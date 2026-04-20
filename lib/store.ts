import fs from "fs/promises";
import path from "path";
import { createClient, type Client } from "@libsql/client";

export interface Palpite {
  username: string;
  valor: number;
  createdAt: number;
}

export interface Rodada {
  id: string;
  status: "aberta" | "travada" | "fechada";
  buyIn: number;
  numVencedores: number;
  palpites: Palpite[];
  createdAt: number;
}

export interface VencedorInfo {
  posicao: number;
  username: string;
  valor: number;
  diferenca: number;
}

export interface ResultadoRodada {
  id: string;
  buyIn: number;
  resultado: number;
  totalParticipantes: number;
  vencedores: VencedorInfo[];
  palpites: Palpite[];
  encerradaEm: number;
}

interface StoreState {
  rodada: Rodada | null;
  historico: ResultadoRodada[];
  msgQueue: string[];
}

const STORE_KEY = "streamer-hub:palpites:v1";
const STORE_TABLE = "app_store";
const LOCAL_FILE = path.join(process.cwd(), ".data", "palpites-store.json");

declare global {
  var __palpitesFallbackState: StoreState | undefined;
}

export interface StoreDiagnostics {
  backend: "turso" | "local-file" | "memory";
  env: {
    TURSO_DATABASE_URL: boolean;
    TURSO_AUTH_TOKEN: boolean;
    RENDER: boolean;
    NODE_ENV: string | undefined;
  };
  turso: {
    configured: boolean;
    ready: boolean;
    error: string | null;
  };
  rodadaAtual: {
    exists: boolean;
    status: Rodada["status"] | null;
    palpites: number;
  };
  historico: number;
  queue: number;
}

let tursoClient: Client | null = null;
let tursoSchemaReady: Promise<void> | null = null;

function tursoConfig() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  return url ? { url, authToken } : null;
}

function emptyState(): StoreState {
  return { rodada: null, historico: [], msgQueue: [] };
}

function shouldUseLocalFile() {
  return !tursoConfig() && process.env.NODE_ENV !== "production" && process.env.RENDER !== "true";
}

function getBackend(): StoreDiagnostics["backend"] {
  if (tursoConfig()) return "turso";
  if (shouldUseLocalFile()) return "local-file";
  return "memory";
}

function getTursoClient() {
  const config = tursoConfig();
  if (!config) return null;

  if (!tursoClient) {
    tursoClient = createClient({ url: config.url, authToken: config.authToken });
  }

  return tursoClient;
}

async function ensureTursoSchema(): Promise<void> {
  const client = getTursoClient();
  if (!client) return;

  if (!tursoSchemaReady) {
    tursoSchemaReady = client
      .execute(`
        CREATE TABLE IF NOT EXISTS ${STORE_TABLE} (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `)
      .then(() => undefined)
      .catch((err) => {
        tursoSchemaReady = null;
        throw err;
      });
  }

  await tursoSchemaReady;
}

async function loadTursoState(): Promise<StoreState> {
  const client = getTursoClient();
  if (!client) return emptyState();

  await ensureTursoSchema();
  const result = await client.execute({
    sql: `SELECT value FROM ${STORE_TABLE} WHERE key = ?`,
    args: [STORE_KEY],
  });

  return parseState(result.rows[0]?.value);
}

async function saveTursoState(raw: string): Promise<void> {
  const client = getTursoClient();
  if (!client) return;

  await ensureTursoSchema();
  await client.execute({
    sql: `
      INSERT INTO ${STORE_TABLE} (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `,
    args: [STORE_KEY, raw],
  });
}

function parseState(raw: unknown): StoreState {
  if (!raw) return emptyState();

  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    const state = value as Partial<StoreState>;

    return {
      rodada: state.rodada ?? null,
      historico: Array.isArray(state.historico) ? state.historico : [],
      msgQueue: Array.isArray(state.msgQueue) ? state.msgQueue : [],
    };
  } catch {
    return emptyState();
  }
}

async function loadState(): Promise<StoreState> {
  if (tursoConfig()) return loadTursoState();

  if (shouldUseLocalFile()) {
    try {
      const raw = await fs.readFile(LOCAL_FILE, "utf-8");
      return parseState(raw);
    } catch {
      return emptyState();
    }
  }

  return globalThis.__palpitesFallbackState ?? emptyState();
}

async function saveState(state: StoreState): Promise<void> {
  const normalized: StoreState = {
    rodada: state.rodada ?? null,
    historico: state.historico.slice(0, 10),
    msgQueue: state.msgQueue,
  };

  const raw = JSON.stringify(normalized);

  if (tursoConfig()) {
    await saveTursoState(raw);
    return;
  }

  if (shouldUseLocalFile()) {
    await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
    await fs.writeFile(LOCAL_FILE, raw, "utf-8");
    return;
  }

  globalThis.__palpitesFallbackState = normalized;
}

/* Rodada */

export async function getRodada(): Promise<Rodada | null> {
  const state = await loadState();
  return state.rodada ?? null;
}

export async function abrirRodada(buyIn: number, numVencedores: number, msgFila?: string): Promise<Rodada> {
  const state = await loadState();
  const now = Date.now();
  const rodada: Rodada = {
    id: now.toString(),
    status: "aberta",
    buyIn,
    numVencedores,
    palpites: [],
    createdAt: now,
  };

  state.rodada = rodada;
  if (msgFila) state.msgQueue.push(msgFila);
  await saveState(state);
  return rodada;
}

export async function travarPalpites(msgFila?: string): Promise<void> {
  const state = await loadState();
  if (state.rodada) {
    state.rodada.status = "travada";
    if (msgFila) state.msgQueue.push(msgFila);
    await saveState(state);
  }
}

export async function fecharRodada(
  resultado?: number,
  buildMsg?: (entry: ResultadoRodada) => string
): Promise<ResultadoRodada | null> {
  const state = await loadState();
  const r = state.rodada;
  if (!r) return null;

  let vencedores: VencedorInfo[] = [];
  if (typeof resultado === "number" && r.palpites.length > 0) {
    const ordenados = [...r.palpites].sort(
      (a, b) => Math.abs(a.valor - resultado) - Math.abs(b.valor - resultado)
    );
    vencedores = ordenados.slice(0, r.numVencedores).map((p, i) => ({
      posicao: i + 1,
      username: p.username,
      valor: p.valor,
      diferenca: Math.abs(p.valor - resultado),
    }));
  }

  const entry: ResultadoRodada = {
    id: r.id,
    buyIn: r.buyIn,
    resultado: resultado ?? 0,
    totalParticipantes: r.palpites.length,
    vencedores,
    palpites: [...r.palpites],
    encerradaEm: Date.now(),
  };

  state.historico = [entry, ...state.historico].slice(0, 10);
  state.rodada = null;
  if (buildMsg) state.msgQueue.push(buildMsg(entry));
  await saveState(state);
  return entry;
}

export async function addOrUpdatePalpite(
  username: string,
  valor: number
): Promise<{ ok: boolean; updated: boolean }> {
  const state = await loadState();
  const r = state.rodada;
  if (!r || r.status !== "aberta") return { ok: false, updated: false };

  const idx = r.palpites.findIndex(
    (p) => p.username.toLowerCase() === username.toLowerCase()
  );

  if (idx >= 0) {
    r.palpites[idx].valor = valor;
    r.palpites[idx].createdAt = Date.now();
    await saveState(state);
    return { ok: true, updated: true };
  }

  r.palpites.push({ username, valor, createdAt: Date.now() });
  await saveState(state);
  return { ok: true, updated: false };
}

/* Histórico de resultados */

export async function getHistorico(): Promise<ResultadoRodada[]> {
  const state = await loadState();
  return state.historico;
}

export async function clearHistorico(): Promise<void> {
  const state = await loadState();
  state.historico = [];
  await saveState(state);
}

/* Fila de mensagens para o bot */

export async function queueChatMessage(msg: string): Promise<void> {
  const state = await loadState();
  state.msgQueue.push(msg);
  await saveState(state);
}

export async function drainChatMessages(): Promise<string[]> {
  const state = await loadState();
  const msgs = state.msgQueue;
  state.msgQueue = [];
  await saveState(state);
  return msgs;
}

export async function getStoreDiagnostics(): Promise<StoreDiagnostics> {
  let tursoReady = false;
  let tursoError: string | null = null;

  if (tursoConfig()) {
    try {
      await ensureTursoSchema();
      await getTursoClient()?.execute("SELECT 1");
      tursoReady = true;
    } catch (err) {
      tursoError = err instanceof Error ? err.message : "Erro desconhecido no Turso";
    }
  }

  const state = await loadState().catch(() => emptyState());

  return {
    backend: getBackend(),
    env: {
      TURSO_DATABASE_URL: !!process.env.TURSO_DATABASE_URL,
      TURSO_AUTH_TOKEN: !!process.env.TURSO_AUTH_TOKEN,
      RENDER: process.env.RENDER === "true",
      NODE_ENV: process.env.NODE_ENV,
    },
    turso: {
      configured: !!tursoConfig(),
      ready: tursoReady,
      error: tursoError,
    },
    rodadaAtual: {
      exists: !!state.rodada,
      status: state.rodada?.status ?? null,
      palpites: state.rodada?.palpites.length ?? 0,
    },
    historico: state.historico.length,
    queue: state.msgQueue.length,
  };
}

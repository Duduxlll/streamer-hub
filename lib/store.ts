import fs from "fs/promises";
import path from "path";

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
const LOCAL_FILE = path.join(process.cwd(), ".data", "palpites-store.json");

declare global {
  var __palpitesFallbackState: StoreState | undefined;
}

type RedisResult<T> = {
  result?: T;
  error?: string;
};

function redisConfig() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ??
    process.env.KV_REST_API_URL ??
    process.env.REDIS_REST_API_URL;

  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    process.env.KV_REST_API_TOKEN ??
    process.env.REDIS_REST_API_TOKEN;

  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

function emptyState(): StoreState {
  return {
    rodada: null,
    historico: [],
    msgQueue: [],
  };
}

function shouldUseLocalFile() {
  return !redisConfig() && process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1";
}

async function redisCommand<T>(command: unknown[]) {
  const config = redisConfig();
  if (!config) return undefined;

  const res = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Redis ${command[0]} failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as RedisResult<T>;
  if (data.error) throw new Error(`Redis ${command[0]} failed: ${data.error}`);
  return data.result;
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
  if (redisConfig()) {
    const raw = await redisCommand<string>(["GET", STORE_KEY]);
    return parseState(raw);
  }

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

  if (redisConfig()) {
    await redisCommand(["SET", STORE_KEY, raw]);
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

export async function abrirRodada(buyIn: number, numVencedores: number): Promise<Rodada> {
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
  await saveState(state);
  return rodada;
}

export async function travarPalpites(): Promise<void> {
  const state = await loadState();
  if (state.rodada) {
    state.rodada.status = "travada";
    await saveState(state);
  }
}

export async function fecharRodada(): Promise<void> {
  const state = await loadState();
  state.rodada = null;
  await saveState(state);
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

/* Historico de resultados */

export async function saveResultado(resultado?: number): Promise<ResultadoRodada | null> {
  const state = await loadState();
  const r = state.rodada;
  if (!r) return null;

  let vencedores: VencedorInfo[] = [];
  if (typeof resultado === "number" && r.palpites.length > 0) {
    const ordenados = [...r.palpites].sort(
      (a, b) => Math.abs(a.valor - resultado) - Math.abs(b.valor - resultado)
    );
    vencedores = ordenados
      .slice(0, r.numVencedores)
      .map((p, i) => ({
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
  await saveState(state);
  return entry;
}

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

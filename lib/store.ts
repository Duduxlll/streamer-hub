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

declare global {
  // eslint-disable-next-line no-var
  var __rodada:   Rodada | null | undefined;
  // eslint-disable-next-line no-var
  var __msgQueue: string[] | undefined;
  // eslint-disable-next-line no-var
  var __historico: ResultadoRodada[] | undefined;
}

if (typeof globalThis.__rodada    === "undefined") globalThis.__rodada    = null;
if (typeof globalThis.__msgQueue  === "undefined") globalThis.__msgQueue  = [];
if (typeof globalThis.__historico === "undefined") globalThis.__historico = [];

/* ── Rodada ── */

export function getRodada(): Rodada | null {
  return globalThis.__rodada ?? null;
}

export function abrirRodada(buyIn: number, numVencedores: number): Rodada {
  const rodada: Rodada = {
    id: Date.now().toString(),
    status: "aberta",
    buyIn,
    numVencedores,
    palpites: [],
    createdAt: Date.now(),
  };
  globalThis.__rodada = rodada;
  return rodada;
}

export function travarPalpites(): void {
  if (globalThis.__rodada) globalThis.__rodada.status = "travada";
}

export function fecharRodada(): void {
  globalThis.__rodada = null;
}

export function addOrUpdatePalpite(
  username: string,
  valor: number
): { ok: boolean; updated: boolean } {
  const r = globalThis.__rodada;
  if (!r || r.status !== "aberta") return { ok: false, updated: false };

  const idx = r.palpites.findIndex(
    (p) => p.username.toLowerCase() === username.toLowerCase()
  );
  if (idx >= 0) {
    r.palpites[idx].valor = valor;
    r.palpites[idx].createdAt = Date.now();
    return { ok: true, updated: true };
  }
  r.palpites.push({ username, valor, createdAt: Date.now() });
  return { ok: true, updated: false };
}

/* ── Histórico de resultados ── */

export function saveResultado(resultado?: number): ResultadoRodada | null {
  const r = globalThis.__rodada;
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

  (globalThis.__historico ??= []).unshift(entry);
  globalThis.__historico = globalThis.__historico.slice(0, 10);

  return entry;
}

export function getHistorico(): ResultadoRodada[] {
  return globalThis.__historico ?? [];
}

export function clearHistorico(): void {
  globalThis.__historico = [];
}

/* ── Fila de mensagens para o bot ── */

export function queueChatMessage(msg: string): void {
  (globalThis.__msgQueue ??= []).push(msg);
}

export function drainChatMessages(): string[] {
  const msgs = globalThis.__msgQueue ?? [];
  globalThis.__msgQueue = [];
  return msgs;
}

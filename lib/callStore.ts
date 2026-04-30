import { dbGet, dbSet } from "@/lib/store";

export interface CallEntry {
  id: string;
  username: string;
  displayName: string;
  jogo: string;
  criadoEm: number;
}

export interface CallState {
  status: "fechada" | "aberta";
  entries: CallEntry[];
}

const KEY = "call:v1";

let _cache: CallState | null = null;

async function load(): Promise<CallState> {
  if (_cache) return _cache;
  try {
    const raw = await dbGet(KEY);
    _cache = raw ? JSON.parse(raw) : { status: "fechada", entries: [] };
  } catch {
    _cache = { status: "fechada", entries: [] };
  }
  return _cache!;
}

async function save(s: CallState): Promise<void> {
  _cache = s;
  await dbSet(KEY, JSON.stringify(s));
}

export async function getCall(): Promise<CallState> {
  return load();
}

export async function abrirCall(): Promise<CallState> {
  const s = await load();
  const next: CallState = { ...s, status: "aberta" };
  await save(next);
  return next;
}

export async function fecharCall(): Promise<CallState> {
  const next: CallState = { status: "fechada", entries: [] };
  await save(next);
  return next;
}

export async function submeterCall(
  username: string,
  displayName: string,
  jogo: string
): Promise<{ ok: boolean; error?: string; state: CallState }> {
  const s = await load();
  if (s.status !== "aberta") return { ok: false, error: "Call fechada", state: s };
  if (s.entries.some(e => e.username === username))
    return { ok: false, error: "Você já enviou uma call", state: s };
  const entry: CallEntry = {
    id: `${Date.now()}-${username}`,
    username,
    displayName,
    jogo: jogo.trim(),
    criadoEm: Date.now(),
  };
  const next: CallState = { ...s, entries: [...s.entries, entry] };
  await save(next);
  return { ok: true, state: next };
}

export async function removerEntry(id: string): Promise<CallState> {
  const s = await load();
  const next: CallState = { ...s, entries: s.entries.filter(e => e.id !== id) };
  await save(next);
  return next;
}

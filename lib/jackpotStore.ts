import { dbGet, dbSet } from "@/lib/store";

export interface JackpotJogador {
  id: string;
  nome: string;
  jogo: string;
  valor: number | null;
}

export interface Jackpot {
  id: string;
  nome: string;
  valorEntrada: number;
  status: "aguardando" | "ativo" | "finalizado";
  jogadores: JackpotJogador[];
  jogadorAtualIdx: number;
  vencedor: JackpotJogador | null;
  criadoEm: number;
}

const KEY = "jackpot:v1";

let _state: Jackpot | null = null;
let _initialized = false;

async function ensureLoaded(): Promise<void> {
  if (_initialized) return;
  _initialized = true;
  try {
    const raw = await dbGet(KEY);
    _state = raw ? (JSON.parse(raw) as Jackpot) : null;
  } catch {
    _state = null;
  }
}

async function save(): Promise<void> {
  await dbSet(KEY, _state ? JSON.stringify(_state) : null);
}

export async function getJackpot(): Promise<Jackpot | null> {
  await ensureLoaded();
  return _state;
}

export async function setJackpot(j: Jackpot | null): Promise<void> {
  await ensureLoaded();
  _state = j;
  await save();
}

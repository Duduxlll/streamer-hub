import { dbGet, dbSet } from "@/lib/store";

export type VagasOptions = 8 | 16 | 32;

export interface BatalhaJogador {
  username: string;
  displayName: string;
  image?: string | null;
}

export interface BatalhaSlot {
  jogador?: BatalhaJogador;
  jogoNome?: string;
  jogoValor?: number;
  resultado?: "win" | "lose";
}

export interface BatalhaMatch {
  id: string;
  slot1: BatalhaSlot;
  slot2: BatalhaSlot;
}

export interface Batalha {
  id: string;
  nome: string;
  vagas: VagasOptions;
  premiacao: number;
  comando: string;
  status: "inscricao" | "ativa" | "finalizada";
  inscricoes: BatalhaJogador[];
  rounds: BatalhaMatch[][];
  vencedorFinal?: BatalhaJogador;
  criadaEm: number;
}

const KEY = "batalha:v1";

let _state: Batalha | null = null;
let _initialized = false;

async function ensureLoaded(): Promise<void> {
  if (_initialized) return;
  _initialized = true;
  try {
    const raw = await dbGet(KEY);
    _state = raw ? (JSON.parse(raw) as Batalha) : null;
  } catch {
    _state = null;
  }
}

async function save(): Promise<void> {
  await dbSet(KEY, _state ? JSON.stringify(_state) : null);
}

export async function getBatalha(): Promise<Batalha | null> {
  await ensureLoaded();
  return _state;
}

function gerarEstrutura(vagas: VagasOptions): BatalhaMatch[][] {
  const rounds: BatalhaMatch[][] = [];
  let n = vagas / 2;
  let r = 0;
  while (n >= 1) {
    rounds.push(
      Array.from({ length: n }, (_, m) => ({
        id: `r${r}m${m}`,
        slot1: {},
        slot2: {},
      }))
    );
    n = n / 2;
    r++;
  }
  return rounds;
}

export async function criarBatalha(
  nome: string, vagas: VagasOptions, premiacao: number, comando: string
): Promise<Batalha> {
  await ensureLoaded();
  _state = {
    id: Date.now().toString(),
    nome,
    vagas,
    premiacao: Number(premiacao),
    comando: comando.trim(),
    status: "inscricao",
    inscricoes: [],
    rounds: gerarEstrutura(vagas),
    criadaEm: Date.now(),
  };
  await save();
  return _state;
}

export async function entrarBatalha(
  username: string, displayName: string, image: string | null = null
): Promise<{ ok: boolean; motivo?: string }> {
  await ensureLoaded();
  if (!_state) return { ok: false, motivo: "Sem batalha ativa." };
  if (_state.status !== "inscricao") return { ok: false, motivo: "Inscrições encerradas." };
  if (_state.inscricoes.length >= _state.vagas) return { ok: false, motivo: "Batalha lotada!" };
  if (_state.inscricoes.find(j => j.username === username))
    return { ok: false, motivo: "Você já está inscrito!" };
  _state.inscricoes.push({ username, displayName, image });
  await save();
  return { ok: true };
}

function avancaVencedor(b: Batalha, roundIdx: number, matchIdx: number, winner: "slot1" | "slot2") {
  const jogador = b.rounds[roundIdx][matchIdx][winner].jogador;
  if (!jogador) return;
  const nextR = roundIdx + 1;
  if (nextR >= b.rounds.length) {
    b.vencedorFinal = jogador;
    b.status = "finalizada";
    return;
  }
  const nextM = Math.floor(matchIdx / 2);
  const nextSlot: "slot1" | "slot2" = matchIdx % 2 === 0 ? "slot1" : "slot2";
  b.rounds[nextR][nextM][nextSlot] = { jogador };
}

export async function iniciarBatalha(): Promise<{ ok: boolean; motivo?: string }> {
  await ensureLoaded();
  if (!_state) return { ok: false, motivo: "Sem batalha." };
  if (_state.status !== "inscricao") return { ok: false, motivo: "Já iniciada." };
  if (_state.inscricoes.length < 2) return { ok: false, motivo: "Mínimo 2 inscritos." };

  const players = [..._state.inscricoes];
  for (let m = 0; m < _state.rounds[0].length; m++) {
    const p1 = players[m * 2] ?? undefined;
    const p2 = players[m * 2 + 1] ?? undefined;
    _state.rounds[0][m].slot1 = { jogador: p1 };
    _state.rounds[0][m].slot2 = { jogador: p2 };
    if (p1 && !p2) {
      _state.rounds[0][m].slot1.resultado = "win";
      _state.rounds[0][m].slot2.resultado = "lose";
      avancaVencedor(_state, 0, m, "slot1");
    } else if (p2 && !p1) {
      _state.rounds[0][m].slot2.resultado = "win";
      _state.rounds[0][m].slot1.resultado = "lose";
      avancaVencedor(_state, 0, m, "slot2");
    }
  }
  _state.status = "ativa";
  await save();
  return { ok: true };
}

export async function setJogo(
  roundIdx: number, matchIdx: number,
  slot: "slot1" | "slot2", jogoNome: string, jogoValor: number
): Promise<boolean> {
  await ensureLoaded();
  if (!_state) return false;
  const match = _state.rounds[roundIdx]?.[matchIdx];
  if (!match) return false;
  match[slot].jogoNome = jogoNome || undefined;
  match[slot].jogoValor = jogoValor > 0 ? Number(jogoValor) : undefined;
  await save();
  return true;
}

export async function setVencedor(
  roundIdx: number, matchIdx: number, winner: "slot1" | "slot2"
): Promise<{ ok: boolean; finalizado?: boolean }> {
  await ensureLoaded();
  if (!_state) return { ok: false };
  const match = _state.rounds[roundIdx]?.[matchIdx];
  if (!match || match.slot1.resultado) return { ok: false };
  const loser: "slot1" | "slot2" = winner === "slot1" ? "slot2" : "slot1";
  match[winner].resultado = "win";
  match[loser].resultado = "lose";
  avancaVencedor(_state, roundIdx, matchIdx, winner);
  await save();
  return { ok: true, finalizado: _state.status === "finalizada" };
}

export async function finalizarBatalha(): Promise<void> {
  await ensureLoaded();
  _state = null;
  await save();
}

export type VagasOptions = 8 | 16 | 32;

export interface BatalhaJogador {
  username: string;
  displayName: string;
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

declare global {
  // eslint-disable-next-line no-var
  var __batalha: Batalha | null | undefined;
}

export function getBatalha(): Batalha | null {
  return globalThis.__batalha ?? null;
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

export function criarBatalha(
  nome: string, vagas: VagasOptions, premiacao: number, comando: string
): Batalha {
  const b: Batalha = {
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
  globalThis.__batalha = b;
  return b;
}

export function entrarBatalha(
  username: string, displayName: string
): { ok: boolean; motivo?: string } {
  const b = globalThis.__batalha;
  if (!b) return { ok: false, motivo: "Sem batalha ativa." };
  if (b.status !== "inscricao") return { ok: false, motivo: "Inscrições encerradas." };
  if (b.inscricoes.length >= b.vagas) return { ok: false, motivo: "Batalha lotada!" };
  if (b.inscricoes.find(j => j.username === username))
    return { ok: false, motivo: "Você já está inscrito!" };
  b.inscricoes.push({ username, displayName });
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

export function iniciarBatalha(): { ok: boolean; motivo?: string } {
  const b = globalThis.__batalha;
  if (!b) return { ok: false, motivo: "Sem batalha." };
  if (b.status !== "inscricao") return { ok: false, motivo: "Já iniciada." };
  if (b.inscricoes.length < 2) return { ok: false, motivo: "Mínimo 2 inscritos." };

  const players = [...b.inscricoes];
  const total = b.rounds[0].length * 2; // = vagas
  for (let m = 0; m < b.rounds[0].length; m++) {
    const p1 = players[m * 2] ?? undefined;
    const p2 = players[m * 2 + 1] ?? undefined;
    b.rounds[0][m].slot1 = { jogador: p1 };
    b.rounds[0][m].slot2 = { jogador: p2 };
    // BYE auto-advance
    if (p1 && !p2) {
      b.rounds[0][m].slot1.resultado = "win";
      b.rounds[0][m].slot2.resultado = "lose";
      avancaVencedor(b, 0, m, "slot1");
    } else if (p2 && !p1) {
      b.rounds[0][m].slot2.resultado = "win";
      b.rounds[0][m].slot1.resultado = "lose";
      avancaVencedor(b, 0, m, "slot2");
    }
  }
  void total;
  b.status = "ativa";
  return { ok: true };
}

export function setJogo(
  roundIdx: number, matchIdx: number,
  slot: "slot1" | "slot2", jogoNome: string, jogoValor: number
): boolean {
  const b = globalThis.__batalha;
  if (!b) return false;
  const match = b.rounds[roundIdx]?.[matchIdx];
  if (!match) return false;
  match[slot].jogoNome = jogoNome || undefined;
  match[slot].jogoValor = jogoValor > 0 ? Number(jogoValor) : undefined;
  return true;
}

export function setVencedor(
  roundIdx: number, matchIdx: number, winner: "slot1" | "slot2"
): { ok: boolean; finalizado?: boolean } {
  const b = globalThis.__batalha;
  if (!b) return { ok: false };
  const match = b.rounds[roundIdx]?.[matchIdx];
  if (!match || match.slot1.resultado) return { ok: false };
  const loser: "slot1" | "slot2" = winner === "slot1" ? "slot2" : "slot1";
  match[winner].resultado = "win";
  match[loser].resultado = "lose";
  avancaVencedor(b, roundIdx, matchIdx, winner);
  return { ok: true, finalizado: b.status === "finalizada" };
}

export function finalizarBatalha(): void {
  globalThis.__batalha = null;
}

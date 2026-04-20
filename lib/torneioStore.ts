export interface EscolhaParticipante {
  username: string;
  displayName: string;
  time: string;
  atualizadaEm: number;
}

export interface Fase {
  numero: number;
  status: "aberta" | "fechada" | "decidida";
  times: string[];
  vencedor?: string;
  escolhas: EscolhaParticipante[];
  abertaEm: number;
  fechadaEm?: number;
  decidaEm?: number;
}

export interface Torneio {
  id: string;
  nome: string;
  status: "ativo" | "finalizado";
  faseAtual: number;
  fases: Fase[];
  classificados: string[] | null; // null = fase 1, sem restrição
  vencedoresFinais: string[];
  criadoEm: number;
  finalizadoEm?: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __torneio: Torneio | null | undefined;
}

if (typeof globalThis.__torneio === "undefined") globalThis.__torneio = null;

export function getTorneio(): Torneio | null {
  return globalThis.__torneio ?? null;
}

export function getFaseAtual(): Fase | null {
  const t = globalThis.__torneio;
  if (!t) return null;
  return t.fases.find(f => f.numero === t.faseAtual) ?? null;
}

export function criarTorneio(nome: string, times: string[]): Torneio {
  const fase: Fase = {
    numero: 1,
    status: "aberta",
    times,
    escolhas: [],
    abertaEm: Date.now(),
  };
  const torneio: Torneio = {
    id: Date.now().toString(),
    nome,
    status: "ativo",
    faseAtual: 1,
    fases: [fase],
    classificados: null,
    vencedoresFinais: [],
    criadoEm: Date.now(),
  };
  globalThis.__torneio = torneio;
  return torneio;
}

export function fecharFase(): Torneio | null {
  const t = globalThis.__torneio;
  const fase = getFaseAtual();
  if (!t || !fase || fase.status !== "aberta") return null;
  fase.status = "fechada";
  fase.fechadaEm = Date.now();
  return t;
}

export function decidirFase(timeVencedor: string): Torneio | null {
  const t = globalThis.__torneio;
  const fase = getFaseAtual();
  if (!t || !fase || fase.status !== "fechada") return null;

  const timeReal = fase.times.find(tm => tm.toLowerCase() === timeVencedor.toLowerCase());
  if (!timeReal) return null;

  fase.vencedor = timeReal;
  fase.status = "decidida";
  fase.decidaEm = Date.now();

  const vencedoresNaFase = fase.escolhas
    .filter(e => e.time.toLowerCase() === timeReal.toLowerCase())
    .map(e => e.username.toLowerCase());

  if (t.classificados === null) {
    t.classificados = vencedoresNaFase;
  } else {
    t.classificados = t.classificados.filter(u => vencedoresNaFase.includes(u));
  }

  return t;
}

export function abrirProximaFase(times: string[]): Torneio | null {
  const t = globalThis.__torneio;
  const faseAtual = getFaseAtual();
  if (!t || !faseAtual || faseAtual.status !== "decidida") return null;

  const novaFase: Fase = {
    numero: t.faseAtual + 1,
    status: "aberta",
    times,
    escolhas: [],
    abertaEm: Date.now(),
  };
  t.fases.push(novaFase);
  t.faseAtual = novaFase.numero;
  return t;
}

export function finalizarTorneio(): Torneio | null {
  const t = globalThis.__torneio;
  if (!t) return null;
  t.status = "finalizado";
  t.vencedoresFinais = t.classificados ?? [];
  t.finalizadoEm = Date.now();
  globalThis.__torneio = null;
  return t;
}

export function registrarEscolha(
  username: string,
  displayName: string,
  time: string
): { ok: boolean; atualizado: boolean; motivo?: string } {
  const t = globalThis.__torneio;
  if (!t || t.status !== "ativo")
    return { ok: false, atualizado: false, motivo: "Nenhum torneio ativo" };

  const fase = getFaseAtual();
  if (!fase)
    return { ok: false, atualizado: false, motivo: "Nenhuma fase ativa" };
  if (fase.status !== "aberta")
    return { ok: false, atualizado: false, motivo: "Fase não está mais aberta" };

  const timeReal = fase.times.find(tm => tm.toLowerCase() === time.toLowerCase());
  if (!timeReal)
    return { ok: false, atualizado: false, motivo: `Time inválido. Escolha: ${fase.times.join(", ")}` };

  if (t.classificados !== null && !t.classificados.includes(username.toLowerCase()))
    return { ok: false, atualizado: false, motivo: "Você foi eliminado do torneio" };

  const idx = fase.escolhas.findIndex(e => e.username.toLowerCase() === username.toLowerCase());
  if (idx >= 0) {
    fase.escolhas[idx].time = timeReal;
    fase.escolhas[idx].atualizadaEm = Date.now();
    return { ok: true, atualizado: true };
  }

  fase.escolhas.push({ username, displayName, time: timeReal, atualizadaEm: Date.now() });
  return { ok: true, atualizado: false };
}

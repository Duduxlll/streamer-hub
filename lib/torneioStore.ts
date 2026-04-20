import { dbGet, dbSet } from "@/lib/store";

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
  valoresBonus?: Record<string, number>;
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
  classificados: string[] | null;
  vencedoresFinais: string[];
  criadoEm: number;
  finalizadoEm?: number;
}

const KEY = "torneio:v1";

let _state: Torneio | null = null;
let _initialized = false;

async function ensureLoaded(): Promise<void> {
  if (_initialized) return;
  _initialized = true;
  try {
    const raw = await dbGet(KEY);
    _state = raw ? (JSON.parse(raw) as Torneio) : null;
  } catch {
    _state = null;
  }
}

async function save(): Promise<void> {
  await dbSet(KEY, _state ? JSON.stringify(_state) : null);
}

export async function getTorneio(): Promise<Torneio | null> {
  await ensureLoaded();
  return _state;
}

export async function getFaseAtual(): Promise<Fase | null> {
  await ensureLoaded();
  if (!_state) return null;
  return _state.fases.find(f => f.numero === _state!.faseAtual) ?? null;
}

export async function criarTorneio(nome: string, times: string[]): Promise<Torneio> {
  await ensureLoaded();
  const fase: Fase = {
    numero: 1,
    status: "aberta",
    times,
    escolhas: [],
    abertaEm: Date.now(),
  };
  _state = {
    id: Date.now().toString(),
    nome,
    status: "ativo",
    faseAtual: 1,
    fases: [fase],
    classificados: null,
    vencedoresFinais: [],
    criadoEm: Date.now(),
  };
  await save();
  return _state;
}

export async function fecharFase(): Promise<Torneio | null> {
  await ensureLoaded();
  const fase = await getFaseAtual();
  if (!_state || !fase || fase.status !== "aberta") return null;
  fase.status = "fechada";
  fase.fechadaEm = Date.now();
  await save();
  return _state;
}

export async function decidirFase(timeVencedor: string): Promise<Torneio | null> {
  await ensureLoaded();
  const fase = await getFaseAtual();
  if (!_state || !fase || fase.status !== "fechada") return null;

  const timeReal = fase.times.find(tm => tm.toLowerCase() === timeVencedor.toLowerCase());
  if (!timeReal) return null;

  fase.vencedor = timeReal;
  fase.status = "decidida";
  fase.decidaEm = Date.now();

  const vencedoresNaFase = fase.escolhas
    .filter(e => e.time.toLowerCase() === timeReal.toLowerCase())
    .map(e => e.username.toLowerCase());

  if (_state.classificados === null) {
    _state.classificados = vencedoresNaFase;
  } else {
    _state.classificados = _state.classificados.filter(u => vencedoresNaFase.includes(u));
  }

  await save();
  return _state;
}

export async function abrirProximaFase(times: string[]): Promise<Torneio | null> {
  await ensureLoaded();
  const faseAtual = await getFaseAtual();
  if (!_state || !faseAtual || faseAtual.status !== "decidida") return null;

  const novaFase: Fase = {
    numero: _state.faseAtual + 1,
    status: "aberta",
    times,
    escolhas: [],
    abertaEm: Date.now(),
  };
  _state.fases.push(novaFase);
  _state.faseAtual = novaFase.numero;
  await save();
  return _state;
}

export async function finalizarTorneio(): Promise<Torneio | null> {
  await ensureLoaded();
  if (!_state) return null;
  _state.status = "finalizado";
  _state.vencedoresFinais = _state.classificados ?? [];
  _state.finalizadoEm = Date.now();
  const resultado = { ..._state };
  _state = null;
  await save();
  return resultado;
}

export async function setValorBonus(faseNum: number, time: string, valor: number): Promise<Torneio | null> {
  await ensureLoaded();
  if (!_state) return null;
  const fase = _state.fases.find(f => f.numero === faseNum);
  if (!fase) return null;
  if (!fase.valoresBonus) fase.valoresBonus = {};
  if (valor <= 0) {
    delete fase.valoresBonus[time];
  } else {
    fase.valoresBonus[time] = valor;
  }
  await save();
  return _state;
}

export async function registrarEscolha(
  username: string,
  displayName: string,
  time: string
): Promise<{ ok: boolean; atualizado: boolean; motivo?: string }> {
  await ensureLoaded();
  if (!_state || _state.status !== "ativo")
    return { ok: false, atualizado: false, motivo: "Nenhum torneio ativo" };

  const fase = await getFaseAtual();
  if (!fase)
    return { ok: false, atualizado: false, motivo: "Nenhuma fase ativa" };
  if (fase.status !== "aberta")
    return { ok: false, atualizado: false, motivo: "Fase não está mais aberta" };

  const timeReal = fase.times.find(tm => tm.toLowerCase() === time.toLowerCase());
  if (!timeReal)
    return { ok: false, atualizado: false, motivo: `Time inválido. Escolha: ${fase.times.join(", ")}` };

  if (_state.classificados !== null && !_state.classificados.includes(username.toLowerCase()))
    return { ok: false, atualizado: false, motivo: "Você foi eliminado do torneio" };

  const idx = fase.escolhas.findIndex(e => e.username.toLowerCase() === username.toLowerCase());
  if (idx >= 0) {
    fase.escolhas[idx].time = timeReal;
    fase.escolhas[idx].atualizadaEm = Date.now();
    await save();
    return { ok: true, atualizado: true };
  }

  fase.escolhas.push({ username, displayName, time: timeReal, atualizadaEm: Date.now() });
  await save();
  return { ok: true, atualizado: false };
}

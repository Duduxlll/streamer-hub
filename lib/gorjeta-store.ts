import { dbGet, dbSet } from "./store";

export interface CadastroGorjeta {
  id: string;
  username: string;
  displayName: string;
  cpf: string;
  nomeCompleto: string;
  status: "pendente" | "aprovado" | "rejeitado";
  criadoEm: number;
  avaliadoEm?: number;
  motivoRejeicao?: string;
}

export interface ParticipanteSessao {
  username: string;
  displayName: string;
  image: string | null;
  cpf: string;
  nomeCompleto: string;
  entradaEm: number;
}

export interface ResultadoPagamento {
  username: string;
  displayName: string;
  cpf: string;
  nomeCompleto: string;
  status: "enviado" | "falhou" | "nao_cadastrado";
  txid?: string;
  e2eid?: string;
  erro?: string;
}

export interface SessaoGorjeta {
  id: string;
  status: "aberta" | "sorteada" | "fechada";
  valorUnitario: number;
  maxVencedores: number;
  participantes: ParticipanteSessao[];
  vencedores: ParticipanteSessao[];
  pagamentos: ResultadoPagamento[];
  abertaEm: number;
  fechadaEm?: number;
}

export interface HistoricoItemGorjeta {
  id: string;
  valorUnitario: number;
  totalEnviado: number;
  pagamentos: ResultadoPagamento[];
  abertaEm: number;
  fechadaEm: number;
}

const KEY_CADASTROS = "gorjeta:cadastros:v1";
const KEY_SESSAO = "gorjeta:sessao:v1";
const KEY_HISTORICO = "gorjeta:historico:v1";

function screenshotKey(id: string) {
  return `gorjeta:screenshot:${id}:v1`;
}

declare global {
  var __gorjetaCadastros: CadastroGorjeta[] | undefined;
  var __gorjetaSessao: SessaoGorjeta | null | undefined;
  var __gorjetaHistorico: HistoricoItemGorjeta[] | undefined;
}

async function loadCadastros(): Promise<CadastroGorjeta[]> {
  try {
    const raw = await dbGet(KEY_CADASTROS);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : (globalThis.__gorjetaCadastros ?? []);
  } catch {
    return globalThis.__gorjetaCadastros ?? [];
  }
}

async function saveCadastros(list: CadastroGorjeta[]): Promise<void> {
  globalThis.__gorjetaCadastros = list;
  try { await dbSet(KEY_CADASTROS, JSON.stringify(list)); } catch {}
}

async function loadSessao(): Promise<SessaoGorjeta | null> {
  try {
    const raw = await dbGet(KEY_SESSAO);
    if (!raw) return globalThis.__gorjetaSessao ?? null;
    return JSON.parse(raw) as SessaoGorjeta;
  } catch {
    return globalThis.__gorjetaSessao ?? null;
  }
}

async function saveSessao(s: SessaoGorjeta | null): Promise<void> {
  globalThis.__gorjetaSessao = s;
  try { await dbSet(KEY_SESSAO, s ? JSON.stringify(s) : null); } catch {}
}

async function loadHistorico(): Promise<HistoricoItemGorjeta[]> {
  try {
    const raw = await dbGet(KEY_HISTORICO);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : (globalThis.__gorjetaHistorico ?? []);
  } catch {
    return globalThis.__gorjetaHistorico ?? [];
  }
}

async function saveHistorico(list: HistoricoItemGorjeta[]): Promise<void> {
  const trimmed = list.slice(0, 30);
  globalThis.__gorjetaHistorico = trimmed;
  try { await dbSet(KEY_HISTORICO, JSON.stringify(trimmed)); } catch {}
}

export async function getCadastros(): Promise<CadastroGorjeta[]> {
  return loadCadastros();
}

export async function getCadastro(username: string): Promise<CadastroGorjeta | null> {
  const list = await loadCadastros();
  return list.find(c => c.username.toLowerCase() === username.toLowerCase()) ?? null;
}

export async function cadastrar(params: {
  username: string;
  displayName: string;
  cpf: string;
  nomeCompleto: string;
  screenshot: string;
}): Promise<{ ok: true; cadastro: CadastroGorjeta } | { ok: false; error: string }> {
  const list = await loadCadastros();
  const existing = list.find(c => c.username.toLowerCase() === params.username.toLowerCase());

  if (existing && existing.status === "aprovado") {
    return { ok: false, error: "Já aprovado" };
  }
  if (existing && existing.status === "pendente") {
    return { ok: false, error: "Cadastro já enviado — aguarde aprovação" };
  }

  const cpfNum = params.cpf.replace(/\D/g, "");
  if (cpfNum.length !== 11) return { ok: false, error: "CPF inválido" };

  const cpfDuplicado = list.find(
    c => c.cpf === cpfNum && c.username.toLowerCase() !== params.username.toLowerCase() && c.status !== "rejeitado"
  );
  if (cpfDuplicado) return { ok: false, error: "CPF já cadastrado por outro usuário" };

  const id = Date.now().toString();
  const cadastro: CadastroGorjeta = {
    id,
    username: params.username.toLowerCase(),
    displayName: params.displayName,
    cpf: cpfNum,
    nomeCompleto: params.nomeCompleto.trim(),
    status: "pendente",
    criadoEm: Date.now(),
  };

  const filtered = list.filter(c => c.username.toLowerCase() !== params.username.toLowerCase());
  await saveCadastros([cadastro, ...filtered]);

  try { await dbSet(screenshotKey(id), params.screenshot); } catch {}

  return { ok: true, cadastro };
}

export async function aprovarCadastro(id: string): Promise<CadastroGorjeta | null> {
  const list = await loadCadastros();
  const c = list.find(x => x.id === id);
  if (!c) return null;
  c.status = "aprovado";
  c.avaliadoEm = Date.now();
  delete c.motivoRejeicao;
  await saveCadastros(list);
  return c;
}

export async function rejeitarCadastro(id: string, motivo: string): Promise<CadastroGorjeta | null> {
  const list = await loadCadastros();
  const c = list.find(x => x.id === id);
  if (!c) return null;
  c.status = "rejeitado";
  c.avaliadoEm = Date.now();
  c.motivoRejeicao = motivo || "Não aprovado";
  await saveCadastros(list);
  return c;
}

export async function getScreenshot(id: string): Promise<string | null> {
  try { return await dbGet(screenshotKey(id)); } catch { return null; }
}

export async function getSessao(): Promise<SessaoGorjeta | null> {
  return loadSessao();
}

export async function abrirSessao(params: {
  valorUnitario: number;
  maxVencedores: number;
}): Promise<{ ok: true; sessao: SessaoGorjeta } | { ok: false; error: string }> {
  const atual = await loadSessao();
  if (atual && atual.status === "aberta") return { ok: false, error: "Já existe uma sessão aberta" };

  const sessao: SessaoGorjeta = {
    id: Date.now().toString(),
    status: "aberta",
    valorUnitario: Math.max(0.01, params.valorUnitario),
    maxVencedores: Math.max(1, params.maxVencedores),
    participantes: [],
    vencedores: [],
    pagamentos: [],
    abertaEm: Date.now(),
  };
  await saveSessao(sessao);
  return { ok: true, sessao };
}

export async function entrarSessao(
  username: string,
  displayName: string,
  image: string | null,
): Promise<{ ok: boolean; reason?: string }> {
  const sessao = await loadSessao();
  if (!sessao || sessao.status !== "aberta") return { ok: false, reason: "sem sessão aberta" };

  const jaParticipa = sessao.participantes.some(
    p => p.username.toLowerCase() === username.toLowerCase()
  );
  if (jaParticipa) return { ok: false, reason: "já participa" };

  const cadastros = await loadCadastros();
  const cadastro = cadastros.find(
    c => c.username.toLowerCase() === username.toLowerCase() && c.status === "aprovado"
  );
  if (!cadastro) return { ok: false, reason: "não cadastrado" };

  sessao.participantes.push({
    username: username.toLowerCase(),
    displayName,
    image,
    cpf: cadastro.cpf,
    nomeCompleto: cadastro.nomeCompleto,
    entradaEm: Date.now(),
  });
  await saveSessao(sessao);
  return { ok: true };
}

export async function sortearGorjeta(): Promise<{ ok: true; sessao: SessaoGorjeta } | { ok: false; error: string }> {
  const sessao = await loadSessao();
  if (!sessao) return { ok: false, error: "Sem sessão ativa" };
  if (sessao.status !== "aberta") return { ok: false, error: "Sessão não está aberta" };
  if (sessao.participantes.length === 0) return { ok: false, error: "Sem participantes" };

  const pool = [...sessao.participantes];
  const vencedores: ParticipanteSessao[] = [];
  const max = Math.min(sessao.maxVencedores, pool.length);

  for (let i = 0; i < max; i++) {
    const idx = Math.floor(Math.random() * (pool.length - i));
    vencedores.push(pool[idx]);
    pool[idx] = pool[pool.length - 1 - i];
  }

  sessao.vencedores = vencedores;
  sessao.status = "sorteada";
  await saveSessao(sessao);
  return { ok: true, sessao };
}

export async function salvarPagamentos(
  pagamentos: ResultadoPagamento[],
): Promise<SessaoGorjeta | null> {
  const sessao = await loadSessao();
  if (!sessao) return null;
  sessao.pagamentos = pagamentos;
  sessao.status = "fechada";
  sessao.fechadaEm = Date.now();
  await saveSessao(sessao);

  const totalEnviado = pagamentos
    .filter(p => p.status === "enviado")
    .reduce((acc) => acc + sessao.valorUnitario, 0);

  const historico = await loadHistorico();
  const item: HistoricoItemGorjeta = {
    id: sessao.id,
    valorUnitario: sessao.valorUnitario,
    totalEnviado,
    pagamentos,
    abertaEm: sessao.abertaEm,
    fechadaEm: sessao.fechadaEm,
  };
  await saveHistorico([item, ...historico]);
  return sessao;
}

export async function fecharSessaoSemPagar(): Promise<void> {
  const sessao = await loadSessao();
  if (!sessao) return;
  sessao.status = "fechada";
  sessao.fechadaEm = Date.now();
  await saveSessao(sessao);
}

export async function limparSessao(): Promise<void> {
  await saveSessao(null);
}

export async function getHistoricoGorjeta(): Promise<HistoricoItemGorjeta[]> {
  return loadHistorico();
}

export function mascarCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

export function formatCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

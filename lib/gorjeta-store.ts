import { dbGet, dbSet } from "./store";

export type TipoChavePix = "cpf" | "telefone" | "email" | "aleatoria";

export interface CadastroGorjeta {
  id: string;
  username: string;
  displayName: string;
  cpf: string;          // campo legado — armazena a chave PIX normalizada
  tipoChave: TipoChavePix;
  cpfTitular?: string;  // CPF do titular da chave (obtido via DICT), para detecção de duplicatas
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
  cpf: string;          // chave PIX normalizada
  tipoChave?: TipoChavePix;
  nomeCompleto: string;
  entradaEm: number;
}

export interface TransacaoGorjeta {
  id: string;
  username: string;
  displayName: string;
  valor: number;
  status: "enviado" | "falhou";
  tipo: "sorteio" | "manual";
  timestamp: number;
  txid?: string;
  e2eid?: string;
  erro?: string;
}

export interface SessaoGorjeta {
  id: string;
  status: "aberta" | "sorteada" | "fechada";
  saldoTotal: number;
  saldoRestante: number;
  valorUnitario: number;
  maxVencedores: number;
  participantes: ParticipanteSessao[];
  vencedores: ParticipanteSessao[];
  transacoes: TransacaoGorjeta[];
  abertaEm: number;
  fechadaEm?: number;
}

export interface HistoricoItemGorjeta {
  id: string;
  saldoTotal: number;
  totalEnviado: number;
  transacoes: TransacaoGorjeta[];
  abertaEm: number;
  fechadaEm: number;
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

const KEY_CADASTROS = "gorjeta:cadastros:v1";
const KEY_SESSAO    = "gorjeta:sessao:v2";
const KEY_HISTORICO = "gorjeta:historico:v2";

function screenshotKey(id: string) { return `gorjeta:screenshot:${id}:v1`; }

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
  } catch { return globalThis.__gorjetaCadastros ?? []; }
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
  } catch { return globalThis.__gorjetaSessao ?? null; }
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
  } catch { return globalThis.__gorjetaHistorico ?? []; }
}

async function saveHistorico(list: HistoricoItemGorjeta[]): Promise<void> {
  const trimmed = list.slice(0, 30);
  globalThis.__gorjetaHistorico = trimmed;
  try { await dbSet(KEY_HISTORICO, JSON.stringify(trimmed)); } catch {}
}

// ─── Cadastros ─────────────────────────────────────────────────────────────

export async function getCadastros(): Promise<CadastroGorjeta[]> { return loadCadastros(); }

export async function getCadastro(username: string): Promise<CadastroGorjeta | null> {
  const list = await loadCadastros();
  return list.find(c => c.username.toLowerCase() === username.toLowerCase()) ?? null;
}

export async function cadastrar(params: {
  username: string; displayName: string;
  tipoChave: TipoChavePix; chave: string;
  cpfTitular?: string;
  nomeCompleto: string; screenshot: string;
}): Promise<{ ok: true; cadastro: CadastroGorjeta } | { ok: false; error: string }> {
  const list = await loadCadastros();
  const existing = list.find(c => c.username.toLowerCase() === params.username.toLowerCase());
  if (existing?.status === "aprovado") return { ok: false, error: "Já aprovado" };
  if (existing?.status === "pendente") return { ok: false, error: "Cadastro já enviado — aguarde aprovação" };

  const chaveNorm = normalizarChave(params.chave, params.tipoChave);
  if (!chaveNorm) {
    const msgs: Record<TipoChavePix, string> = {
      cpf: "CPF inválido",
      telefone: "Telefone inválido — use o formato +5511999999999",
      email: "E-mail inválido",
      aleatoria: "Chave aleatória inválida — deve ser um UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)",
    };
    return { ok: false, error: msgs[params.tipoChave] };
  }

  // Bloqueia mesma chave em contas diferentes
  const chaveDup = list.find(c =>
    c.cpf === chaveNorm &&
    c.username.toLowerCase() !== params.username.toLowerCase() &&
    c.status !== "rejeitado"
  );
  if (chaveDup) return { ok: false, error: "Esta chave PIX já está cadastrada por outro usuário" };

  // Bloqueia mesmo titular (mesmo CPF identificado via DICT) em contas diferentes
  if (params.cpfTitular) {
    const titularDup = list.find(c => {
      if (c.username.toLowerCase() === params.username.toLowerCase()) return false;
      if (c.status === "rejeitado") return false;
      // Checa campo cpfTitular (cadastros novos)
      if (c.cpfTitular && c.cpfTitular === params.cpfTitular) return true;
      // Retrocompatibilidade: cadastros antigos com CPF não têm cpfTitular,
      // mas o próprio campo cpf É o CPF do titular
      const tipo = c.tipoChave ?? "cpf";
      if (tipo === "cpf" && c.cpf === params.cpfTitular) return true;
      return false;
    });
    if (titularDup) return { ok: false, error: "Você já possui um cadastro em outra conta com o mesmo titular bancário" };
  }

  const id = Date.now().toString();
  const cadastro: CadastroGorjeta = {
    id, username: params.username.toLowerCase(), displayName: params.displayName,
    cpf: chaveNorm, tipoChave: params.tipoChave,
    cpfTitular: params.cpfTitular,
    nomeCompleto: params.nomeCompleto.trim(), status: "pendente", criadoEm: Date.now(),
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
  c.status = "aprovado"; c.avaliadoEm = Date.now(); delete c.motivoRejeicao;
  await saveCadastros(list); return c;
}

export async function rejeitarCadastro(id: string, motivo: string): Promise<CadastroGorjeta | null> {
  const list = await loadCadastros();
  const c = list.find(x => x.id === id);
  if (!c) return null;
  c.status = "rejeitado"; c.avaliadoEm = Date.now(); c.motivoRejeicao = motivo || "Não aprovado";
  await saveCadastros(list); return c;
}

export async function editarCpfCadastro(id: string, cpf: string): Promise<CadastroGorjeta | null> {
  const cpfNum = cpf.replace(/\D/g, "");
  if (cpfNum.length !== 11) return null;
  const list = await loadCadastros();
  const c = list.find(x => x.id === id);
  if (!c) return null;
  c.cpf = cpfNum;
  c.tipoChave = "cpf";
  await saveCadastros(list); return c;
}

export async function editarChaveCadastro(id: string, tipoChave: TipoChavePix, chave: string): Promise<CadastroGorjeta | null> {
  const list = await loadCadastros();
  const c = list.find(x => x.id === id);
  if (!c) return null;
  const chaveNorm = normalizarChave(chave, tipoChave);
  if (!chaveNorm) return null;
  c.cpf = chaveNorm;
  c.tipoChave = tipoChave;
  c.cpfTitular = tipoChave === "cpf" ? chaveNorm : undefined;
  await saveCadastros(list); return c;
}

export async function getScreenshot(id: string): Promise<string | null> {
  try { return await dbGet(screenshotKey(id)); } catch { return null; }
}

// ─── Sessão ────────────────────────────────────────────────────────────────

export async function getSessao(): Promise<SessaoGorjeta | null> { return loadSessao(); }

export async function abrirSessao(params: {
  saldoTotal: number;
}): Promise<{ ok: true; sessao: SessaoGorjeta } | { ok: false; error: string }> {
  const atual = await loadSessao();
  if (atual && (atual.status === "aberta" || atual.status === "sorteada")) {
    return { ok: false, error: "Já existe uma sessão ativa" };
  }

  const sessao: SessaoGorjeta = {
    id: Date.now().toString(),
    status: "aberta",
    saldoTotal: Math.max(0.01, params.saldoTotal),
    saldoRestante: Math.max(0.01, params.saldoTotal),
    valorUnitario: 0,
    maxVencedores: 0,
    participantes: [],
    vencedores: [],
    transacoes: [],
    abertaEm: Date.now(),
  };
  await saveSessao(sessao);
  return { ok: true, sessao };
}

export async function entrarSessao(
  username: string, displayName: string, image: string | null,
): Promise<{ ok: boolean; reason?: string }> {
  const sessao = await loadSessao();
  if (!sessao || sessao.status !== "aberta") return { ok: false, reason: "sem sessão aberta" };

  const jaParticipa = sessao.participantes.some(p => p.username.toLowerCase() === username.toLowerCase());
  if (jaParticipa) return { ok: false, reason: "já participa" };

  const cadastros = await loadCadastros();
  const cadastro = cadastros.find(c => c.username.toLowerCase() === username.toLowerCase() && c.status === "aprovado");
  if (!cadastro) return { ok: false, reason: "não cadastrado" };

  sessao.participantes.push({
    username: username.toLowerCase(), displayName, image,
    cpf: cadastro.cpf, tipoChave: cadastro.tipoChave ?? "cpf",
    nomeCompleto: cadastro.nomeCompleto, entradaEm: Date.now(),
  });
  await saveSessao(sessao);
  return { ok: true };
}

export async function sortearGorjeta(params?: {
  valorUnitario?: number; maxVencedores?: number;
}): Promise<{ ok: true; sessao: SessaoGorjeta } | { ok: false; error: string }> {
  const sessao = await loadSessao();
  if (!sessao) return { ok: false, error: "Sem sessão ativa" };
  if (sessao.status === "fechada") return { ok: false, error: "Sessão encerrada" };
  if (sessao.participantes.length === 0) return { ok: false, error: "Sem participantes" };

  if (params?.valorUnitario && params.valorUnitario > 0) sessao.valorUnitario = params.valorUnitario;
  if (params?.maxVencedores && params.maxVencedores > 0) sessao.maxVencedores = params.maxVencedores;

  if (!sessao.valorUnitario || sessao.valorUnitario <= 0) return { ok: false, error: "Defina o valor por vencedor" };
  if (!sessao.maxVencedores || sessao.maxVencedores <= 0) return { ok: false, error: "Defina a quantidade de vencedores" };

  const qtd = Math.min(sessao.maxVencedores, sessao.participantes.length);
  const custo = sessao.valorUnitario * qtd;
  if (custo > sessao.saldoRestante) {
    return { ok: false, error: `Saldo insuficiente. Disponível: R$ ${sessao.saldoRestante.toFixed(2)}, necessário: R$ ${custo.toFixed(2)}` };
  }

  const pool = [...sessao.participantes];
  const vencedores: ParticipanteSessao[] = [];
  for (let i = 0; i < qtd; i++) {
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
  valorUnitario: number,
): Promise<SessaoGorjeta | null> {
  const sessao = await loadSessao();
  if (!sessao) return null;

  for (const p of pagamentos) {
    const t: TransacaoGorjeta = {
      id: `s_${Date.now()}_${Math.random().toString(36).slice(2)}_${p.username}`,
      username: p.username, displayName: p.displayName,
      valor: valorUnitario,
      status: p.status === "enviado" ? "enviado" : "falhou",
      tipo: "sorteio",
      timestamp: Date.now(),
      txid: p.txid, e2eid: p.e2eid, erro: p.erro,
    };
    sessao.transacoes.push(t);
    if (p.status === "enviado") {
      sessao.saldoRestante = Math.max(0, sessao.saldoRestante - valorUnitario);
    }
  }

  sessao.status = "aberta";
  sessao.vencedores = [];
  await saveSessao(sessao);
  return sessao;
}

export async function adicionarParticipanteTeste(
  username: string,
  displayName: string,
  image: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const sessao = await loadSessao();
  if (!sessao || sessao.status === "fechada") return { ok: false, error: "Sem sessão ativa" };
  const uLower = username.toLowerCase().replace(/\s+/g, "_");
  if (sessao.participantes.some(p => p.username === uLower)) return { ok: false, error: "Já participa" };
  sessao.participantes.push({
    username: uLower, displayName, image,
    cpf: "00000000000",
    nomeCompleto: displayName,
    entradaEm: Date.now(),
  });
  await saveSessao(sessao);
  return { ok: true };
}

export async function registrarManual(
  username: string, displayName: string, valor: number,
  result: { status: "enviado" | "falhou"; txid?: string; e2eid?: string; erro?: string },
): Promise<SessaoGorjeta | null> {
  const sessao = await loadSessao();
  if (!sessao) return null;

  const t: TransacaoGorjeta = {
    id: `m_${Date.now()}_${Math.random().toString(36).slice(2)}_${username}`,
    username, displayName, valor,
    status: result.status, tipo: "manual",
    timestamp: Date.now(),
    txid: result.txid, e2eid: result.e2eid, erro: result.erro,
  };
  sessao.transacoes.push(t);
  if (result.status === "enviado") {
    sessao.saldoRestante = Math.max(0, sessao.saldoRestante - valor);
  }
  await saveSessao(sessao);
  return sessao;
}

export async function fecharSessaoSemPagar(): Promise<void> {
  const sessao = await loadSessao();
  if (!sessao) return;

  const totalEnviado = sessao.transacoes
    .filter(t => t.status === "enviado")
    .reduce((acc, t) => acc + t.valor, 0);

  const historico = await loadHistorico();
  await saveHistorico([{
    id: sessao.id,
    saldoTotal: sessao.saldoTotal,
    totalEnviado,
    transacoes: sessao.transacoes,
    abertaEm: sessao.abertaEm,
    fechadaEm: Date.now(),
  }, ...historico]);

  sessao.status = "fechada";
  sessao.fechadaEm = Date.now();
  await saveSessao(sessao);
}

export async function limparSessao(): Promise<void> { await saveSessao(null); }

export async function getHistoricoGorjeta(): Promise<HistoricoItemGorjeta[]> { return loadHistorico(); }

export async function deletarCadastro(id: string): Promise<boolean> {
  const list = await loadCadastros();
  const idx = list.findIndex(x => x.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  await saveCadastros(list);
  return true;
}

export async function limparHistorico(): Promise<void> {
  await saveHistorico([]);
}

// ─── Validação & Normalização ──────────────────────────────────────────────

function validarCpf(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +d[i] * (10 - i);
  let r = (s * 10) % 11; if (r >= 10) r = 0;
  if (r !== +d[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +d[i] * (11 - i);
  r = (s * 10) % 11; if (r >= 10) r = 0;
  return r === +d[10];
}

export function normalizarChave(chave: string, tipo: TipoChavePix): string | null {
  switch (tipo) {
    case "cpf": {
      const d = chave.replace(/\D/g, "");
      return validarCpf(d) ? d : null;
    }
    case "telefone": {
      const d = chave.replace(/\D/g, "");
      if (d.length === 11) return `+55${d}`;
      if (d.length === 13 && d.startsWith("55")) return `+${d}`;
      if (d.length === 12 && d.startsWith("55")) return `+${d}`;
      return null;
    }
    case "email": {
      const e = chave.trim().toLowerCase();
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
    }
    case "aleatoria": {
      const k = chave.trim().toLowerCase();
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(k) ? k : null;
    }
  }
}

export function mascarChave(chave: string, tipo?: TipoChavePix): string {
  const t = tipo ?? "cpf";
  switch (t) {
    case "cpf": {
      const d = chave.replace(/\D/g, "");
      if (d.length !== 11) return chave;
      return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
    }
    case "telefone": {
      const d = chave.replace(/\D/g, "");
      if (d.length < 4) return "***";
      return `+55 (${d.slice(2, 4)}) *****-${d.slice(-4)}`;
    }
    case "email": {
      const [local, domain] = chave.split("@");
      if (!domain) return "***@***";
      return `${local[0] ?? "*"}***@${domain}`;
    }
    case "aleatoria": {
      if (chave.length < 8) return "****";
      return `${chave.slice(0, 8)}-****-****-****-${chave.slice(-4)}`;
    }
  }
}

export function mascarCpf(cpf: string): string { return mascarChave(cpf, "cpf"); }

export function formatCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

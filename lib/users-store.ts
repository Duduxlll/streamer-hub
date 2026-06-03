import { dbGet, dbSet } from "./store";
import { hashPassword, verifyPassword } from "./password";
import { randomUUID } from "node:crypto";

export type UserStatus = "ativo" | "banido" | "suspenso";

export interface SiteUser {
  twitchId: string;
  twitchLogin: string;
  displayName: string;
  image: string | null;
  status: UserStatus;
  // ── Login próprio (usuário + senha) ──────────────────────────────
  passwordHash?: string;
  nomeCompleto?: string;
  cpf?: string;
  email?: string;
  isAdmin?: boolean;
  // ─────────────────────────────────────────────────────────────────
  banMotivo?: string;
  banEm?: number;
  banPor?: string;
  suspAte?: number;
  suspMotivo?: string;
  suspPor?: string;
  ips: string[];
  bannedIps?: string[];
  primeiroLogin: number;
  ultimoLogin: number;
  totalLogins: number;
}

const KEY_USERS         = "admin:users:v1";
const KEY_BANNED_IPS    = "admin:banned-ips:v1";
const KEY_BANNED_LOGINS = "admin:banned-logins:v1";

async function loadUsers(): Promise<SiteUser[]> {
  try {
    const raw = await dbGet(KEY_USERS);
    if (!raw) return [];
    return JSON.parse(raw) as SiteUser[];
  } catch { return []; }
}

async function saveUsers(list: SiteUser[]): Promise<void> {
  await dbSet(KEY_USERS, JSON.stringify(list));
}

// Reconstrói as listas de bloqueio: IPs (de banidos) e logins (banidos + suspensos ativos).
// O proxy consulta essas listas para bloquear o acesso em toda requisição.
async function rebuildBlocklists(list: SiteUser[]): Promise<void> {
  const ips    = new Set<string>();
  // ate = 0 → bloqueio permanente (banido); ate = timestamp → suspensão até essa data
  const logins: { login: string; ate: number }[] = [];
  const now    = Date.now();
  for (const u of list) {
    const banido        = u.status === "banido";
    const suspensoAtivo = u.status === "suspenso" && (u.suspAte ?? 0) > now;
    if (banido) {
      logins.push({ login: u.twitchLogin.toLowerCase(), ate: 0 });
      for (const ip of u.bannedIps ?? []) ips.add(ip);
    } else if (suspensoAtivo) {
      logins.push({ login: u.twitchLogin.toLowerCase(), ate: u.suspAte! });
    }
  }
  await dbSet(KEY_BANNED_IPS,    JSON.stringify([...ips]));
  await dbSet(KEY_BANNED_LOGINS, JSON.stringify(logins));
}

export async function getUsers(): Promise<SiteUser[]> {
  return loadUsers();
}

export async function upsertUser(params: {
  twitchId: string;
  twitchLogin: string;
  displayName: string;
  image: string | null;
  ip?: string;
}): Promise<SiteUser> {
  const list = await loadUsers();
  const idx  = list.findIndex(u => u.twitchId === params.twitchId);

  if (idx >= 0) {
    const u = list[idx];
    u.twitchLogin  = params.twitchLogin.toLowerCase();
    u.displayName  = params.displayName;
    u.image        = params.image;
    u.ultimoLogin  = Date.now();
    u.totalLogins  = (u.totalLogins ?? 0) + 1;
    if (params.ip && !u.ips.includes(params.ip)) {
      u.ips = [params.ip, ...u.ips].slice(0, 10);
    }
    await saveUsers(list);
    return u;
  }

  const newUser: SiteUser = {
    twitchId:      params.twitchId,
    twitchLogin:   params.twitchLogin.toLowerCase(),
    displayName:   params.displayName,
    image:         params.image,
    status:        "ativo",
    ips:           params.ip ? [params.ip] : [],
    primeiroLogin: Date.now(),
    ultimoLogin:   Date.now(),
    totalLogins:   1,
  };
  await saveUsers([newUser, ...list]);
  return newUser;
}

export async function isBanned(twitchLogin: string): Promise<boolean> {
  const list = await loadUsers();
  const u = list.find(u => u.twitchLogin === twitchLogin.toLowerCase());
  if (!u) return false;
  if (u.status === "banido") return true;
  if (u.status === "suspenso" && u.suspAte && u.suspAte > Date.now()) return true;
  // Levanta suspensão automaticamente quando expirada
  if (u.status === "suspenso" && u.suspAte && u.suspAte <= Date.now()) {
    u.status = "ativo";
    delete u.suspAte; delete u.suspMotivo; delete u.suspPor;
    await saveUsers(list);
  }
  return false;
}

export async function banUser(
  twitchLogin: string, motivo: string, adminLogin: string,
): Promise<boolean> {
  const list = await loadUsers();
  const u = list.find(u => u.twitchLogin === twitchLogin.toLowerCase());
  if (!u) return false;
  u.status    = "banido";
  u.banMotivo = motivo;
  u.banEm     = Date.now();
  u.banPor    = adminLogin;
  u.bannedIps = [...new Set([...(u.bannedIps ?? []), ...u.ips])];
  await saveUsers(list);
  await rebuildBlocklists(list);
  return true;
}

export async function desbanirUser(twitchLogin: string): Promise<boolean> {
  const list = await loadUsers();
  const u = list.find(u => u.twitchLogin === twitchLogin.toLowerCase());
  if (!u) return false;
  u.status = "ativo";
  u.bannedIps = [];
  delete u.banMotivo; delete u.banEm; delete u.banPor;
  await saveUsers(list);
  await rebuildBlocklists(list);
  return true;
}

export async function suspenderUser(
  twitchLogin: string, ate: number, motivo: string, adminLogin: string,
): Promise<boolean> {
  const list = await loadUsers();
  const u = list.find(u => u.twitchLogin === twitchLogin.toLowerCase());
  if (!u) return false;
  u.status     = "suspenso";
  u.suspAte    = ate;
  u.suspMotivo = motivo;
  u.suspPor    = adminLogin;
  await saveUsers(list);
  await rebuildBlocklists(list);
  return true;
}

export async function dessuspenderUser(twitchLogin: string): Promise<boolean> {
  const list = await loadUsers();
  const u = list.find(u => u.twitchLogin === twitchLogin.toLowerCase());
  if (!u) return false;
  u.status = "ativo";
  delete u.suspAte; delete u.suspMotivo; delete u.suspPor;
  await saveUsers(list);
  await rebuildBlocklists(list);
  return true;
}

export async function getBannedIps(): Promise<string[]> {
  try {
    const raw = await dbGet(KEY_BANNED_IPS);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

// ─── Login próprio (usuário + senha) ──────────────────────────────────────────

export async function getUserByLogin(login: string): Promise<SiteUser | null> {
  const list = await loadUsers();
  return list.find(u => u.twitchLogin === login.toLowerCase()) ?? null;
}

export type CreateUserResult =
  | { ok: true; user: SiteUser }
  | { ok: false; error: string };

/**
 * Cria uma nova conta com login próprio.
 * `twitchLogin` é o nome da Twitch (usuário de login) e também casa com o chat do bot.
 */
export async function createUser(params: {
  twitchLogin: string;
  nomeCompleto: string;
  cpf: string;
  email: string;
  senha: string;
  isAdmin?: boolean;
  ip?: string;
}): Promise<CreateUserResult> {
  const login = params.twitchLogin.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,25}$/.test(login)) {
    return { ok: false, error: "Nome da Twitch inválido (use letras, números e _ )" };
  }
  if (params.senha.length < 6) {
    return { ok: false, error: "A senha precisa ter no mínimo 6 caracteres" };
  }

  const list = await loadUsers();
  const existing = list.find(u => u.twitchLogin === login);
  if (existing && existing.passwordHash) {
    return { ok: false, error: "Esse nome da Twitch já está cadastrado" };
  }
  // E-mail único (entre contas que têm senha)
  const emailNorm = params.email.trim().toLowerCase();
  if (emailNorm && list.some(u => u.email === emailNorm && u.twitchLogin !== login)) {
    return { ok: false, error: "Esse e-mail já está cadastrado" };
  }

  const now = Date.now();
  const passwordHash = hashPassword(params.senha);

  if (existing) {
    // Conta já existia (ex.: criada por um login antigo) — anexa as credenciais.
    existing.passwordHash = passwordHash;
    existing.nomeCompleto = params.nomeCompleto.trim();
    existing.cpf          = params.cpf.replace(/\D/g, "");
    existing.email        = emailNorm;
    existing.displayName  = existing.displayName || params.twitchLogin;
    if (params.isAdmin) existing.isAdmin = true;
    if (params.ip && !existing.ips.includes(params.ip)) existing.ips = [params.ip, ...existing.ips].slice(0, 10);
    await saveUsers(list);
    return { ok: true, user: existing };
  }

  const user: SiteUser = {
    twitchId:      randomUUID(),
    twitchLogin:   login,
    displayName:   params.twitchLogin,
    image:         null,
    status:        "ativo",
    passwordHash,
    nomeCompleto:  params.nomeCompleto.trim(),
    cpf:           params.cpf.replace(/\D/g, ""),
    email:         emailNorm,
    isAdmin:       params.isAdmin ? true : undefined,
    ips:           params.ip ? [params.ip] : [],
    primeiroLogin: now,
    ultimoLogin:   now,
    totalLogins:   0,
  };
  await saveUsers([user, ...list]);
  return { ok: true, user };
}

/** Valida usuário + senha. Retorna o usuário se as credenciais conferem. */
export async function verifyCredentials(login: string, senha: string): Promise<SiteUser | null> {
  const u = await getUserByLogin(login);
  if (!u || !u.passwordHash) return null;
  if (!verifyPassword(senha, u.passwordHash)) return null;
  return u;
}

/** Registra um login bem-sucedido (contador + data + IP). */
export async function touchLogin(login: string, ip?: string): Promise<void> {
  const list = await loadUsers();
  const u = list.find(x => x.twitchLogin === login.toLowerCase());
  if (!u) return;
  u.ultimoLogin = Date.now();
  u.totalLogins = (u.totalLogins ?? 0) + 1;
  if (ip && !u.ips.includes(ip)) u.ips = [ip, ...u.ips].slice(0, 10);
  await saveUsers(list);
}

/** Define uma nova senha (usado pelo admin para resetar). */
export async function setPassword(login: string, novaSenha: string): Promise<boolean> {
  if (novaSenha.length < 6) return false;
  const list = await loadUsers();
  const u = list.find(x => x.twitchLogin === login.toLowerCase());
  if (!u) return false;
  u.passwordHash = hashPassword(novaSenha);
  await saveUsers(list);
  return true;
}


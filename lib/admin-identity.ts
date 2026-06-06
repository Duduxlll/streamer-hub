import type { Session } from "next-auth";
import { createHmac, timingSafeEqual } from "node:crypto";
import { isAdmin } from "./admins";
import { dbGet, dbSet } from "./store";
import { getUserByLogin } from "./users-store";

const ADMIN_IDENTITIES_KEY = "admin:identity-locks:v1";

interface AdminIdentity {
  login: string;
  emailHash: string;
  cpfHash: string;
  lockedAt: number;
}

type IdentityResult =
  | { ok: true; created: boolean }
  | { ok: false; reason: string };

function normalizeLogin(login: string | null | undefined): string {
  return String(login ?? "").trim().toLowerCase();
}

function normalizeEmail(email: string | null | undefined): string {
  return String(email ?? "").trim().toLowerCase();
}

function normalizeCpf(cpf: string | null | undefined): string {
  return String(cpf ?? "").replace(/\D/g, "");
}

function secretKey(): string | null {
  const secret = process.env.AUTH_SECRET;
  return secret && secret.length >= 24 ? secret : null;
}

function hmacIdentity(kind: "email" | "cpf", value: string): string | null {
  const secret = secretKey();
  if (!secret || !value) return null;
  return createHmac("sha256", secret).update(`${kind}:${value}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

async function loadIdentities(): Promise<Record<string, AdminIdentity>> {
  const raw = await dbGet(ADMIN_IDENTITIES_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, AdminIdentity>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function saveIdentities(identities: Record<string, AdminIdentity>): Promise<void> {
  await dbSet(ADMIN_IDENTITIES_KEY, JSON.stringify(identities));
}

export async function ensureAdminIdentity(
  twitchLogin: string | null | undefined,
  email: string | null | undefined,
  cpf: string | null | undefined,
): Promise<IdentityResult> {
  const login = normalizeLogin(twitchLogin);
  if (!isAdmin(login)) return { ok: false, reason: "login não está na lista de admins" };

  const emailNorm = normalizeEmail(email);
  const cpfNorm = normalizeCpf(cpf);
  const emailHash = hmacIdentity("email", emailNorm);
  const cpfHash = hmacIdentity("cpf", cpfNorm);

  if (!emailHash || !cpfHash) {
    return { ok: false, reason: "admin sem e-mail/CPF válido ou AUTH_SECRET fraco" };
  }

  const identities = await loadIdentities();
  const existing = identities[login];

  if (!existing) {
    identities[login] = {
      login,
      emailHash,
      cpfHash,
      lockedAt: Date.now(),
    };
    await saveIdentities(identities);
    return { ok: true, created: true };
  }

  if (safeEqual(existing.emailHash, emailHash) && safeEqual(existing.cpfHash, cpfHash)) {
    return { ok: true, created: false };
  }

  return { ok: false, reason: "identidade admin não confere com e-mail/CPF travados" };
}

export async function isVerifiedAdminSession(session: Session | null | undefined): Promise<boolean> {
  const login = normalizeLogin(session?.user?.twitchLogin);
  if (!login || !isAdmin(login)) return false;

  const user = await getUserByLogin(login);
  if (!user || user.status !== "ativo" || !user.passwordHash) return false;

  const sessionEmail = normalizeEmail(session?.user?.email);
  if (sessionEmail && normalizeEmail(user.email) !== sessionEmail) return false;

  const result = await ensureAdminIdentity(login, user.email, user.cpf);
  return result.ok;
}

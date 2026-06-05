import { dbGet, dbSet } from "./store";
import { scryptSync, randomBytes, randomInt, timingSafeEqual } from "node:crypto";


interface ResetEntry {
  codeHash: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
}

const TTL_MS       = 15 * 60 * 1000;
const COOLDOWN_MS  = 60 * 1000;
const MAX_ATTEMPTS = 5;

function key(email: string): string {
  return `pwreset:${email.trim().toLowerCase()}:v1`;
}

function hashCode(code: string, salt: string): string {
  return scryptSync(code, salt, 32).toString("hex");
}


export async function createResetCode(email: string): Promise<string | null> {
  const existingRaw = await dbGet(key(email));
  if (existingRaw) {
    try {
      const ex = JSON.parse(existingRaw) as ResetEntry;
      if (Date.now() - ex.createdAt < COOLDOWN_MS) return null;
    } catch {  }
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const salt = randomBytes(8).toString("hex");
  const entry: ResetEntry = {
    codeHash:  `${salt}$${hashCode(code, salt)}`,
    expiresAt: Date.now() + TTL_MS,
    attempts:  0,
    createdAt: Date.now(),
  };
  await dbSet(key(email), JSON.stringify(entry));
  return code;
}


export async function verifyResetCode(
  email: string, code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const raw = await dbGet(key(email));
  if (!raw) return { ok: false, error: "Código inválido ou expirado. Solicite um novo." };

  let entry: ResetEntry;
  try { entry = JSON.parse(raw) as ResetEntry; }
  catch { await dbSet(key(email), null); return { ok: false, error: "Código inválido. Solicite um novo." }; }

  if (Date.now() > entry.expiresAt) {
    await dbSet(key(email), null);
    return { ok: false, error: "Código expirado. Solicite um novo." };
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    await dbSet(key(email), null);
    return { ok: false, error: "Muitas tentativas. Solicite um novo código." };
  }

  const [salt, hash] = entry.codeHash.split("$");
  const calc = hashCode(code.trim(), salt);
  const a = Buffer.from(calc, "hex");
  const b = Buffer.from(hash, "hex");
  const match = a.length === b.length && timingSafeEqual(a, b);

  if (!match) {
    entry.attempts += 1;
    await dbSet(key(email), JSON.stringify(entry));
    const restantes = MAX_ATTEMPTS - entry.attempts;
    return { ok: false, error: restantes > 0 ? `Código incorreto. ${restantes} tentativa(s) restante(s).` : "Muitas tentativas. Solicite um novo código." };
  }

  await dbSet(key(email), null);
  return { ok: true };
}

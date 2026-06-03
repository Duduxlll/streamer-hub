import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

// Hash de senha com scrypt nativo do Node — sem dependência externa (evita binários nativos).
// Formato armazenado: "scrypt$<salt hex>$<hash hex>"
const SCRYPT_KEYLEN = 64;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(plain: string, stored: string | undefined | null): boolean {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  try {
    const calc = scryptSync(plain, salt, SCRYPT_KEYLEN);
    const orig = Buffer.from(hash, "hex");
    if (calc.length !== orig.length) return false;
    return timingSafeEqual(calc, orig);
  } catch {
    return false;
  }
}

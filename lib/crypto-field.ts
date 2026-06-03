import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Criptografia de campo (AES-256-GCM) para dados sensíveis no banco — ex.: CPF / chave PIX.
// Usa a mesma derivação de chave das credenciais (AUTH_SECRET).
// Formato: "enc1:<iv>:<tag>:<data>" (base64url). Valores sem esse prefixo são tratados
// como texto puro (compatibilidade com dados antigos) — e re-gravados cifrados no próximo save.

const PREFIX = "enc1:";

function getKey(): Buffer {
  return createHash("sha256").update(process.env.AUTH_SECRET ?? "").digest();
}

export function encField(value: string | undefined | null): string {
  if (!value) return "";
  if (value.startsWith(PREFIX)) return value; // já cifrado (idempotente)
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${data.toString("base64url")}`;
}

export function decField(value: string | undefined | null): string {
  if (!value) return "";
  if (!value.startsWith(PREFIX)) return value; // texto puro legado
  try {
    const [, iv64, tag64, data64] = value.split(":");
    const d = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv64, "base64url"));
    d.setAuthTag(Buffer.from(tag64, "base64url"));
    return d.update(Buffer.from(data64, "base64url")).toString("utf8") + d.final("utf8");
  } catch {
    return "";
  }
}

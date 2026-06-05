import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";


const PREFIX = "enc1:";

function getKey(): Buffer {
  return createHash("sha256").update(process.env.AUTH_SECRET ?? "").digest();
}

export function encField(value: string | undefined | null): string {
  if (!value) return "";
  if (value.startsWith(PREFIX)) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${data.toString("base64url")}`;
}

export function decField(value: string | undefined | null): string {
  if (!value) return "";
  if (!value.startsWith(PREFIX)) return value;
  try {
    const [, iv64, tag64, data64] = value.split(":");
    const d = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv64, "base64url"));
    d.setAuthTag(Buffer.from(tag64, "base64url"));
    return d.update(Buffer.from(data64, "base64url")).toString("utf8") + d.final("utf8");
  } catch {
    return "";
  }
}

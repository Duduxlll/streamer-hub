import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { dbGet, dbSet } from "./store";

export type WebhookAuthMode = "none" | "bearer" | "hmac" | "ambos";

export interface Credentials {
  livepix: {
    clientId: string;
    clientSecret: string;
    webhookSecret: string;
  };
  ggpix: {
    apiKey: string;
    webhookAuthMode: WebhookAuthMode;
    bearerToken: string;
    hmacSecret: string;
  };
}

const CREDS_KEY = "config:credentials:v1";

function getKey(): Buffer {
  return createHash("sha256").update(process.env.AUTH_SECRET ?? "").digest();
}

function enc(s: string): string {
  if (!s) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const data = Buffer.concat([cipher.update(s, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}:${tag.toString("base64url")}:${data.toString("base64url")}`;
}

function dec(s: string): string {
  if (!s) return "";
  try {
    const parts = s.split(":");
    if (parts.length !== 3) return "";
    const [iv64, tag64, data64] = parts;
    const d = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv64, "base64url"));
    d.setAuthTag(Buffer.from(tag64, "base64url"));
    return d.update(Buffer.from(data64, "base64url")).toString("utf8") + d.final("utf8");
  } catch {
    return "";
  }
}

interface RawCreds {
  livepix?: { clientId?: string; clientSecret?: string; webhookSecret?: string };
  ggpix?: { apiKey?: string; webhookAuthMode?: WebhookAuthMode; bearerToken?: string; hmacSecret?: string };
}

function toRaw(c: Credentials): RawCreds {
  return {
    livepix: {
      clientId:      enc(c.livepix.clientId),
      clientSecret:  enc(c.livepix.clientSecret),
      webhookSecret: enc(c.livepix.webhookSecret),
    },
    ggpix: {
      apiKey:          enc(c.ggpix.apiKey),
      webhookAuthMode: c.ggpix.webhookAuthMode,
      bearerToken:     enc(c.ggpix.bearerToken),
      hmacSecret:      enc(c.ggpix.hmacSecret),
    },
  };
}

function fromRaw(raw: RawCreds): Credentials {
  return {
    livepix: {
      clientId:      dec(raw.livepix?.clientId      ?? ""),
      clientSecret:  dec(raw.livepix?.clientSecret  ?? ""),
      webhookSecret: dec(raw.livepix?.webhookSecret ?? ""),
    },
    ggpix: {
      apiKey:          dec(raw.ggpix?.apiKey      ?? ""),
      webhookAuthMode: raw.ggpix?.webhookAuthMode ?? "none",
      bearerToken:     dec(raw.ggpix?.bearerToken ?? ""),
      hmacSecret:      dec(raw.ggpix?.hmacSecret  ?? ""),
    },
  };
}

const EMPTY: Credentials = {
  livepix: { clientId: "", clientSecret: "", webhookSecret: "" },
  ggpix:   { apiKey: "", webhookAuthMode: "none", bearerToken: "", hmacSecret: "" },
};

export async function getCredentials(): Promise<Credentials> {
  try {
    const raw = await dbGet(CREDS_KEY);
    if (!raw) return { ...EMPTY, livepix: { ...EMPTY.livepix }, ggpix: { ...EMPTY.ggpix } };
    return fromRaw(JSON.parse(raw) as RawCreds);
  } catch {
    return { ...EMPTY, livepix: { ...EMPTY.livepix }, ggpix: { ...EMPTY.ggpix } };
  }
}

export async function patchLivePix(patch: Partial<Credentials["livepix"]>): Promise<void> {
  const creds = await getCredentials();
  const merged: Credentials = {
    ...creds,
    livepix: { ...creds.livepix, ...patch },
  };
  await dbSet(CREDS_KEY, JSON.stringify(toRaw(merged)));
}

export async function patchGGPix(patch: Partial<Credentials["ggpix"]>): Promise<void> {
  const creds = await getCredentials();
  const merged: Credentials = {
    ...creds,
    ggpix: { ...creds.ggpix, ...patch },
  };
  await dbSet(CREDS_KEY, JSON.stringify(toRaw(merged)));
}

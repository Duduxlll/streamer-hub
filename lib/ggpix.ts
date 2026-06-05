import type { TipoChavePix } from "./gorjeta-store";
import { getCredentials } from "./credentials";
import { dbGet, dbSet } from "./store";
import type { Credentials } from "./credentials";

const BASE_URL = "https://ggpixapi.com/api/v1";
const WEBHOOK_STATUS_KEY = "ggpix:webhook:last-status:v1";

export type GGPixWebhookStatus = {
  ok: boolean;
  status: "received" | "auth_failed" | "parse_error";
  mode: string;
  message: string;
  checkedAt: number;
  bearerOk?: boolean;
  hmacOk?: boolean;
};

async function getApiKey(): Promise<string> {
  const creds = await getCredentials();
  if (creds.ggpix.apiKey) return creds.ggpix.apiKey;
  if (process.env.GGPIX_API_KEY) return process.env.GGPIX_API_KEY;
  throw new Error("GGPIX_API_KEY não configurada");
}

async function getApiKeyOrNull(): Promise<string | null> {
  const creds = await getCredentials();
  return creds.ggpix.apiKey || process.env.GGPIX_API_KEY || null;
}

export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  const apiKey = await getApiKeyOrNull();
  if (!apiKey) return { ok: false, error: "API Key não preenchida" };
  try {
    const res = await fetch(`${BASE_URL}/balance`, {
      headers: { "X-API-Key": apiKey },
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "O GGPix recusou a API Key (inválida ou sem permissão)" };
    }
    if (res.ok) return { ok: true };

    if (res.status === 404) return { ok: true };
    return { ok: false, error: `O GGPix respondeu com erro (HTTP ${res.status})` };
  } catch {
    return { ok: false, error: "Não foi possível conectar ao GGPix" };
  }
}

export function getGgpixWebhookAuthIssue(creds: Credentials): string | null {
  const mode = creds.ggpix.webhookAuthMode;
  if (mode === "none") return null;
  if (mode === "bearer" && !creds.ggpix.bearerToken) return "Bearer Token do webhook não preenchido";
  if (mode === "hmac" && !creds.ggpix.hmacSecret) return "HMAC Secret do webhook não preenchido";
  if (mode === "ambos" && !creds.ggpix.bearerToken && !creds.ggpix.hmacSecret) return "Bearer Token e HMAC Secret do webhook não preenchidos";
  if (mode === "ambos" && !creds.ggpix.bearerToken) return "Bearer Token do webhook não preenchido";
  if (mode === "ambos" && !creds.ggpix.hmacSecret) return "HMAC Secret do webhook não preenchido";
  return null;
}

export async function getGgpixServerIp(): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json() as { ip?: string };
    return data.ip ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getGgpixWebhookStatus(): Promise<GGPixWebhookStatus | null> {
  try {
    const raw = await dbGet(WEBHOOK_STATUS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GGPixWebhookStatus;
  } catch {
    return null;
  }
}

export async function setGgpixWebhookStatus(status: GGPixWebhookStatus): Promise<void> {
  await dbSet(WEBHOOK_STATUS_KEY, JSON.stringify(status));
}

export async function clearGgpixWebhookStatus(): Promise<void> {
  await dbSet(WEBHOOK_STATUS_KEY, null);
}

function explainGgpixFailure(status: number, parsed: { error?: string; message?: string; clientIp?: string } | null, fallback: string): string {
  const raw = `${parsed?.error ?? ""} ${parsed?.message ?? ""} ${fallback}`.toLowerCase();
  const clientIp = parsed?.clientIp ? ` IP detectado: ${parsed.clientIp}.` : "";

  if (status === 403 && raw.includes("ip whitelist")) {
    return `IP do servidor não liberado na GGPix.${clientIp} Copie o IP em Admin > Configurações > GGPix > IP do servidor e cole em Credenciais e Webhooks > IPs Permitidos.`;
  }

  if (status === 401 || raw.includes("api key") || raw.includes("unauthorized") || raw.includes("inválida") || raw.includes("invalida")) {
    return "A GGPix recusou a API Key ou as permissões da conta. Confira a API Key no painel Merchant e salve novamente em Admin > Configurações.";
  }

  if (raw.includes("saldo") || raw.includes("balance")) {
    return "Saldo insuficiente ou indisponível na GGPix. Confira o saldo disponível para PIX Out e lembre das taxas.";
  }

  if (raw.includes("pix") && (raw.includes("chave") || raw.includes("key") || raw.includes("document"))) {
    return "A chave PIX foi recusada pela GGPix. Confira se a chave e o tipo estão corretos no cadastro da pessoa.";
  }

  if (status === 400 && raw.includes("processar transação")) {
    return "A GGPix não conseguiu processar o PIX agora. Confira se o PIX Out está liberado, se há saldo disponível e tente novamente em alguns instantes.";
  }

  const msg = parsed?.message ?? parsed?.error ?? fallback;
  return `GGPix recusou o envio (${status}): ${msg}`;
}

const TIPO_MAP: Record<TipoChavePix, string> = {
  cpf:      "CPF",
  telefone: "PHONE",
  email:    "EMAIL",
  aleatoria: "EVP",
};

export async function enviarPix(
  pixKey: string,
  pixKeyType: TipoChavePix,
  valorReais: number,
  externalId: string,
): Promise<{ id: string; status: string }> {
  const apiKey = await getApiKey();
  const amountCents = Math.round(valorReais * 100);

  console.log(`[ggpix/enviar] pixKey="${pixKey}" tipo="${pixKeyType}" valor=R$${valorReais.toFixed(2)} externalId=${externalId}`);

  const res = await fetch(`${BASE_URL}/pix/out`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      amountCents,
      pixKey,
      pixKeyType: TIPO_MAP[pixKeyType],
      externalId,
    }),
  });

  const text = await res.text();
  console.log(`[ggpix/enviar] status=${res.status} response=${text}`);

  if (!res.ok) {
    let parsed: { error?: string; message?: string; clientIp?: string } | null = null;
    try { parsed = JSON.parse(text) as { error?: string; message?: string; clientIp?: string }; } catch {  }
    throw new Error(explainGgpixFailure(res.status, parsed, text));
  }

  return JSON.parse(text) as { id: string; status: string };
}

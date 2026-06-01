import { getCredentials } from "./credentials";

interface TokenCache {
  access_token: string;
  expires_at: number;
}

declare global {
  var __livepix_token: TokenCache | undefined;
}

async function getClientIdAndSecret(): Promise<{ clientId: string; clientSecret: string }> {
  // banco tem prioridade — configurado via UI sobrepõe o env do Render
  const creds = await getCredentials();
  if (creds.livepix.clientId && creds.livepix.clientSecret) {
    return { clientId: creds.livepix.clientId, clientSecret: creds.livepix.clientSecret };
  }
  // fallback para env (deployments antigos / antes de configurar pela UI)
  return {
    clientId:     process.env.LIVEPIX_CLIENT_ID     ?? "",
    clientSecret: process.env.LIVEPIX_CLIENT_SECRET ?? "",
  };
}

export async function isConfigured(): Promise<boolean> {
  const creds = await getCredentials();
  if (creds.livepix.clientId && creds.livepix.clientSecret) return true;
  return !!(process.env.LIVEPIX_CLIENT_ID && process.env.LIVEPIX_CLIENT_SECRET);
}

async function getClientToken(): Promise<string> {
  const cached = globalThis.__livepix_token;
  if (cached && cached.expires_at > Date.now() + 60_000) {
    return cached.access_token;
  }

  const { clientId, clientSecret } = await getClientIdAndSecret();

  if (!clientId || !clientSecret) {
    throw new Error("LIVEPIX_CLIENT_ID ou LIVEPIX_CLIENT_SECRET não configurados");
  }

  const res = await fetch("https://oauth.livepix.gg/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "client_credentials",
      client_id:     clientId,
      client_secret: clientSecret,
      scope:         "messages:read",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[livepix] ❌ Falha ao obter token OAuth: HTTP ${res.status} — ${text}`);
    throw new Error(`LivePix auth ${res.status}: ${text}`);
  }

  const data = await res.json();
  globalThis.__livepix_token = {
    access_token: data.access_token,
    expires_at:   Date.now() + (data.expires_in ?? 3600) * 1000,
  };

  return globalThis.__livepix_token.access_token;
}

export interface LivePixMessage {
  id: string;
  username: string;
  message: string;
  amount: number;
  currency: string;
  reference: string;
  createdAt: string;
}

export async function getMessage(messageId: string): Promise<LivePixMessage> {
  const token = await getClientToken();
  const res = await fetch(`https://api.livepix.gg/v2/messages/${messageId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[livepix] ❌ getMessage ${messageId} falhou: HTTP ${res.status} — ${body}`);
    throw new Error(`LivePix getMessage ${res.status}: ${body}`);
  }
  const json = await res.json();
  const msg: LivePixMessage = json.data ?? json;
  return msg;
}

export async function getWebhookSecret(): Promise<string> {
  // banco tem prioridade — configurado via UI sobrepõe o env do Render
  const creds = await getCredentials();
  if (creds.livepix.webhookSecret) return creds.livepix.webhookSecret;
  return process.env.LIVEPIX_WEBHOOK_SECRET ?? "";
}

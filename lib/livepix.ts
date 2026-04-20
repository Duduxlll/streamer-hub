/* ── LivePix API integration ─────────────────────────────────
   Docs: https://docs.livepix.gg/api
   Webhook payload: { userId, clientId, event, resource: { id, type, reference } }
   Sender + message: GET /v2/messages/{id}
────────────────────────────────────────────────────────────── */

import { getLivePixUserToken, setLivePixUserToken, type LivePixUserToken } from "@/lib/store";

interface TokenCache {
  access_token: string;
  expires_at: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __livepix_token: TokenCache | undefined;
}

export function isConfigured(): boolean {
  return !!(process.env.LIVEPIX_CLIENT_ID && process.env.LIVEPIX_CLIENT_SECRET);
}

async function refreshUserToken(refreshToken: string): Promise<LivePixUserToken | null> {
  const res = await fetch("https://oauth.livepix.gg/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: refreshToken,
      client_id:     process.env.LIVEPIX_CLIENT_ID     ?? "",
      client_secret: process.env.LIVEPIX_CLIENT_SECRET ?? "",
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  const t: LivePixUserToken = {
    access_token:  data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
    expires_at:    Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  await setLivePixUserToken(t);
  return t;
}

async function getUserToken(): Promise<string | null> {
  let t = await getLivePixUserToken();
  if (!t) return null;
  if (t.expires_at < Date.now() + 60_000) {
    t = await refreshUserToken(t.refresh_token);
    if (!t) return null;
  }
  return t.access_token;
}

async function getClientToken(): Promise<string> {
  const cached = globalThis.__livepix_token;
  if (cached && cached.expires_at > Date.now() + 60_000) {
    return cached.access_token;
  }

  const res = await fetch("https://oauth.livepix.gg/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "client_credentials",
      client_id:     process.env.LIVEPIX_CLIENT_ID     ?? "",
      client_secret: process.env.LIVEPIX_CLIENT_SECRET ?? "",
      audience:      "https://api.livepix.gg",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
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
  amount: number;     // em centavos (ex: 5000 = R$50,00)
  currency: string;
  reference: string;
  createdAt: string;
}

async function fetchWithAuth(url: string, label: string): Promise<Response> {
  // Tenta 1: user OAuth Bearer token
  const userToken = await getUserToken();
  if (userToken) {
    console.log(`🔐 ${label} tentando user-oauth...`);
    const r1 = await fetch(url, { headers: { Authorization: `Bearer ${userToken}` }, cache: "no-store" });
    if (r1.ok) return r1;
    console.log(`⚠️ user-oauth falhou: ${r1.status} | WWW-Auth: ${r1.headers.get("www-authenticate") ?? "–"}`);
  }

  // Tenta 2: client_credentials Bearer token
  try {
    const ccToken = await getClientToken();
    console.log(`🔐 ${label} tentando client-credentials...`);
    const r2 = await fetch(url, { headers: { Authorization: `Bearer ${ccToken}` }, cache: "no-store" });
    if (r2.ok) return r2;
    console.log(`⚠️ client-credentials falhou: ${r2.status} | WWW-Auth: ${r2.headers.get("www-authenticate") ?? "–"}`);
  } catch (e) { console.log("⚠️ client-credentials token erro:", e); }

  // Tenta 3: Basic Auth com client_id:client_secret
  const basicCred = Buffer.from(
    `${process.env.LIVEPIX_CLIENT_ID ?? ""}:${process.env.LIVEPIX_CLIENT_SECRET ?? ""}`
  ).toString("base64");
  console.log(`🔐 ${label} tentando Basic Auth...`);
  const r3 = await fetch(url, { headers: { Authorization: `Basic ${basicCred}` }, cache: "no-store" });
  console.log(`🔐 Basic Auth resultado: ${r3.status} | WWW-Auth: ${r3.headers.get("www-authenticate") ?? "–"}`);
  return r3;
}

export async function getMessage(messageId: string): Promise<LivePixMessage> {
  // Tenta primeiro por ID direto
  const res = await fetchWithAuth(
    `https://api.livepix.gg/v2/messages/${messageId}`,
    `getMessage(${messageId})`
  );
  if (res.ok) {
    const json = await res.json();
    return json.data ?? json;
  }
  const body = await res.text().catch(() => "");
  throw new Error(`LivePix getMessage ${res.status}: ${body}`);
}

export async function getMessageByReference(reference: string): Promise<LivePixMessage> {
  // Busca por reference — campo correto do webhook (resource.reference)
  const res = await fetchWithAuth(
    `https://api.livepix.gg/v2/messages?reference=${encodeURIComponent(reference)}&limit=1`,
    `getMessageByRef(${reference})`
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LivePix getMessageByRef ${res.status}: ${body}`);
  }
  const json = await res.json();
  const items: LivePixMessage[] = json.data ?? json.items ?? json;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`LivePix: mensagem não encontrada para reference=${reference}`);
  }
  return items[0];
}

export async function isUserConnected(): Promise<boolean> {
  const t = await getLivePixUserToken();
  return !!t;
}

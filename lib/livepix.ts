/* ── LivePix API integration ─────────────────────────────────
   Auth: client_credentials com scope messages:read
   Webhook: resource.id → GET /v2/messages/{id}
────────────────────────────────────────────────────────────── */

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
      scope:         "messages:read",
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

export async function getMessage(messageId: string): Promise<LivePixMessage> {
  const token = await getClientToken();
  const res = await fetch(`https://api.livepix.gg/v2/messages/${messageId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LivePix getMessage ${res.status}: ${body}`);
  }
  const json = await res.json();
  return json.data ?? json;
}

import type { TipoChavePix } from "./gorjeta-store";
import { getCredentials } from "./credentials";

const BASE_URL = "https://ggpixapi.com/api/v1";

async function getApiKey(): Promise<string> {
  // banco tem prioridade — configurado via UI sobrepõe o env do Render
  const creds = await getCredentials();
  if (creds.ggpix.apiKey) return creds.ggpix.apiKey;
  if (process.env.GGPIX_API_KEY) return process.env.GGPIX_API_KEY;
  throw new Error("GGPIX_API_KEY não configurada");
}

async function getApiKeyOrNull(): Promise<string | null> {
  const creds = await getCredentials();
  return creds.ggpix.apiKey || process.env.GGPIX_API_KEY || null;
}

/**
 * Testa de verdade se a API Key do GGPix funciona, consultando o saldo da conta.
 * Detecta chaves removidas/inválidas ou conta bloqueada.
 */
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
    // 404: o endpoint de saldo pode não existir nessa versão, mas a auth passou
    if (res.status === 404) return { ok: true };
    return { ok: false, error: `O GGPix respondeu com erro (HTTP ${res.status})` };
  } catch {
    return { ok: false, error: "Não foi possível conectar ao GGPix" };
  }
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
    let msg = text;
    try { msg = (JSON.parse(text) as { message?: string; error?: string }).message ?? (JSON.parse(text) as { message?: string; error?: string }).error ?? text; } catch { /* noop */ }
    throw new Error(`GGPix ${res.status}: ${msg}`);
  }

  return JSON.parse(text) as { id: string; status: string };
}

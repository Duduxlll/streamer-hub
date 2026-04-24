import type { TipoChavePix } from "./gorjeta-store";

const BASE_URL = "https://ggpixapi.com/api/v1";

function getApiKey(): string {
  const key = process.env.GGPIX_API_KEY;
  if (!key) throw new Error("GGPIX_API_KEY não configurada");
  return key;
}

const TIPO_MAP: Record<TipoChavePix, string> = {
  cpf:      "cpf",
  telefone: "phone",
  email:    "email",
  aleatoria: "random",
};

export async function enviarPix(
  pixKey: string,
  pixKeyType: TipoChavePix,
  valorReais: number,
  externalId: string,
): Promise<{ id: string; status: string }> {
  const amountCents = Math.round(valorReais * 100);

  console.log(`[ggpix/enviar] pixKey="${pixKey}" tipo="${pixKeyType}" valor=R$${valorReais.toFixed(2)} externalId=${externalId}`);

  const res = await fetch(`${BASE_URL}/pix/out`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": getApiKey(),
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

const BASE_URL = process.env.GERENCIANET_SANDBOX === "true"
  ? "https://pix-h.api.efipay.com.br"
  : "https://pix.api.efipay.com.br";

let _cachedToken: string | null = null;
let _tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;

  const clientId = process.env.GERENCIANET_CLIENT_ID;
  const clientSecret = process.env.GERENCIANET_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("GERENCIANET_CLIENT_ID ou GERENCIANET_CLIENT_SECRET não configurados");

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ grant_type: "client_credentials" }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Falha de autenticação Gerencianet: ${res.status} ${txt}`);
  }

  const data = await res.json();
  _cachedToken = data.access_token as string;
  _tokenExpiry = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000;
  return _cachedToken;
}

export async function enviarPix(
  cpf: string,
  valor: number,
  infoPagador = "Gorjeta",
): Promise<{ txid: string; e2eid?: string }> {
  const token = await getToken();
  const cpfNum = cpf.replace(/\D/g, "");
  const txid = `gorjeta${Date.now()}${Math.random().toString(36).slice(2, 8)}`.slice(0, 35);

  const res = await fetch(`${BASE_URL}/v2/gn/pix`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      valor: valor.toFixed(2),
      pagador: {
        chave: cpfNum,
        infoPagador,
      },
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Falha no envio PIX: ${res.status} ${txt}`);
  }

  const data = await res.json();
  return { txid: (data.txid as string) ?? txid, e2eid: data.e2eid as string | undefined };
}

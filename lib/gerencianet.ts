import https from "https";

const HOST_PROD = "pix.api.efipay.com.br";
const HOST_SAND = "pix-h.api.efipay.com.br";

function getHost(): string {
  return process.env.GERENCIANET_SANDBOX === "true" ? HOST_SAND : HOST_PROD;
}

function getAgent(): https.Agent {
  // Suporte a PEM separado (client-cert.pem + client-key.pem em base64)
  const certB64 = process.env.GERENCIANET_CERT_PEM_BASE64;
  const keyB64  = process.env.GERENCIANET_KEY_PEM_BASE64;
  if (certB64 && keyB64) {
    return new https.Agent({
      cert: Buffer.from(certB64, "base64"),
      key:  Buffer.from(keyB64,  "base64"),
    });
  }

  // Fallback: suporte a .p12 (pfx) em base64
  const pfxB64 = process.env.GERENCIANET_CERT_BASE64;
  if (pfxB64) {
    return new https.Agent({
      pfx:        Buffer.from(pfxB64, "base64"),
      passphrase: process.env.GERENCIANET_CERT_PASSPHRASE ?? "",
    });
  }

  return new https.Agent();
}

function nodeRequest(
  options: https.RequestOptions,
  body?: string,
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let text = "";
      res.on("data", (chunk: Buffer) => { text += chunk.toString(); });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, text }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

let _cachedToken: string | null = null;
let _tokenExpiry = 0;
let _agentInstance: https.Agent | null = null;

function agent(): https.Agent {
  if (!_agentInstance) _agentInstance = getAgent();
  return _agentInstance;
}

async function getToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;

  const clientId     = process.env.GERENCIANET_CLIENT_ID;
  const clientSecret = process.env.GERENCIANET_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GERENCIANET_CLIENT_ID ou GERENCIANET_CLIENT_SECRET não configurados");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = "grant_type=client_credentials";

  const res = await nodeRequest(
    {
      hostname: getHost(),
      path:     "/oauth/token",
      method:   "POST",
      headers:  {
        Authorization:   `Basic ${auth}`,
        "Content-Type":  "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
      },
      agent: agent(),
    },
    body,
  );

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Falha de autenticação EfíBank: ${res.status} — ${res.text}`);
  }

  const data = JSON.parse(res.text) as { access_token: string; expires_in?: number };
  _cachedToken = data.access_token;
  _tokenExpiry = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000;
  return _cachedToken;
}

export async function enviarPix(
  cpfDestinatario: string,
  valor: number,
  infoPagador = "Gorjeta",
): Promise<{ idEnvio: string; e2eId?: string }> {
  const chavePagador = process.env.GERENCIANET_PIX_KEY;
  if (!chavePagador) throw new Error("GERENCIANET_PIX_KEY não configurada");

  const token  = await getToken();
  const cpfNum = cpfDestinatario.replace(/\D/g, "");
  const idEnvio = `gorjeta${Date.now()}${Math.random().toString(36).slice(2, 8)}`.slice(0, 35);

  const bodyStr = JSON.stringify({
    valor: valor.toFixed(2),
    pagador: {
      chave: chavePagador,
      infoPagador,
    },
    favorecido: {
      chave: cpfNum,
    },
  });

  const res = await nodeRequest(
    {
      hostname: getHost(),
      path:     `/v3/gn/pix/${idEnvio}`,
      method:   "PUT",
      headers:  {
        Authorization:    `Bearer ${token}`,
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
      },
      agent: agent(),
    },
    bodyStr,
  );

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Falha no envio PIX (${res.status}): ${res.text}`);
  }

  const data = JSON.parse(res.text) as { idEnvio?: string; e2eId?: string };
  return { idEnvio: data.idEnvio ?? idEnvio, e2eId: data.e2eId };
}

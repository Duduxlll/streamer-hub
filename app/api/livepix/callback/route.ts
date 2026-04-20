import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import { setLivePixUserToken } from "@/lib/store";
import { getSiteUrl } from "@/lib/site-url";

export async function GET(req: NextRequest) {
  // Apenas admin pode completar o fluxo OAuth
  const session = await auth();
  if (!isAdmin(session?.user?.twitchLogin)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const code          = req.nextUrl.searchParams.get("code");
  const returnedState = req.nextUrl.searchParams.get("state");
  const storedState   = req.cookies.get("livepix_oauth_state")?.value;

  if (!code) {
    return NextResponse.json({ error: "Sem código de autorização" }, { status: 400 });
  }

  // Verifica o state para prevenir CSRF
  if (!returnedState || !storedState || returnedState !== storedState) {
    return NextResponse.json({ error: "State inválido — possível ataque CSRF" }, { status: 403 });
  }

  const clientId     = process.env.LIVEPIX_CLIENT_ID     ?? "";
  const clientSecret = process.env.LIVEPIX_CLIENT_SECRET ?? "";
  const callbackUrl  = `${getSiteUrl()}/api/livepix/callback`;

  const res = await fetch("https://oauth.livepix.gg/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:   "authorization_code",
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  callbackUrl,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: "Falha no token", detail: text }, { status: 502 });
  }

  const data = await res.json();
  await setLivePixUserToken({
    access_token:  data.access_token,
    refresh_token: data.refresh_token ?? "",
    expires_at:    Date.now() + (data.expires_in ?? 3600) * 1000,
  });

  // Limpa o cookie de state após uso
  const response = new NextResponse(`
    <html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#030610;color:#fff">
      <h2>✅ LivePix conectado com sucesso!</h2>
      <p style="color:#6b7280">Pode fechar esta aba.</p>
    </body></html>
  `, { headers: { "Content-Type": "text/html" } });

  response.cookies.set("livepix_oauth_state", "", { maxAge: 0, path: "/" });
  return response;
}

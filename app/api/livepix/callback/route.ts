import { NextRequest, NextResponse } from "next/server";
import { setLivePixUserToken } from "@/lib/store";
import { getSiteUrl } from "@/lib/site-url";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Sem código de autorização" }, { status: 400 });
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

  return new NextResponse(`
    <html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#030610;color:#fff">
      <h2>✅ LivePix conectado com sucesso!</h2>
      <p style="color:#6b7280">Pode fechar esta aba.</p>
    </body></html>
  `, { headers: { "Content-Type": "text/html" } });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import { getSiteUrl } from "@/lib/site-url";
import { getLivePixUserToken } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.twitchLogin)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const clientId    = process.env.LIVEPIX_CLIENT_ID ?? "(não definido)";
  const siteUrl     = getSiteUrl();
  const callbackUrl = `${siteUrl}/api/livepix/callback`;
  const token       = await getLivePixUserToken();

  const oauthUrl = new URL("https://oauth.livepix.gg/oauth2/auth");
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("client_id", clientId);
  oauthUrl.searchParams.set("redirect_uri", callbackUrl);
  oauthUrl.searchParams.set("scope", "reads:payments");

  return NextResponse.json({
    clientId,
    siteUrl,
    callbackUrl,
    oauthUrl: oauthUrl.toString(),
    tokenSalvo: token ? {
      expiresAt: new Date(token.expires_at).toISOString(),
      expirado: token.expires_at < Date.now(),
    } : null,
    instrucao: `Registre exatamente esta URL no painel LivePix em Configurações > App OAuth > Redirect URIs: ${callbackUrl}`,
  });
}

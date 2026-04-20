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

  const clientId     = process.env.LIVEPIX_CLIENT_ID     ?? "(não definido)";
  const clientSecret = process.env.LIVEPIX_CLIENT_SECRET ?? "";
  const siteUrl      = getSiteUrl();
  const callbackUrl  = `${siteUrl}/api/livepix/callback`;
  const userToken    = await getLivePixUserToken();

  // Testa client_credentials e loga resposta completa
  const ccRes = await fetch("https://oauth.livepix.gg/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "client_credentials",
      client_id:     clientId,
      client_secret: clientSecret,
      audience:      "https://api.livepix.gg",
    }),
    cache: "no-store",
  });
  const ccData = await ccRes.json().catch(() => null);

  // Se obteve token CC, testa a API com ele
  let apiTestCC = null;
  if (ccRes.ok && ccData?.access_token) {
    const apiRes = await fetch("https://api.livepix.gg/v2/messages?limit=1", {
      headers: {
        Authorization: `Bearer ${ccData.access_token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const apiBody = await apiRes.text().catch(() => "");
    apiTestCC = { status: apiRes.status, body: apiBody.slice(0, 500) };
  }

  // Testa com user token também
  let apiTestUser = null;
  if (userToken) {
    const apiRes = await fetch("https://api.livepix.gg/v2/messages?limit=1", {
      headers: {
        Authorization: `Bearer ${userToken.access_token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const apiBody = await apiRes.text().catch(() => "");
    apiTestUser = { status: apiRes.status, body: apiBody.slice(0, 500) };
  }

  return NextResponse.json({
    callbackUrl,
    clientIdConfigured: !!process.env.LIVEPIX_CLIENT_ID,
    clientSecretConfigured: !!process.env.LIVEPIX_CLIENT_SECRET,
    clientSecretLength: clientSecret.length,
    userToken: userToken ? {
      expiresAt: new Date(userToken.expires_at).toISOString(),
      expirado: userToken.expires_at < Date.now(),
      accessTokenLength: userToken.access_token.length,
    } : null,
    clientCredentials: {
      status: ccRes.status,
      tokenType: ccData?.token_type,
      scope: ccData?.scope,
      expiresIn: ccData?.expires_in,
      hasAccessToken: !!ccData?.access_token,
    },
    apiTestWithCC: apiTestCC,
    apiTestWithUserToken: apiTestUser,
  });
}

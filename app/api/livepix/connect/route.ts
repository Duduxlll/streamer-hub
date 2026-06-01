import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import { getSiteUrl } from "@/lib/site-url";
import { getCredentials } from "@/lib/credentials";
import { randomBytes } from "crypto";

export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.twitchLogin)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // env tem prioridade, depois o store
  let clientId = process.env.LIVEPIX_CLIENT_ID ?? "";
  if (!clientId) {
    const creds = await getCredentials();
    clientId = creds.livepix.clientId;
  }

  if (!clientId) {
    return NextResponse.json({ error: "Client ID do LivePix não configurado" }, { status: 400 });
  }

  const callbackUrl = `${getSiteUrl()}/api/livepix/callback`;
  const state = randomBytes(16).toString("hex");

  const url = new URL("https://oauth.livepix.gg/oauth2/auth");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("state", state);
  url.searchParams.set("audience", "https://api.livepix.gg");

  const redirect = NextResponse.redirect(url.toString());
  redirect.cookies.set("livepix_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });
  return redirect;
}

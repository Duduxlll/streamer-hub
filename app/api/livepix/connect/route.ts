import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import { getSiteUrl } from "@/lib/site-url";

export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.twitchLogin)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const clientId    = process.env.LIVEPIX_CLIENT_ID ?? "";
  const callbackUrl = `${getSiteUrl()}/api/livepix/callback`;

  const url = new URL("https://oauth.livepix.gg/oauth2/auth");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("scope", "reads:payments");

  return NextResponse.redirect(url.toString());
}

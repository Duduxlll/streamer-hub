import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import { isConfigured as livepixConfigured, testConnection as testLivepix } from "@/lib/livepix";
import {
  clearGgpixWebhookStatus,
  getGgpixServerIp,
  getGgpixWebhookAuthIssue,
  getGgpixWebhookStatus,
  testConnection as testGgpix,
} from "@/lib/ggpix";
import { getCredentials, patchLivePix, patchGGPix, type WebhookAuthMode } from "@/lib/credentials";
import { getSiteUrl } from "@/lib/site-url";
import { addLog } from "@/lib/security-log";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

async function getGgpixTestStatus() {
  const [api, creds, webhookStatus] = await Promise.all([testGgpix(), getCredentials(), getGgpixWebhookStatus()]);
  const authIssue = getGgpixWebhookAuthIssue(creds);
  if (!api.ok) return api;
  if (authIssue) return { ok: false, error: authIssue };
  if (webhookStatus?.ok === false) return { ok: false, error: webhookStatus.message };
  return { ok: true };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.twitchLogin)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  if (req.nextUrl.searchParams.get("test") === "1") {
    const [livepix, ggpix] = await Promise.all([testLivepix(), getGgpixTestStatus()]);
    return NextResponse.json({ livepix, ggpix }, { headers: NO_CACHE });
  }

  const [livepixOk, creds, webhookStatus, serverIp] = await Promise.all([
    livepixConfigured(),
    getCredentials(),
    getGgpixWebhookStatus(),
    getGgpixServerIp(),
  ]);

  const siteUrl = getSiteUrl();

  const ggpixApiOk = !!(creds.ggpix.apiKey || process.env.GGPIX_API_KEY);
  const webhookAuthError = getGgpixWebhookAuthIssue(creds);
  const webhookAuthReady = !webhookAuthError;
  const webhookLastOk = webhookStatus?.ok !== false;
  const ggpixOk = ggpixApiOk && webhookAuthReady && webhookLastOk;

  const hasWebhookSecret = !!(creds.livepix.webhookSecret || process.env.LIVEPIX_WEBHOOK_SECRET);
  const webhookSecret    = creds.livepix.webhookSecret || process.env.LIVEPIX_WEBHOOK_SECRET || "";

  const livepixWebhookBase = `${siteUrl}/api/livepix/webhook`;
  const livepixWebhookUrl  = webhookSecret
    ? `${livepixWebhookBase}?secret=${encodeURIComponent(webhookSecret)}`
    : livepixWebhookBase;

  return NextResponse.json({
    ggpix: {
      ok: ggpixOk,
      hasApiKey:        ggpixOk,
      webhookAuthMode:  creds.ggpix.webhookAuthMode,
      hasBearerToken:   !!creds.ggpix.bearerToken,
      hasHmacSecret:    !!creds.ggpix.hmacSecret,
      webhookUrl:       `${siteUrl}/api/ggpix/webhook`,
      webhookAuthReady,
      webhookAuthError,
      webhookStatus,
      serverIp,
    },
    livepix: {
      ok: livepixOk,
      hasClientId:      !!(creds.livepix.clientId    || process.env.LIVEPIX_CLIENT_ID),
      hasClientSecret:  !!(creds.livepix.clientSecret || process.env.LIVEPIX_CLIENT_SECRET),
      hasWebhookSecret,
      webhookUrl:       livepixWebhookUrl,
      callbackUrl:      `${siteUrl}/api/livepix/callback`,
    },
  }, { headers: NO_CACHE });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.twitchLogin)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { type } = body;

  if (type === "livepix") {
    const patch: Partial<{ clientId: string; clientSecret: string; webhookSecret: string }> = {};
    if (typeof body.clientId      === "string" && body.clientId.trim())      patch.clientId      = body.clientId.trim();
    if (typeof body.clientSecret  === "string" && body.clientSecret.trim())  patch.clientSecret  = body.clientSecret.trim();
    if (typeof body.webhookSecret === "string")                               patch.webhookSecret = body.webhookSecret.trim();
    await patchLivePix(patch);
    globalThis.__livepix_token = undefined;
    await addLog({ admin: session!.user!.twitchLogin!, action: "config_livepix", detail: "Credenciais LivePix atualizadas" });

    const test = await testLivepix();
    return NextResponse.json({ ok: true, test }, { headers: NO_CACHE });
  }

  if (type === "ggpix") {
    const patch: Partial<{ apiKey: string; webhookAuthMode: WebhookAuthMode; bearerToken: string; hmacSecret: string }> = {};
    if (typeof body.apiKey          === "string" && body.apiKey.trim())          patch.apiKey          = body.apiKey.trim();
    if (typeof body.webhookAuthMode === "string")                                 patch.webhookAuthMode = body.webhookAuthMode as WebhookAuthMode;
    if (typeof body.bearerToken     === "string")                                 patch.bearerToken     = body.bearerToken.trim();
    if (typeof body.hmacSecret      === "string")                                 patch.hmacSecret      = body.hmacSecret.trim();
    await patchGGPix(patch);
    await clearGgpixWebhookStatus();
    await addLog({ admin: session!.user!.twitchLogin!, action: "config_ggpix", detail: "Credenciais GGPix atualizadas" });

    const test = await getGgpixTestStatus();
    return NextResponse.json({ ok: true, test }, { headers: NO_CACHE });
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
}

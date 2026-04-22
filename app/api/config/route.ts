import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import { isConfigured as livepixConfigured } from "@/lib/livepix";
import { dbGet, dbSet } from "@/lib/store";
import { cadastrarWebhook } from "@/lib/gerencianet";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

const WEBHOOK_KEY = "gorjeta:webhook-status:v1";

export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.twitchLogin)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const [webhookRaw] = await Promise.all([dbGet(WEBHOOK_KEY)]);
  const webhookInfo = webhookRaw ? JSON.parse(webhookRaw) as { registradoEm: number; url: string } : null;

  const efibankOk = !!(
    process.env.GERENCIANET_CLIENT_ID &&
    process.env.GERENCIANET_CLIENT_SECRET &&
    process.env.GERENCIANET_PIX_KEY &&
    (process.env.GERENCIANET_CERT_PEM_BASE64 || process.env.GERENCIANET_CERT_BASE64)
  );

  return NextResponse.json({
    efibank: {
      credenciaisOk: efibankOk,
      webhook: webhookInfo
        ? { ok: true, registradoEm: webhookInfo.registradoEm, url: webhookInfo.url }
        : { ok: false },
    },
    livepix: {
      ok: livepixConfigured(),
    },
  }, { headers: NO_CACHE });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.twitchLogin)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  if (body.action === "cadastrar-webhook") {
    const siteUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? process.env.SITE_URL ?? "";
    if (!siteUrl) return NextResponse.json({ ok: false, erro: "NEXTAUTH_URL não definida" }, { headers: NO_CACHE });
    const webhookUrl = `${siteUrl.replace(/\/+$/, "")}/api/gerencianet/webhook`;
    const result = await cadastrarWebhook(webhookUrl);
    if (result.ok) {
      await dbSet(WEBHOOK_KEY, JSON.stringify({ registradoEm: Date.now(), url: webhookUrl }));
    }
    return NextResponse.json({ ...result, webhookUrl }, { headers: NO_CACHE });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}

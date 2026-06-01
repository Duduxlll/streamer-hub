import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { atualizarTransacaoPorTxid } from "@/lib/gorjeta-store";
import { getCredentials } from "@/lib/credentials";

export const dynamic = "force-dynamic";

function verifyBearer(authHeader: string | null, token: string): boolean {
  if (!token || !authHeader) return false;
  const candidate = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!candidate) return false;
  try {
    if (candidate.length !== token.length) return false;
    return timingSafeEqual(Buffer.from(candidate), Buffer.from(token));
  } catch { return false; }
}

function verifyHmac(payload: string, signatureHeader: string | null, secret: string): boolean {
  if (!secret || !signatureHeader) return false;
  try {
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const sig = signatureHeader.toLowerCase().replace(/^sha256=/, "");
    if (sig.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch { return false; }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const creds = await getCredentials();
  const mode         = creds.ggpix.webhookAuthMode;
  const bearerToken  = creds.ggpix.bearerToken;
  const hmacSecret   = creds.ggpix.hmacSecret;

  if (mode !== "none") {
    const authHeader  = req.headers.get("authorization");
    const sigHeader   = req.headers.get("x-webhook-signature");

    let authorized = false;

    if (mode === "bearer") {
      authorized = verifyBearer(authHeader, bearerToken);
    } else if (mode === "hmac") {
      authorized = verifyHmac(rawBody, sigHeader, hmacSecret);
    } else if (mode === "ambos") {
      authorized = verifyBearer(authHeader, bearerToken) && verifyHmac(rawBody, sigHeader, hmacSecret);
    }

    if (!authorized) {
      console.error(`[ggpix/webhook] ❌ Autenticação falhou (modo: ${mode})`);
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  try {
    const body = JSON.parse(rawBody || "{}");
    console.log("[ggpix/webhook] Notificação:", JSON.stringify(body));

    const externalId: string | undefined =
      body.externalId ?? body.external_id ?? body.data?.externalId ?? body.data?.external_id;

    const status: string | undefined =
      body.status ?? body.data?.status;

    const errorMsg: string | undefined =
      body.error ?? body.message ?? body.data?.error ?? body.data?.message;

    if (externalId && status) {
      const statusUp = status.toUpperCase();
      if (statusUp === "FAILED" || statusUp === "CANCELLED" || statusUp === "NAO_REALIZADO" || statusUp === "REJECTED") {
        const motivo = errorMsg ?? status;
        const updated = await atualizarTransacaoPorTxid(externalId, "falhou", motivo);
        console.log(`[ggpix/webhook] ${updated ? "✓" : "não encontrado"} externalId=${externalId} → falhou: ${motivo}`);
      } else if (statusUp === "COMPLETED" || statusUp === "SUCCESS" || statusUp === "CONCLUÍDA" || statusUp === "CONCLUIDA") {
        const updated = await atualizarTransacaoPorTxid(externalId, "enviado");
        console.log(`[ggpix/webhook] ${updated ? "✓" : "não encontrado"} externalId=${externalId} → confirmado enviado`);
      }
    }
  } catch (err) {
    console.error("[ggpix/webhook] Erro:", err);
  }

  return new NextResponse("OK", { status: 200 });
}

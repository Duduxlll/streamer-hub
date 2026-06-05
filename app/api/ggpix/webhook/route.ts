import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { atualizarTransacaoPorTxid } from "@/lib/gorjeta-store";
import { getCredentials } from "@/lib/credentials";

export const dynamic = "force-dynamic";

function verifyBearer(authHeader: string | null, token: string): boolean {
  if (!token || !authHeader) return false;
  const candidate = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  if (!candidate) return false;
  try {
    if (candidate.length !== token.length) return false;
    return timingSafeEqual(Buffer.from(candidate), Buffer.from(token));
  } catch { return false; }
}

function verifyHmac(payload: string, signatureHeader: string | null, secret: string): boolean {
  if (!secret || !signatureHeader) return false;
  try {
    const parts = Object.fromEntries(signatureHeader.split(",").map(part => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    }));
    const timestamp = parts.t;
    const receivedSig = parts.v1;

    if (timestamp && receivedSig) {
      const ts = Number(timestamp);
      if (!Number.isFinite(ts)) return false;
      const age = Math.abs(Date.now() / 1000 - ts);
      if (age > 300) return false;

      const signedPayload = `${timestamp}.${payload}`;
      const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");
      if (receivedSig.length !== expected.length) return false;
      return timingSafeEqual(Buffer.from(receivedSig, "hex"), Buffer.from(expected, "hex"));
    }

    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const sig = signatureHeader.toLowerCase().replace(/^sha256=/, "").trim();
    if (sig.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
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
    const bearerOk = verifyBearer(authHeader, bearerToken);
    const hmacOk = verifyHmac(rawBody, sigHeader, hmacSecret);

    let authorized = false;

    if (mode === "bearer") {
      authorized = bearerOk;
    } else if (mode === "hmac") {
      authorized = hmacOk;
    } else if (mode === "ambos") {
      authorized = bearerOk && hmacOk;
    }

    if (!authorized) {
      console.error(`[ggpix/webhook] ❌ Autenticação falhou (modo: ${mode}, bearer=${bearerOk ? "ok" : "falhou"}, hmac=${hmacOk ? "ok" : "falhou"})`);
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
      body.failureReason ?? body.error ?? body.message ?? body.data?.failureReason ?? body.data?.error ?? body.data?.message;

    if (externalId && status) {
      const statusUp = status.toUpperCase();
      if (statusUp === "FAILED" || statusUp === "CANCELED" || statusUp === "CANCELLED" || statusUp === "NAO_REALIZADO" || statusUp === "REJECTED") {
        const motivo = errorMsg ?? status;
        const updated = await atualizarTransacaoPorTxid(externalId, "falhou", motivo);
        console.log(`[ggpix/webhook] ${updated ? "✓" : "não encontrado"} externalId=${externalId} → falhou: ${motivo}`);
      } else if (statusUp === "COMPLETE" || statusUp === "COMPLETED" || statusUp === "SUCCESS" || statusUp === "CONCLUÍDA" || statusUp === "CONCLUIDA") {
        const updated = await atualizarTransacaoPorTxid(externalId, "enviado");
        console.log(`[ggpix/webhook] ${updated ? "✓" : "não encontrado"} externalId=${externalId} → confirmado enviado`);
      }
    }
  } catch (err) {
    console.error("[ggpix/webhook] Erro:", err);
  }

  return new NextResponse("OK", { status: 200 });
}

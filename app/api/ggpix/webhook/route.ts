import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { atualizarTransacaoPorTxid } from "@/lib/gorjeta-store";
import { getCredentials } from "@/lib/credentials";
import { setGgpixWebhookStatus } from "@/lib/ggpix";

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

type HmacCheck = { ok: true; reason: string } | { ok: false; reason: string };

function hmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeHexEqual(received: string, expected: string): boolean {
  const a = received.trim().toLowerCase();
  const b = expected.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(a) || !/^[0-9a-f]+$/.test(b)) return false;
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch { return false; }
}

function parseSignatureHeader(signatureHeader: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const part of signatureHeader.split(",")) {
    const [rawKey, ...rest] = part.trim().split("=");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join("=").trim();
    if (!key || !value) continue;
    out[key] = [...(out[key] ?? []), value];
  }
  return out;
}

function verifyHmac(payload: string, signatureHeader: string | null, secret: string): HmacCheck {
  if (!secret) return { ok: false, reason: "HMAC Secret não está salvo no site" };
  if (!signatureHeader) return { ok: false, reason: "header X-Webhook-Signature não veio na requisição" };

  const parts = parseSignatureHeader(signatureHeader);
  const timestamps = parts.t ?? [];
  const signatures = parts.v1 ?? [];

  if (timestamps.length > 0 && signatures.length > 0) {
    let sawFreshTimestamp = false;

    for (const timestamp of timestamps) {
      const rawTs = timestamp.trim();
      const numericTs = Number(rawTs);
      if (!Number.isFinite(numericTs)) continue;

      const timestampSeconds = numericTs > 10_000_000_000 ? numericTs / 1000 : numericTs;
      const age = Math.abs(Date.now() / 1000 - timestampSeconds);
      if (age > 300) continue;
      sawFreshTimestamp = true;

      const normalizedTs = String(Math.trunc(timestampSeconds));
      const payloads = new Set([
        `${rawTs}.${payload}`,
        `${normalizedTs}.${payload}`,
        payload,
      ]);

      for (const candidatePayload of payloads) {
        const expected = hmacHex(secret, candidatePayload);
        if (signatures.some(sig => safeHexEqual(sig, expected))) {
          return { ok: true, reason: "HMAC válido" };
        }
      }
    }

    if (!sawFreshTimestamp) return { ok: false, reason: "timestamp do HMAC expirado ou inválido" };
    return { ok: false, reason: "assinatura HMAC não bateu com o HMAC Secret salvo" };
  }

  const compactSig = signatureHeader.toLowerCase().replace(/^sha256=/, "").trim();
  const expected = hmacHex(secret, payload);
  if (safeHexEqual(compactSig, expected)) return { ok: true, reason: "HMAC válido" };
  return { ok: false, reason: "formato do header HMAC inválido ou assinatura não bateu" };
}

function maskWebhookLog(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskWebhookLog);
  if (!value || typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (
      typeof item === "string" &&
      (lower.includes("pixkey") || lower.includes("pix_key") || lower.includes("cpf") || lower.includes("document"))
    ) {
      out[key] = item.includes("@") ? "***@***" : "***";
    } else {
      out[key] = maskWebhookLog(item);
    }
  }
  return out;
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
    const hmacCheck = verifyHmac(rawBody, sigHeader, hmacSecret);
    const hmacOk = hmacCheck.ok;

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
      await setGgpixWebhookStatus({
        ok: false,
        status: "auth_failed",
        mode,
        message: `Autenticação falhou no webhook GGPix. Bearer: ${bearerOk ? "ok" : "falhou"}. HMAC: ${hmacOk ? "ok" : hmacCheck.reason}.`,
        checkedAt: Date.now(),
        bearerOk,
        hmacOk,
      });
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  try {
    const body = JSON.parse(rawBody || "{}");
    await setGgpixWebhookStatus({
      ok: true,
      status: "received",
      mode,
      message: "Webhook GGPix recebido com autenticação válida.",
      checkedAt: Date.now(),
    });
    console.log("[ggpix/webhook] Notificação:", JSON.stringify(maskWebhookLog(body)));

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
    await setGgpixWebhookStatus({
      ok: false,
      status: "parse_error",
      mode,
      message: "Webhook chegou, mas o corpo da requisição não veio em JSON válido.",
      checkedAt: Date.now(),
    });
  }

  return new NextResponse("OK", { status: 200 });
}

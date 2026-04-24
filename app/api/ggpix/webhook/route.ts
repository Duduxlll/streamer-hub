import { NextRequest, NextResponse } from "next/server";
import { atualizarTransacaoPorTxid } from "@/lib/gorjeta-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    console.log("[ggpix/webhook] Notificação:", JSON.stringify(body));

    // O GGPix pode enviar o externalId em diferentes campos dependendo da versão da API
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

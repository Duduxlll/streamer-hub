import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// EfíBank envia um GET para validar o endpoint antes de cadastrar
export async function GET() {
  return new NextResponse("OK", { status: 200 });
}

// EfíBank envia notificações de status de pagamento via POST
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    console.log("[gerencianet/webhook] Notificação recebida:", JSON.stringify(body));
    // Notificações de Pix enviados ficam em body.pix[]
    // Não é necessário processar agora — o status já foi salvo no momento do envio
  } catch (err) {
    console.error("[gerencianet/webhook] Erro ao processar:", err);
  }
  return new NextResponse("OK", { status: 200 });
}

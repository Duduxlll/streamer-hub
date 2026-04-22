import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// EfíBank envia notificações de PIX enviados aqui (adiciona /pix na URL cadastrada)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    console.log("[gerencianet/webhook/pix] Notificação:", JSON.stringify(body));
  } catch (err) {
    console.error("[gerencianet/webhook/pix] Erro:", err);
  }
  return new NextResponse("OK", { status: 200 });
}

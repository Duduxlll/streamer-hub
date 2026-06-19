import { NextResponse } from "next/server";
import { drainChatMessages } from "@/lib/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const secret = req.headers.get("x-bot-secret");
  if (!secret || secret !== process.env.BOT_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    return NextResponse.json(await drainChatMessages(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error(
      "[palpites/announce] Falha ao buscar mensagens:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json([], {
      headers: { "Cache-Control": "no-store" },
    });
  }
}

import { NextResponse } from "next/server";
import { drainChatMessages } from "@/lib/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const secret = req.headers.get("x-bot-secret");
  if (!secret || secret !== process.env.BOT_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return NextResponse.json(await drainChatMessages());
}

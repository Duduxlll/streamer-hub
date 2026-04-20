import { NextResponse } from "next/server";
import { addOrUpdatePalpite } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = req.headers.get("x-bot-secret");
  if (!secret || secret !== process.env.BOT_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json() as { username?: string; valor?: number };
  const { username, valor } = body;

  if (!username || typeof valor !== "number" || valor <= 0) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const result = await addOrUpdatePalpite(username, valor);

  if (!result.ok) {
    return NextResponse.json({ error: "Sem rodada aberta" }, { status: 409 });
  }

  return NextResponse.json({ ok: true, updated: result.updated });
}

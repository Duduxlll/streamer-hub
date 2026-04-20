import { NextRequest, NextResponse } from "next/server";
import { getBatalha, entrarBatalha } from "@/lib/batalhaStore";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-bot-secret");
  if (!secret || secret !== process.env.BOT_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { username, displayName } = await req.json();
  if (!username) return NextResponse.json({ error: "username obrigatório" }, { status: 400 });

  const batalha = await getBatalha();
  if (!batalha || batalha.status !== "inscricao") {
    return NextResponse.json({ ok: false, motivo: "Inscrições não estão abertas." });
  }

  const result = await entrarBatalha(username, displayName ?? username);
  return NextResponse.json(result);
}

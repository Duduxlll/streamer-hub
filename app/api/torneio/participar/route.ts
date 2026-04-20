import { NextResponse } from "next/server";
import { registrarEscolha } from "@/lib/torneioStore";
import { queueChatMessage } from "@/lib/store";

export async function POST(req: Request) {
  const secret = req.headers.get("x-bot-secret");
  if (secret !== process.env.BOT_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json() as { username: string; displayName: string; time: string };
  const result = await registrarEscolha(body.username, body.displayName, body.time);

  if (result.ok && BOT_USER_RESPONDS()) {
    await queueChatMessage(
      result.atualizado
        ? `@${body.displayName} trocou para o time ${body.time}! ✅`
        : `@${body.displayName} entrou no time ${body.time}! ✅`
    );
  }

  return NextResponse.json(result);
}

function BOT_USER_RESPONDS() {
  return !!process.env.BOT_USERNAME;
}

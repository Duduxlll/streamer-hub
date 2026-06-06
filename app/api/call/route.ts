import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isVerifiedAdminSession } from "@/lib/admin-identity";
import { getCall, abrirCall, fecharCall, submeterCall, removerEntry } from "@/lib/callStore";

const NO_CACHE = { "Cache-Control": "no-store" };

export async function GET() {
  return NextResponse.json(await getCall(), { headers: NO_CACHE });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { action } = body;

  if (action === "submeter") {
    const secret = body.secret ?? req.headers.get("x-bot-secret");
    if (!secret || secret !== process.env.BOT_SECRET) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const { username, displayName, jogo, image } = body;
    if (!username || !jogo?.trim()) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    const result = await submeterCall(username, displayName ?? username, jogo, typeof image === "string" ? image : null);
    return NextResponse.json(result, { status: result.ok ? 200 : 400, headers: NO_CACHE });
  }

  const session = await auth();
  if (!(await isVerifiedAdminSession(session))) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  if (action === "abrir") return NextResponse.json(await abrirCall(), { headers: NO_CACHE });
  if (action === "fechar") return NextResponse.json(await fecharCall(), { headers: NO_CACHE });
  if (action === "remover") {
    if (!body.id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    return NextResponse.json(await removerEntry(body.id), { headers: NO_CACHE });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}

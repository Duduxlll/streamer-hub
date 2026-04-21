import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import {
  getSorteios,
  getAtivo,
  criarSorteio,
  participarSorteio,
  addTicket,
  realizarSorteio,
  cancelarSorteio,
} from "@/lib/sorteio-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const list = await getSorteios();
  const ativo = getAtivo(list);

  if (id) {
    const sorteio = list.find(x => x.id === id) ?? null;
    return NextResponse.json({ sorteio, sorteios: list, ativo }, { headers: NO_CACHE });
  }
  return NextResponse.json({ sorteios: list, ativo }, { headers: NO_CACHE });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { action } = body;

  if (action === "criar") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    const s = await criarSorteio({
      titulo: String(body.titulo || "Sorteio"),
      valor: String(body.valor || ""),
      minutosTicket: Number(body.minutosTicket) || 10,
      duracaoMinutos: Number(body.duracaoMinutos) || 60,
    });
    const list = await getSorteios();
    return NextResponse.json({ sorteio: s, sorteios: list }, { headers: NO_CACHE });
  }

  if (action === "participar") {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Login necessário" }, { status: 401 });
    }
    const username = session.user.twitchLogin ?? session.user.name ?? "";
    const result = await participarSorteio(
      username,
      session.user.name ?? username,
      session.user.image ?? null,
    );
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result, { headers: NO_CACHE });
  }

  if (action === "add-ticket") {
    const botSecret = process.env.BOT_SECRET;
    if (!botSecret || req.headers.get("x-bot-secret") !== botSecret) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    const { username, displayName, image } = body;
    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "username obrigatório" }, { status: 400 });
    }
    const ok = await addTicket(
      username,
      typeof displayName === "string" ? displayName : username,
      typeof image === "string" ? image : null,
    );
    return NextResponse.json({ ok }, { headers: NO_CACHE });
  }

  if (action === "sortear") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    const result = await realizarSorteio(String(body.id ?? ""));
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const list = await getSorteios();
    return NextResponse.json({ sorteio: result, sorteios: list }, { headers: NO_CACHE });
  }

  if (action === "cancelar") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    const id = body.id ? String(body.id) : null;
    await cancelarSorteio(id);
    const list = await getSorteios();
    return NextResponse.json({ ok: true, sorteios: list }, { headers: NO_CACHE });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}

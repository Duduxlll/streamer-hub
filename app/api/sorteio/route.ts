import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";

export interface Participante {
  username: string;
  displayName: string;
  image: string | null;
  tickets: number;
}

export interface Sorteio {
  id: string;
  titulo: string;
  valor: string;
  minutosTicket: number;
  duracaoMs: number;
  iniciadoEm: number;
  status: "ativo" | "pronto" | "finalizado" | "cancelado";
  participantes: Participante[];
  vencedor: Participante | null;
}

declare global {
  var __sorteios: Sorteio[] | undefined;
}

if (!globalThis.__sorteios) globalThis.__sorteios = [];

function getAll(): Sorteio[] {
  const list = globalThis.__sorteios ?? [];
  for (const s of list) {
    if (s.status === "ativo" && Date.now() >= s.iniciadoEm + s.duracaoMs) {
      s.status = "pronto";
    }
  }
  return list;
}

function getAtivo(): Sorteio | null {
  return getAll().find(s => s.status === "ativo" || s.status === "pronto") ?? null;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const all = getAll();
  if (id) {
    const s = all.find(x => x.id === id) ?? null;
    return NextResponse.json({ sorteio: s, sorteios: all, ativo: getAtivo() });
  }
  return NextResponse.json({ sorteios: all, ativo: getAtivo() });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json();
  const { action } = body;

  if (action === "criar") {
    if (!isAdmin(session?.user?.twitchLogin)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    const s: Sorteio = {
      id: Date.now().toString(),
      titulo: String(body.titulo || "Sorteio"),
      valor: String(body.valor || ""),
      minutosTicket: Math.max(1, Number(body.minutosTicket) || 10),
      duracaoMs: Math.max(60_000, Number(body.duracaoMinutos) * 60_000),
      iniciadoEm: Date.now(),
      status: "ativo",
      participantes: [],
      vencedor: null,
    };
    globalThis.__sorteios = [s, ...(globalThis.__sorteios ?? [])];
    return NextResponse.json({ sorteio: s, sorteios: getAll() });
  }

  if (action === "participar") {
    if (!session?.user) return NextResponse.json({ error: "Login necessário" }, { status: 401 });
    const s = getAtivo();
    if (!s) return NextResponse.json({ error: "Sem sorteio ativo" }, { status: 400 });
    const username = session.user.twitchLogin ?? session.user.name ?? "";
    if (s.participantes.find(p => p.username === username)) {
      return NextResponse.json({ sorteio: s, jaParticipa: true });
    }
    s.participantes.push({ username, displayName: session.user.name ?? username, image: session.user.image ?? null, tickets: 1 });
    return NextResponse.json({ sorteio: s });
  }

  if (action === "add-ticket") {
    const botSecret = process.env.BOT_SECRET;
    if (!botSecret || req.headers.get("x-bot-secret") !== botSecret) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    const s = getAtivo();
    if (!s || s.status !== "ativo") return NextResponse.json({ ok: false });
    const { username, displayName, image } = body;
    const ex = s.participantes.find(p => p.username === username);
    if (ex) ex.tickets += 1;
    else s.participantes.push({ username, displayName: displayName ?? username, image: image ?? null, tickets: 1 });
    return NextResponse.json({ ok: true });
  }

  if (action === "sortear") {
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const id = body.id as string;
    const list = getAll();
    const s = list.find(x => x.id === id) ?? getAtivo();
    if (!s) return NextResponse.json({ error: "Sem sorteio" }, { status: 400 });
    if (s.status === "finalizado") return NextResponse.json({ sorteio: s });
    if (s.participantes.length === 0) return NextResponse.json({ error: "Sem participantes" }, { status: 400 });
    const pool: Participante[] = [];
    for (const p of s.participantes) for (let i = 0; i < Math.max(p.tickets, 1); i++) pool.push(p);
    s.vencedor = pool[Math.floor(Math.random() * pool.length)];
    s.status = "finalizado";
    return NextResponse.json({ sorteio: s, sorteios: getAll() });
  }

  if (action === "cancelar") {
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const id = body.id as string;
    if (id) {
      globalThis.__sorteios = (globalThis.__sorteios ?? []).filter(s => s.id !== id);
    } else {
      globalThis.__sorteios = [];
    }
    return NextResponse.json({ ok: true, sorteios: getAll() });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}

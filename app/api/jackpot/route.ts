import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import { getJackpot, setJackpot, type Jackpot, type JackpotJogador } from "@/lib/jackpotStore";

let _jid = 0;

export async function GET() {
  return NextResponse.json(getJackpot());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json();
  const { action } = body;

  if (!isAdmin(session?.user?.twitchLogin)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  if (action === "criar") {
    const j: Jackpot = {
      id: Date.now().toString(),
      nome: String(body.nome || "Jackpot").trim(),
      valorEntrada: Math.max(0, Number(body.valorEntrada) || 0),
      status: "aguardando",
      jogadores: [],
      jogadorAtualIdx: 0,
      vencedor: null,
      criadoEm: Date.now(),
    };
    setJackpot(j);
    return NextResponse.json(j);
  }

  const j = getJackpot();
  if (!j) return NextResponse.json({ error: "Sem jackpot ativo" }, { status: 400 });

  if (action === "add-jogador") {
    if (j.status !== "aguardando") return NextResponse.json({ error: "Já iniciado" }, { status: 400 });
    const jogador: JackpotJogador = {
      id: String(++_jid),
      nome: String(body.nome || "Jogador").trim(),
      jogo: String(body.jogo || "").trim(),
      valor: null,
    };
    j.jogadores.push(jogador);
    setJackpot(j);
    return NextResponse.json(j);
  }

  if (action === "remove-jogador") {
    if (j.status !== "aguardando") return NextResponse.json({ error: "Já iniciado" }, { status: 400 });
    j.jogadores = j.jogadores.filter(jg => jg.id !== String(body.id));
    setJackpot(j);
    return NextResponse.json(j);
  }

  if (action === "iniciar") {
    if (j.jogadores.length < 2) return NextResponse.json({ error: "Mínimo 2 jogadores" }, { status: 400 });
    j.status = "ativo";
    j.jogadorAtualIdx = 0;
    setJackpot(j);
    return NextResponse.json(j);
  }

  if (action === "registrar") {
    if (j.status !== "ativo") return NextResponse.json({ error: "Jackpot não está ativo" }, { status: 400 });
    if (j.jogadorAtualIdx >= j.jogadores.length) return NextResponse.json({ error: "Todos jogaram" }, { status: 400 });
    const raw = String(body.valor ?? "0").replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".");
    const valor = parseFloat(raw);
    if (isNaN(valor) || valor < 0) return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
    j.jogadores[j.jogadorAtualIdx].valor = valor;
    j.jogadorAtualIdx++;
    if (j.jogadorAtualIdx >= j.jogadores.length) {
      j.status = "finalizado";
      j.vencedor = j.jogadores.reduce((best, jg) =>
        (jg.valor ?? -1) > (best?.valor ?? -1) ? jg : best, j.jogadores[0]);
    }
    setJackpot(j);
    return NextResponse.json(j);
  }

  if (action === "cancelar") {
    setJackpot(null);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}

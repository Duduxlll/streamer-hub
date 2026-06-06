import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isVerifiedAdminSession } from "@/lib/admin-identity";
import { getJackpot, setJackpot, salvarHistoricoJackpot, type Jackpot, type JackpotJogador } from "@/lib/jackpotStore";

function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

export async function GET() {
  return NextResponse.json(await getJackpot());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json();
  const { action } = body;

  if (!(await isVerifiedAdminSession(session))) {
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
    await setJackpot(j);
    return NextResponse.json(j);
  }

  const j = await getJackpot();
  if (!j) return NextResponse.json({ error: "Sem jackpot ativo" }, { status: 400 });

  if (action === "add-jogador") {
    if (j.status === "finalizado") return NextResponse.json({ error: "Jackpot já finalizado" }, { status: 400 });
    const jogador: JackpotJogador = {
      id: newId(),
      nome: String(body.nome || "Jogador").trim(),
      jogo: String(body.jogo || "").trim(),
      valor: null,
    };
    j.jogadores.push(jogador);
    await setJackpot(j);
    return NextResponse.json(j);
  }

  if (action === "remove-jogador") {
    if (j.status === "finalizado") return NextResponse.json({ error: "Jackpot já finalizado" }, { status: 400 });
    const alvo = j.jogadores.find(jg => jg.id === String(body.id));
    if (alvo && alvo.valor !== null) return NextResponse.json({ error: "Jogador já jogou" }, { status: 400 });
    j.jogadores = j.jogadores.filter(jg => jg.id !== String(body.id));
    if (j.status === "ativo" && j.jogadorAtualIdx >= j.jogadores.length) {
      j.jogadorAtualIdx = Math.max(0, j.jogadores.length - 1);
    }
    await setJackpot(j);
    return NextResponse.json(j);
  }

  if (action === "edit-jogador") {
    if (j.status === "finalizado") return NextResponse.json({ error: "Jackpot já finalizado" }, { status: 400 });
    const idx = j.jogadores.findIndex(jg => jg.id === String(body.id));
    if (idx < 0) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    j.jogadores[idx].nome = String(body.nome || j.jogadores[idx].nome).trim();
    j.jogadores[idx].jogo = String(body.jogo ?? j.jogadores[idx].jogo).trim();
    await setJackpot(j);
    return NextResponse.json(j);
  }

  if (action === "edit-valor") {
    const idx = j.jogadores.findIndex(jg => jg.id === String(body.id));
    if (idx < 0) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    const raw = String(body.valor ?? "0").replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".");
    const valor = parseFloat(raw);
    if (isNaN(valor) || valor < 0) return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
    j.jogadores[idx].valor = valor;
    if (j.status === "finalizado") {
      j.vencedor = j.jogadores.reduce((best, jg) =>
        (jg.valor ?? -1) > (best?.valor ?? -1) ? jg : best, j.jogadores[0]);
    }
    await setJackpot(j);
    return NextResponse.json(j);
  }

  if (action === "iniciar") {
    if (j.jogadores.length < 2) return NextResponse.json({ error: "Mínimo 2 jogadores" }, { status: 400 });
    j.status = "ativo";
    j.jogadorAtualIdx = 0;
    await setJackpot(j);
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
      await setJackpot(j);
      await salvarHistoricoJackpot(j);
    } else {
      await setJackpot(j);
    }
    return NextResponse.json(j);
  }

  if (action === "cancelar") {
    await setJackpot(null);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}

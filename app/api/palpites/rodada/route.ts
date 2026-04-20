import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import { getRodada, abrirRodada, travarPalpites, fecharRodada, saveResultado, queueChatMessage } from "@/lib/store";

export async function GET() {
  return NextResponse.json(getRodada());
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !isAdmin(session.user?.twitchLogin)) {
    return NextResponse.json({ error: "Proibido" }, { status: 403 });
  }

  const body = await req.json() as {
    action: string;
    buyIn?: number;
    numVencedores?: number;
    resultado?: number;
  };

  /* ── Abrir rodada ── */
  if (body.action === "open") {
    const buyIn = Number(body.buyIn ?? 0);
    const numVencedores = Number(body.numVencedores ?? 1);
    if (buyIn <= 0) return NextResponse.json({ error: "Buy-in inválido" }, { status: 400 });

    const rodada = abrirRodada(buyIn, numVencedores);

    queueChatMessage(
      `🎯 PALPITE ABERTO! Bônus no valor de R$ ${buyIn.toLocaleString("pt-BR")}. ` +
      `Use !p <valor> para participar! Ex: !p 230 — Quem acertar mais perto ganha! 🏆`
    );

    return NextResponse.json(rodada);
  }

  /* ── Travar palpites (ninguém mais muda) ── */
  if (body.action === "lock") {
    travarPalpites();
    queueChatMessage(`🔒 Palpites fechados! Ninguém mais pode participar. Aguardando resultado... ⏳`);
    return NextResponse.json(getRodada());
  }

  /* ── Definir vencedor e encerrar ── */
  if (body.action === "close") {
    const temResultado = typeof body.resultado === "number";
    const resultadoSalvo = saveResultado(temResultado ? body.resultado : undefined);

    if (temResultado && resultadoSalvo && resultadoSalvo.vencedores.length > 0) {
      const v = resultadoSalvo.vencedores;
      const res = body.resultado!;
      if (v.length === 1) {
        queueChatMessage(
          `🏆 VENCEDOR DEFINIDO! Resultado: R$ ${res.toLocaleString("pt-BR")}. ` +
          `🥇 @${v[0].username} palpitou R$ ${v[0].valor.toLocaleString("pt-BR")} — diferença de apenas R$ ${v[0].diferenca.toLocaleString("pt-BR")}! Parabéns! 🎉`
        );
      } else {
        const lista = v.map((x, i) => `${i + 1}º @${x.username} (R$ ${x.valor.toLocaleString("pt-BR")})`).join(" | ");
        queueChatMessage(
          `🏆 VENCEDORES DEFINIDOS! Resultado: R$ ${res.toLocaleString("pt-BR")}. ${lista} Parabéns! 🎉`
        );
      }
    } else if (temResultado) {
      queueChatMessage(`Resultado: R$ ${body.resultado!.toLocaleString("pt-BR")}. Nenhum participante nesta rodada.`);
    } else {
      queueChatMessage(`Rodada encerrada sem resultado definido. Até a próxima! 👋`);
    }

    fecharRodada();
    return NextResponse.json({ ok: true, resultado: resultadoSalvo });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}

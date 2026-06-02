import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import { getRodada, abrirRodada, travarPalpites, fecharRodada, queueChatMessage } from "@/lib/store";
import type { ResultadoRodada } from "@/lib/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export async function GET() {
  return NextResponse.json(await getRodada(), { headers: NO_STORE_HEADERS });
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
    modoVitoria?: "aproximado" | "exato";
    multiplosPalpites?: boolean;
  };

  if (body.action === "open") {
    const buyIn = Number(body.buyIn ?? 0);
    const numVencedores = Number(body.numVencedores ?? 1);
    const modoVitoria = body.modoVitoria === "exato" ? "exato" : "aproximado";
    const multiplosPalpites = body.multiplosPalpites === true;
    if (buyIn <= 0) return NextResponse.json({ error: "Buy-in inválido" }, { status: 400 });

    const rodada = await abrirRodada(buyIn, numVencedores, modoVitoria, multiplosPalpites);

    const regra = modoVitoria === "exato"
      ? "Quem acertar o valor EXATO ganha!"
      : "Quem acertar mais perto ganha!";
    const vezes = multiplosPalpites
      ? " Você pode palpitar quantas vezes quiser!"
      : "";

    await queueChatMessage(
      `🎯 PALPITE ABERTO! Bônus no valor de R$ ${buyIn.toLocaleString("pt-BR")}. ` +
      `Use !p <valor> para participar! Ex: !p 230 — ${regra}${vezes} 🏆`
    );

    return NextResponse.json(rodada, { headers: NO_STORE_HEADERS });
  }

  if (body.action === "lock") {
    await travarPalpites();
    await queueChatMessage(`🔒 Palpites fechados! Ninguém mais pode participar. Aguardando resultado... ⏳`);
    return NextResponse.json(await getRodada(), { headers: NO_STORE_HEADERS });
  }

  if (body.action === "close") {
    const temResultado = typeof body.resultado === "number";
    const res = temResultado ? body.resultado! : undefined;

    const buildMsg = (entry: ResultadoRodada): string => {
      if (temResultado && entry.vencedores.length > 0) {
        const v = entry.vencedores;
        if (v.length === 1) {
          return (
            `🏆 VENCEDOR DEFINIDO! Resultado: R$ ${res!.toLocaleString("pt-BR")}. ` +
            `🥇 @${v[0].username} palpitou R$ ${v[0].valor.toLocaleString("pt-BR")} — diferença de apenas R$ ${v[0].diferenca.toLocaleString("pt-BR")}! Parabéns! 🎉`
          );
        }
        const lista = v.map((x, i) => `${i + 1}º @${x.username} (R$ ${x.valor.toLocaleString("pt-BR")})`).join(" | ");
        return `🏆 VENCEDORES DEFINIDOS! Resultado: R$ ${res!.toLocaleString("pt-BR")}. ${lista} Parabéns! 🎉`;
      }
      if (temResultado) return `Resultado: R$ ${res!.toLocaleString("pt-BR")}. Nenhum participante nesta rodada.`;
      return `Rodada encerrada sem resultado definido. Até a próxima! 👋`;
    };

    const resultadoSalvo = await fecharRodada(res, buildMsg);
    return NextResponse.json({ ok: true, resultado: resultadoSalvo }, { headers: NO_STORE_HEADERS });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}

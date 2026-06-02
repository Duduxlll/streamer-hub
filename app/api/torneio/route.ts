import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import {
  getTorneio, criarTorneio, fecharFase, decidirFase,
  abrirProximaFase, finalizarTorneio, setValorBonus,
} from "@/lib/torneioStore";
import { queueChatMessage } from "@/lib/store";

export async function GET() {
  return NextResponse.json(await getTorneio());
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !isAdmin(session.user?.twitchLogin)) {
    return NextResponse.json({ error: "Proibido" }, { status: 403 });
  }

  const body = await req.json() as {
    action: string;
    nome?: string;
    times?: string[];
    time?: string;
    faseNum?: number;
    valor?: number;
  };

  if (body.action === "criar") {
    const times = (body.times ?? []).map(t => t.trim()).filter(Boolean);
    if (!body.nome?.trim() || times.length < 2)
      return NextResponse.json({ error: "Nome e pelo menos 2 times são obrigatórios" }, { status: 400 });
    const torneio = await criarTorneio(body.nome.trim(), times);
    const cmds = times.map(t => `!time ${t}`).join(" | ");
    await queueChatMessage(`🏆 TORNEIO "${torneio.nome}" COMEÇOU! Fase 1 aberta! Escolha: ${cmds} 🎯`);
    return NextResponse.json(torneio);
  }

  if (body.action === "fechar-fase") {
    const torneio = await fecharFase();
    if (!torneio) return NextResponse.json({ error: "Nenhuma fase aberta" }, { status: 400 });
    await queueChatMessage(`🔒 Fase ${torneio.faseAtual} FECHADA! Ninguém mais pode participar. Aguardando resultado...`);
    return NextResponse.json(torneio);
  }

  if (body.action === "decidir") {
    if (!body.time) return NextResponse.json({ error: "Time obrigatório" }, { status: 400 });
    const torneio = await decidirFase(body.time);
    if (!torneio) return NextResponse.json({ error: "Não foi possível decidir (fase não está fechada ou time inválido)" }, { status: 400 });
    const vivos = torneio.classificados?.length ?? 0;
    await queueChatMessage(
      `✅ Fase ${torneio.faseAtual} decidida! Time vencedor: ${body.time}. ` +
      `${vivos} participante${vivos !== 1 ? "s" : ""} seguem vivos no torneio! 🎉`
    );
    return NextResponse.json(torneio);
  }

  if (body.action === "abrir-fase") {
    const times = (body.times ?? []).map(t => t.trim()).filter(Boolean);
    if (times.length < 2) return NextResponse.json({ error: "Pelo menos 2 times" }, { status: 400 });
    const torneio = await abrirProximaFase(times);
    if (!torneio) return NextResponse.json({ error: "Fase atual não foi decidida" }, { status: 400 });
    const cmds = times.map(t => `!time ${t}`).join(" | ");
    await queueChatMessage(
      `🏆 Fase ${torneio.faseAtual} aberta! Apenas classificados podem participar. Escolha: ${cmds} 🎯`
    );
    return NextResponse.json(torneio);
  }

  if (body.action === "set-valor") {
    if (!body.time || body.faseNum == null) return NextResponse.json({ error: "time e faseNum obrigatórios" }, { status: 400 });
    const torneio = await setValorBonus(body.faseNum, body.time, body.valor ?? 0);
    if (!torneio) return NextResponse.json({ error: "Fase não encontrada" }, { status: 400 });
    return NextResponse.json(torneio);
  }

  if (body.action === "finalizar") {
    const torneio = await finalizarTorneio();
    if (!torneio) return NextResponse.json({ error: "Nenhum torneio ativo" }, { status: 400 });

    // Mapeia username → displayName a partir das escolhas de todas as fases
    const nameMap = new Map<string, string>();
    for (const fase of torneio.fases) {
      for (const e of fase.escolhas) nameMap.set(e.username.toLowerCase(), e.displayName);
    }
    const vencedores = torneio.vencedoresFinais.map(u => ({
      username: u,
      displayName: nameMap.get(u.toLowerCase()) ?? u,
    }));

    const vencedoresStr = vencedores.map(v => `@${v.displayName}`).join(", ") || "Nenhum";
    await queueChatMessage(`🎊 TORNEIO "${torneio.nome}" FINALIZADO! Vencedores: ${vencedoresStr} — Parabéns! 🏆`);
    return NextResponse.json({ ok: true, nome: torneio.nome, vencedores });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}

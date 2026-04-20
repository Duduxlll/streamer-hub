import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getMessage } from "@/lib/livepix";
import { getJackpot, setJackpot, type JackpotJogador } from "@/lib/jackpotStore";
import { dbGet, dbSet } from "@/lib/store";

function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

export async function POST(req: NextRequest) {
  const secret = process.env.LIVEPIX_WEBHOOK_SECRET;

  // Secret é obrigatório — recusa tudo se não configurado
  if (!secret) {
    console.error("LIVEPIX_WEBHOOK_SECRET não configurado — webhook rejeitado");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const header = req.headers.get("x-webhook-secret") ?? req.headers.get("x-livepix-secret") ?? "";

  // Comparação em tempo constante para evitar timing attacks
  let authorized = false;
  try {
    if (header.length > 0 && header.length === secret.length) {
      authorized = crypto.timingSafeEqual(Buffer.from(header), Buffer.from(secret));
    }
  } catch {
    authorized = false;
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { event?: string; resource?: { id?: string; type?: string; reference?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  const messageId = body.resource?.id;
  if (!messageId) return NextResponse.json({ ok: true, skipped: "sem messageId" });

  // Idempotência: evita processar o mesmo evento duas vezes (retry do LivePix)
  const idempotencyKey = `livepix:processed:${messageId}`;
  const alreadyProcessed = await dbGet(idempotencyKey);
  if (alreadyProcessed) {
    return NextResponse.json({ ok: true, skipped: "already processed" });
  }

  const jackpot = await getJackpot();
  if (!jackpot) return NextResponse.json({ ok: true, skipped: "sem jackpot" });

  try {
    const msg = await getMessage(messageId);

    /* ── Fase aguardando: adiciona jogador automaticamente ── */
    if (jackpot.status === "aguardando") {
      const pagoCentavos    = Math.round(msg.amount);
      const entradaCentavos = Math.round(jackpot.valorEntrada * 100);
      if (pagoCentavos !== entradaCentavos) {
        console.log(`⚠️ Valor ignorado: R$ ${msg.amount / 100} (esperado R$ ${jackpot.valorEntrada})`);
        return NextResponse.json({ ok: true, skipped: "valor incorreto" });
      }

      const jaExiste = jackpot.jogadores.some(
        j => j.nome.toLowerCase() === msg.username.toLowerCase()
      );
      if (jaExiste) {
        await dbSet(idempotencyKey, Date.now().toString());
        return NextResponse.json({ ok: true, skipped: "jogador já cadastrado" });
      }

      const jogador: JackpotJogador = {
        id: newId(),
        nome: msg.username,
        jogo: msg.message || "",
        valor: null,
      };
      jackpot.jogadores.push(jogador);
      await setJackpot(jackpot);
      await dbSet(idempotencyKey, Date.now().toString());
      console.log(`✅ Jogador adicionado: ${jogador.nome} | jogo: ${jogador.jogo}`);
      return NextResponse.json({ ok: true, acao: "jogador-adicionado", jogador: jogador.nome });
    }

    /* ── Fase ativo: registra valor do jogador atual ── */
    if (jackpot.status === "ativo") {
      const jogadorAtual = jackpot.jogadores[jackpot.jogadorAtualIdx];
      if (!jogadorAtual || jogadorAtual.valor !== null) {
        return NextResponse.json({ ok: true, skipped: "jogador atual já registrado" });
      }

      const valor = msg.amount / 100;
      jogadorAtual.valor = valor;
      jackpot.jogadorAtualIdx++;

      if (jackpot.jogadorAtualIdx >= jackpot.jogadores.length) {
        jackpot.status = "finalizado";
        jackpot.vencedor = jackpot.jogadores.reduce((best, jg) =>
          (jg.valor ?? -1) > (best?.valor ?? -1) ? jg : best, jackpot.jogadores[0]);
      }

      await setJackpot(jackpot);
      await dbSet(idempotencyKey, Date.now().toString());
      console.log(`✅ Valor registrado: ${jogadorAtual.nome} → R$ ${valor}`);
      return NextResponse.json({ ok: true, acao: "valor-registrado", jogador: jogadorAtual.nome, valor });
    }

    return NextResponse.json({ ok: true, skipped: "jackpot finalizado" });
  } catch (err) {
    console.error("LivePix webhook erro:", err);
    return NextResponse.json({ error: "Falha ao buscar mensagem" }, { status: 502 });
  }
}

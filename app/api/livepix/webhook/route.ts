import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getMessage } from "@/lib/livepix";
import { getJackpot, setJackpot, type JackpotJogador } from "@/lib/jackpotStore";
import { dbGet, dbSet } from "@/lib/store";

function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

export async function POST(req: NextRequest) {
  const secret = process.env.LIVEPIX_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[livepix/webhook] ❌ LIVEPIX_WEBHOOK_SECRET não configurado");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Log all headers relacionados à autenticação para diagnóstico
  const headerAuth  = req.headers.get("x-webhook-secret");
  const headerAlt   = req.headers.get("x-livepix-secret");
  const headerSig   = req.headers.get("x-signature");
  const headerAuth2 = req.headers.get("authorization");
  const header = headerAuth ?? headerAlt ?? headerSig ?? "";

  let authorized = false;
  try {
    if (header.length > 0 && header.length === secret.length) {
      authorized = crypto.timingSafeEqual(Buffer.from(header), Buffer.from(secret));
    } else if (header.length === 0 && headerAuth2) {
      // Tenta Authorization: Bearer <secret>
      const bearer = headerAuth2.replace(/^Bearer\s+/i, "");
      if (bearer.length === secret.length) {
        authorized = crypto.timingSafeEqual(Buffer.from(bearer), Buffer.from(secret));
      }
    }
  } catch {
    authorized = false;
  }

  if (!authorized) {
    console.error(
      "[livepix/webhook] ❌ Auth falhou." +
      ` x-webhook-secret=${headerAuth ? `"${headerAuth.slice(0, 6)}..."` : "(ausente)"}` +
      ` x-livepix-secret=${headerAlt ? `"${headerAlt.slice(0, 6)}..."` : "(ausente)"}` +
      ` x-signature=${headerSig ? `"${headerSig.slice(0, 6)}..."` : "(ausente)"}` +
      ` authorization=${headerAuth2 ? "(presente)" : "(ausente)"}` +
      ` secret-len=${secret.length} header-len=${header.length}`
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { event?: string; resource?: { id?: string; type?: string; reference?: string } };
  try {
    body = await req.json();
  } catch (err) {
    console.error("[livepix/webhook] ❌ Body inválido (não é JSON):", err);
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  const messageId = body.resource?.id;

  if (!messageId) {
    // Não é erro — eventos sem messageId são normais (ex: ping)
    return NextResponse.json({ ok: true, skipped: "sem messageId" });
  }

  const idempotencyKey = `livepix:processed:${messageId}`;
  const alreadyProcessed = await dbGet(idempotencyKey);
  if (alreadyProcessed) {
    return NextResponse.json({ ok: true, skipped: "already processed" });
  }

  const jackpot = await getJackpot();
  if (!jackpot) {
    return NextResponse.json({ ok: true, skipped: "sem jackpot" });
  }

  let msg: Awaited<ReturnType<typeof getMessage>>;
  try {
    msg = await getMessage(messageId);
  } catch (err) {
    console.error(`[livepix/webhook] ❌ Falha ao buscar mensagem ${messageId}:`, err);
    return NextResponse.json({ error: "Falha ao buscar mensagem" }, { status: 502 });
  }

  if (jackpot.status === "aguardando") {
    // msg.amount vem em centavos; valorEntrada está em reais
    const pagoCentavos    = Math.round(msg.amount);
    const entradaCentavos = Math.round(jackpot.valorEntrada * 100);

    if (pagoCentavos !== entradaCentavos) {
      console.error(
        `[livepix/webhook] ❌ Valor incorreto de ${msg.username}.` +
        ` Recebido: ${pagoCentavos} centavos (R$ ${(pagoCentavos / 100).toFixed(2)}).` +
        ` Esperado: ${entradaCentavos} centavos (R$ ${jackpot.valorEntrada.toFixed(2)}).`
      );
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
    console.log(`[livepix/webhook] ✅ Jogador adicionado: ${jogador.nome} | jogo: "${jogador.jogo}"`);
    return NextResponse.json({ ok: true, acao: "jogador-adicionado", jogador: jogador.nome });
  }

  if (jackpot.status === "ativo") {
    const jogadorAtual = jackpot.jogadores[jackpot.jogadorAtualIdx];
    if (!jogadorAtual) {
      console.error(`[livepix/webhook] ❌ jogadorAtualIdx=${jackpot.jogadorAtualIdx} fora do array (len=${jackpot.jogadores.length})`);
      return NextResponse.json({ ok: true, skipped: "todos jogaram" });
    }
    if (jogadorAtual.valor !== null) {
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
    console.log(`[livepix/webhook] ✅ Valor registrado: ${jogadorAtual.nome} → R$ ${valor.toFixed(2)}`);
    return NextResponse.json({ ok: true, acao: "valor-registrado", jogador: jogadorAtual.nome, valor });
  }

  return NextResponse.json({ ok: true, skipped: "jackpot finalizado" });
}

import { NextRequest, NextResponse } from "next/server";
import { getMessage, getWebhookSecret, safeCompareWebhookSecret } from "@/lib/livepix";
import { getJackpot, setJackpot, type JackpotJogador } from "@/lib/jackpotStore";
import { dbGet, dbSet } from "@/lib/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

export async function GET() {
  return new NextResponse("OK", { status: 200 });
}

export async function POST(req: NextRequest) {
  const secret = await getWebhookSecret();

  if (!secret) {
    console.error("[livepix/webhook] ❌ Webhook Secret não configurado");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const candidate = req.nextUrl.searchParams.get("secret") ?? "";
  if (!safeCompareWebhookSecret(candidate, secret)) {
    console.error("[livepix/webhook] ❌ Secret inválido ou ausente na URL");
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

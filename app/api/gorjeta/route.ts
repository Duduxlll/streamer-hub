import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import {
  getCadastros, getCadastro, cadastrar, aprovarCadastro, rejeitarCadastro, editarCpfCadastro, editarChaveCadastro, deletarCadastro,
  getScreenshot, getSessao, abrirSessao, entrarSessao, sortearGorjeta,
  salvarPagamentos, liberarVencedoresSorteio, registrarManual, adicionarParticipanteTeste, fecharSessaoSemPagar, limparSessao, limparInscritosSessao,
  getHistoricoGorjeta, limparHistorico, mascarCpf, normalizarChave, atualizarTransacaoPorTxid,
  getPagamentos, adicionarPagamentos, atualizarStatusPagamento, removerPagamento, limparPagamentosFinalizados,
  type ResultadoPagamento, type TipoChavePix,
} from "@/lib/gorjeta-store";
import { enviarPix } from "@/lib/ggpix";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

function gerarExternalId(): string {
  return `gorjeta${Date.now()}${Math.random().toString(36).slice(2, 8)}`.slice(0, 35);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const adminUser = isAdmin(session?.user?.twitchLogin);
  const tipo = req.nextUrl.searchParams.get("tipo");
  const screenshotId = req.nextUrl.searchParams.get("screenshot");

  if (screenshotId) {
    if (!adminUser) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const data = await getScreenshot(screenshotId);
    if (!data) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json({ screenshot: data }, { headers: NO_CACHE });
  }

  if (tipo === "cadastros" && adminUser) {
    const cadastros = await getCadastros();
    return NextResponse.json({ cadastros }, { headers: NO_CACHE });
  }

  if (tipo === "pagamentos" && adminUser) {
    const pagamentos = await getPagamentos();
    return NextResponse.json({ pagamentos }, { headers: NO_CACHE });
  }

  const [sessaoRaw, historico] = await Promise.all([getSessao(), getHistoricoGorjeta()]);

  const sessaoPublic = sessaoRaw ? {
    ...sessaoRaw,
    participantes: sessaoRaw.participantes.map(p => ({ ...p, cpf: mascarCpf(p.cpf) })),
    vencedores: sessaoRaw.vencedores.map(p => ({ ...p, cpf: mascarCpf(p.cpf) })),
  } : null;

  let meucadastro = null;
  if (session?.user) {
    const login = session.user.twitchLogin ?? session.user.name ?? "";
    meucadastro = await getCadastro(login);
  }

  return NextResponse.json(
    { sessao: adminUser ? sessaoRaw : sessaoPublic, historico, meucadastro },
    { headers: NO_CACHE },
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { action } = body;

  if (action === "cadastrar") {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Login necessário" }, { status: 401 });
    const login = (session.user.twitchLogin ?? session.user.name ?? "").toLowerCase();
    const tiposValidos = ["cpf", "telefone", "email", "aleatoria"];
    const tipoChave = tiposValidos.includes(body.tipoChave) ? body.tipoChave : "cpf";
    const chaveRaw = String(body.chave ?? body.cpf ?? "");

    let cpfTitular: string | undefined;
    const chaveNorm = normalizarChave(chaveRaw, tipoChave);
    if (chaveNorm) {
      if (tipoChave === "cpf") {
        cpfTitular = chaveNorm;
      } else if (body.cpfVerificacao) {
        const cpfVer = normalizarChave(String(body.cpfVerificacao), "cpf");
        if (cpfVer) cpfTitular = cpfVer;
      }
    }

    const result = await cadastrar({
      username: login, displayName: session.user.name ?? login,
      tipoChave, chave: chaveRaw, cpfTitular,
      nomeCompleto: String(body.nomeCompleto ?? ""),
      screenshot: String(body.screenshot ?? ""),
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, cadastro: result.cadastro }, { headers: NO_CACHE });
  }


  if (action === "reenviar-print") {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Login necessário" }, { status: 401 });
    const login = (session.user.twitchLogin ?? session.user.name ?? "").toLowerCase();
    const cad = await getCadastro(login);
    if (!cad) return NextResponse.json({ error: "Você ainda não tem cadastro" }, { status: 400 });

    const screenshot = String(body.screenshot ?? "");
    if (!screenshot.startsWith("data:image/")) return NextResponse.json({ error: "Envie o print do depósito" }, { status: 400 });

    const result = await cadastrar({
      username: login,
      displayName: cad.displayName,
      tipoChave: cad.tipoChave ?? "cpf",
      chave: cad.cpf,
      cpfTitular: cad.cpfTitular ?? ((cad.tipoChave ?? "cpf") === "cpf" ? cad.cpf : undefined),
      nomeCompleto: cad.nomeCompleto,
      screenshot,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, cadastro: result.cadastro }, { headers: NO_CACHE });
  }

  if (action === "aprovar") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const c = await aprovarCadastro(String(body.id ?? ""));
    if (!c) return NextResponse.json({ error: "Cadastro não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, cadastro: c }, { headers: NO_CACHE });
  }

  if (action === "rejeitar") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const c = await rejeitarCadastro(String(body.id ?? ""), String(body.motivo ?? ""));
    if (!c) return NextResponse.json({ error: "Cadastro não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, cadastro: c }, { headers: NO_CACHE });
  }

  if (action === "editar-cpf") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const c = await editarCpfCadastro(String(body.id ?? ""), String(body.cpf ?? ""));
    if (!c) return NextResponse.json({ error: "CPF inválido ou cadastro não encontrado" }, { status: 400 });
    return NextResponse.json({ ok: true, cadastro: c }, { headers: NO_CACHE });
  }

  if (action === "editar-chave") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const tiposValidos = ["cpf", "telefone", "email", "aleatoria"];
    const tipoChave = tiposValidos.includes(body.tipoChave) ? body.tipoChave : "cpf";
    const c = await editarChaveCadastro(String(body.id ?? ""), tipoChave, String(body.chave ?? ""));
    if (!c) return NextResponse.json({ error: "Chave inválida ou cadastro não encontrado" }, { status: 400 });
    return NextResponse.json({ ok: true, cadastro: c }, { headers: NO_CACHE });
  }

  if (action === "abrir-sessao") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const result = await abrirSessao({ saldoTotal: Number(body.saldoTotal) || 100 });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, sessao: result.sessao }, { headers: NO_CACHE });
  }

  if (action === "fechar-sessao") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    await fecharSessaoSemPagar();
    return NextResponse.json({ ok: true }, { headers: NO_CACHE });
  }

  if (action === "limpar-sessao") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    await limparSessao();
    return NextResponse.json({ ok: true }, { headers: NO_CACHE });
  }

  if (action === "limpar-inscritos") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const result = await limparInscritosSessao();
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, sessao: result.sessao }, { headers: NO_CACHE });
  }

  if (action === "entrar") {
    const botSecret = process.env.BOT_SECRET;
    if (!botSecret || req.headers.get("x-bot-secret") !== botSecret) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    const { username, displayName, image } = body;
    if (!username) return NextResponse.json({ error: "username obrigatório" }, { status: 400 });
    const result = await entrarSessao(String(username), typeof displayName === "string" ? displayName : String(username), typeof image === "string" ? image : null);
    return NextResponse.json(result, { headers: NO_CACHE });
  }

  if (action === "sortear") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const result = await sortearGorjeta({
      valorUnitario: body.valorUnitario ? Number(body.valorUnitario) : undefined,
      maxVencedores: body.maxVencedores ? Number(body.maxVencedores) : undefined,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, sessao: result.sessao }, { headers: NO_CACHE });
  }

  if (action === "pagar") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const sessao = await getSessao();
    if (!sessao) return NextResponse.json({ error: "Sem sessão" }, { status: 400 });
    if (sessao.status !== "sorteada") return NextResponse.json({ error: "Sorteie primeiro" }, { status: 400 });
    if (sessao.vencedores.length === 0) return NextResponse.json({ error: "Sem vencedores" }, { status: 400 });

    const pagamentos: ResultadoPagamento[] = [];
    for (const v of sessao.vencedores) {
      const externalId = gerarExternalId();
      try {
        await enviarPix(v.cpf, v.tipoChave ?? "cpf", sessao.valorUnitario, externalId);
        pagamentos.push({ username: v.username, displayName: v.displayName, cpf: v.cpf, nomeCompleto: v.nomeCompleto, status: "enviado", txid: externalId });
      } catch (err) {
        const erroMsg = err instanceof Error ? err.message : "Erro desconhecido";
        console.error("[gorjeta/pagar] Falha PIX para", v.username, "—", erroMsg);
        pagamentos.push({ username: v.username, displayName: v.displayName, cpf: v.cpf, nomeCompleto: v.nomeCompleto, status: "falhou", erro: erroMsg });
      }
    }

    const sessaoFinal = await salvarPagamentos(pagamentos, sessao.valorUnitario);
    return NextResponse.json({ ok: true, pagamentos, sessao: sessaoFinal }, { headers: NO_CACHE });
  }

  if (action === "enviar-manual") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const { username, valor } = body;
    if (!username || !valor) return NextResponse.json({ error: "username e valor obrigatórios" }, { status: 400 });
    const valorNum = Number(valor);
    if (isNaN(valorNum) || valorNum <= 0) return NextResponse.json({ error: "Valor inválido" }, { status: 400 });

    const sessao = await getSessao();
    if (!sessao || sessao.status === "fechada") return NextResponse.json({ error: "Sem sessão ativa" }, { status: 400 });

    const participante = sessao.participantes.find(p => p.username === String(username).toLowerCase());
    if (!participante) return NextResponse.json({ error: "Participante não encontrado na sessão" }, { status: 404 });

    if (valorNum > sessao.saldoRestante) {
      return NextResponse.json({ error: `Saldo insuficiente (disponível: R$ ${sessao.saldoRestante.toFixed(2)})` }, { status: 400 });
    }

    const externalId = gerarExternalId();
    let result: { status: "enviado" | "falhou"; txid?: string; erro?: string };
    try {
      await enviarPix(participante.cpf, participante.tipoChave ?? "cpf", valorNum, externalId);
      result = { status: "enviado", txid: externalId };
    } catch (err) {
      const erroMsg = err instanceof Error ? err.message : "Erro";
      console.error("[gorjeta/automatico] Falha PIX para", username, "—", erroMsg);
      result = { status: "falhou", erro: erroMsg };
    }

    const sessaoAtualizada = await registrarManual(participante.username, participante.displayName, valorNum, result, "automatico");
    return NextResponse.json({ ok: true, result, sessao: sessaoAtualizada }, { headers: NO_CACHE });
  }

  if (action === "deletar-cadastro") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const ok = await deletarCadastro(String(body.id ?? ""));
    if (!ok) return NextResponse.json({ error: "Cadastro não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true }, { headers: NO_CACHE });
  }

  if (action === "limpar-historico") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    await limparHistorico();
    return NextResponse.json({ ok: true }, { headers: NO_CACHE });
  }



  if (action === "pagar-fila") {

    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const sessao = await getSessao();
    if (!sessao || sessao.status !== "sorteada") return NextResponse.json({ error: "Sorteie primeiro" }, { status: 400 });
    if (sessao.vencedores.length === 0) return NextResponse.json({ error: "Sem vencedores" }, { status: 400 });


    const pagamentos = await adicionarPagamentos(sessao.vencedores.map(v => ({
      username:    v.username,
      displayName: v.displayName,
      pixKey:      v.cpf,
      tipoChave:   (v.tipoChave ?? "cpf") as TipoChavePix,
      valor:       sessao.valorUnitario,
      tipo:        "sorteio" as const,
    })));

    for (const pag of pagamentos) {
      await registrarManual(pag.username, pag.displayName, pag.valor, { status: "pendente", txid: `fila-${pag.id}` }, "manual");
    }
    const sessaoFinal = await liberarVencedoresSorteio();
    return NextResponse.json({ ok: true, sessao: sessaoFinal }, { headers: NO_CACHE });
  }

  if (action === "enviar-manual-fila") {

    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const { username, valor } = body;
    if (!username || !valor) return NextResponse.json({ error: "username e valor obrigatórios" }, { status: 400 });
    const valorNum = Number(valor);
    if (isNaN(valorNum) || valorNum <= 0) return NextResponse.json({ error: "Valor inválido" }, { status: 400 });

    const sessao = await getSessao();
    if (!sessao || sessao.status === "fechada") return NextResponse.json({ error: "Sem sessão ativa" }, { status: 400 });

    const participante = sessao.participantes.find(p => p.username === String(username).toLowerCase());
    if (!participante) return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 });

    if (valorNum > sessao.saldoRestante) {
      return NextResponse.json({ error: `Saldo insuficiente (disponível: R$ ${sessao.saldoRestante.toFixed(2)})` }, { status: 400 });
    }

    const pagamentos = await adicionarPagamentos([{
      username:    participante.username,
      displayName: participante.displayName,
      pixKey:      participante.cpf,
      tipoChave:   participante.tipoChave ?? "cpf",
      valor:       valorNum,
      tipo:        "manual" as const,
    }]);
    const pagamento = pagamentos[0];
    const sessaoAtualizada = await registrarManual(
      pagamento.username,
      pagamento.displayName,
      pagamento.valor,
      { status: "pendente", txid: `fila-${pagamento.id}` },
      "manual",
    );
    return NextResponse.json({ ok: true, pagamento, sessao: sessaoAtualizada ?? sessao }, { headers: NO_CACHE });
  }

  if (action === "fila-enviar") {

    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

    const lista = await getPagamentos();
    const pag = lista.find(p => p.id === id);
    if (!pag) return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 });
    if (pag.status === "enviado") return NextResponse.json({ error: "Já enviado" }, { status: 400 });

    const externalId = gerarExternalId();
    try {
      await enviarPix(pag.pixKey, pag.tipoChave, pag.valor, externalId);
      await atualizarStatusPagamento(id, "enviado");
      const updated = await atualizarTransacaoPorTxid(`fila-${id}`, "enviado");
      const sessaoAtualizada = updated
        ? await getSessao()
        : await registrarManual(pag.username, pag.displayName, pag.valor, { status: "enviado", txid: externalId }, "automatico");
      return NextResponse.json({ ok: true, status: "enviado", sessao: sessaoAtualizada }, { headers: NO_CACHE });
    } catch (err) {
      const erroMsg = err instanceof Error ? err.message : "Erro desconhecido";
      await atualizarStatusPagamento(id, "falhou", erroMsg);
      await atualizarTransacaoPorTxid(`fila-${id}`, "falhou", erroMsg);
      return NextResponse.json({ ok: false, status: "falhou", erro: erroMsg }, { headers: NO_CACHE });
    }
  }

  if (action === "fila-marcar-pago") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const id = String(body.id ?? "");
    const lista = await getPagamentos();
    const pag = lista.find(p => p.id === id);
    if (!pag) return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 });
    if (pag.status === "enviado") return NextResponse.json({ ok: true }, { headers: NO_CACHE });
    const ok = await atualizarStatusPagamento(id, "enviado");
    const updated = ok ? await atualizarTransacaoPorTxid(`fila-${id}`, "enviado") : false;
    const sessaoAtualizada = ok
      ? (updated ? await getSessao() : await registrarManual(pag.username, pag.displayName, pag.valor, { status: "enviado", txid: `fila-${id}` }, "manual"))
      : null;
    return NextResponse.json({ ok, sessao: sessaoAtualizada }, { headers: NO_CACHE });
  }

  if (action === "fila-remover") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const id = String(body.id ?? "");
    const lista = await getPagamentos();
    const pag = lista.find(p => p.id === id);
    const ok = await removerPagamento(id);
    let sessaoAtualizada = null;
    if (ok && pag?.status === "pendente") {
      await atualizarTransacaoPorTxid(`fila-${id}`, "falhou", "Pagamento manual excluído");
      sessaoAtualizada = await getSessao();
    }
    return NextResponse.json({ ok, sessao: sessaoAtualizada }, { headers: NO_CACHE });
  }

  if (action === "fila-limpar") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    await limparPagamentosFinalizados();
    return NextResponse.json({ ok: true }, { headers: NO_CACHE });
  }

  if (action === "add-teste") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const username = String(body.username ?? `teste_${Date.now()}`);
    const displayName = String(body.displayName ?? username);
    const image = typeof body.image === "string" ? body.image : null;
    const result = await adicionarParticipanteTeste(username, displayName, image);
    return NextResponse.json(result, { headers: NO_CACHE });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}

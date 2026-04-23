import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import {
  getCadastros, getCadastro, cadastrar, aprovarCadastro, rejeitarCadastro, editarCpfCadastro, editarChaveCadastro,
  getScreenshot, getSessao, abrirSessao, entrarSessao, sortearGorjeta,
  salvarPagamentos, registrarManual, adicionarParticipanteTeste, fecharSessaoSemPagar, limparSessao,
  getHistoricoGorjeta, mascarCpf,
  type ResultadoPagamento,
} from "@/lib/gorjeta-store";
import { enviarPix, cadastrarWebhook, consultarTitularChave } from "@/lib/gerencianet";
import { normalizarChave } from "@/lib/gorjeta-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

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

  const [sessaoRaw, historico] = await Promise.all([getSessao(), getHistoricoGorjeta()]);

  // Public view: mask CPF in participantes/vencedores, strip CPF from transacoes
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

    // Consulta DICT para identificar o titular da chave e bloquear duplicatas entre contas
    let cpfTitular: string | undefined;
    const chaveNorm = normalizarChave(chaveRaw, tipoChave);
    if (chaveNorm) {
      if (tipoChave === "cpf") {
        cpfTitular = chaveNorm; // CPF é o próprio identificador do titular
      } else {
        // Para outros tipos, consulta o DICT para descobrir o CPF do titular
        const titular = await consultarTitularChave(chaveNorm).catch(() => null);
        if (titular) cpfTitular = titular;
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
      try {
        const r = await enviarPix(v.cpf, sessao.valorUnitario, "Gorjeta stainzincs");
        pagamentos.push({ username: v.username, displayName: v.displayName, cpf: v.cpf, nomeCompleto: v.nomeCompleto, status: "enviado", txid: r.idEnvio, e2eid: r.e2eId });
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

    let result: { status: "enviado" | "falhou"; txid?: string; e2eid?: string; erro?: string };
    try {
      const r = await enviarPix(participante.cpf, valorNum, "Gorjeta");
      result = { status: "enviado", txid: r.idEnvio, e2eid: r.e2eId };
    } catch (err) {
      const erroMsg = err instanceof Error ? err.message : "Erro";
      console.error("[gorjeta/manual] Falha PIX para", username, "—", erroMsg);
      result = { status: "falhou", erro: erroMsg };
    }

    const sessaoAtualizada = await registrarManual(participante.username, participante.displayName, valorNum, result);
    return NextResponse.json({ ok: true, result, sessao: sessaoAtualizada }, { headers: NO_CACHE });
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

  if (action === "cadastrar-webhook") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const siteUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? process.env.SITE_URL ?? "";
    if (!siteUrl) return NextResponse.json({ ok: false, erro: "NEXTAUTH_URL não definida no ambiente" }, { headers: NO_CACHE });
    const webhookUrl = `${siteUrl.replace(/\/+$/, "")}/api/gerencianet/webhook`;
    const result = await cadastrarWebhook(webhookUrl);
    return NextResponse.json({ ...result, webhookUrl }, { headers: NO_CACHE });
  }

  if (action === "testar-pix") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const diag = {
      GERENCIANET_CLIENT_ID: !!process.env.GERENCIANET_CLIENT_ID,
      GERENCIANET_CLIENT_SECRET: !!process.env.GERENCIANET_CLIENT_SECRET,
      GERENCIANET_PIX_KEY: process.env.GERENCIANET_PIX_KEY ?? "(não definida)",
      GERENCIANET_CERT_PEM_BASE64: !!process.env.GERENCIANET_CERT_PEM_BASE64,
      GERENCIANET_KEY_PEM_BASE64: !!process.env.GERENCIANET_KEY_PEM_BASE64,
    };
    try {
      const cpfTeste = String(body.cpf ?? "").replace(/\D/g, "");
      if (!cpfTeste || cpfTeste.length !== 11) return NextResponse.json({ ok: false, diag, erro: "Informe um CPF válido para testar" }, { headers: NO_CACHE });
      const r = await enviarPix(cpfTeste, Number(body.valor ?? 0.01), "Teste gorjeta");
      return NextResponse.json({ ok: true, diag, resultado: r }, { headers: NO_CACHE });
    } catch (err) {
      const erro = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ ok: false, diag, erro }, { headers: NO_CACHE });
    }
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}

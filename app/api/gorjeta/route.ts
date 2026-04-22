import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import {
  getCadastros,
  getCadastro,
  cadastrar,
  aprovarCadastro,
  rejeitarCadastro,
  getScreenshot,
  getSessao,
  abrirSessao,
  entrarSessao,
  sortearGorjeta,
  salvarPagamentos,
  fecharSessaoSemPagar,
  limparSessao,
  getHistoricoGorjeta,
  mascarCpf,
  type ResultadoPagamento,
} from "@/lib/gorjeta-store";
import { enviarPix } from "@/lib/gerencianet";

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

  const sessao = sessaoRaw
    ? {
        ...sessaoRaw,
        participantes: sessaoRaw.participantes.map(p => ({ ...p, cpf: mascarCpf(p.cpf) })),
        vencedores: sessaoRaw.vencedores.map(p => ({ ...p, cpf: mascarCpf(p.cpf) })),
        pagamentos: sessaoRaw.pagamentos.map(p => ({ ...p, cpf: mascarCpf(p.cpf) })),
      }
    : null;

  const sessaoAdmin = adminUser ? sessaoRaw : undefined;

  let meucadastro = null;
  if (session?.user) {
    const login = session.user.twitchLogin ?? session.user.name ?? "";
    meucadastro = await getCadastro(login);
  }

  return NextResponse.json(
    { sessao: adminUser ? sessaoAdmin : sessao, historico, meucadastro },
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
    const result = await cadastrar({
      username: login,
      displayName: session.user.name ?? login,
      cpf: String(body.cpf ?? ""),
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

  if (action === "abrir-sessao") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const result = await abrirSessao({
      valorUnitario: Number(body.valorUnitario) || 10,
      maxVencedores: Number(body.maxVencedores) || 3,
    });
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
    const result = await entrarSessao(
      String(username),
      typeof displayName === "string" ? displayName : String(username),
      typeof image === "string" ? image : null,
    );
    return NextResponse.json(result, { headers: NO_CACHE });
  }

  if (action === "sortear") {
    const session = await auth();
    if (!isAdmin(session?.user?.twitchLogin)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const result = await sortearGorjeta();
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
        pagamentos.push({
          username: v.username, displayName: v.displayName, cpf: v.cpf, nomeCompleto: v.nomeCompleto,
          status: "falhou",
          erro: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }
    }

    const sessaoFinal = await salvarPagamentos(pagamentos);
    return NextResponse.json({ ok: true, pagamentos, sessao: sessaoFinal }, { headers: NO_CACHE });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}

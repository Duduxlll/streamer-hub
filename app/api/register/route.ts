import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/users-store";
import { isAdmin } from "@/lib/admins";
import { normalizarChave, cadastrar } from "@/lib/gorjeta-store";
import { addLog } from "@/lib/security-log";
import { rateLimit, ipFromHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function getIp(req: NextRequest): string {
  return ipFromHeaders(req.headers) || "";
}

export async function POST(req: NextRequest) {
  // Limita criação de contas por IP (anti-spam): 6 por hora.
  const limite = rateLimit(`register:${getIp(req)}`, 6, 60 * 60 * 1000);
  if (!limite.ok) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente mais tarde." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const twitchLogin  = String(body.twitchLogin ?? "").trim();
  const nomeCompleto = String(body.nomeCompleto ?? "").trim();
  const cpfRaw       = String(body.cpf ?? "");
  const email        = String(body.email ?? "").trim();
  const senha        = String(body.senha ?? "");
  const screenshot   = String(body.screenshot ?? "");

  if (!twitchLogin || !nomeCompleto || !cpfRaw || !email || !senha) {
    return NextResponse.json({ error: "Preencha todos os campos" }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_]{3,25}$/.test(twitchLogin)) {
    return NextResponse.json({ error: "Nome da Twitch inválido (letras, números e _ )" }, { status: 400 });
  }
  if (nomeCompleto.length < 3 || !nomeCompleto.trim().includes(" ")) {
    return NextResponse.json({ error: "Informe seu nome completo (nome e sobrenome)" }, { status: 400 });
  }
  const cpf = normalizarChave(cpfRaw, "cpf");
  if (!cpf) return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }
  if (senha.length < 6) {
    return NextResponse.json({ error: "A senha precisa ter no mínimo 6 caracteres" }, { status: 400 });
  }
  // Print do depósito (JonBet) é obrigatório para aprovação
  if (!screenshot.startsWith("data:image/")) {
    return NextResponse.json({ error: "Envie o print do seu histórico de depósito na JonBet" }, { status: 400 });
  }
  if (screenshot.length > 2_900_000) { // ~2MB em base64
    return NextResponse.json({ error: "Imagem muito grande (máx 2MB)" }, { status: 400 });
  }

  const login = twitchLogin.toLowerCase();

  const result = await createUser({
    twitchLogin: login,
    nomeCompleto,
    cpf,
    email,
    senha,
    ip: getIp(req) || undefined,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  // Cria o cadastro de gorjeta (pendente) com o print, reaproveitando o fluxo de aprovação.
  const cad = await cadastrar({
    username: login,
    displayName: result.user.displayName,
    tipoChave: "cpf",
    chave: cpf,
    cpfTitular: cpf,
    nomeCompleto,
    screenshot,
  });
  if (!cad.ok) {
    // Conta criada, mas o print não pôde ser registrado — informa para reenviar na página de Gorjeta.
    await addLog({ admin: "sistema", action: "cadastro", target: login, detail: `Conta criada (print pendente: ${cad.error})` });
    return NextResponse.json({ ok: true, avisoPrint: cad.error });
  }

  await addLog({
    admin: "sistema",
    action: "cadastro",
    target: login,
    detail: isAdmin(login) ? "Nova conta de administrador" : "Nova conta criada (com print)",
  });

  return NextResponse.json({ ok: true });
}

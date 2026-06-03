import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/users-store";
import { isAdmin } from "@/lib/admins";
import { normalizarChave } from "@/lib/gorjeta-store";
import { addLog } from "@/lib/security-log";

export const dynamic = "force-dynamic";

function getIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    ""
  );
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const twitchLogin  = String(body.twitchLogin ?? "").trim();
  const nomeCompleto = String(body.nomeCompleto ?? "").trim();
  const cpfRaw       = String(body.cpf ?? "");
  const email        = String(body.email ?? "").trim();
  const senha        = String(body.senha ?? "");
  const adminCode    = String(body.adminCode ?? "");

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

  const login        = twitchLogin.toLowerCase();
  const reservedAdmin = isAdmin(login);
  const codeOk        = !!process.env.ADMIN_SIGNUP_CODE && adminCode === process.env.ADMIN_SIGNUP_CODE;

  // Nome reservado a admin: só pode ser cadastrado com o código correto.
  if (reservedAdmin && !codeOk) {
    return NextResponse.json({ error: "Esse nome é reservado. É necessário o código de administrador." }, { status: 403 });
  }
  // Código informado mas inválido
  if (adminCode && !codeOk) {
    return NextResponse.json({ error: "Código de administrador inválido" }, { status: 403 });
  }

  const result = await createUser({
    twitchLogin: login,
    nomeCompleto,
    cpf,
    email,
    senha,
    isAdmin: reservedAdmin || codeOk,
    ip: getIp(req) || undefined,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  await addLog({
    admin: "sistema",
    action: "cadastro",
    target: login,
    detail: result.user.isAdmin ? "Nova conta de administrador" : "Nova conta criada",
  });

  return NextResponse.json({ ok: true });
}

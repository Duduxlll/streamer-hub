import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, setPassword } from "@/lib/users-store";
import { verifyResetCode } from "@/lib/password-reset";
import { addLog } from "@/lib/security-log";
import { rateLimit, ipFromHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Anti-força-bruta do código: 30 tentativas por hora por IP.
  const limite = rateLimit(`reset:${ipFromHeaders(req.headers)}`, 30, 60 * 60 * 1000);
  if (!limite.ok) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente mais tarde." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const email     = String(body.email ?? "").trim().toLowerCase();
  const code      = String(body.code ?? "").trim();
  const novaSenha = String(body.novaSenha ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Código inválido (são 6 dígitos)" }, { status: 400 });
  }
  if (novaSenha.length < 6) {
    return NextResponse.json({ error: "A senha precisa ter no mínimo 6 caracteres" }, { status: 400 });
  }

  const check = await verifyResetCode(email, code);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const user = await getUserByEmail(email);
  if (!user) return NextResponse.json({ error: "Conta não encontrada" }, { status: 400 });

  const ok = await setPassword(user.twitchLogin, novaSenha);
  if (!ok) return NextResponse.json({ error: "Não foi possível redefinir a senha" }, { status: 400 });

  await addLog({ admin: "sistema", action: "reset_senha", target: user.twitchLogin, detail: "Senha redefinida pelo usuário (e-mail)" });
  return NextResponse.json({ ok: true });
}

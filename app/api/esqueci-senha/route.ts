import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/users-store";
import { createResetCode } from "@/lib/password-reset";
import { sendEmail, resetCodeEmailHtml } from "@/lib/email";
import { rateLimit, ipFromHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Limita pedidos de código por IP (anti-spam): 10 por hora.
  const limite = rateLimit(`forgot:${ipFromHeaders(req.headers)}`, 10, 60 * 60 * 1000);
  if (!limite.ok) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente mais tarde." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }

  // Sempre responde { ok: true }, exista ou não a conta e mesmo se o envio falhar,
  // para não revelar quais e-mails têm cadastro (evita enumeração de usuários).
  const user = await getUserByEmail(email);
  if (user) {
    const code = await createResetCode(email);
    if (code) {
      const r = await sendEmail({
        to: email,
        subject: "Seu código para redefinir a senha",
        html: resetCodeEmailHtml(code, 15),
      });
      if (!r.ok) console.error("[esqueci-senha] Falha ao enviar e-mail:", r.error);
    }
  }

  return NextResponse.json({ ok: true });
}

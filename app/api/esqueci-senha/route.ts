import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/users-store";
import { createResetCode } from "@/lib/password-reset";
import { sendEmail, resetCodeEmailHtml } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }

  // Sempre responde igual, exista ou não a conta (não revela quais e-mails têm cadastro).
  const user = await getUserByEmail(email);
  if (user) {
    const code = await createResetCode(email);
    if (code) {
      const r = await sendEmail({
        to: email,
        subject: "Seu código para redefinir a senha",
        html: resetCodeEmailHtml(code, 15),
      });
      // Se o envio falhar (ex.: Resend não configurado), informa de forma controlada.
      if (!r.ok) {
        return NextResponse.json({ ok: false, error: "Não foi possível enviar o e-mail agora. Tente novamente em instantes." }, { status: 502 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

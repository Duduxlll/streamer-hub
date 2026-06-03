// Envio de e-mail via Resend (https://resend.com) usando a API HTTP — sem dependência npm.
// Requer as variáveis de ambiente:
//   RESEND_API_KEY  → chave da API (re_...)
//   RESEND_FROM     → remetente verificado, ex.: "stainzincs <no-reply@seudominio.com>"
//                     (sem domínio verificado, o Resend só entrega para o e-mail do dono da conta)

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.RESEND_FROM || "stainzincs <onboarding@resend.dev>";
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY não configurada" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [params.to], subject: params.subject, html: params.html }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Resend HTTP ${res.status} ${text}`.trim() };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao enviar e-mail" };
  }
}

// Template HTML do e-mail de redefinição de senha (tema verde, código em destaque).
export function resetCodeEmailHtml(code: string, minutos = 15): string {
  const digits = code.split("").map(d =>
    `<td style="padding:0 5px;"><div style="width:44px;height:56px;line-height:56px;text-align:center;font-size:28px;font-weight:800;color:#eafff3;background:#0a2e1a;border:1px solid #16a34a;border-radius:12px;">${d}</div></td>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#04100a;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#04100a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#07160e;border:1px solid rgba(34,197,94,0.18);border-radius:20px;overflow:hidden;">
        <tr><td style="height:4px;background:linear-gradient(90deg,#22c55e,#4ade80,#22c55e);"></td></tr>
        <tr><td style="padding:36px 36px 8px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#ffffff;">stain<span style="color:#4ade80;">zincs</span></div>
          <div style="margin-top:18px;font-size:19px;font-weight:800;color:#ffffff;">Redefinição de senha</div>
          <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#9aa6a0;">
            Use o código abaixo para criar uma nova senha. Ele expira em <strong style="color:#cfe9da;">${minutos} minutos</strong>.
          </p>
        </td></tr>
        <tr><td style="padding:24px 36px 8px;" align="center">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table>
        </td></tr>
        <tr><td style="padding:18px 36px 36px;text-align:center;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7a72;">
            Se você não pediu para redefinir sua senha, pode ignorar este e-mail com segurança — sua conta continua protegida.
          </p>
        </td></tr>
        <tr><td style="padding:16px;text-align:center;background:#050f0a;border-top:1px solid rgba(255,255,255,0.05);">
          <p style="margin:0;font-size:11px;color:#4b5563;">+18 · Jogue com responsabilidade</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

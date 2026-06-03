"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell, AuthHeader, AuthField, AuthInput, AuthButton, AuthAlert, Icons } from "@/components/auth-ui";

export default function EsqueciSenhaPage() {
  const [etapa, setEtapa] = useState<"email" | "codigo" | "sucesso">("email");
  const [email, setEmail] = useState("");
  const [code, setCode]   = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  async function enviarCodigo(e?: React.FormEvent) {
    e?.preventDefault();
    setErro(""); setInfo("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErro("Digite um e-mail válido"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/esqueci-senha", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error ?? "Erro ao enviar o código"); setLoading(false); return; }
      setEtapa("codigo");
      setInfo("Se houver uma conta com esse e-mail, enviamos um código. Verifique a caixa de entrada e o spam.");
    } catch { setErro("Erro de conexão. Tente novamente."); }
    finally { setLoading(false); }
  }

  async function redefinir(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setInfo("");
    if (!/^\d{6}$/.test(code.trim())) { setErro("O código tem 6 dígitos"); return; }
    if (senha.length < 6) { setErro("A senha precisa ter no mínimo 6 caracteres"); return; }
    if (senha !== confirmar) { setErro("As senhas não coincidem"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/redefinir-senha", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim(), novaSenha: senha }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error ?? "Erro ao redefinir a senha"); setLoading(false); return; }
      setEtapa("sucesso");
    } catch { setErro("Erro de conexão. Tente novamente."); }
    finally { setLoading(false); }
  }

  return (
    <AuthShell>
      {etapa === "email" && (
        <>
          <AuthHeader icon={Icons.mail("w-7 h-7")} title="Esqueci minha senha" subtitle="Enviaremos um código para o seu e-mail" />
          <form onSubmit={enviarCodigo} className="space-y-4">
            <AuthField label="E-mail da conta" delay={80}>
              <AuthInput type="email" autoCapitalize="none" placeholder="voce@email.com"
                icon={Icons.mail()} value={email} onChange={e => setEmail(e.target.value)} />
            </AuthField>
            {erro && <AuthAlert>{erro}</AuthAlert>}
            <div className="auth-fade pt-1" style={{ animationDelay: "120ms" }}>
              <AuthButton type="submit" loading={loading}>Enviar código →</AuthButton>
            </div>
          </form>
        </>
      )}

      {etapa === "codigo" && (
        <>
          <AuthHeader icon={Icons.key()} title="Criar nova senha"
            subtitle={`Digite o código que enviamos para ${email}`} />
          {info && <div className="mb-4"><AuthAlert kind="info">{info}</AuthAlert></div>}
          <form onSubmit={redefinir} className="space-y-4">
            <AuthField label="Código (6 dígitos)" delay={60}>
              <AuthInput type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                className="auth-code-input" value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            </AuthField>
            <AuthField label="Nova senha" delay={100}>
              <AuthInput type="password" placeholder="mín. 6 caracteres" icon={Icons.lock()}
                value={senha} onChange={e => setSenha(e.target.value)} />
            </AuthField>
            <AuthField label="Confirmar nova senha" delay={130}>
              <AuthInput type="password" placeholder="repita a senha" icon={Icons.lock()}
                value={confirmar} onChange={e => setConfirmar(e.target.value)} />
            </AuthField>
            {erro && <AuthAlert>{erro}</AuthAlert>}
            <div className="auth-fade pt-1" style={{ animationDelay: "160ms" }}>
              <AuthButton type="submit" loading={loading}>Redefinir senha →</AuthButton>
            </div>
          </form>
          <button onClick={() => enviarCodigo()} disabled={loading}
            className="mt-4 w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Não recebeu? Reenviar código
          </button>
        </>
      )}

      {etapa === "sucesso" && (
        <div className="text-center py-3">
          <div className="auth-success-check mb-5">{Icons.check()}</div>
          <h1 className="auth-title">Senha redefinida!</h1>
          <p className="text-gray-500 text-sm mt-2 mb-6">Já pode entrar com sua nova senha.</p>
          <Link href="/login" className="auth-btn inline-flex relative overflow-hidden">
            <span aria-hidden className="auth-btn-shine" />
            <span className="relative z-10 w-full text-center">Ir para o login →</span>
          </Link>
        </div>
      )}

      {etapa !== "sucesso" && (
        <div className="mt-5 pt-5 border-t border-white/5 text-center">
          <Link href="/login" className="text-sm text-[#4ade80] font-bold hover:underline">← Voltar ao login</Link>
        </div>
      )}
    </AuthShell>
  );
}

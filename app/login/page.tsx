"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { AuthShell, AuthHeader, AuthField, AuthInput, AuthButton, AuthAlert, AuthDivider, Icons } from "@/components/auth-ui";

function Spinner() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#22c55e] border-t-transparent animate-spin" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";

  const [email, setEmail]     = useState("");
  const [senha, setSenha]     = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro]       = useState("");

  useEffect(() => {
    if (status === "authenticated") router.replace(callbackUrl);
  }, [status, router, callbackUrl]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!email.trim() || !senha) { setErro("Preencha e-mail e senha"); return; }
    setLoading(true);
    try {
      const res = await signIn("credentials", { email: email.trim(), password: senha, redirect: false });
      if (res?.error) { setErro("E-mail ou senha incorretos"); setLoading(false); return; }
      router.replace(callbackUrl);
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  if (status === "loading" || status === "authenticated") return <Spinner />;

  return (
    <AuthShell>
      <AuthHeader icon={Icons.login()} title="Entrar na plataforma" subtitle="Acesse com seu e-mail e senha" />

      <form onSubmit={handleLogin} className="space-y-4">
        <AuthField label="E-mail" delay={80}>
          <AuthInput type="email" autoCapitalize="none" autoCorrect="off" placeholder="voce@email.com"
            icon={Icons.mail()} value={email} onChange={e => setEmail(e.target.value)} />
        </AuthField>

        <AuthField label="Senha" delay={120}
          right={<Link href="/esqueci-senha" className="text-[11px] font-bold text-[#4ade80] hover:underline">Esqueci minha senha</Link>}>
          <AuthInput type={showPass ? "text" : "password"} placeholder="••••••••"
            icon={Icons.lock()} value={senha} onChange={e => setSenha(e.target.value)}
            right={
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-black text-gray-500 hover:text-gray-300 transition-colors">
                {showPass ? "ocultar" : "ver"}
              </button>
            } />
        </AuthField>

        {erro && <AuthAlert>{erro}</AuthAlert>}

        <div className="auth-fade pt-1" style={{ animationDelay: "160ms" }}>
          <AuthButton type="submit" loading={loading}>Entrar →</AuthButton>
        </div>
      </form>

      <div className="auth-fade text-center mt-5" style={{ animationDelay: "200ms" }}>
        <p className="text-sm text-gray-500">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="text-[#4ade80] font-bold hover:underline">Cadastre-se</Link>
        </p>
      </div>

      <AuthDivider />

      <div className="auth-fade flex items-center justify-center gap-2" style={{ animationDelay: "240ms" }}>
        <span className="text-green-500/70">{Icons.shield("w-3.5 h-3.5")}</span>
        <p className="text-[11px] text-gray-600 text-center leading-relaxed">
          Acesso protegido · Ao entrar você aceita os{" "}
          <Link href="/termos" className="text-[#4ade80] hover:underline">Termos</Link> e a{" "}
          <Link href="/privacidade" className="text-[#4ade80] hover:underline">Privacidade</Link>
        </p>
      </div>
    </AuthShell>
  );
}

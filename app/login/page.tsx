"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";

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

  const [usuario, setUsuario] = useState("");
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
    if (!usuario.trim() || !senha) { setErro("Preencha usuário e senha"); return; }
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        username: usuario.trim(),
        password: senha,
        redirect: false,
      });
      if (res?.error) {
        setErro("Nome da Twitch ou senha incorretos");
        setLoading(false);
        return;
      }
      router.replace(callbackUrl);
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  if (status === "loading" || status === "authenticated") {
    return <Spinner />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="w-full max-w-sm relative scale-in">
        <div className="card-dark rounded-2xl overflow-hidden border-[#16a34a]/20">
          <div className="h-1 w-full bg-gradient-to-r from-[#22c55e] via-[#4ade80] to-[#22c55e]" />

          <div className="p-8">
            <div className="text-center mb-7">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-green-950/50">
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              </div>
              <h1 className="text-2xl font-black text-white">Entrar na plataforma</h1>
              <p className="text-gray-500 text-sm mt-1.5">Acesse com seu nome da Twitch e senha</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">Nome da Twitch</label>
                <input type="text" autoCapitalize="none" autoCorrect="off" placeholder="seu_nome_na_twitch"
                  value={usuario}
                  onChange={e => setUsuario(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-[#22c55e]/50"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">Senha</label>
                <div className="relative">
                  <input type={showPass ? "text" : "password"} placeholder="••••••••"
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    className="w-full px-4 py-2.5 pr-11 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-[#22c55e]/50"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs font-bold">
                    {showPass ? "ocultar" : "ver"}
                  </button>
                </div>
              </div>

              {erro && (
                <div className="rounded-xl px-3 py-2.5 text-sm text-red-400 font-bold"
                  style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                  {erro}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-white text-base transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 4px 18px rgba(34,197,94,0.3)" }}>
                {loading ? <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : "Entrar"}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-white/5 text-center">
              <p className="text-sm text-gray-500">
                Ainda não tem conta?{" "}
                <Link href="/cadastro" className="text-[#4ade80] font-bold hover:underline">Cadastre-se</Link>
              </p>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-[#0a2e1a]/40 border border-[#16a34a]/15">
              <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                Ao entrar, você concorda com os{" "}
                <Link href="/termos" className="text-[#4ade80] hover:underline">Termos de Uso</Link>
                {" "}e{" "}
                <Link href="/privacidade" className="text-[#4ade80] hover:underline">Política de Privacidade</Link>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-700 mt-4">
          +18 · Jogue com responsabilidade
        </p>
      </div>
    </div>
  );
}

"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

function TwitchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  );
}

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  async function handleLogin() {
    setLoading(true);
    await signIn("twitch", { callbackUrl: "/" });
  }

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#9146ff] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 relative overflow-hidden">

      {/* Orbs decorativos */}

      <div className="w-full max-w-sm relative scale-in">

        {/* Card */}
        <div className="card-dark rounded-2xl overflow-hidden border-[#1d4ed8]/20">

          {/* Faixa topo roxa */}
          <div className="h-1 w-full bg-gradient-to-r from-[#9146ff] via-[#a855f7] to-[#9146ff]" />

          <div className="p-8">
            {/* Logo central */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#9146ff] to-[#6d28d9] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-purple-950/50">
                <TwitchIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-black text-white">Entrar na plataforma</h1>
              <p className="text-gray-500 text-sm mt-1.5">Faça login com sua conta Twitch</p>
            </div>

            {/* Botão Twitch */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="btn-twitch w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-white text-base disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <TwitchIcon className="w-5 h-5" />
              )}
              {loading ? "Redirecionando..." : "Continuar com Twitch"}
            </button>

            {/* Segurança */}
            <div className="mt-4 flex items-center gap-2 justify-center">
              <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="text-[11px] text-gray-600">Login seguro via OAuth 2.0 da Twitch</span>
            </div>

            {/* Termos */}
            <div className="mt-5 p-4 rounded-xl bg-[#0f2354]/40 border border-[#1d4ed8]/15">
              <p className="text-xs text-gray-500 text-center leading-relaxed">
                Ao entrar, você concorda com os{" "}
                <Link href="/termos" className="text-[#60a5fa] hover:underline">Termos de Uso</Link>
                {" "}e{" "}
                <Link href="/privacidade" className="text-[#60a5fa] hover:underline">Política de Privacidade</Link>
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

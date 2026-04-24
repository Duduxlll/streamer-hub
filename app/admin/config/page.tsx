"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admins";

interface ConfigStatus {
  ggpix: { ok: boolean };
  livepix: { ok: boolean };
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
      {ok && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-40" />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${ok ? "bg-green-400" : "bg-red-500"}`} />
    </span>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(8,6,20,0.7)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}>
      {children}
    </div>
  );
}

export default function AdminConfigPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !isAdmin(session?.user?.twitchLogin)) router.replace("/");
  }, [status, session, router]);

  const fetchConfig = useCallback(async () => {
    const res = await fetch("/api/config");
    if (res.ok) setConfig(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchConfig();
  }, [status, fetchConfig]);

  if (loading || status === "loading") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#ffba00] border-t-transparent animate-spin" />
      </div>
    );
  }

  const tudo_ok = config?.ggpix.ok;

  return (
    <div className="page-enter relative min-h-[calc(100vh-4rem)]">
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-14 pb-24 space-y-5">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Link href="/" className="hover:text-gray-400 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-gray-400">Admin · Configurações</span>
        </div>

        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black text-white flex-1">Configurações</h1>
        </div>

        {tudo_ok && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-green-400"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <StatusDot ok={true} />
            Tudo conectado e funcionando
          </div>
        )}

        {/* GGPix / Gorjeta */}
        <Card>
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
            <span className="text-xl">💰</span>
            <div className="flex-1">
              <p className="text-sm font-black text-white">GGPix · Gorjeta</p>
              <p className="text-[11px] text-gray-600">API PIX para envio automático de gorjetas</p>
            </div>
            <StatusDot ok={config?.ggpix.ok ?? false} />
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="flex items-center gap-3">
              <StatusDot ok={config?.ggpix.ok ?? false} />
              <span className="text-xs text-gray-400 flex-1">API Key (GGPIX_API_KEY)</span>
              <span className={`text-[11px] font-black ${config?.ggpix.ok ? "text-green-400" : "text-red-400"}`}>
                {config?.ggpix.ok ? "Configurada" : "Não configurada"}
              </span>
            </div>

            {!config?.ggpix.ok && (
              <div className="px-4 py-3 rounded-xl text-xs text-yellow-400"
                style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)" }}>
                Adicione a variável <code className="text-white">GGPIX_API_KEY</code> no Render para ativar o envio de gorjetas.
              </div>
            )}
          </div>
        </Card>

        {/* LivePix / Jackpot */}
        <Card>
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
            <span className="text-xl">🎰</span>
            <div className="flex-1">
              <p className="text-sm font-black text-white">LivePix · Jackpot</p>
              <p className="text-[11px] text-gray-600">Integração de doações para o jackpot</p>
            </div>
            <StatusDot ok={config?.livepix.ok ?? false} />
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="flex items-center gap-3">
              <StatusDot ok={config?.livepix.ok ?? false} />
              <span className="text-xs text-gray-400 flex-1">Credenciais LivePix</span>
              <span className={`text-[11px] font-black ${config?.livepix.ok ? "text-green-400" : "text-red-400"}`}>
                {config?.livepix.ok ? "Configuradas" : "Não configuradas"}
              </span>
            </div>

            {!config?.livepix.ok && (
              <div className="px-4 py-3 rounded-xl text-xs text-yellow-400"
                style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)" }}>
                Adicione <code className="text-white">LIVEPIX_CLIENT_ID</code> e <code className="text-white">LIVEPIX_CLIENT_SECRET</code> no Render para ativar o jackpot.
              </div>
            )}

            <Link
              href="/api/livepix/connect"
              className="w-full py-2.5 rounded-xl font-black text-sm text-center block transition-all hover:scale-[1.02]"
              style={config?.livepix.ok
                ? { background: "rgba(255,255,255,0.04)", color: "#6b7280", border: "1px solid rgba(255,255,255,0.08)" }
                : { background: "linear-gradient(135deg, #c084fc, #9146ff)", color: "#fff" }}>
              {config?.livepix.ok ? "Reconectar LivePix" : "Conectar LivePix"}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

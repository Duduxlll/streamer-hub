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

  const ggpixOk = config?.ggpix.ok ?? false;
  const livepixOk = config?.livepix.ok ?? false;

  return (
    <div className="page-enter relative min-h-[calc(100vh-4rem)]">
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-14 pb-24 space-y-5">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Link href="/" className="hover:text-gray-400 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-gray-400">Admin · Configurações</span>
        </div>

        <h1 className="text-3xl font-black text-white">Configurações</h1>

        {/* Banner de status geral */}
        {ggpixOk ? (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-green-400"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <StatusDot ok={true} />
            Tudo conectado e funcionando
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-yellow-400"
            style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.25)" }}>
            <span>⚠️</span>
            Configure o GGPix para ativar o envio de gorjetas
          </div>
        )}

        {/* GGPix / Gorjeta */}
        <Card>
          <div className="px-5 py-4 flex items-center gap-3">
            <span className="text-xl">💰</span>
            <div className="flex-1">
              <p className="text-sm font-black text-white">GGPix · Gorjeta</p>
              <p className="text-[11px] text-gray-600">API PIX para envio automático de gorjetas</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-black ${ggpixOk ? "text-green-400" : "text-red-400"}`}>
                {ggpixOk ? "Conectado" : "Não configurado"}
              </span>
              <StatusDot ok={ggpixOk} />
            </div>
          </div>
          {!ggpixOk && (
            <div className="px-5 pb-4">
              <div className="px-4 py-3 rounded-xl text-xs text-yellow-400"
                style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)" }}>
                Configure a chave de API do GGPix no painel do Render para ativar o envio de gorjetas.
              </div>
            </div>
          )}
        </Card>

        {/* LivePix / Jackpot */}
        <Card>
          <div className="px-5 py-4 flex items-center gap-3">
            <span className="text-xl">🎰</span>
            <div className="flex-1">
              <p className="text-sm font-black text-white">LivePix · Jackpot</p>
              <p className="text-[11px] text-gray-600">Integração de doações para o jackpot</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-black ${livepixOk ? "text-green-400" : "text-gray-600"}`}>
                {livepixOk ? "Conectado" : "Não configurado"}
              </span>
              <StatusDot ok={livepixOk} />
            </div>
          </div>
          <div className="px-5 pb-4 space-y-3">
            {!livepixOk && (
              <div className="px-4 py-3 rounded-xl text-xs text-gray-500"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                Configure as credenciais do LivePix no Render para ativar o jackpot.
              </div>
            )}
            <Link
              href="/api/livepix/connect"
              className="w-full py-2.5 rounded-xl font-black text-sm text-center block transition-all hover:scale-[1.02]"
              style={livepixOk
                ? { background: "rgba(255,255,255,0.04)", color: "#6b7280", border: "1px solid rgba(255,255,255,0.08)" }
                : { background: "linear-gradient(135deg, #c084fc, #9146ff)", color: "#fff" }}>
              {livepixOk ? "Reconectar LivePix" : "Conectar LivePix"}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

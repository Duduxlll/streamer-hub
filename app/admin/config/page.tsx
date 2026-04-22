"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admins";

interface ConfigStatus {
  efibank: {
    credenciaisOk: boolean;
    webhook: { ok: true; registradoEm: number; url: string } | { ok: false };
  };
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
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);

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

  function flash(text: string, type: "ok" | "err") {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  }

  async function cadastrarWebhook() {
    setBusy(true);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cadastrar-webhook" }),
      });
      const data = await res.json() as { ok: boolean; erro?: string; webhookUrl?: string };
      flash(data.ok ? "Webhook cadastrado com sucesso!" : `Erro: ${data.erro}`, data.ok ? "ok" : "err");
      if (data.ok) fetchConfig();
    } catch { flash("Erro de conexão", "err"); }
    finally { setBusy(false); }
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#ffba00] border-t-transparent animate-spin" />
      </div>
    );
  }

  const tudo_ok = config?.efibank.credenciaisOk && config?.efibank.webhook.ok && config?.livepix.ok;

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
          {msg && (
            <span className={`text-xs font-black px-3 py-1.5 rounded-full flex-shrink-0 ${msg.type === "ok" ? "text-green-400 bg-green-500/10 border border-green-500/25" : "text-red-400 bg-red-500/10 border border-red-500/25"}`}>
              {msg.text}
            </span>
          )}
        </div>

        {tudo_ok && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-green-400"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <StatusDot ok={true} />
            Tudo conectado e funcionando
          </div>
        )}

        {/* EfíBank / Gorjeta */}
        <Card>
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
            <span className="text-xl">💰</span>
            <div className="flex-1">
              <p className="text-sm font-black text-white">EfíBank · Gorjeta</p>
              <p className="text-[11px] text-gray-600">API PIX para envio automático de gorjetas</p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <StatusDot ok={config?.efibank.credenciaisOk ?? false} />
                <span className="text-xs text-gray-400 flex-1">Credenciais (Client ID, Secret, Certificado)</span>
                <span className={`text-[11px] font-black ${config?.efibank.credenciaisOk ? "text-green-400" : "text-red-400"}`}>
                  {config?.efibank.credenciaisOk ? "Configuradas" : "Faltando"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <StatusDot ok={config?.efibank.webhook.ok ?? false} />
                <span className="text-xs text-gray-400 flex-1">Webhook cadastrado</span>
                <span className={`text-[11px] font-black ${config?.efibank.webhook.ok ? "text-green-400" : "text-red-400"}`}>
                  {config?.efibank.webhook.ok ? "Ativo" : "Não cadastrado"}
                </span>
              </div>
              {config?.efibank.webhook.ok && (
                <p className="text-[10px] text-gray-600 pl-6">
                  Cadastrado em {new Date((config.efibank.webhook as { ok: true; registradoEm: number; url: string }).registradoEm).toLocaleString("pt-BR")}
                </p>
              )}
            </div>

            {!config?.efibank.credenciaisOk && (
              <div className="px-4 py-3 rounded-xl text-xs text-yellow-400"
                style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)" }}>
                Adicione as variáveis <code className="text-white">GERENCIANET_CLIENT_ID</code>, <code className="text-white">GERENCIANET_CLIENT_SECRET</code>, <code className="text-white">GERENCIANET_PIX_KEY</code> e o certificado no Render.
              </div>
            )}

            <button
              onClick={cadastrarWebhook}
              disabled={busy || !config?.efibank.credenciaisOk}
              className="w-full py-2.5 rounded-xl font-black text-sm transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: config?.efibank.webhook.ok ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg, #ffdd55, #ffba00)", color: config?.efibank.webhook.ok ? "#6b7280" : "#000", border: config?.efibank.webhook.ok ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
              {busy ? "Cadastrando..." : config?.efibank.webhook.ok ? "🔗 Re-cadastrar webhook" : "🔗 Cadastrar webhook"}
            </button>
            <p className="text-[10px] text-gray-600 text-center">
              {config?.efibank.webhook.ok
                ? "Clique apenas se trocar as credenciais EfíBank"
                : "Necessário antes de enviar o primeiro PIX"}
            </p>
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

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admins";

type AuthMode = "none" | "bearer" | "hmac" | "ambos";

interface ConfigStatus {
  ggpix: {
    ok: boolean;
    hasApiKey: boolean;
    webhookAuthMode: AuthMode;
    hasBearerToken: boolean;
    hasHmacSecret: boolean;
    webhookUrl: string;
  };
  livepix: {
    ok: boolean;
    hasClientId: boolean;
    hasClientSecret: boolean;
    hasWebhookSecret: boolean;
    webhookUrl: string;
    callbackUrl: string;
  };
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
      {ok && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-40" />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${ok ? "bg-green-400" : "bg-red-500"}`} />
    </span>
  );
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all"
      style={copied
        ? { background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }
        : { background: "rgba(255,255,255,0.05)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      {copied ? "Copiado!" : (label ?? "Copiar")}
    </button>
  );
}

function FieldInput({
  label, placeholder, value, onChange, type = "text", configured, hint,
}: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
  type?: string; configured?: boolean; hint?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">{label}</label>
        {configured && (
          <span className="text-[10px] font-black text-green-400 flex items-center gap-1">
            <span>✓</span> Configurado
          </span>
        )}
      </div>
      <div className="relative">
        <input
          type={isPassword && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={configured ? "••••••••  (deixe vazio para manter)" : placeholder}
          className="w-full px-3 py-2.5 rounded-xl text-sm text-white pr-10 outline-none transition-all"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,186,0,0.4)"; }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors text-xs"
          >
            {show ? "Ocultar" : "Ver"}
          </button>
        )}
      </div>
      {hint && <p className="text-[10px] text-gray-600">{hint}</p>}
    </div>
  );
}

function UrlBox({ label, url }: { label: string; url: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 px-3 py-2 rounded-xl text-[11px] text-gray-300 truncate"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {url}
        </code>
        <CopyButton value={url} />
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center mt-0.5"
        style={{ background: "rgba(255,186,0,0.15)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.3)" }}>
        {n}
      </span>
      <p className="text-xs text-gray-400 leading-relaxed">{children}</p>
    </div>
  );
}

function RadioCard({
  value, current, onChange, title, description,
}: {
  value: AuthMode; current: AuthMode; onChange: (v: AuthMode) => void;
  title: string; description: string;
}) {
  const selected = value === current;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
      style={selected
        ? { background: "rgba(255,186,0,0.08)", border: "1px solid rgba(255,186,0,0.35)" }
        : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center"
        style={{ borderColor: selected ? "#ffba00" : "rgba(255,255,255,0.2)" }}>
        {selected && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
      </span>
      <div>
        <p className={`text-xs font-black ${selected ? "text-white" : "text-gray-400"}`}>{title}</p>
        <p className="text-[10px] text-gray-600 mt-0.5">{description}</p>
      </div>
    </button>
  );
}

function SaveButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-2.5 rounded-xl font-black text-sm transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
      style={{ background: "linear-gradient(135deg, #ffba00, #ff8c00)", color: "#000" }}
    >
      {loading ? "Salvando..." : children}
    </button>
  );
}

export default function AdminConfigPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);

  // LivePix form
  const [liveClientId,     setLiveClientId]     = useState("");
  const [liveClientSecret, setLiveClientSecret] = useState("");
  const [liveWebhookSec,   setLiveWebhookSec]   = useState("");
  const [liveSaving,       setLiveSaving]        = useState(false);
  const [liveMsg,          setLiveMsg]           = useState<{ ok: boolean; text: string } | null>(null);

  // GGPix form
  const [ggApiKey,      setGgApiKey]      = useState("");
  const [ggAuthMode,    setGgAuthMode]    = useState<AuthMode>("none");
  const [ggBearer,      setGgBearer]      = useState("");
  const [ggHmac,        setGgHmac]        = useState("");
  const [ggSaving,      setGgSaving]      = useState(false);
  const [ggMsg,         setGgMsg]         = useState<{ ok: boolean; text: string } | null>(null);

  const liveMsgTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ggMsgTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !isAdmin(session?.user?.twitchLogin)) router.replace("/");
  }, [status, session, router]);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json() as ConfigStatus;
        setConfig(data);
        setGgAuthMode(data.ggpix.webhookAuthMode);
      }
    } finally {
      setLoadingPage(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchConfig();
  }, [status, fetchConfig]);

  // Webhook URL do LivePix — mostra com o secret digitado em tempo real
  const livepixWebhookDisplay = (() => {
    const base = config?.livepix.webhookUrl?.split("?")[0] ?? "";
    if (!base) return "";
    const secret = liveWebhookSec.trim();
    if (secret) return `${base}?secret=${encodeURIComponent(secret)}`;
    if (config?.livepix.hasWebhookSecret) return config.livepix.webhookUrl;
    return base;
  })();

  const showMsg = (
    set: typeof setLiveMsg,
    timer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
    payload: { ok: boolean; text: string },
  ) => {
    if (timer.current) clearTimeout(timer.current);
    set(payload);
    timer.current = setTimeout(() => set(null), 5000);
  };

  const saveLivePix = async (e: React.FormEvent) => {
    e.preventDefault();
    setLiveSaving(true);
    try {
      const body: Record<string, string> = { type: "livepix" };
      if (liveClientId.trim())     body.clientId      = liveClientId.trim();
      if (liveClientSecret.trim()) body.clientSecret  = liveClientSecret.trim();
      body.webhookSecret = liveWebhookSec.trim();

      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showMsg(setLiveMsg, liveMsgTimer, { ok: true, text: "Credenciais do LivePix salvas com sucesso!" });
        setLiveClientId(""); setLiveClientSecret(""); setLiveWebhookSec("");
        await fetchConfig();
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string };
        showMsg(setLiveMsg, liveMsgTimer, { ok: false, text: d.error ?? "Erro ao salvar" });
      }
    } catch {
      showMsg(setLiveMsg, liveMsgTimer, { ok: false, text: "Erro de conexão" });
    } finally {
      setLiveSaving(false);
    }
  };

  const saveGGPix = async (e: React.FormEvent) => {
    e.preventDefault();
    setGgSaving(true);
    try {
      const body: Record<string, string> = {
        type: "ggpix",
        webhookAuthMode: ggAuthMode,
      };
      if (ggApiKey.trim()) body.apiKey = ggApiKey.trim();
      body.bearerToken = ggBearer.trim();
      body.hmacSecret  = ggHmac.trim();

      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showMsg(setGgMsg, ggMsgTimer, { ok: true, text: "Credenciais do GGPix salvas com sucesso!" });
        setGgApiKey(""); setGgBearer(""); setGgHmac("");
        await fetchConfig();
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string };
        showMsg(setGgMsg, ggMsgTimer, { ok: false, text: d.error ?? "Erro ao salvar" });
      }
    } catch {
      showMsg(setGgMsg, ggMsgTimer, { ok: false, text: "Erro de conexão" });
    } finally {
      setGgSaving(false);
    }
  };

  if (loadingPage || status === "loading") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#ffba00] border-t-transparent animate-spin" />
      </div>
    );
  }

  const ggpixOk  = config?.ggpix.ok  ?? false;
  const livepixOk = config?.livepix.ok ?? false;

  return (
    <div className="page-enter relative min-h-[calc(100vh-4rem)]">
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-14 pb-24 space-y-5">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Link href="/" className="hover:text-gray-400 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-gray-400">Admin · Configurações</span>
        </div>

        <h1 className="text-3xl font-black text-white">Configurações</h1>

        {/* Banner de status */}
        {ggpixOk && livepixOk ? (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-green-400"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <StatusDot ok={true} />
            Tudo conectado e funcionando
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-yellow-400"
            style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.25)" }}>
            <span>⚠️</span>
            {!ggpixOk && !livepixOk ? "Configure o GGPix e o LivePix para ativar todas as funcionalidades"
              : !ggpixOk ? "Configure o GGPix para ativar o envio de gorjetas"
              : "Configure o LivePix para ativar o jackpot"}
          </div>
        )}

        {/* ─── LIVEPIX ─────────────────────────────────────────────── */}
        <form onSubmit={saveLivePix}>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(8,6,20,0.7)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}>

            {/* Header */}
            <div className="px-5 py-4 flex items-center gap-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-xl">🎰</span>
              <div className="flex-1">
                <p className="text-sm font-black text-white">LivePix</p>
                <p className="text-[11px] text-gray-600">Integração de doações para o jackpot</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-black ${livepixOk ? "text-green-400" : "text-gray-600"}`}>
                  {livepixOk ? "Conectado" : "Não configurado"}
                </span>
                <StatusDot ok={livepixOk} />
              </div>
            </div>

            <div className="px-5 py-5 space-y-5">

              {/* Instruções */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Como configurar</p>
                <div className="space-y-2">
                  <Step n={1}>Acesse <strong className="text-gray-300">livepix.gg</strong> e faça login na sua conta de streamer.</Step>
                  <Step n={2}>No painel, vá em <strong className="text-gray-300">Configurações → API → Aplicações</strong> e clique em <strong className="text-gray-300">Nova Aplicação</strong>.</Step>
                  <Step n={3}>Nomeie sua aplicação e informe a <strong className="text-gray-300">URL de Callback</strong> abaixo.</Step>
                  <Step n={4}>Copie o <strong className="text-gray-300">Client ID</strong> e o <strong className="text-gray-300">Client Secret</strong> gerados e cole nos campos abaixo.</Step>
                  <Step n={5}>Na seção de Webhooks da aplicação, informe a <strong className="text-gray-300">URL do Webhook</strong> abaixo (com o secret, se configurado).</Step>
                </div>
              </div>

              {/* URLs */}
              <div className="space-y-2.5 p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider">URLs do LivePix</p>
                {config?.livepix.callbackUrl && (
                  <UrlBox label="URL de Callback (Redirect URI)" url={config.livepix.callbackUrl} />
                )}
                {livepixWebhookDisplay && (
                  <UrlBox
                    label={`URL do Webhook${config?.livepix.hasWebhookSecret || liveWebhookSec.trim() ? " (com secret)" : ""}`}
                    url={livepixWebhookDisplay}
                  />
                )}
              </div>

              {/* Campos */}
              <div className="space-y-3">
                <FieldInput
                  label="Client ID"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={liveClientId}
                  onChange={setLiveClientId}
                  configured={config?.livepix.hasClientId}
                />
                <FieldInput
                  label="Client Secret"
                  placeholder="Cole o Client Secret aqui"
                  value={liveClientSecret}
                  onChange={setLiveClientSecret}
                  type="password"
                  configured={config?.livepix.hasClientSecret}
                />
                <FieldInput
                  label="Webhook Secret (opcional, mas recomendado)"
                  placeholder="Uma senha para validar as notificações recebidas"
                  value={liveWebhookSec}
                  onChange={setLiveWebhookSec}
                  type="password"
                  configured={config?.livepix.hasWebhookSecret}
                  hint="Ao definir um secret, a URL do Webhook acima será atualizada automaticamente com ele."
                />
              </div>

              {/* Feedback */}
              {liveMsg && (
                <div className={`px-4 py-2.5 rounded-xl text-xs font-black ${liveMsg.ok ? "text-green-400" : "text-red-400"}`}
                  style={liveMsg.ok
                    ? { background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }
                    : { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {liveMsg.ok ? "✅" : "❌"} {liveMsg.text}
                </div>
              )}

              <SaveButton loading={liveSaving}>Salvar LivePix</SaveButton>
            </div>
          </div>
        </form>

        {/* ─── GGPIX ───────────────────────────────────────────────── */}
        <form onSubmit={saveGGPix}>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(8,6,20,0.7)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}>

            {/* Header */}
            <div className="px-5 py-4 flex items-center gap-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-xl">💰</span>
              <div className="flex-1">
                <p className="text-sm font-black text-white">GGPix</p>
                <p className="text-[11px] text-gray-600">API PIX para envio automático de gorjetas</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-black ${ggpixOk ? "text-green-400" : "text-red-400"}`}>
                  {ggpixOk ? "Conectado" : "Não configurado"}
                </span>
                <StatusDot ok={ggpixOk} />
              </div>
            </div>

            <div className="px-5 py-5 space-y-5">

              {/* Instruções */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Como configurar</p>
                <div className="space-y-2">
                  <Step n={1}>Acesse <strong className="text-gray-300">ggpixapi.com</strong>, crie uma conta de Merchant e conclua a verificação.</Step>
                  <Step n={2}>No painel, vá em <strong className="text-gray-300">Credenciais e Webhooks → aba Credenciais</strong> e copie sua <strong className="text-gray-300">API Key</strong>.</Step>
                  <Step n={3}>Na <strong className="text-gray-300">aba Webhooks</strong>, informe a URL do Webhook abaixo e ative os eventos <strong className="text-gray-300">PIX Enviado</strong> e <strong className="text-gray-300">Transferência Enviada</strong>.</Step>
                  <Step n={4}>Escolha o modo de autenticação do webhook (recomendamos <strong className="text-gray-300">Ambos</strong>), gere os tokens no painel da GGPix e cole nos campos abaixo.</Step>
                </div>
              </div>

              {/* URL do Webhook */}
              <div className="space-y-2.5 p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider">URL do Webhook GGPix</p>
                {config?.ggpix.webhookUrl && (
                  <UrlBox label="Cole esta URL no painel da GGPix" url={config.ggpix.webhookUrl} />
                )}
                <p className="text-[10px] text-gray-600">
                  Eventos a ativar: <span className="text-gray-400 font-black">PIX Enviado</span> e <span className="text-gray-400 font-black">Transferência Enviada</span>
                </p>
              </div>

              {/* API Key */}
              <FieldInput
                label="API Key"
                placeholder="gk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={ggApiKey}
                onChange={setGgApiKey}
                type="password"
                configured={config?.ggpix.hasApiKey}
              />

              {/* Autenticação do webhook */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Autenticação do Webhook</p>
                <div className="space-y-2">
                  <RadioCard value="none"   current={ggAuthMode} onChange={setGgAuthMode}
                    title="Sem autenticação"  description="Webhooks recebidos sem verificação de origem." />
                  <RadioCard value="bearer" current={ggAuthMode} onChange={setGgAuthMode}
                    title="Bearer Token"      description="Verifica o header Authorization: Bearer <token>." />
                  <RadioCard value="hmac"   current={ggAuthMode} onChange={setGgAuthMode}
                    title="HMAC Secret"       description="Verifica a assinatura no header X-Webhook-Signature." />
                  <RadioCard value="ambos"  current={ggAuthMode} onChange={setGgAuthMode}
                    title="Ambos (recomendado)" description="Bearer Token + HMAC Secret — máxima segurança." />
                </div>
              </div>

              {/* Campos condicionais */}
              {(ggAuthMode === "bearer" || ggAuthMode === "ambos") && (
                <FieldInput
                  label="Bearer Token"
                  placeholder="Cole o Bearer Token gerado no painel da GGPix"
                  value={ggBearer}
                  onChange={setGgBearer}
                  type="password"
                  configured={config?.ggpix.hasBearerToken}
                  hint='Gerado na GGPix em: Webhooks → Bearer Token → "Gerar".'
                />
              )}
              {(ggAuthMode === "hmac" || ggAuthMode === "ambos") && (
                <FieldInput
                  label="HMAC Secret"
                  placeholder="Cole o HMAC Secret gerado no painel da GGPix"
                  value={ggHmac}
                  onChange={setGgHmac}
                  type="password"
                  configured={config?.ggpix.hasHmacSecret}
                  hint='Gerado na GGPix em: Webhooks → HMAC Secret → "Gerar". Assinatura enviada em X-Webhook-Signature.'
                />
              )}

              {/* Feedback */}
              {ggMsg && (
                <div className={`px-4 py-2.5 rounded-xl text-xs font-black ${ggMsg.ok ? "text-green-400" : "text-red-400"}`}
                  style={ggMsg.ok
                    ? { background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }
                    : { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {ggMsg.ok ? "✅" : "❌"} {ggMsg.text}
                </div>
              )}

              <SaveButton loading={ggSaving}>Salvar GGPix</SaveButton>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admins";
import PlayerAvatar from "@/components/PlayerAvatar";
import type { CallState, CallEntry } from "@/lib/callStore";

const C = "#22c55e";

const CSS = `
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }
  @keyframes pulse-cyan {
    0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
    50%      { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
  }
`;

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button
      onClick={copy}
      title="Copiar nome do jogo"
      className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-110 active:scale-95 flex-shrink-0"
      style={{
        background: copied ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${copied ? "rgba(34,197,94,0.5)" : "rgba(255,255,255,0.1)"}`,
        color: copied ? C : "#6b7280",
      }}
    >
      {copied ? (
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
        </svg>
      )}
    </button>
  );
}

function FollowBtn({ jogo }: { jogo: string }) {
  const [copied, setCopied] = useState(false);

  async function copiar() {
    try { await navigator.clipboard.writeText(jogo); } catch {  }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copiar}
      title="Copiar o nome do jogo"
      className="group flex items-center gap-1.5 px-2.5 h-7 rounded-lg font-black text-[10px] uppercase tracking-wide transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
      style={{
        background: copied
          ? "linear-gradient(135deg, rgba(34,197,94,0.3), rgba(16,185,129,0.2))"
          : "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(16,185,129,0.12))",
        border: "1px solid rgba(34,197,94,0.35)",
        color: "#4ade80",
        boxShadow: "0 0 0 rgba(34,197,94,0)",
        transition: "box-shadow 0.2s, transform 0.15s, background 0.2s",
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 14px rgba(34,197,94,0.35)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 0 0 rgba(34,197,94,0)")}
    >
      {copied ? (
        <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
          <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
        </svg>
      )}
      {copied ? "Copiado!" : "Copiar"}
    </button>
  );
}

function EntryRow({ entry, num, onRemover, removing }: {
  entry: CallEntry;
  num: number;
  onRemover: () => void;
  removing: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
      style={{
        background: "rgba(34,197,94,0.04)",
        border: "1px solid rgba(34,197,94,0.15)",
        animation: "slideDown 0.3s ease-out both",
      }}
    >
      <div
        className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-[11px] flex-shrink-0"
        style={{ background: "rgba(34,197,94,0.12)", color: C, border: "1px solid rgba(34,197,94,0.25)" }}
      >
        {num}
      </div>

      <PlayerAvatar image={entry.image} name={entry.displayName} size={32} color={C} />

      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-semibold truncate">{entry.displayName} · @{entry.username}</p>
        <p className="text-sm font-black text-white truncate leading-tight">{entry.jogo}</p>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <FollowBtn jogo={entry.jogo} />
        <CopyBtn text={entry.jogo} />
        <button
          onClick={onRemover}
          disabled={removing}
          title="Remover entry"
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-40"
          style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171" }}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function AdminCallPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [call, setCall] = useState<CallState | null>(null);
  const [busy, setBusy] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const prevCount = useRef(0);

  useEffect(() => {
    if (status === "loading") return;
    if (!isAdmin(session?.user?.twitchLogin)) router.replace("/arena/call");
  }, [status, session, router]);

  const fetchCall = useCallback(async () => {
    try {
      const res = await fetch("/api/call", { cache: "no-store" });
      if (res.ok) {
        const data: CallState = await res.json();
        setCall(data);
        prevCount.current = data.entries.length;
      }
    } catch {  }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => { fetchCall(); }, [fetchCall]);
  useEffect(() => {
    const iv = setInterval(fetchCall, 2000);
    return () => clearInterval(iv);
  }, [fetchCall]);

  function flash(text: string, type: "ok" | "err") {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  }

  async function post(body: object) {
    setBusy(true);
    try {
      const res = await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { flash(data.error ?? "Erro", "err"); return null; }
      setCall(data);
      return data;
    } catch { flash("Erro de conexão", "err"); return null; }
    finally { setBusy(false); }
  }

  async function remover(id: string) {
    setRemovingId(id);
    try {
      const res = await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remover", id }),
      });
      const data = await res.json();
      if (res.ok) setCall(data);
      else flash(data.error ?? "Erro", "err");
    } catch { flash("Erro de conexão", "err"); }
    finally { setRemovingId(null); }
  }

  if (status === "loading" || carregando || !isAdmin(session?.user?.twitchLogin)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${C}40`, borderTopColor: C }} />
      </div>
    );
  }

  const aberta = call?.status === "aberta";
  const entries = call?.entries ?? [];

  return (
    <div className="page-enter relative min-h-[calc(100vh-4rem)]">
      <style>{CSS}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full opacity-[0.035]"
          style={{ background: `radial-gradient(ellipse, ${C}, transparent 70%)`, filter: "blur(60px)" }} />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-14 pb-24 space-y-5">


        <div className="flex items-center gap-2 text-xs text-gray-700">
          <span className="text-gray-500">Admin · Call de Slot</span>
        </div>


        <div className="flex items-start gap-4">
          <div className="flex-1">
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 mb-2"
              style={{ background: "rgba(34,197,94,0.12)", color: C, border: "1px solid rgba(34,197,94,0.3)" }}>
              📋 PAINEL ADMIN
            </span>
            <h1 className="text-3xl font-black text-white">Call de Slot</h1>
            <p className="text-sm text-gray-600 mt-0.5">Gerenciar calls do chat · <span className="font-mono">!call [jogo]</span></p>
          </div>
          {msg && (
            <div className={`px-4 py-2 rounded-xl text-xs font-black flex-shrink-0 ${
              msg.type === "ok"
                ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                : "text-red-400 bg-red-500/10 border border-red-500/20"
            }`}>
              {msg.text}
            </div>
          )}
        </div>


        <div className="flex items-center gap-3">
          {aberta ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black"
              style={{ background: "rgba(34,197,94,0.1)", color: C, border: "1px solid rgba(34,197,94,0.35)", animation: "pulse-cyan 2s infinite" }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: C }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: C }} />
              </span>
              ABERTA · {entries.length} call{entries.length !== 1 ? "s" : ""}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black text-gray-600"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="w-2 h-2 rounded-full bg-gray-700" />
              FECHADA
            </div>
          )}
        </div>


        {!aberta ? (

          <div className="rounded-3xl overflow-hidden text-center py-16 px-6"
            style={{ background: "rgba(6,16,10,0.95)", border: "1px solid rgba(34,197,94,0.12)" }}>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6"
              style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
              <span className="text-4xl">📋</span>
            </div>
            <h2 className="text-lg font-black text-white mb-2">Call do Chat fechada</h2>
            <p className="text-sm text-gray-600 mb-8 max-w-xs mx-auto">
              Abra para que os espectadores possam enviar suas calls com <span className="font-mono text-gray-400">!call [jogo]</span> no chat.
            </p>
            <button
              onClick={async () => { const r = await post({ action: "abrir" }); if (r) flash("Call aberta!", "ok"); }}
              disabled={busy}
              className="px-10 py-4 rounded-2xl font-black text-sm transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${C}, #16a34a)`,
                color: "#000",
                boxShadow: `0 4px 24px rgba(34,197,94,0.3)`,
              }}
            >
              {busy ? "Abrindo..." : "📋 Abrir Call do Chat"}
            </button>
          </div>
        ) : (

          <div className="space-y-4">

            <div className="rounded-2xl px-5 py-4"
              style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: C }}>Comando ativo</p>
              <p className="text-white font-black font-mono text-lg">!call [nome do jogo]</p>
              <p className="text-xs text-gray-500 mt-1">1 call por pessoa · as calls aparecem abaixo em tempo real</p>
            </div>


            <div className="rounded-3xl overflow-hidden"
              style={{ background: "rgba(6,16,10,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex-1">Calls recebidas</p>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full"
                  style={{ background: "rgba(34,197,94,0.1)", color: C, border: "1px solid rgba(34,197,94,0.25)" }}>
                  {entries.length}
                </span>
              </div>

              <div className="p-4">
                {entries.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-3xl mb-3">💬</p>
                    <p className="text-sm font-black text-gray-600">Aguardando calls...</p>
                    <p className="text-xs text-gray-700 mt-1">Os espectadores digitam <span className="font-mono">!call [jogo]</span> no chat</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {entries.map((e, i) => (
                      <EntryRow
                        key={e.id}
                        entry={e}
                        num={i + 1}
                        onRemover={() => remover(e.id)}
                        removing={removingId === e.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>


            <button
              onClick={async () => { const r = await post({ action: "fechar" }); if (r) flash("Call fechada", "ok"); }}
              disabled={busy}
              className="w-full py-3.5 rounded-2xl font-black text-sm transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
              style={{ color: "#f87171", border: "1px solid rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.05)" }}
            >
              {busy ? "Fechando..." : "✕ Fechar Call"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

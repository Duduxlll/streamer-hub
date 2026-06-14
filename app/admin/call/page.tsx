"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(18px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }
  @keyframes winnerGlow {
    0%,100% { box-shadow: 0 0 18px rgba(34,197,94,0.3), 0 0 40px rgba(34,197,94,0.08); }
    50%      { box-shadow: 0 0 32px rgba(34,197,94,0.6), 0 0 70px rgba(34,197,94,0.2);  }
  }
  @keyframes spinFlicker {
    0%   { opacity: 0.7; }
    50%  { opacity: 1;   }
    100% { opacity: 0.7; }
  }
`;

function FollowBtn({ jogo }: { jogo: string }) {
  const [copied, setCopied] = useState(false);

  async function copiar() {
    try { await navigator.clipboard.writeText(jogo); } catch { }
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

function RouletaModal({ entries: initialEntries, onRemover, onClose }: {
  entries: CallEntry[];
  onRemover: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [pool, setPool] = useState(initialEntries);
  const [spinDisplay, setSpinDisplay] = useState<CallEntry>(initialEntries[0]);
  const [winner, setWinner] = useState<CallEntry | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [jogoCopiado, setJogoCopiado] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    startSpin(initialEntries);
    return () => { cancelRef.current = true; };
  }, []);

  async function startSpin(entries: CallEntry[]) {
    if (entries.length === 0) { onClose(); return; }
    cancelRef.current = false;
    setWinner(null);
    setJogoCopiado(false);
    setSpinning(true);

    const picked = entries[Math.floor(Math.random() * entries.length)];
    const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

    const start = Date.now();
    const dur = 1300;

    while (Date.now() - start < dur) {
      if (cancelRef.current) return;
      const elapsed = Date.now() - start;
      const progress = elapsed / dur;
      const speed = 55 + progress * progress * 370;
      setSpinDisplay(entries[Math.floor(Math.random() * entries.length)]);
      await sleep(Math.min(speed, 370));
    }

    if (cancelRef.current) return;
    setSpinDisplay(picked);
    setSpinning(false);
    setWinner(picked);
  }

  async function girarNovamente() {
    if (!winner || removing) return;
    setRemoving(true);
    await onRemover(winner.id);
    setRemoving(false);
    const next = pool.filter(e => e.id !== winner.id);
    setPool(next);
    if (next.length === 0) { onClose(); return; }
    startSpin(next);
  }

  async function copiarJogo() {
    if (!winner) return;
    try { await navigator.clipboard.writeText(winner.jogo); } catch { }
    setJogoCopiado(true);
    setTimeout(() => setJogoCopiado(false), 2000);
  }

  const current = spinDisplay;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(16px)" }}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden relative"
        style={{
          background: "rgba(4,14,9,0.99)",
          border: `1px solid rgba(34,197,94,${winner ? "0.45" : "0.25"})`,
          boxShadow: winner
            ? "0 0 80px rgba(34,197,94,0.15), 0 0 160px rgba(34,197,94,0.06)"
            : "0 0 40px rgba(34,197,94,0.08)",
          transition: "border-color 0.4s, box-shadow 0.4s",
        }}>

        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex items-center justify-center w-8 h-8 rounded-xl text-xs font-black transition-all hover:scale-110 active:scale-95"
          style={{ background: "rgba(255,255,255,0.06)", color: "#6b7280", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          ✕
        </button>

        <div className="px-6 pt-6 pb-4 text-center border-b border-white/5">
          <div className="text-2xl mb-1">{spinning ? "🎰" : winner ? "🎉" : "🎰"}</div>
          <h2 className="text-lg font-black text-white">
            {spinning ? "Sorteando..." : winner ? "Sorteado!" : "Pronto"}
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            {pool.length} call{pool.length !== 1 ? "s" : ""} na lista
          </p>
        </div>

        <div className="px-5 py-5 flex flex-col items-center gap-4">
          <div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{
              border: winner
                ? "1px solid rgba(34,197,94,0.5)"
                : "1px solid rgba(34,197,94,0.2)",
              animation: winner ? "winnerGlow 2s ease-in-out infinite" : undefined,
              transition: "border-color 0.3s",
            }}
          >
            {current.image && (
              <img
                src={current.image}
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ filter: "blur(22px) brightness(0.12)", transform: "scale(1.5)", transition: "opacity 0.1s" }}
              />
            )}
            {!current.image && (
              <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(34,197,94,0.06), transparent 70%)" }} />
            )}

            <div className="relative z-10 flex flex-col items-center gap-3 py-8 px-4">
              <div style={{ transition: spinning ? "none" : "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)", transform: winner ? "scale(1.06)" : "scale(1)" }}>
                <PlayerAvatar image={current.image} name={current.displayName} size={84} color={C} />
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-white leading-tight"
                  style={{ textShadow: winner ? "0 0 20px rgba(34,197,94,0.5)" : undefined, transition: "text-shadow 0.4s" }}>
                  {current.displayName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">@{current.username}</p>
              </div>
            </div>
          </div>

          {spinning && (
            <div className="flex items-center gap-2">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: C, animationDelay: `${i * 0.15}s`, opacity: 0.8 }}
                />
              ))}
            </div>
          )}

          {winner && (
            <div className="w-full space-y-3" style={{ animation: "fadeInUp 0.45s cubic-bezier(0.22,1,0.36,1) both" }}>
              <div
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.22)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-0.5">Jogo sorteado</p>
                  <p className="text-sm font-black text-white truncate">{winner.jogo}</p>
                </div>
                <button
                  onClick={copiarJogo}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-xl font-black text-[11px] flex-shrink-0 transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: jogoCopiado
                      ? "rgba(34,197,94,0.25)"
                      : "rgba(34,197,94,0.12)",
                    border: "1px solid rgba(34,197,94,0.4)",
                    color: "#4ade80",
                  }}
                >
                  {jogoCopiado ? (
                    <>
                      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                      Copiado!
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                        <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
                      </svg>
                      Copiar jogo
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={girarNovamente}
                disabled={removing}
                className="w-full py-3.5 rounded-2xl font-black text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                style={{
                  background: pool.length <= 1
                    ? "rgba(248,113,113,0.08)"
                    : `linear-gradient(135deg, ${C}, #16a34a)`,
                  color: pool.length <= 1 ? "#f87171" : "#000",
                  border: pool.length <= 1 ? "1px solid rgba(248,113,113,0.25)" : "none",
                  boxShadow: pool.length <= 1 ? "none" : "0 4px 20px rgba(34,197,94,0.25)",
                }}
              >
                {removing
                  ? "Removendo..."
                  : pool.length <= 1
                  ? "✕ Encerrar roleta"
                  : "🎰 Girar novamente"}
              </button>
            </div>
          )}
        </div>
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
  const [showRoleta, setShowRoleta] = useState(false);
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
    } catch { }
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

      {showRoleta && entries.length > 0 && (
        <RouletaModal
          entries={entries}
          onRemover={remover}
          onClose={() => { setShowRoleta(false); fetchCall(); }}
        />
      )}

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

            {entries.length > 0 && (
              <button
                onClick={() => setShowRoleta(true)}
                className="w-full py-4 rounded-2xl font-black text-base text-black transition-all hover:scale-[1.02] active:scale-95"
                style={{
                  background: `linear-gradient(135deg, #4ade80, ${C}, #16a34a)`,
                  boxShadow: "0 4px 28px rgba(34,197,94,0.35)",
                }}
              >
                🎰 Sortear pelo roleta
              </button>
            )}

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

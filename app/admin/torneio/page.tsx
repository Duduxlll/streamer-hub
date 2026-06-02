"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { isAdmin } from "@/lib/admins";
import PlayerAvatar from "@/components/PlayerAvatar";
import type { Torneio } from "@/lib/torneioStore";
import { useToast, ToastContainer } from "@/components/toast";
import { useConfirm } from "@/components/confirm-modal";

const TEAM_COLORS = [
  { bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.35)", glow: "rgba(34,197,94,0.15)", text: "#4ade80", avatar: "rgba(34,197,94,0.22)", avatarText: "#86efac" },
  { bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.35)", glow: "rgba(34,197,94,0.15)", text: "#4ade80", avatar: "rgba(34,197,94,0.22)", avatarText: "#86efac" },
  { bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.35)", glow: "rgba(245,158,11,0.15)", text: "#fbbf24", avatar: "rgba(245,158,11,0.22)", avatarText: "#fcd34d" },
  { bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.35)", glow: "rgba(16,185,129,0.15)", text: "#34d399", avatar: "rgba(16,185,129,0.22)", avatarText: "#6ee7b7" },
];

const STATUS_CFG = {
  aberta:   { label: "ABERTA",   bg: "bg-green-500/10",  border: "border-green-500/40",  text: "text-green-400",  dot: "bg-green-400 animate-pulse" },
  fechada:  { label: "FECHADA",  bg: "bg-orange-500/10", border: "border-orange-500/40", text: "text-orange-400", dot: "bg-orange-400" },
  decidida: { label: "DECIDIDA", bg: "bg-yellow-500/10", border: "border-yellow-500/40", text: "text-yellow-400", dot: "bg-yellow-400" },
};

function TimesForm({ label, times, setTimes }: { label: string; times: string[]; setTimes: (t: string[]) => void }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
      <div className="space-y-2">
        {times.map((t, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={t}
              onChange={e => { const a = [...times]; a[i] = e.target.value; setTimes(a); }}
              placeholder={`Time ${String.fromCharCode(65 + i)}`}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#ffba00]/50 transition-colors"
            />
            {times.length > 2 && (
              <button
                onClick={() => setTimes(times.filter((_, j) => j !== i))}
                className="px-3 rounded-xl border border-red-500/30 bg-red-500/8 text-red-400 text-xs hover:bg-red-500/20 transition-all"
              >✕</button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={() => setTimes([...times, ""])}
        className="mt-2 text-xs text-gray-600 hover:text-gray-300 transition-colors flex items-center gap-1"
      >
        <span className="text-base leading-none">+</span> Adicionar time
      </button>
    </div>
  );
}

export default function AdminTorneioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const { toasts, toast, dismiss } = useToast();
  const { confirm, ConfirmModal } = useConfirm();
  const [torneio, setTorneio] = useState<Torneio | null>(null);
  const [loading, setLoading] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [resultadoFinal, setResultadoFinal] = useState<{ nome: string; vencedores: { username: string; displayName: string }[] } | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novosTimes, setNovosTimes] = useState(["", ""]);
  const [proximosTimes, setProximosTimes] = useState(["", ""]);
  const [valoresTimes, setValoresTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === "loading") return;
    if (!isAdmin(session?.user?.twitchLogin)) router.replace("/arena/torneio");
  }, [status, session, router]);

  const fetchTorneio = useCallback(async () => {
    try {
      const res = await fetch("/api/torneio", { cache: "no-store" });
      setTorneio(await res.json());
    } catch { /* ignora */ }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => {
    fetchTorneio();
    const id = setInterval(fetchTorneio, 2000);
    return () => clearInterval(id);
  }, [fetchTorneio]);

  if (status === "loading" || carregando || !isAdmin(session?.user?.twitchLogin)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#22c55e] border-t-transparent animate-spin" />
      </div>
    );
  }

  async function post(body: object): Promise<Torneio | null> {
    setLoading(true);
    try {
      const res = await fetch("/api/torneio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data && "id" in data) { setTorneio(data as Torneio); return data as Torneio; }
      return null;
    } finally { setLoading(false); }
  }

  const fase = torneio?.fases.find(f => f.numero === torneio.faseAtual);
  const st = fase ? STATUS_CFG[fase.status] : null;

  function setValorTime(time: string, valor: string) {
    setValoresTimes(prev => ({ ...prev, [time]: valor }));
  }

  function parseValor(v: string): number {
    return parseFloat(v.replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".")) || 0;
  }

  function fmtValor(v: string): string {
    const n = parseFloat(v.replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", "."));
    if (!isNaN(n) && n > 0)
      return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return v;
  }

  return (
    <div className="page-enter relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      {ConfirmModal}

<div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-24 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div>
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 mb-2"
                style={{ background: "rgba(255,186,0,0.15)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.3)" }}>
                👑 PAINEL ADMIN
              </span>
              <h1 className="text-3xl font-black text-white leading-tight">Torneio</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {st && fase ? (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${st.bg} ${st.border} ${st.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                Fase {torneio!.faseAtual} · {st.label}
              </span>
            ) : !torneio ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border bg-gray-500/10 border-gray-600/40 text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                Inativo
              </span>
            ) : null}

            {torneio && !resultadoFinal && (
              <button
                onClick={async () => {
                  if (!await confirm(`Finalizar o torneio "${torneio.nome}" e decidir os vencedores?`, { confirmLabel: "Finalizar", danger: true })) return;
                  setLoading(true);
                  try {
                    const res = await fetch("/api/torneio", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "finalizar" }),
                    });
                    const data = await res.json() as { nome?: string; vencedores?: { username: string; displayName: string }[] };
                    setTorneio(null);
                    if (data.vencedores) {
                      setResultadoFinal({ nome: data.nome ?? torneio.nome, vencedores: data.vencedores });
                    }
                    toast("Torneio finalizado! 🏆", "success");
                  } finally { setLoading(false); }
                }}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-red-500/35 bg-red-500/8 text-red-400 hover:bg-red-500/18 transition-all disabled:opacity-50"
              >
                Finalizar e Decidir Vencedor
              </button>
            )}
          </div>
        </div>

        {resultadoFinal ? (
          <div className="rounded-3xl border overflow-hidden"
            style={{
              borderColor: "rgba(255,186,0,0.4)",
              background: "linear-gradient(160deg, rgba(255,186,0,0.1), rgba(6,18,11,0.98))",
              boxShadow: "0 0 60px rgba(255,186,0,0.12)",
              animation: "tnFinalIn 0.5s cubic-bezier(0.16,1,0.3,1)",
            }}>
            <style>{`
              @keyframes tnFinalIn { from { opacity:0; transform: scale(0.96) translateY(20px); } to { opacity:1; transform: scale(1) translateY(0); } }
              @keyframes tnWinnerIn { from { opacity:0; transform: translateY(16px) scale(0.9); } to { opacity:1; transform: translateY(0) scale(1); } }
              @keyframes tnTrophyBounce { 0%,100% { transform: translateY(0) rotate(0deg); } 25% { transform: translateY(-8px) rotate(-6deg); } 75% { transform: translateY(-8px) rotate(6deg); } }
              @keyframes tnGlow { 0%,100% { text-shadow: 0 0 20px rgba(255,186,0,0.4); } 50% { text-shadow: 0 0 40px rgba(255,186,0,0.7); } }
            `}</style>

            {/* Cabeçalho */}
            <div className="px-6 pt-8 pb-5 text-center">
              <div className="text-6xl mb-3 inline-block" style={{ animation: "tnTrophyBounce 1.8s ease-in-out infinite" }}>🏆</div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] mb-1" style={{ color: "#ffba00" }}>Torneio Finalizado</p>
              <h2 className="text-3xl font-black text-white" style={{ animation: "tnGlow 2.5s ease-in-out infinite" }}>{resultadoFinal.nome}</h2>
            </div>

            {/* Vencedores */}
            <div className="px-6 pb-6">
              {resultadoFinal.vencedores.length === 0 ? (
                <div className="text-center py-8 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-3xl mb-2">🤷</p>
                  <p className="text-sm font-black text-gray-400">Nenhum vencedor</p>
                  <p className="text-xs text-gray-600 mt-1">Nenhum participante chegou até o fim.</p>
                </div>
              ) : (
                <>
                  <p className="text-center text-[11px] font-black text-gray-500 uppercase tracking-widest mb-4">
                    {resultadoFinal.vencedores.length === 1
                      ? "🥇 Grande Campeão"
                      : `🎉 ${resultadoFinal.vencedores.length} Vencedores`}
                  </p>
                  <div className={`grid gap-3 ${resultadoFinal.vencedores.length === 1 ? "grid-cols-1 max-w-sm mx-auto" : "grid-cols-1 sm:grid-cols-2"}`}>
                    {resultadoFinal.vencedores.map((v, i) => (
                      <div key={v.username}
                        className="flex items-center gap-3 px-5 py-4 rounded-2xl"
                        style={{
                          background: "rgba(255,186,0,0.08)",
                          border: "1px solid rgba(255,186,0,0.3)",
                          boxShadow: "0 0 24px rgba(255,186,0,0.08)",
                          animation: `tnWinnerIn 0.5s ease-out ${0.15 + i * 0.12}s both`,
                        }}>
                        <span className="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-black flex-shrink-0"
                          style={{ background: "linear-gradient(135deg,#ffdd55,#ffba00)" }}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-black text-white truncate">{v.displayName}</p>
                          <p className="text-[11px] text-gray-500 truncate">@{v.username}</p>
                        </div>
                        <span className="text-2xl flex-shrink-0">🏆</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Botão próximo torneio */}
            <div className="px-6 pb-7">
              <button
                onClick={() => { setResultadoFinal(null); setTorneio(null); }}
                className="w-full py-3.5 rounded-2xl font-black text-black text-sm transition-all hover:scale-[1.02] active:scale-95"
                style={{ background: "linear-gradient(135deg, #ffba00, #e6a000)", boxShadow: "0 4px 24px rgba(255,186,0,0.3)" }}>
                ▶ Abrir Próximo Torneio
              </button>
            </div>
          </div>
        ) : !torneio ? (
          <div className="rounded-2xl border border-white/12 p-6" style={{ background: "rgba(6,18,11,0.97)", backdropFilter: "blur(12px)" }}>
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-5">Criar Torneio</p>
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Nome do Torneio</label>
              <input
                type="text"
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                placeholder="Ex: Torneio da Semana"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#ffba00]/50 transition-colors"
              />
            </div>
            <div className="mb-6">
              <TimesForm label="Times da Fase 1" times={novosTimes} setTimes={setNovosTimes} />
            </div>
            <button
              onClick={async () => {
                const result = await post({ action: "criar", nome: novoNome, times: novosTimes });
                if (result) { setNovoNome(""); setNovosTimes(["", ""]); }
              }}
              disabled={!novoNome.trim() || novosTimes.filter(Boolean).length < 2 || loading}
              className="w-full py-3.5 rounded-xl font-black text-black text-sm transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: "linear-gradient(135deg, #ffba00, #e6a000)" }}
            >
              {loading ? "Criando..." : "▶ Iniciar Fase 1"}
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-yellow-500/25 px-5 py-4"
              style={{ background: "rgba(251,191,36,0.06)", boxShadow: "0 0 30px rgba(251,191,36,0.06)" }}>
              <p className="text-[11px] font-black text-yellow-600 uppercase tracking-widest mb-0.5">🏆 Torneio Ativo</p>
              <p className="text-2xl font-black text-white">{torneio.nome}</p>
            </div>
            {fase && (
              <div className="rounded-2xl border border-white/12 p-5" style={{ background: "rgba(6,18,11,0.97)", backdropFilter: "blur(12px)" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Comandos do Chat</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(fase.times.map(t => `!time ${t}`).join(" | "))}
                    className="text-[11px] font-bold text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded-lg border border-white/10 hover:border-white/20"
                  >
                    📋 Copiar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {fase.times.map(t => (
                    <span key={t}
                      className="font-mono font-black text-sm px-4 py-2 rounded-xl border border-green-500/30 text-green-200 tracking-wide"
                      style={{ background: "rgba(34,197,94,0.15)" }}>
                      !time {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {fase && (
              <div className="rounded-2xl border border-white/12 p-5" style={{ background: "rgba(6,18,11,0.97)", backdropFilter: "blur(12px)" }}>
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-4">
                  Controle · Fase {torneio.faseAtual}
                </p>

                {fase.status === "aberta" && (
                  <button
                    onClick={() => post({ action: "fechar-fase" })}
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-black text-sm border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                  >
                    {loading ? "Fechando..." : "■ Fechar Fase"}
                  </button>
                )}

                {fase.status === "fechada" && (
                  <div className="text-center py-2">
                    <p className="text-sm text-orange-400">
                      ⏳ Fase fechada — clique em <strong>Definir Vencedor</strong> em um dos times abaixo
                    </p>
                  </div>
                )}

                {fase.status === "decidida" && (
                  <div>
                    <div className="flex items-center gap-2 mb-4 p-3 rounded-xl border border-yellow-500/25 bg-yellow-500/8">
                      <span className="text-lg">🏆</span>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold">Vencedor da fase</p>
                        <p className="text-white font-black">{fase.vencedor}</p>
                      </div>
                      <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400">
                        {torneio.classificados?.length ?? 0} classificado{(torneio.classificados?.length ?? 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <TimesForm label="Times da Próxima Fase" times={proximosTimes} setTimes={setProximosTimes} />
                    <button
                      onClick={async () => {
                        const result = await post({ action: "abrir-fase", times: proximosTimes });
                        if (result) setProximosTimes(["", ""]);
                      }}
                      disabled={proximosTimes.filter(Boolean).length < 2 || loading}
                      className="w-full mt-4 py-3.5 rounded-xl font-black text-black text-sm transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                      style={{ background: "linear-gradient(135deg, #ffba00, #e6a000)" }}
                    >
                      {loading ? "Abrindo..." : `▶ Abrir Fase ${torneio.faseAtual + 1}`}
                    </button>
                  </div>
                )}
              </div>
            )}
            {fase && (
              <div>
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3">
                  Times · Fase {torneio.faseAtual}
                </p>
                <div className={`grid gap-4 ${
                  fase.times.length === 2 ? "grid-cols-2"
                  : fase.times.length === 3 ? "grid-cols-3"
                  : "grid-cols-2 sm:grid-cols-4"
                }`}>
                  {fase.times.map((time, idx) => {
                    const votos = fase.escolhas.filter(e => e.time === time);
                    const isVenc = fase.vencedor === time;
                    const isElim = !!(fase.vencedor && !isVenc);
                    const tc = TEAM_COLORS[idx % TEAM_COLORS.length];

                    const cardBg   = isVenc ? "rgba(251,191,36,0.1)"  : isElim ? "rgba(6,16,10,0.85)" : tc.bg;
                    const cardBdr  = isVenc ? "rgba(251,191,36,0.45)" : isElim ? "rgba(255,255,255,0.08)" : tc.border;
                    const shadow   = isElim ? undefined : isVenc ? "0 0 28px rgba(251,191,36,0.2)" : `0 0 20px ${tc.glow}`;
                    const numColor = isVenc ? "#fbbf24" : tc.text;
                    const avBg     = isVenc ? "rgba(251,191,36,0.22)" : tc.avatar;
                    const avTxt    = isVenc ? "#fbbf24" : tc.avatarText;

                    return (
                      <div
                        key={time}
                        className={`rounded-2xl border p-4 flex flex-col transition-all ${isElim ? "opacity-45" : ""}`}
                        style={{ background: isVenc ? `linear-gradient(135deg, rgba(251,191,36,0.15), rgba(6,16,10,0.92))` : isElim ? "rgba(6,16,10,0.80)" : `linear-gradient(135deg, ${tc.bg}, rgba(6,16,10,0.92))`, borderColor: cardBdr, boxShadow: shadow }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            {isVenc && <p className="text-[10px] text-yellow-400 font-black mb-0.5 uppercase tracking-widest">🏆 Vencedor</p>}
                            <p className="font-black text-white text-base leading-tight">{time}</p>
                          </div>
                          <span className="text-2xl font-black tabular-nums leading-none" style={{ color: numColor }}>
                            {votos.length}
                          </span>
                        </div>
                        {!isElim && (
                          <div className="mb-3">
                            <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: isVenc ? "#fbbf24" : tc.text, opacity: 0.7 }}>
                              Valor do Bônus
                            </p>
                            {isVenc && valoresTimes[time] ? (
                              <div className="px-3 py-2 rounded-lg text-center"
                                style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)" }}>
                                <p className="text-base font-black text-yellow-300 tabular-nums">
                                  {fmtValor(valoresTimes[time])}
                                </p>
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={valoresTimes[time] ?? ""}
                                onChange={e => setValorTime(time, e.target.value)}
                                onBlur={e => {
                                  const formatted = e.target.value.trim() ? fmtValor(e.target.value) : "";
                                  setValorTime(time, formatted);
                                  if (torneio) {
                                    const n = parseValor(formatted);
                                    fetch("/api/torneio", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ action: "set-valor", time, faseNum: torneio.faseAtual, valor: n }),
                                    });
                                  }
                                }}
                                placeholder="R$ 0,00"
                                disabled={isElim}
                                className="w-full rounded-lg px-3 py-2 text-sm font-black text-center placeholder-gray-700 focus:outline-none transition-all tabular-nums"
                                style={{
                                  background: "rgba(0,0,0,0.35)",
                                  border: `1px solid ${isVenc ? "rgba(251,191,36,0.4)" : cardBdr}`,
                                  color: isVenc ? "#fbbf24" : tc.text,
                                }}
                              />
                            )}
                          </div>
                        )}
                        {fase.status === "fechada" && (
                          <button
                            onClick={() => {
                              setValoresTimes({});
                              post({ action: "decidir", time });
                            }}
                            disabled={loading}
                            className="w-full py-2 rounded-lg text-xs font-black mb-3 transition-all hover:scale-[1.02] disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg, #ffba00, #e6a000)", color: "#000" }}
                          >
                            {valoresTimes[time]
                              ? `✓ Vencedor · ${fmtValor(valoresTimes[time])}`
                              : "✓ Definir Vencedor"}
                          </button>
                        )}
                        <div className="h-px mb-2" style={{ background: `linear-gradient(90deg, ${cardBdr}, transparent)` }} />
                        <div className="flex-1 space-y-1 max-h-36 overflow-y-auto">
                          {votos.length === 0 ? (
                            <p className="text-[10px] text-gray-700 text-center py-3">Nenhum voto</p>
                          ) : votos.map(v => (
                            <div key={v.username} className="flex items-center gap-1.5">
                              {v.image ? (
                                <PlayerAvatar image={v.image} name={v.displayName} size={20} color="#22c55e" />
                              ) : (
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-black"
                                  style={{ background: avBg, color: avTxt }}
                                >
                                  {v.username[0].toUpperCase()}
                                </div>
                              )}
                              <span className="text-[11px] text-gray-400 truncate font-medium">{v.displayName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="rounded-2xl border border-white/12 p-5" style={{ background: "rgba(6,18,11,0.97)", backdropFilter: "blur(12px)" }}>
              <div className="flex items-center gap-2.5 mb-3">
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                  Classificados
                </p>
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400">
                  {torneio.classificados === null ? "Todos (Fase 1)" : `${torneio.classificados.length} vivos`}
                </span>
              </div>
              {torneio.classificados === null ? (
                <p className="text-sm text-gray-600 text-center py-2">
                  Fase 1: qualquer pessoa do chat pode participar.
                </p>
              ) : torneio.classificados.length === 0 ? (
                <p className="text-sm text-gray-600 text-center py-2">Nenhum classificado.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {torneio.classificados.map(u => (
                    <span key={u} className="text-xs font-bold px-2.5 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-400">
                      @{u}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

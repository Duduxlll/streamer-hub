"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { isAdmin } from "@/lib/admins";
import PlayerAvatar from "@/components/PlayerAvatar";
import type { Torneio } from "@/lib/torneioStore";

const TEAM_COLORS = [
  { bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.4)",  glow: "rgba(34,197,94,0.18)",  text: "#4ade80", avatar: "rgba(34,197,94,0.25)",  avatarText: "#86efac" },
  { bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.4)",  glow: "rgba(34,197,94,0.18)",  text: "#4ade80", avatar: "rgba(34,197,94,0.25)",  avatarText: "#86efac" },
  { bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.4)",  glow: "rgba(245,158,11,0.18)",  text: "#fbbf24", avatar: "rgba(245,158,11,0.25)",  avatarText: "#fcd34d" },
  { bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.4)",  glow: "rgba(16,185,129,0.18)",  text: "#34d399", avatar: "rgba(16,185,129,0.25)",  avatarText: "#6ee7b7" },
];
const WINNER_COLOR = {
  bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.5)", glow: "rgba(251,191,36,0.25)",
  text: "#fbbf24", avatar: "rgba(251,191,36,0.2)", avatarText: "#fbbf24",
};

export default function TorneioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [torneio, setTorneio] = useState<Torneio | null>(null);
  const [carregando, setCarregando] = useState(true);

  const fetchTorneio = useCallback(async () => {
    try {
      const res = await fetch("/api/torneio", { cache: "no-store" });
      setTorneio(await res.json());
    } catch { /* ignora */ } finally { setCarregando(false); }
  }, []);

  useEffect(() => {
    fetchTorneio();
    const id = setInterval(fetchTorneio, 3000);
    return () => clearInterval(id);
  }, [fetchTorneio]);

  if (carregando || status === "loading") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const fase = torneio?.fases.find(f => f.numero === torneio.faseAtual);
  const totalParticipantes = fase ? fase.escolhas.length : 0;

  return (
    <div className="page-enter relative overflow-hidden min-h-[calc(100vh-4rem)]">

<div className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-14 pb-24">
        <div className="flex items-center gap-2 text-xs text-gray-600 mb-8">
          <Link href="/arena" className="hover:text-gray-400 transition-colors">Arena</Link>
          <span>/</span>
          <span className="text-gray-400">Torneio</span>
        </div>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-2xl sm:text-4xl font-black">
              <span className="text-white">🏆 </span>
              <span style={{
                background: "linear-gradient(135deg, #fff 0%, #4ade80 60%, #16a34a 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                Torneio
              </span>
            </h1>
            {fase?.status === "aberta" && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-500/40 bg-red-500/15 text-red-400"
                style={{ boxShadow: "0 0 15px rgba(239,68,68,0.2)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                AO VIVO
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">
            {torneio
              ? <span className="text-gray-300 font-semibold">{torneio.nome}</span>
              : "Nenhum torneio ativo no momento."}
          </p>
        </div>

        {!torneio ? (
          <div className="text-center py-20 rounded-2xl border border-white/10" style={{ background: "rgba(6,16,10,0.88)" }}>
            <p className="text-6xl mb-4">🏆</p>
            <p className="text-white font-black text-xl mb-2">Sem torneio ativo</p>
            <p className="text-gray-600 text-sm max-w-xs mx-auto leading-relaxed">
              Fique de olho no chat! Quando um torneio começar, aparece aqui em tempo real.
            </p>
          </div>
        ) : (
          <>
            {fase && (
              <div className="mb-6">
                {fase.status === "aberta" && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-green-500/40 bg-green-500/12 text-green-400 text-sm font-bold"
                      style={{ boxShadow: "0 0 20px rgba(34,197,94,0.15)" }}>
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      Fase {torneio.faseAtual} · Aberta
                    </div>
                    {totalParticipantes > 0 && (
                      <span className="text-xs text-gray-500 font-semibold">
                        {totalParticipantes} participante{totalParticipantes !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}
                {fase.status === "fechada" && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-orange-500/40 bg-orange-500/10 text-orange-400 text-sm font-bold">
                    <span className="w-2 h-2 rounded-full bg-orange-400" />
                    Fase {torneio.faseAtual} · Fechada — aguardando resultado
                  </div>
                )}
                {fase.status === "decidida" && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-500/50 bg-yellow-500/12 text-yellow-400 text-sm font-bold"
                    style={{ boxShadow: "0 0 20px rgba(234,179,8,0.2)" }}>
                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                    Fase {torneio.faseAtual} · Vencedor definido!
                  </div>
                )}
              </div>
            )}
            {fase?.status === "aberta" && (
              <div className="rounded-2xl border border-green-500/25 p-5 mb-6"
                style={{ background: "rgba(6,16,10,0.92)", boxShadow: "0 0 30px rgba(34,197,94,0.10)" }}>
                <p className="text-[11px] font-black text-green-400 uppercase tracking-widest mb-1.5">
                  ⚡ Como participar
                </p>
                <p className="text-sm text-gray-400 mb-3">
                  {torneio.classificados === null
                    ? "Qualquer pessoa pode entrar! Escreva no chat:"
                    : "Apenas classificados das fases anteriores podem participar."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {fase.times.map(t => (
                    <span key={t}
                      className="font-mono font-black text-sm px-4 py-2 rounded-xl border border-green-500/35 text-green-200 tracking-wide"
                      style={{ background: "rgba(34,197,94,0.18)" }}>
                      !time {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {fase && (
              <div className="mb-6">
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3">
                  Times · Fase {torneio.faseAtual}
                </p>
                <div className={`grid gap-4 ${
                  fase.times.length === 3 ? "grid-cols-1 sm:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2"
                }`}>
                  {fase.times.map((time, idx) => {
                    const participantes = fase.escolhas.filter(e => e.time === time);
                    const isVenc = fase.vencedor === time;
                    const isElim = !!(fase.vencedor && !isVenc);
                    const cor = isVenc ? WINNER_COLOR : TEAM_COLORS[idx % TEAM_COLORS.length];

                    return (
                      <div
                        key={time}
                        className={`rounded-2xl border p-4 flex flex-col transition-all ${isElim ? "opacity-40" : ""}`}
                        style={{
                          background: `linear-gradient(135deg, ${cor.bg} 0%, rgba(6,16,10,0.92) 100%)`,
                          borderColor: cor.border,
                          boxShadow: isElim ? undefined : `0 0 24px ${cor.glow}`,
                        }}
                      >
                        <div className="mb-3">
                          {isVenc && (
                            <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-1">
                              🏆 VENCEDOR
                            </p>
                          )}
                          <p className="font-black text-white text-xl leading-tight">{time}</p>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-3xl font-black tabular-nums leading-none" style={{ color: cor.text }}>
                              {participantes.length}
                            </span>
                            <span className="text-[11px] text-gray-600">
                              {participantes.length !== 1 ? "participantes" : "participante"}
                            </span>
                          </div>
                          {fase.valoresBonus?.[time] != null && fase.valoresBonus[time] > 0 && (
                            <div className="mt-2 px-3 py-1.5 rounded-lg text-center"
                              style={{ background: isVenc ? "rgba(251,191,36,0.12)" : `${cor.bg}`, border: `1px solid ${cor.border}` }}>
                              <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: cor.text, opacity: 0.7 }}>Bônus</p>
                              <p className="text-lg font-black tabular-nums" style={{ color: cor.text }}>
                                R$ {fase.valoresBonus[time].toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="h-px mb-3" style={{ background: `linear-gradient(90deg, ${cor.border}, transparent)` }} />
                        <div className="flex-1 space-y-1.5 max-h-44 overflow-y-auto scrollbar-thin">
                          {participantes.length === 0 ? (
                            <p className="text-[11px] text-gray-700 text-center py-3">Nenhum ainda</p>
                          ) : participantes.map(p => (
                            <div key={p.username} className="flex items-center gap-2">
                              {p.image ? (
                                <PlayerAvatar image={p.image} name={p.displayName} size={20} color={cor.text} />
                              ) : (
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-black"
                                  style={{ background: cor.avatar, color: cor.avatarText }}
                                >
                                  {p.displayName[0].toUpperCase()}
                                </div>
                              )}
                              <span className="text-xs text-gray-300 font-medium truncate">{p.displayName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {torneio.classificados !== null && (
              <div
                className="rounded-2xl border border-white/12 p-5"
                style={{
                  background: "rgba(6,16,10,0.90)",
                  boxShadow: "0 0 20px rgba(0,0,0,0.2)",
                }}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                    Classificados Vivos
                  </p>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full border border-green-500/35 bg-green-500/12 text-green-400">
                    {torneio.classificados.length}
                  </span>
                </div>
                {torneio.classificados.length === 0 ? (
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
            )}
          </>
        )}
      </div>
    </div>
  );
}

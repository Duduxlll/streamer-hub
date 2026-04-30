"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { isAdmin } from "@/lib/admins";

interface RodadaInfo  { status: string; }
interface TorneioInfo { nome: string; faseAtual: number; fases: { numero: number; status: string }[]; }
interface BatalhaInfo { status: string; nome: string; }
interface JackpotInfo { status: string; nome: string; }
interface CallInfo    { status: string; entries: { id: string }[]; }

const FEATURES = [
  {
    id: "torneio",
    icon: "🏆",
    title: "Torneio",
    description: "Competição ao vivo no chat. Para entrar, use !time [nome do time] no chat da Twitch durante a live.",
    color: "#3b82f6",
    href: "/arena/torneio",
    adminHref: "/admin/torneio",
    available: true,
  },
  {
    id: "palpites",
    icon: "🎯",
    title: "Palpites",
    description: "Preveja o resultado das rodadas. Use !p [valor] no chat da Twitch para registrar seu palpite.",
    color: "#10b981",
    href: "/arena/palpites",
    adminHref: "/admin/palpites",
    available: true,
  },
  {
    id: "batalha-bonus",
    icon: "⚔️",
    title: "Batalha de Bônus",
    description: "Bracket com 8, 16 ou 32 jogadores. Quando aberto, use o comando divulgado no chat da Twitch para entrar.",
    color: "#9146ff",
    href: "/arena/batalha",
    adminHref: "/admin/batalha",
    available: true,
  },
  {
    id: "jackpot",
    icon: "🎰",
    title: "Jackpot",
    description: "Disputa de bônus ao vivo. Cada jogador registra seu resultado e o maior valor vence o prêmio total.",
    color: "#f59e0b",
    href: "/arena/jackpot",
    adminHref: "/admin/jackpot",
    available: true,
  },
  {
    id: "call",
    icon: "📋",
    title: "Call de Slot",
    description: "Peça o jogo que quer ver! Use !call [jogo] no chat da Twitch quando a call estiver aberta.",
    color: "#06b6d4",
    href: "/arena/call",
    adminHref: "/admin/call",
    available: true,
  },
] as const;

export default function ArenaPage() {
  const { data: session } = useSession();
  const admin = isAdmin(session?.user?.twitchLogin);
  const [rodada,  setRodada]  = useState<RodadaInfo  | null>(null);
  const [torneio, setTorneio] = useState<TorneioInfo | null>(null);
  const [batalha, setBatalha] = useState<BatalhaInfo | null>(null);
  const [jackpot, setJackpot] = useState<JackpotInfo | null>(null);
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [loaded,  setLoaded]  = useState(false);

  const fetchStatus = useCallback(async () => {
    const [r, t, b, j, c] = await Promise.all([
      fetch("/api/palpites/rodada", { cache: "no-store" }).then(x => x.ok ? x.json() : null).catch(() => null),
      fetch("/api/torneio",         { cache: "no-store" }).then(x => x.ok ? x.json() : null).catch(() => null),
      fetch("/api/batalha",         { cache: "no-store" }).then(x => x.ok ? x.json() : null).catch(() => null),
      fetch("/api/jackpot",         { cache: "no-store" }).then(x => x.ok ? x.json() : null).catch(() => null),
      fetch("/api/call",            { cache: "no-store" }).then(x => x.ok ? x.json() : null).catch(() => null),
    ]);
    setRodada(r);
    setTorneio(t);
    setBatalha(b?.status === "inscricao" || b?.status === "ativa" ? b : null);
    setJackpot(j?.status === "ativo" ? j : null);
    setCallInfo(c?.status === "aberta" ? c : null);
    setLoaded(true);
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 5000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const palpiteLive  = !!(rodada && (rodada.status === "aberta" || rodada.status === "travada"));
  const torneioFase  = torneio?.fases.find(f => f.numero === torneio.faseAtual);
  const torneioLive  = !!(torneio && torneioFase?.status === "aberta");
  const batalhaLive  = !!batalha;
  const jackpotLive  = !!jackpot;
  const callLive     = !!callInfo;

  const isLive = (id: string) =>
    (id === "torneio"       && torneioLive) ||
    (id === "palpites"      && palpiteLive) ||
    (id === "batalha-bonus" && batalhaLive) ||
    (id === "jackpot"       && jackpotLive) ||
    (id === "call"          && callLive);

  const liveItems = [
    ...(torneioLive
      ? [{ icon: "🏆", label: torneio!.nome, sub: `Fase ${torneio!.faseAtual} · escolha seu time!`, href: "/arena/torneio", color: "#3b82f6" }]
      : []),
    ...(palpiteLive
      ? [{ icon: "🎯", label: "Palpites ao Vivo", sub: rodada!.status === "aberta" ? "Fase aberta — aposte agora!" : "Fase fechada para novos votos", href: "/arena/palpites", color: "#10b981" }]
      : []),
    ...(batalhaLive
      ? [{ icon: "⚔️", label: batalha!.nome, sub: batalha!.status === "inscricao" ? "Inscrições abertas — entre pelo chat!" : "Batalha em andamento — acompanhe ao vivo!", href: "/arena/batalha", color: "#9146ff" }]
      : []),
    ...(jackpotLive
      ? [{ icon: "🎰", label: jackpot!.nome, sub: "Jackpot em andamento — acompanhe ao vivo!", href: "/arena/jackpot", color: "#f59e0b" }]
      : []),
    ...(callLive
      ? [{ icon: "📋", label: "Call de Slot aberta!", sub: `${callInfo!.entries.length} call${callInfo!.entries.length !== 1 ? "s" : ""} recebida${callInfo!.entries.length !== 1 ? "s" : ""} · use !call [jogo] no chat`, href: "/arena/call", color: "#06b6d4" }]
      : []),
  ];

  if (!loaded) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#9146ff]/40 border-t-[#9146ff] animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-4rem)]">

<div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28">

        <div className="text-center mb-12 animate-in">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#9146ff]/35 bg-[#9146ff]/10 mb-5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#9146ff] animate-pulse" />
            <span className="text-xs text-purple-300 font-black uppercase tracking-widest">Interações ao Vivo</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black tracking-tight mb-5 leading-none">
            <span className="text-white">Live </span>
            <span style={{
              background: "linear-gradient(135deg, #9146ff 0%, #3b82f6 50%, #22d3ee 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>Arena</span>
          </h1>

          <p className="text-gray-500 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
            Participe das interações ao vivo com o stainzincs.
            Batalhas, torneios e palpites em tempo real.
          </p>
        </div>

        {liveItems.length > 0 && (
          <div className="mb-10 animate-in" style={{ animationDelay: "0.06s", opacity: 0 }}>
            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                borderColor: "rgba(239,68,68,0.35)",
                background: "rgba(239,68,68,0.06)",
                boxShadow: "0 0 50px rgba(239,68,68,0.1)",
              }}
            >
              <div className="flex items-center gap-3 px-5 py-3 border-b border-red-500/15">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                <span className="text-xs font-black text-red-400 uppercase tracking-widest">Acontecendo Agora</span>
              </div>

              <div className={`p-4 grid gap-3 ${liveItems.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                {liveItems.map(item => (
                  <a
                    key={item.href}
                    href="https://www.twitch.tv/stainzincs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center gap-4 px-4 py-3 rounded-xl border transition-all hover:scale-[1.02] hover:-translate-y-0.5"
                    style={{
                      borderColor: `${item.color}45`,
                      background: `${item.color}12`,
                      boxShadow: `0 0 20px ${item.color}15`,
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: `${item.color}22`, border: `1px solid ${item.color}40` }}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-black text-sm truncate">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
                    </div>
                    <div
                      className="flex items-center gap-1 text-xs font-black flex-shrink-0"
                      style={{ color: item.color }}
                    >
                      Ir para a live
                      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
          {FEATURES.map((f, i) => {
            const live = isLive(f.id);

            return (
              <Link
                key={f.id}
                href={admin ? f.adminHref : f.href}
                className={`group relative rounded-2xl p-6 border transition-all duration-300 animate-in overflow-hidden ${
                  f.available ? "hover:-translate-y-2 hover:shadow-2xl" : "opacity-50 cursor-default"
                }`}
                style={{
                  background: "rgba(5,7,16,0.92)",
                  borderColor: live ? `${f.color}60` : f.available ? `${f.color}35` : `${f.color}18`,
                  boxShadow: live ? `0 0 50px ${f.color}22, 0 0 100px ${f.color}08` : undefined,
                  animationDelay: `${0.1 + i * 0.08}s`,
                  opacity: 0,
                  cursor: "pointer",
                }}
              >
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{ background: `linear-gradient(135deg, ${f.color}18 0%, transparent 55%)` }}
                />

                {f.available && (
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                    style={{ background: `radial-gradient(ellipse at 50% 0%, ${f.color}18, transparent 70%)` }}
                  />
                )}

                <div className="absolute top-4 right-4 z-10">
                  {live ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                      style={{
                        background: "rgba(239,68,68,0.18)",
                        border: "1px solid rgba(239,68,68,0.5)",
                        color: "#f87171",
                        boxShadow: "0 0 12px rgba(239,68,68,0.3)",
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      AO VIVO
                    </span>
                  ) : f.available ? (
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                      style={{
                        background: `${f.color}20`,
                        border: `1px solid ${f.color}45`,
                        color: f.color,
                      }}
                    >
                      Disponível
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-gray-600">
                      Em Breve
                    </span>
                  )}
                </div>

                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                  style={{
                    background: live
                      ? `linear-gradient(135deg, ${f.color}40, ${f.color}20)`
                      : `${f.color}20`,
                    border: `1px solid ${f.color}35`,
                    boxShadow: live ? `0 0 25px ${f.color}35` : undefined,
                  }}
                >
                  {f.icon}
                </div>

                <h3 className="text-xl font-black text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{f.description}</p>

                {f.available && (
                  <div
                    className="inline-flex items-center gap-1.5 text-xs font-black transition-all duration-300 group-hover:gap-3"
                    style={{ color: f.color }}
                  >
                    Acessar
                    <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}

                <div
                  className="absolute bottom-0 left-6 right-6 h-px rounded-full"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${f.color}${live ? "80" : "50"}, transparent)`,
                  }}
                />

                {f.available && (
                  <div
                    className="absolute top-0 left-0 w-px h-full opacity-60"
                    style={{ background: `linear-gradient(180deg, transparent, ${f.color}, transparent)` }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-700 mt-12">
          Faça login com Twitch para participar quando as funções forem liberadas.
        </p>
      </div>
    </div>
  );
}

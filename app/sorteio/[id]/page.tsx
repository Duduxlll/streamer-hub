"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { isAdmin } from "@/lib/admins";
import type { Sorteio, Participante } from "@/lib/sorteio-store";

const ITEM_W = 140;
const ITEM_GAP = 10;
const UNIT = ITEM_W + ITEM_GAP;
const WINNER_POS = 32;

function Countdown({ endsAt }: { endsAt: number }) {
  const [left, setLeft] = useState(Math.max(0, endsAt - Date.now()));
  useEffect(() => {
    const iv = setInterval(() => setLeft(Math.max(0, endsAt - Date.now())), 500);
    return () => clearInterval(iv);
  }, [endsAt]);
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1_000);
  const fmt = (n: number) => String(n).padStart(2, "0");
  return <span>{h > 0 ? `${fmt(h)}:` : ""}{fmt(m)}:{fmt(s)}</span>;
}

function RoletaIdle({ participantes }: { participantes: Participante[] }) {
  const SHOW = 14;
  const source = participantes;
  const items: (Participante | null)[] = Array.from({ length: SHOW }, (_, i) =>
    source.length > 0 ? source[i % source.length] : null
  );
  const all = [...items, ...items];

  return (
    <div className="relative rounded-2xl overflow-hidden"
      style={{ background: "rgba(10,8,24,0.92)", border: "1px solid rgba(255,186,0,0.2)" }}>
      <style>{`
        @keyframes idle-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
      <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20">
        <div className="w-0 h-0" style={{ borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: "9px solid rgba(255,186,0,0.35)" }} />
      </div>
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20">
        <div className="w-0 h-0" style={{ borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderBottom: "9px solid rgba(255,186,0,0.35)" }} />
      </div>
      <div className="absolute inset-y-0 left-0 w-28 z-10 pointer-events-none"
        style={{ background: "linear-gradient(90deg, rgba(10,8,24,1) 0%, transparent 100%)" }} />
      <div className="absolute inset-y-0 right-0 w-28 z-10 pointer-events-none"
        style={{ background: "linear-gradient(270deg, rgba(10,8,24,1) 0%, transparent 100%)" }} />

      <div className="py-4 px-2 overflow-hidden">
        <div style={{ display: "flex", gap: ITEM_GAP, width: "max-content", animation: "idle-scroll 20s linear infinite" }}>
          {all.map((p, i) => (
            <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1.5 rounded-xl p-2"
              style={{ width: ITEM_W, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {p?.image ? (
                <img src={p.image} alt={p.displayName} className="w-14 h-14 rounded-full object-cover"
                  style={{ filter: "blur(2px) brightness(0.5)" }} />
              ) : (
                <div className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,186,0,0.06)", border: "1px solid rgba(255,186,0,0.1)" }}>
                  <span style={{ color: "rgba(255,186,0,0.25)", fontSize: 22 }}>?</span>
                </div>
              )}
              <div className="h-2 rounded-full"
                style={{ width: p ? 48 : 32, background: p ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Roleta({ participantes, vencedor }: { participantes: Participante[]; vencedor: Participante }) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [strip, setStrip] = useState<Participante[]>([]);
  const [finalizado, setFinalizado] = useState(false);

  useEffect(() => {
    const pool: Participante[] = [];
    for (const p of participantes) for (let i = 0; i < Math.max(p.tickets, 1); i++) pool.push(p);
    if (pool.length === 0) return;
    const arr: Participante[] = [];
    for (let i = 0; i < WINNER_POS + 20; i++) {
      arr.push(i === WINNER_POS ? vencedor : pool[Math.floor(Math.random() * pool.length)]);
    }
    setStrip(arr);

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => {
      if (!stripRef.current) return;
      const containerW = stripRef.current.parentElement?.clientWidth ?? 600;
      const target = WINNER_POS * UNIT - (containerW / 2 - ITEM_W / 2);
      // Deslocamento de suspense: para o giro com o vencedor quase um item inteiro fora do
      // centro, e depois desliza BEM devagar até encaixar — o suspense final.
      const offsetSuspense = UNIT * 0.92;

      // ── Fase 1: giro principal, desacelera forte e quase para ──
      stripRef.current.style.transition = "transform 6.5s cubic-bezier(0.05, 0.85, 0.12, 1)";
      stripRef.current.style.transform  = `translateX(-${target - offsetSuspense}px)`;

      // ── Fase 2: deslize final ~5s, o mais lento possível, indo indo até parar ──
      timers.push(setTimeout(() => {
        if (!stripRef.current) return;
        stripRef.current.style.transition = "transform 5s cubic-bezier(0.18, 0.7, 0.1, 1)";
        stripRef.current.style.transform  = `translateX(-${target}px)`;
      }, 6700));

      // Marca o vencedor quando o deslize final termina
      timers.push(setTimeout(() => setFinalizado(true), 11850));
    }, 300));

    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative rounded-2xl overflow-hidden"
      style={{ background: "rgba(10,8,24,0.9)", border: "1px solid rgba(255,186,0,0.25)" }}>
      <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20">
        <div className="w-0 h-0" style={{ borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: `9px solid ${finalizado ? "#ffba00" : "rgba(255,186,0,0.5)"}`, transition: "all 0.5s" }} />
      </div>
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20">
        <div className="w-0 h-0" style={{ borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderBottom: `9px solid ${finalizado ? "#ffba00" : "rgba(255,186,0,0.5)"}`, transition: "all 0.5s" }} />
      </div>
      <div className="absolute inset-y-0 left-0 w-32 z-10 pointer-events-none"
        style={{ background: "linear-gradient(90deg, rgba(10,8,24,1) 0%, rgba(10,8,24,0.8) 60%, transparent 100%)" }} />
      <div className="absolute inset-y-0 right-0 w-32 z-10 pointer-events-none"
        style={{ background: "linear-gradient(270deg, rgba(10,8,24,1) 0%, rgba(10,8,24,0.8) 60%, transparent 100%)" }} />
      <div className="py-5 px-2">
        <div ref={stripRef} className="flex gap-[10px]" style={{ willChange: "transform" }}>
          {strip.map((p, i) => {
            const isWinner = i === WINNER_POS && finalizado;
            return (
              <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2 rounded-xl p-2"
                style={{ width: ITEM_W, background: isWinner ? "rgba(255,186,0,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${isWinner ? "rgba(255,186,0,0.5)" : "rgba(255,255,255,0.06)"}`, transition: "all 0.5s", boxShadow: isWinner ? "0 0 20px rgba(255,186,0,0.2)" : "none" }}>
                {p.image ? (
                  <img src={p.image} alt={p.displayName} className="w-16 h-16 rounded-full object-cover"
                    style={{ filter: isWinner ? "blur(0px) brightness(1)" : "blur(2px) brightness(0.55)" }} />
                ) : (
                  <div className="w-16 h-16 rounded-full flex items-center justify-center font-black text-white text-2xl"
                    style={{ background: "linear-gradient(135deg, #9146ff, #16a34a)" }}>
                    {p.displayName[0]?.toUpperCase()}
                  </div>
                )}
                <p className="text-xs font-bold text-white truncate w-full text-center"
                  style={{ color: isWinner ? "#ffba00" : "rgba(255,255,255,0.6)" }}>
                  {p.displayName}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EntradaCard({ p }: { p: Participante }) {
  return (
    <div className="relative overflow-hidden rounded-2xl flex flex-col items-center"
      style={{ background: "rgba(8,6,20,0.85)", border: "1px solid rgba(255,255,255,0.09)" }}>
      {p.image && (
        <img src={p.image} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ filter: "blur(14px) brightness(0.25)", transform: "scale(1.2)" }} />
      )}
      <div className="relative z-10 flex flex-col items-center gap-2 px-2 pt-4 pb-3 w-full">
        {p.image ? (
          <img src={p.image} alt={p.displayName}
            className="w-16 h-16 rounded-full object-cover border-2"
            style={{ borderColor: "rgba(255,186,0,0.5)", filter: "blur(3px)" }} />
        ) : (
          <div className="w-16 h-16 rounded-full flex items-center justify-center font-black text-white text-2xl border-2"
            style={{ background: "linear-gradient(135deg, #9146ff, #16a34a)", borderColor: "rgba(255,186,0,0.4)", filter: "blur(3px)" }}>
            {p.displayName[0]?.toUpperCase()}
          </div>
        )}
        <p className="text-xs font-black text-white text-center truncate w-full leading-tight drop-shadow">
          {p.displayName}
        </p>
        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black"
          style={{ background: "rgba(255,186,0,0.15)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.3)" }}>
          🎟️ {p.tickets}
        </span>
      </div>
    </div>
  );
}

export default function SorteioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const admin = isAdmin((session?.user as { twitchLogin?: string })?.twitchLogin);
  const [sorteio, setSorteio] = useState<Sorteio | null>(null);
  const [loading, setLoading] = useState(true);
  const [participando, setParticipando] = useState(false);
  const [jaParticipa, setJaParticipa] = useState(false);
  const [mostrarRoleta, setMostrarRoleta] = useState(false);
  const [sorteando, setSorteando] = useState(false);
  const prevStatusRef = useRef<string | null>(null);

  const fetchSorteio = useCallback(async () => {
    const res = await fetch(`/api/sorteio?id=${id}`);
    const data = await res.json();
    const s: Sorteio | null = data.sorteio;
    if (s?.status === "finalizado" && prevStatusRef.current !== "finalizado") {
      setMostrarRoleta(true);
    }
    prevStatusRef.current = s?.status ?? null;
    setSorteio(s);
    setLoading(false);
    if (s && session?.user) {
      const username = (session.user as { twitchLogin?: string }).twitchLogin ?? session.user.name ?? "";
      setJaParticipa(s.participantes.some(p => p.username === username));
    }
  }, [id, session]);

  useEffect(() => {
    fetchSorteio();
    const iv = setInterval(fetchSorteio, 3000);
    return () => clearInterval(iv);
  }, [fetchSorteio]);

  async function sortearAgora() {
    if (!sorteio) return;
    setSorteando(true);
    const res = await fetch("/api/sorteio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sortear", id: sorteio.id }),
    });
    const data = await res.json();
    if (data.sorteio) {
      setSorteio(data.sorteio);
      if (data.sorteio.vencedor) setMostrarRoleta(true);
    }
    setSorteando(false);
  }

  async function participar() {
    if (!session?.user) { signIn("twitch"); return; }
    setParticipando(true);
    const res = await fetch("/api/sorteio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "participar" }),
    });
    const data = await res.json();
    if (data.sorteio) setSorteio(data.sorteio);
    setJaParticipa(true);
    setParticipando(false);
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#ffba00] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!sorteio) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4">
        <p className="text-4xl">🎟️</p>
        <p className="text-white font-black text-xl">Sorteio não encontrado</p>
        <Link href="/sorteio" className="text-sm text-gray-500 hover:text-white transition-colors">← Voltar aos sorteios</Link>
      </div>
    );
  }

  const prontoPaSortear = sorteio.status === "pronto";
  const finalizado = sorteio.status === "finalizado";

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-10 pb-24 space-y-6">

        <div className="flex items-center gap-2 text-xs flex-wrap">
          <Link href="/" className="text-gray-600 hover:text-gray-400 transition-colors">Home</Link>
          <span className="text-gray-700">/</span>
          <Link href="/sorteio" className="text-gray-600 hover:text-gray-400 transition-colors">Sorteio</Link>
          <span className="text-gray-700">/</span>
          <span className="text-gray-500 truncate max-w-[120px]">{sorteio.titulo}</span>

          {admin && (
            <>
              <span className="text-gray-700 ml-auto">·</span>
              <Link href="/admin/sorteio"
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black transition-all hover:bg-white/5"
                style={{ color: "#ffba00", border: "1px solid rgba(255,186,0,0.2)" }}>
                ← Voltar
              </Link>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                style={{ background: "rgba(255,186,0,0.1)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.2)" }}>
                🎟️ Admin
              </span>
            </>
          )}
        </div>

        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(8,6,20,0.75)", border: "1px solid rgba(255,186,0,0.2)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[rgba(255,186,0,0.1)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffba00] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ffba00]" />
            </span>
            <span className="text-xs font-black text-[#ffba00] uppercase tracking-widest">Sorteio ao Vivo</span>
          </div>
          <div className="px-5 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1">Sorteio</p>
              <h1 className="text-3xl lg:text-4xl font-black text-white leading-tight">{sorteio.titulo}</h1>
            </div>
            {sorteio.valor && (
              <div className="sm:text-right">
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1">Premiação</p>
                <p className="text-3xl font-black" style={{
                  background: "linear-gradient(135deg, #ffba00, #ffdd55, #ffba00)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  animation: "shimmer 3s linear infinite",
                }}>{sorteio.valor}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Participantes", value: String(sorteio.participantes.length), icon: "👥" },
            { label: "Tickets totais", value: String(sorteio.participantes.reduce((a, p) => a + p.tickets, 0)), icon: "🎟️" },
            {
              label: sorteio.status === "ativo" ? "Encerra em" : "Status",
              value: sorteio.status === "ativo"
                ? <Countdown endsAt={sorteio.iniciadoEm + sorteio.duracaoMs} />
                : prontoPaSortear ? "Pronto!" : "Finalizado",
              icon: finalizado ? "🏆" : "⏱️",
            },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl p-4 text-center flex flex-col items-center gap-1"
              style={{ background: "rgba(8,6,20,0.65)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(10px)" }}>
              <span className="text-lg">{s.icon}</span>
              <p className="text-lg font-black text-white">{s.value}</p>
              <p className="text-[11px] text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {!finalizado && !admin && (
          <div className="rounded-2xl p-5 space-y-3"
            style={{ background: "rgba(8,6,20,0.65)", border: "1px solid rgba(22,163,74,0.2)", backdropFilter: "blur(10px)" }}>
            <p className="text-xs font-black text-green-400 uppercase tracking-widest">Como participar</p>
            <ul className="space-y-2.5 text-sm text-gray-300">
              {[
                "Faça login com sua conta Twitch",
                `Clique em "Participar do Sorteio"`,
                `Fique na live! A cada ${sorteio.minutosTicket} minutos assistindo você ganha +1 ticket`,
              ].map((txt, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0"
                    style={{ background: "rgba(34,197,94,0.2)", color: "#86efac", border: "1px solid rgba(34,197,94,0.3)" }}>{i + 1}</span>
                  <span dangerouslySetInnerHTML={{ __html: txt.replace(`${sorteio.minutosTicket}`, `<strong class="text-white">${sorteio.minutosTicket}</strong>`) }} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {!finalizado && !admin && (
          <div className="flex justify-center">
            {status === "unauthenticated" ? (
              <button onClick={() => signIn("twitch")}
                className="flex items-center gap-3 px-8 py-4 rounded-full font-black text-white text-sm transition-all hover:scale-105 active:scale-95"
                style={{ background: "linear-gradient(135deg, #9146ff, #6d28d9)" }}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
                </svg>
                Login com Twitch para participar
              </button>
            ) : jaParticipa ? (
              <div className="flex items-center gap-2.5 px-8 py-4 rounded-full font-black text-sm"
                style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.35)", color: "#22c55e" }}>
                <span className="text-lg">✓</span> Você está participando!
              </div>
            ) : (
              <button onClick={participar} disabled={participando}
                className="px-10 py-4 rounded-full font-black text-black text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
                {participando ? "Entrando..." : "🎟️ Participar do Sorteio"}
              </button>
            )}
          </div>
        )}

        {!finalizado && (
          <div className="rounded-2xl overflow-hidden space-y-0"
            style={{ background: "rgba(8,6,20,0.7)", border: "1px solid rgba(255,186,0,0.18)", backdropFilter: "blur(12px)" }}>

            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: "#ffba00" }}>
                🎰 Roleta
              </span>
            </div>

            <div className="p-4">
              <RoletaIdle participantes={sorteio.participantes} />
            </div>

            {admin && (
              <div className="px-5 pb-5 flex flex-col items-center gap-3">
                <button
                  onClick={sortearAgora}
                  disabled={sorteio.status === "ativo" || sorteio.participantes.length === 0 || sorteando}
                  className="w-full py-3.5 rounded-xl font-black text-sm text-black transition-all disabled:cursor-not-allowed"
                  style={{
                    background: prontoPaSortear && sorteio.participantes.length > 0
                      ? "linear-gradient(135deg, #ffdd55, #ffba00)"
                      : "rgba(255,186,0,0.15)",
                    color: prontoPaSortear && sorteio.participantes.length > 0 ? "#000" : "rgba(255,186,0,0.4)",
                    border: prontoPaSortear && sorteio.participantes.length > 0 ? "none" : "1px solid rgba(255,186,0,0.2)",
                    opacity: sorteando ? 0.7 : 1,
                  }}>
                  {sorteando ? "Sorteando..." : prontoPaSortear ? "🎰 Sortear Agora" : "⏳ Aguardando o tempo encerrar..."}
                </button>
                {sorteio.status === "ativo" && (
                  <p className="text-[11px] text-gray-600 text-center">
                    Botão liberado quando o timer encerrar
                  </p>
                )}
              </div>
            )}

            {!admin && (
              <div className="px-5 pb-5 text-center">
                <p className="text-sm text-gray-500">
                  ⏳ Aguardando o admin sortear o vencedor...
                </p>
              </div>
            )}
          </div>
        )}

        {mostrarRoleta && sorteio.vencedor && (
          <div className="rounded-3xl overflow-hidden"
            style={{ background: "rgba(10,8,24,0.95)", border: "1px solid rgba(255,186,0,0.2)" }}>
            <div className="px-6 pt-6 pb-2 text-center">
              <p className="text-xs font-black text-[#ffba00] uppercase tracking-widest">🎰 Sorteando o vencedor...</p>
            </div>
            <div className="px-4 pb-4">
              <Roleta participantes={sorteio.participantes} vencedor={sorteio.vencedor} />
            </div>
            <div className="px-6 pb-8 text-center animate-in" style={{ animationDelay: "12s", opacity: 0 }}>
              <div className="w-full h-px mb-6" style={{ background: "linear-gradient(90deg, transparent, rgba(255,186,0,0.3), transparent)" }} />
              <p className="text-xs font-black uppercase tracking-widest mb-5" style={{ color: "#ffba00" }}>🏆 Vencedor do Sorteio</p>
              <div className="inline-flex flex-col items-center gap-4">
                {sorteio.vencedor.image ? (
                  <img src={sorteio.vencedor.image} alt={sorteio.vencedor.displayName}
                    className="w-24 h-24 rounded-full object-cover border-2 border-[#ffba00]" />
                ) : (
                  <div className="w-24 h-24 rounded-full flex items-center justify-center font-black text-white text-3xl border-2 border-[#ffba00]"
                    style={{ background: "linear-gradient(135deg, #9146ff, #16a34a)" }}>
                    {sorteio.vencedor.displayName[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-3xl font-black text-white">{sorteio.vencedor.displayName}</p>
                  <p className="text-gray-500 text-sm">@{sorteio.vencedor.username}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(8,6,20,0.7)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
            <p className="text-sm font-black text-white">Últimas entradas</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: "rgba(255,186,0,0.1)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.2)" }}>
              {sorteio.participantes.length}
            </span>
          </div>
          <div className="p-4">
            {sorteio.participantes.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-3xl mb-2">🎟️</p>
                <p className="text-sm text-gray-600">Nenhum participante ainda.</p>
                <p className="text-xs text-gray-700 mt-1">Seja o primeiro a entrar!</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {[...sorteio.participantes].reverse().slice(0, 16).map(p => (
                  <EntradaCard key={p.username} p={p} />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/lib/admins";
import type { Jackpot } from "@/lib/jackpotStore";

const RW = 160, RG = 10;

/* ── Idle roulette (scrolling slowly) ───────────────────── */
function IdleRoleta({ jogadores }: { jogadores: Jackpot["jogadores"] }) {
  if (jogadores.length === 0) return null;
  const items = Array.from({ length: 20 }, (_, i) => jogadores[i % jogadores.length]);
  const all = [...items, ...items];
  return (
    <div className="relative overflow-hidden" style={{ height: 100, background: "rgba(8,10,20,0.98)" }}>
      <style>{`
        @keyframes idle-jk-pub {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
      {/* Arrows */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
        <div className="w-0 h-0" style={{ borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid rgba(245,158,11,0.4)" }} />
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20">
        <div className="w-0 h-0" style={{ borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderBottom: "8px solid rgba(245,158,11,0.4)" }} />
      </div>
      {/* Side fades */}
      <div className="absolute inset-y-0 left-0 w-32 z-10 pointer-events-none"
        style={{ background: "linear-gradient(90deg,rgba(8,10,20,1) 0%,transparent 100%)" }} />
      <div className="absolute inset-y-0 right-0 w-32 z-10 pointer-events-none"
        style={{ background: "linear-gradient(270deg,rgba(8,10,20,1) 0%,transparent 100%)" }} />
      {/* Strip */}
      <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
        <div style={{ display: "flex", gap: RG, width: "max-content", animation: "idle-jk-pub 22s linear infinite" }}>
          {all.map((p, i) => (
            <div key={i} style={{
              width: RW, height: 72, flexShrink: 0, borderRadius: 10, padding: "10px 14px",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              filter: "blur(1.5px)", opacity: 0.4,
              display: "flex", flexDirection: "column", justifyContent: "center",
            }}>
              <p className="font-black text-white truncate text-sm">{p?.nome ?? "—"}</p>
              <p className="text-gray-500 text-[11px] truncate mt-0.5">{p?.jogo || "—"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ArenaJackpotPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jackpot, setJackpot] = useState<Jackpot | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && isAdmin(session?.user?.twitchLogin)) {
      router.replace("/admin/jackpot");
    }
  }, [status, session, router]);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/jackpot", { cache: "no-store" });
      setJackpot(await res.json());
    } catch { /* ignora */ } finally { setCarregando(false); }
  }, []);

  useEffect(() => {
    fetch_();
    const iv = setInterval(fetch_, 2000);
    return () => clearInterval(iv);
  }, [fetch_]);

  if (carregando || status === "loading" || (status === "authenticated" && isAdmin(session?.user?.twitchLogin))) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#f59e0b] border-t-transparent animate-spin" />
    </div>;
  }

  if (!jackpot || jackpot.status === "aguardando") {
    return (
      <div className="page-enter min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 text-center">
        <p className="text-5xl mb-4">🎰</p>
        <p className="text-xl font-black text-white mb-2">Jackpot</p>
        <p className="text-sm text-gray-500">Nenhuma batalha ativa no momento.<br />Aguarde o streamer iniciar uma sessão!</p>
      </div>
    );
  }

  const jogados     = jackpot.jogadores.filter(j => j.valor !== null).length;
  const total       = jackpot.jogadores.length;
  const sorted      = [...jackpot.jogadores].filter(j => j.valor !== null).sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));
  const premioTotal = jackpot.jogadores.reduce((sum, j) => sum + (j.valor ?? 0), 0);
  const custo       = total * jackpot.valorEntrada;
  const progPct     = total > 0 ? (jogados / total) * 100 : 0;
  const jogadorAtual = jackpot.jogadores[jackpot.jogadorAtualIdx];
  const jogadoresNaRoleta = jackpot.jogadores.filter((j, i) =>
    j.valor === null && i !== jackpot.jogadorAtualIdx
  );

  if (jackpot.status === "finalizado" && jackpot.vencedor) {
    const rankingSorted = [...jackpot.jogadores].sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1));
    return (
      <div className="page-enter min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-md w-full space-y-3">
          {/* Winner card */}
          <div className="rounded-2xl border border-[#f59e0b]/40 p-8 text-center" style={{ background: "rgba(245,158,11,0.06)" }}>
            <p className="text-5xl mb-3 animate-bounce">🏆</p>
            <p className="text-[11px] font-black text-amber-500 uppercase tracking-widest mb-2">Campeão do Jackpot</p>
            <h2 className="text-4xl font-black text-white mb-1">{jackpot.vencedor.nome}</h2>
            {jackpot.vencedor.jogo && (
              <p className="text-sm font-black text-gray-400 mb-4">{jackpot.vencedor.jogo}</p>
            )}
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Bônus mais alto</p>
                <p className="text-2xl font-black text-white">R$ {jackpot.vencedor.valor!.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>
              {premioTotal > 0 && (
                <div className="pt-3 border-t border-white/8">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5">Prêmio Total Ganho</p>
                  <p className="text-4xl font-black" style={{
                    background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}>R$ {premioTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
              )}
            </div>
          </div>

          {/* Ranking scrollável */}
          <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: "rgba(8,10,20,0.95)" }}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Ranking</p>
              <span className="text-[10px] font-black text-gray-700">{rankingSorted.length} participantes</span>
            </div>
            <div className="max-h-44 overflow-y-auto">
              {rankingSorted.map((j, i) => (
                <div key={j.id} className="flex items-center gap-2.5 px-4 py-2.5 border-b border-white/5 last:border-0"
                  style={{ background: i === 0 ? "rgba(245,158,11,0.05)" : "transparent" }}>
                  <span className="text-xs font-black flex-shrink-0 w-6 text-center"
                    style={{ color: i === 0 ? "#f59e0b" : "#4b5563" }}>
                    {i === 0 ? "🏆" : `${i + 1}º`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-xs truncate" style={{ color: i === 0 ? "#fff" : "#9ca3af" }}>{j.nome}</p>
                    {j.jogo && <p className="text-[10px] text-gray-700 truncate">{j.jogo}</p>}
                  </div>
                  <p className="font-black tabular-nums text-xs flex-shrink-0"
                    style={{ color: i === 0 ? "#f59e0b" : j.valor !== null ? "#6b7280" : "#374151" }}>
                    {j.valor !== null ? `R$ ${j.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter relative min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-24 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 mb-1"
              style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />EM ANDAMENTO
            </span>
            <h1 className="text-xl font-black text-white">{jackpot.nome}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {[
              { label: "Jogados", value: `${jogados}/${total}` },
              { label: "Prêmio Total", value: premioTotal > 0 ? `R$ ${premioTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—", color: "#f59e0b" },
              ...(jackpot.valorEntrada > 0 ? [
                { label: "Entrada", value: `R$ ${jackpot.valorEntrada.toLocaleString("pt-BR")}` },
                { label: "Custo Total", value: `R$ ${custo.toLocaleString("pt-BR")}` },
              ] : []),
            ].map(s => (
              <div key={s.label} className="text-center px-4 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-0.5">{s.label}</p>
                <p className="text-base font-black tabular-nums" style={{ color: (s as { color?: string }).color ?? "#fff" }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Progress */}
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progPct}%`, background: "linear-gradient(90deg,#f59e0b,#fbbf24)" }} />
        </div>

        {/* Roulette + jogando agora */}
        <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: "rgba(8,10,20,0.98)" }}>
          <IdleRoleta jogadores={jogadoresNaRoleta} />
          {jogadorAtual && (
            <div className="border-t border-white/8 px-6 py-5 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Jogando Agora</p>
              <p className="text-2xl font-black text-white">{jogadorAtual.nome}</p>
              {jogadorAtual.jogo && <p className="text-sm text-gray-500 mt-0.5">{jogadorAtual.jogo}</p>}
            </div>
          )}
        </div>

        {/* Placar ao vivo */}
        <div className="rounded-2xl border border-white/10 p-5" style={{ background: "rgba(8,10,20,0.95)" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Placar ao Vivo</p>
            <div className="flex items-center gap-2">
              {premioTotal > 0 && (
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
                  Prêmio R$ {premioTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              )}
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">{sorted.length}</span>
            </div>
          </div>
          {sorted.length === 0
            ? <p className="text-xs text-gray-700 text-center py-6">Aguardando resultados...</p>
            : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sorted.map((j, i) => (
                  <div key={j.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                    style={{ background: i === 0 ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${i === 0 ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.05)"}` }}>
                    {i === 0 && <span className="text-xs flex-shrink-0">🏆</span>}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm truncate">{j.nome}</p>
                      {j.jogo && <p className="text-[11px] text-gray-600 truncate">{j.jogo}</p>}
                    </div>
                    <p className="font-black tabular-nums text-sm" style={{ color: i === 0 ? "#f59e0b" : "#22c55e" }}>
                      R$ {j.valor!.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            )}
        </div>

      </div>
    </div>
  );
}

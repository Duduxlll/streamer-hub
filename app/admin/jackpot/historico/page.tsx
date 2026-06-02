"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admins";
import type { JackpotHistoricoItem } from "@/lib/jackpotStore";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function fmtData(ts: number) {
  return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function HistoricoCard({ item, num }: { item: JackpotHistoricoItem; num: number }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...item.jogadores]
    .filter(j => j.valor !== null)
    .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: "rgba(8,20,13,0.97)", border: "1px solid rgba(245,158,11,0.15)", backdropFilter: "blur(12px)" }}>

      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-black flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)" }}>
          #{num}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-sm truncate">{item.nome}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">{fmtData(item.finalizadoEm)}</p>
        </div>
        <div className="hidden sm:flex items-center gap-5 flex-shrink-0">
          <div className="text-center">
            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Jogadores</p>
            <p className="text-sm font-black text-white">{item.jogadores.length}</p>
          </div>
          {item.valorEntrada > 0 && (
            <div className="text-center">
              <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Entrada</p>
              <p className="text-sm font-black text-white">R$ {fmtBRL(item.valorEntrada)}</p>
            </div>
          )}
          <div className="text-center">
            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Prêmio</p>
            <p className="text-sm font-black" style={{ color: "#f59e0b" }}>R$ {fmtBRL(item.premioTotal)}</p>
          </div>
        </div>
        {item.vencedor && (
          <div className="hidden md:flex items-center gap-2 flex-shrink-0 max-w-[160px]">
            <span className="text-base">🏆</span>
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate">{item.vencedor.nome}</p>
              <p className="text-[10px] text-amber-400 font-black">R$ {fmtBRL(item.vencedor.valor ?? 0)}</p>
            </div>
          </div>
        )}
        <span className="text-gray-600 text-xs flex-shrink-0 ml-1">{expanded ? "▲" : "▼"}</span>
      </button>

      <div className="flex sm:hidden items-center gap-4 px-5 pb-3 border-t border-white/5 pt-3">
        <div className="text-center flex-1">
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Jogadores</p>
          <p className="text-sm font-black text-white">{item.jogadores.length}</p>
        </div>
        {item.valorEntrada > 0 && (
          <div className="text-center flex-1">
            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Entrada</p>
            <p className="text-sm font-black text-white">R$ {fmtBRL(item.valorEntrada)}</p>
          </div>
        )}
        <div className="text-center flex-1">
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Prêmio</p>
          <p className="text-sm font-black" style={{ color: "#f59e0b" }}>R$ {fmtBRL(item.premioTotal)}</p>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5">
          {item.vencedor && (
            <div className="px-5 py-4 flex items-center gap-4"
              style={{ background: "rgba(245,158,11,0.05)", borderBottom: "1px solid rgba(245,158,11,0.12)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}>
                🏆
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5">Campeão</p>
                <p className="text-lg font-black text-white truncate">{item.vencedor.nome}</p>
                {item.vencedor.jogo && <p className="text-xs text-gray-500 truncate">{item.vencedor.jogo}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Bônus</p>
                <p className="text-xl font-black" style={{ color: "#f59e0b" }}>R$ {fmtBRL(item.vencedor.valor ?? 0)}</p>
              </div>
            </div>
          )}
          <div className="px-5 py-3">
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3">
              Todos os participantes ({item.jogadores.length})
            </p>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(245,158,11,0.2) transparent" }}>
              {sorted.map((j, i) => (
                <div key={j.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                  style={{
                    background: i === 0 ? "rgba(245,158,11,0.07)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${i === 0 ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.04)"}`,
                  }}>
                  <span className="text-xs font-black w-5 text-center flex-shrink-0"
                    style={{ color: i === 0 ? "#f59e0b" : "#4b5563" }}>
                    {i === 0 ? "🏆" : `${i + 1}º`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: i === 0 ? "#fff" : "#9ca3af" }}>{j.nome}</p>
                    {j.jogo && <p className="text-[10px] text-gray-600 truncate">{j.jogo}</p>}
                  </div>
                  <p className="text-sm font-black tabular-nums flex-shrink-0"
                    style={{ color: i === 0 ? "#f59e0b" : j.valor !== null ? "#6b7280" : "#374151" }}>
                    {j.valor !== null ? `R$ ${fmtBRL(j.valor)}` : "—"}
                  </p>
                </div>
              ))}
              {item.jogadores.filter(j => j.valor === null).map(j => (
                <div key={j.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <span className="text-xs font-black w-5 text-center flex-shrink-0 text-gray-700">—</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-gray-600">{j.nome}</p>
                    {j.jogo && <p className="text-[10px] text-gray-700 truncate">{j.jogo}</p>}
                  </div>
                  <p className="text-sm font-black tabular-nums flex-shrink-0 text-gray-700">—</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminJackpotHistoricoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [historico, setHistorico] = useState<JackpotHistoricoItem[] | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!isAdmin(session?.user?.twitchLogin)) router.replace("/arena/jackpot");
  }, [status, session, router]);

  const fetchHistorico = useCallback(async () => {
    try {
      const res = await fetch("/api/jackpot/historico");
      if (res.ok) setHistorico(await res.json());
    } catch { /* ignora */ }
  }, []);

  useEffect(() => { fetchHistorico(); }, [fetchHistorico]);

  if (status === "loading" || !isAdmin(session?.user?.twitchLogin)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#f59e0b] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-enter relative min-h-[calc(100vh-4rem)]">
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-24 space-y-5">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Link href="/admin/jackpot" className="hover:text-gray-400 transition-colors">← Admin · Jackpot</Link>
        </div>

        <div>
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 mb-2"
            style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
            🎰 PAINEL ADMIN
          </span>
          <h1 className="text-3xl font-black text-white">Histórico de Batalhas</h1>
          <p className="text-sm text-gray-500 mt-1">Todas as rodadas finalizadas</p>
        </div>

        {historico === null && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-[#f59e0b] border-t-transparent animate-spin" />
          </div>
        )}

        {historico !== null && historico.length === 0 && (
          <div className="rounded-2xl text-center py-20 px-6"
            style={{ background: "rgba(8,20,13,0.97)", border: "1px solid rgba(245,158,11,0.1)" }}>
            <p className="text-4xl mb-4">🎰</p>
            <p className="text-base font-black text-white mb-2">Nenhuma batalha ainda</p>
            <p className="text-sm text-gray-600">O histórico aparece aqui após a primeira rodada ser finalizada.</p>
          </div>
        )}

        {historico !== null && historico.length > 0 && (
          <div className="space-y-3">
            {historico.map((item, i) => (
              <HistoricoCard key={item.id} item={item} num={historico.length - i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

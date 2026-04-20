"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { isAdmin } from "@/lib/admins";
import type { Rodada, Palpite, ResultadoRodada } from "@/lib/store";

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

function PalpiteRow({ palpite, index }: { palpite: Palpite; index: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-white/18 transition-all" style={{ background: "rgba(5,7,16,0.88)" }}>
      <span className="w-6 text-center text-xs font-bold text-gray-600">{index + 1}º</span>
      <div className="w-8 h-8 rounded-full bg-[#1d4ed8]/30 border border-[#1d4ed8]/30 flex items-center justify-center flex-shrink-0">
        <span className="text-[11px] font-bold text-blue-300 uppercase">{palpite.username[0]}</span>
      </div>
      <span className="flex-1 text-sm font-semibold text-white truncate">{palpite.username}</span>
      <span className="text-sm font-black tabular-nums text-[#93c5fd]">
        R$ {palpite.valor.toLocaleString("pt-BR")}
      </span>
    </div>
  );
}

function UltimoVencedor({ r }: { r: ResultadoRodada }) {
  const temVencedor = r.vencedores.length > 0;
  const destaque = r.vencedores[0] ?? r.palpites?.[0];
  if (!destaque) return null;

  return (
    <div className="rounded-2xl border border-yellow-500/35 p-5 mb-6" style={{ background: "rgba(5,7,16,0.92)", boxShadow: "0 0 30px rgba(251,191,36,0.08)" }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🏆</span>
        <p className="text-[11px] font-black text-yellow-400 uppercase tracking-widest">
          {temVencedor ? "Último Vencedor" : "Última Rodada"}
        </p>
        <span className="ml-auto text-[10px] text-gray-600">{timeAgo(r.encerradaEm)}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center flex-shrink-0">
          <span className="text-base font-black text-yellow-300 uppercase">{destaque.username[0]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-black text-white truncate">@{destaque.username}</p>
          <p className="text-xs text-gray-500">
            Palpitou <span className="text-[#93c5fd] font-bold">R$ {destaque.valor.toLocaleString("pt-BR")}</span>
            {temVencedor && "diferenca" in destaque && (
              <span> · diferença de <span className="text-yellow-400 font-bold">R$ {(destaque as {diferenca:number}).diferenca.toLocaleString("pt-BR")}</span></span>
            )}
          </p>
        </div>
        {r.resultado > 0 && (
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">Bônus</p>
            <p className="text-sm font-black text-green-400">R$ {r.resultado.toLocaleString("pt-BR")}</p>
          </div>
        )}
      </div>
      {r.vencedores.length > 1 && (
        <div className="mt-3 pt-3 border-t border-yellow-500/10 space-y-1.5">
          {r.vencedores.slice(1).map((w) => (
            <div key={w.username} className="flex items-center gap-2 text-xs text-gray-500">
              <span>{w.posicao === 2 ? "🥈" : "🥉"}</span>
              <span className="font-bold text-gray-400">@{w.username}</span>
              <span className="ml-auto">R$ {w.valor.toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Historico({ lista }: { lista: ResultadoRodada[] }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="rounded-2xl border border-white/12 overflow-hidden mt-6" style={{ background: "rgba(5,7,16,0.90)" }}>
      <button
        onClick={() => setAberto(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Histórico de Rodadas</p>
          {lista.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400">
              {lista.length}
            </span>
          )}
        </div>
        <span className="text-gray-600 text-xs">{aberto ? "▲" : "▼"}</span>
      </button>

      {aberto && (
        <div className="px-5 pb-5">
          {lista.length === 0 ? (
            <p className="text-center text-gray-700 text-sm py-6">Nenhuma rodada encerrada ainda.</p>
          ) : (
            <div className="space-y-2">
              {lista.map((r) => {
                const top = r.vencedores[0];
                const destaque = top ?? r.palpites?.[0];
                return (
                  <div key={r.id} className="rounded-xl border border-white/10 px-4 py-3" style={{ background: "rgba(5,7,16,0.85)" }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🏆</span>
                        {destaque ? (
                          <p className="text-sm font-bold text-white">@{destaque.username}</p>
                        ) : (
                          <p className="text-sm font-bold text-gray-600">Sem participantes</p>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-600">{timeAgo(r.encerradaEm)}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                      <span className="text-gray-600">Bônus: <span className="text-white font-bold">R$ {r.buyIn.toLocaleString("pt-BR")}</span></span>
                      {r.resultado > 0 && <span className="text-gray-600">Resultado real: <span className="text-green-400 font-bold">R$ {r.resultado.toLocaleString("pt-BR")}</span></span>}
                      {destaque && <span className="text-gray-600">Palpite: <span className="text-[#93c5fd] font-bold">R$ {destaque.valor.toLocaleString("pt-BR")}</span></span>}
                      {top && <span className="text-gray-600">Diferença: <span className="text-yellow-400 font-bold">R$ {top.diferenca.toLocaleString("pt-BR")}</span></span>}
                      <span className="text-gray-600">{r.totalParticipantes} participante{r.totalParticipantes !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PalpitesPage() {
  const { data: session, status } = useSession();
  const admin = isAdmin(session?.user?.twitchLogin);
  const router = useRouter();
  const [rodada, setRodada] = useState<Rodada | null>(null);
  const [historico, setHistorico] = useState<ResultadoRodada[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && admin) {
      router.replace("/admin/palpites");
    }
  }, [status, admin, router]);

  const fetchDados = useCallback(async () => {
    try {
      const [rRes, hRes] = await Promise.all([
        fetch("/api/palpites/rodada", { cache: "no-store" }),
        fetch("/api/palpites/historico", { cache: "no-store" }),
      ]);
      setRodada(await rRes.json() as Rodada | null);
      setHistorico(await hRes.json() as ResultadoRodada[]);
    } catch { /* ignora */ } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    fetchDados();
    const id = setInterval(fetchDados, 3000);
    return () => clearInterval(id);
  }, [fetchDados]);

  if (carregando || status === "loading" || (status === "authenticated" && admin)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#10b981] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-enter relative overflow-hidden min-h-[calc(100vh-4rem)]">

<div className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-16 pb-24">
        <div className="flex items-center gap-2 text-xs text-gray-600 mb-8">
          <Link href="/arena" className="hover:text-gray-400 transition-colors">Arena</Link>
          <span>/</span>
          <span className="text-gray-400">Palpites</span>
        </div>
        <div className="mb-6">
          <h1 className="text-3xl font-black text-white mb-2">🎯 Palpites</h1>
          {rodada?.status === "aberta" ? (
            <p className="text-sm text-gray-500">
              Digite{" "}
              <span className="text-[#93c5fd] font-mono font-bold">!p &lt;valor&gt;</span>
              {" "}no chat da Twitch para participar.
            </p>
          ) : (
            <p className="text-sm text-gray-600">Aguarde a próxima rodada.</p>
          )}
        </div>
        <div className="mb-6">
          {rodada?.status === "aberta" ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/40">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-bold text-green-400 uppercase tracking-widest">Palpite Aberto</span>
              <span className="text-green-600 text-xs">·</span>
              <span className="text-xs font-semibold text-green-500">
                Bônus R$ {rodada.buyIn.toLocaleString("pt-BR")}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-500/10 border border-gray-600/40">
              <span className="w-2 h-2 rounded-full bg-gray-500" />
              <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Sem rodada ativa</span>
            </div>
          )}
        </div>
        {historico.length > 0 && (
          <UltimoVencedor r={historico[0]} />
        )}
        {rodada && rodada.palpites.length > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl border border-white/10 px-4 py-3" style={{ background: "rgba(5,7,16,0.88)" }}>
                <p className="text-[11px] text-gray-600 uppercase tracking-wider mb-1">Valor do Bônus</p>
                <p className="text-lg font-black text-white">R$ {rodada.buyIn.toLocaleString("pt-BR")}</p>
              </div>
              <div className="rounded-xl border border-white/10 px-4 py-3" style={{ background: "rgba(5,7,16,0.88)" }}>
                <p className="text-[11px] text-gray-600 uppercase tracking-wider mb-1">Participantes</p>
                <p className="text-lg font-black text-white">{rodada.palpites.length}</p>
              </div>
            </div>

            <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest px-1 mb-2">
              {rodada.palpites.length} palpite{rodada.palpites.length !== 1 ? "s" : ""}
            </p>

            <div className="space-y-2">
              {[...rodada.palpites]
                .sort((a, b) => a.createdAt - b.createdAt)
                .map((p, i) => (
                  <PalpiteRow key={p.username} palpite={p} index={i} />
                ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl border border-white/10" style={{ background: "rgba(5,7,16,0.88)" }}>
            <p className="text-5xl mb-4">🎯</p>
            <p className="text-white font-bold text-lg mb-1">
              {rodada?.status === "aberta" ? "Seja o primeiro!" : "Nenhuma rodada ativa"}
            </p>
            <p className="text-gray-600 text-sm max-w-xs mx-auto">
              {rodada?.status === "aberta"
                ? "Digite !p <valor> no chat da Twitch para participar."
                : "Fique de olho no chat! Quando abrir um palpite, aparece aqui em tempo real."}
            </p>
          </div>
        )}
        <Historico lista={historico} />

      </div>
    </div>
  );
}

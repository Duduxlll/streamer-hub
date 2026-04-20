"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { isAdmin } from "@/lib/admins";
import type { Rodada, ResultadoRodada } from "@/lib/store";
import { useToast, ToastContainer } from "@/components/toast";

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

function VencedorPanel({
  r,
  onNovaRodada,
}: {
  r: ResultadoRodada;
  onNovaRodada: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* resultado header */}
      <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/6 p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🏆</span>
          <p className="text-sm font-black text-yellow-300 uppercase tracking-widest">Resultado da Rodada</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl border border-white/5 bg-white/3 px-3 py-2.5 text-center">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Valor do Bônus</p>
            <p className="text-base font-black text-white">R$ {r.buyIn.toLocaleString("pt-BR")}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/3 px-3 py-2.5 text-center">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Resultado Real</p>
            {r.resultado > 0
              ? <p className="text-base font-black text-green-400">R$ {r.resultado.toLocaleString("pt-BR")}</p>
              : <p className="text-base font-black text-gray-600">—</p>
            }
          </div>
          <div className="rounded-xl border border-white/5 bg-white/3 px-3 py-2.5 text-center">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Participantes</p>
            <p className="text-base font-black text-white">{r.totalParticipantes}</p>
          </div>
        </div>

        {r.vencedores.length > 0 ? (
          <div className="space-y-2">
            {r.vencedores.map((v) => (
              <div key={v.username} className="px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/8">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg">{v.posicao === 1 ? "🥇" : v.posicao === 2 ? "🥈" : "🥉"}</span>
                  <p className="text-sm font-black text-white">@{v.username}</p>
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 uppercase tracking-wide">
                    {v.posicao === 1 ? "Vencedor" : `${v.posicao}º lugar`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-black/20 px-3 py-2 text-center">
                    <p className="text-[10px] text-gray-600 mb-0.5">Palpite</p>
                    <p className="text-sm font-black text-[#93c5fd]">R$ {v.valor.toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="rounded-lg bg-black/20 px-3 py-2 text-center">
                    <p className="text-[10px] text-gray-600 mb-0.5">Resultado real</p>
                    <p className="text-sm font-black text-green-400">R$ {r.resultado.toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="rounded-lg bg-black/20 px-3 py-2 text-center">
                    <p className="text-[10px] text-gray-600 mb-0.5">Diferença</p>
                    <p className="text-sm font-black text-yellow-400">R$ {v.diferenca.toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : r.palpites && r.palpites.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Participantes (sem resultado informado)</p>
            {r.palpites.map((p) => (
              <div key={p.username} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/3">
                <div className="w-7 h-7 rounded-full bg-[#1d4ed8]/30 border border-[#1d4ed8]/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-blue-300 uppercase">{p.username[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">@{p.username}</p>
                  <p className="text-xs text-gray-500">
                    Palpitou <span className="text-[#93c5fd] font-bold">R$ {p.valor.toLocaleString("pt-BR")}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600 text-sm py-2">Nenhum participante nesta rodada.</p>
        )}
      </div>

      <button
        onClick={onNovaRodada}
        className="w-full py-3 rounded-xl font-black text-black text-sm transition-all hover:scale-[1.02]"
        style={{ background: "linear-gradient(135deg, #ffba00, #e6a000)" }}
      >
        ✚ Nova Rodada
      </button>
    </div>
  );
}

export default function AdminPalpitesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const { toasts, toast, dismiss } = useToast();
  const [rodada, setRodada] = useState<Rodada | null>(null);
  const [buyIn, setBuyIn] = useState("");
  const [numVencedores, setNumVencedores] = useState("1");
  const [resultado, setResultado] = useState("");
  const [ultimoResultado, setUltimoResultado] = useState<ResultadoRodada | null>(null);
  const [historico, setHistorico] = useState<ResultadoRodada[]>([]);
  const [showHistorico, setShowHistorico] = useState(false);
  const [loading, setLoading] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const actionInFlight = useRef(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!isAdmin(session?.user?.twitchLogin)) router.replace("/arena/palpites");
  }, [status, session, router]);

  // Sincroniza buyIn/numVencedores da rodada ativa ao carregar a página
  useEffect(() => {
    if (!rodada) return;
    setBuyIn(prev => prev || String(rodada.buyIn));
    setNumVencedores(prev => prev || String(rodada.numVencedores));
  }, [rodada]);

  const fetchDados = useCallback(async () => {
    if (actionInFlight.current) return;
    try {
      const [rRes, hRes] = await Promise.all([
        fetch("/api/palpites/rodada", { cache: "no-store" }),
        fetch("/api/palpites/historico", { cache: "no-store" }),
      ]);
      if (actionInFlight.current) return;
      setRodada(await rRes.json());
      setHistorico(await hRes.json() as ResultadoRodada[]);
    } catch { /* ignora */ } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    fetchDados();
    const id = setInterval(fetchDados, 2000);
    return () => clearInterval(id);
  }, [fetchDados]);

  if (status === "loading" || !isAdmin(session?.user?.twitchLogin) || carregando) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#9146ff] border-t-transparent animate-spin" />
      </div>
    );
  }

  async function abrirPalpites() {
    if (!buyIn || actionInFlight.current) return;
    actionInFlight.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/palpites/rodada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open", buyIn: parseValor(buyIn), numVencedores: parseInt(numVencedores) || 1 }),
      });
      setRodada(await res.json());
      toast("Palpites abertos! Chat pode apostar agora 🎯", "success");
    } catch { toast("Erro ao abrir palpites.", "error"); }
    finally { actionInFlight.current = false; setLoading(false); }
  }

  async function travarPalpites() {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setLoading(true);
    try {
      const resp = await fetch("/api/palpites/rodada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lock" }),
      });
      setRodada(await resp.json());
      toast("Palpites fechados! Informe o resultado.", "warning");
    } catch { toast("Erro ao fechar palpites.", "error"); }
    finally { actionInFlight.current = false; setLoading(false); }
  }

  async function definirVencedor() {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setLoading(true);
    try {
      const res = parseValor(resultado);
      const resp = await fetch("/api/palpites/rodada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close", ...(resultado && !isNaN(res) ? { resultado: res } : {}) }),
      });
      const data = await resp.json() as { ok: boolean; resultado: ResultadoRodada | null };
      setRodada(null);
      if (data.resultado) {
        setUltimoResultado(data.resultado);
        toast("Vencedor definido! 🏆", "success");
      } else {
        setBuyIn(""); setNumVencedores("1"); setResultado("");
        toast("Rodada encerrada.", "info");
      }
    } catch { toast("Erro ao definir vencedor.", "error"); }
    finally { actionInFlight.current = false; setLoading(false); }
  }

  function novaRodada() {
    setUltimoResultado(null);
    setBuyIn("");
    setNumVencedores("1");
    setResultado("");
  }

  function formatarValor(v: string): string {
    const t = v.trim().replace(/R\$\s*/g, "");
    const num = Number(t.replace(",", "."));
    if (t !== "" && !isNaN(num) && isFinite(num) && num > 0)
      return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    return v.trim();
  }

  function parseValor(v: string): number {
    return parseFloat(v.replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".")) || 0;
  }

  const aberta = rodada?.status === "aberta";
  const travada = rodada?.status === "travada";
  const rodadaAtiva = aberta || travada;
  const podAbrir = buyIn.trim() !== "" && !rodadaAtiva && !loading;
  const resNum = parseValor(resultado);
  const podDefinir = travada && resultado.trim() !== "" && !isNaN(resNum) && resNum > 0 && !loading;

  return (
    <div className="page-enter relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

<div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-24 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/arena" className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-300 transition-colors mb-2">
              ← Voltar para Arena
            </Link>
            <div>
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full mb-2 inline-block"
                style={{ background: "rgba(255,186,0,0.15)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.3)" }}>
                👑 ADMIN
              </span>
              <h1 className="text-3xl font-black text-white">Painel · Palpites</h1>
            </div>
          </div>

          {aberta ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border bg-green-500/10 border-green-500/40 text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Aberto · {rodada!.palpites.length}
            </span>
          ) : travada ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border bg-orange-500/10 border-orange-500/40 text-orange-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              Travado · {rodada!.palpites.length}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border bg-gray-500/10 border-gray-600/40 text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
              Fechado
            </span>
          )}
        </div>

        {/* Painel de vencedor (após definir vencedor) */}
        {ultimoResultado && !rodadaAtiva ? (
          <VencedorPanel r={ultimoResultado} onNovaRodada={novaRodada} />
        ) : (
          <>
            {/* Configuração */}
            <div className="rounded-2xl border border-white/8 bg-white/2 p-5">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4">Configuração da Rodada</p>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Valor do Bônus (R$)</label>
                  <input type="text" value={buyIn} onChange={e => setBuyIn(e.target.value)} disabled={rodadaAtiva}
                    placeholder="Valor do bônus"
                    onBlur={() => setBuyIn(v => formatarValor(v))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#ffba00]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Nº de Vencedores</label>
                  <input type="number" min={1} value={numVencedores} onChange={e => setNumVencedores(e.target.value)} disabled={rodadaAtiva}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#ffba00]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" />
                </div>
              </div>

              {/* Botão Abrir — só quando não há rodada */}
              {!rodadaAtiva && (
                <button onClick={abrirPalpites} disabled={!podAbrir}
                  className="w-full py-3 rounded-xl font-black text-black text-sm transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ background: "linear-gradient(135deg, #ffba00, #e6a000)" }}>
                  {loading ? "Abrindo..." : "▶ Abrir Palpites"}
                </button>
              )}

              {/* Botões Fechar Palpites + Definir Vencedor */}
              {rodadaAtiva && (
                <div className="space-y-3">
                  {/* Fechar Palpites — ativo quando aberta, apagado quando já travada */}
                  <button
                    onClick={travarPalpites}
                    disabled={!aberta || loading}
                    className="w-full py-3 rounded-xl font-bold text-sm border transition-all disabled:cursor-not-allowed"
                    style={aberta
                      ? { borderColor: "rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.1)", color: "#f87171" }
                      : { borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: "#4b5563" }
                    }
                  >
                    {loading && aberta ? "Fechando..." : aberta ? "■ Fechar Palpites" : "■ Palpites Fechados"}
                  </button>

                  {/* Input resultado + Definir Vencedor — ativo só quando travada */}
                  <div>
                    <label className="text-xs mb-1.5 block transition-colors"
                      style={{ color: travada ? "#9ca3af" : "#374151" }}>
                      Valor real do bônus (R$)
                      <span className="ml-1" style={{ color: travada ? "#6b7280" : "#1f2937" }}>— informe o resultado</span>
                    </label>
                    <input
                      type="text"
                      value={resultado}
                      onChange={e => setResultado(e.target.value)}
                      disabled={!travada}
                      placeholder="Resultado real"
                      onBlur={() => setResultado(v => formatarValor(v))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-yellow-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all mb-3"
                    />
                    <button
                      onClick={definirVencedor}
                      disabled={!podDefinir}
                      className="w-full py-3 rounded-xl font-black text-sm transition-all disabled:cursor-not-allowed disabled:hover:scale-100"
                      style={podDefinir
                        ? { background: "linear-gradient(135deg, #ffba00, #e6a000)", color: "#000" }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#374151" }
                      }
                    >
                      {loading && travada ? "Definindo..." : "🏆 Definir Vencedor"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Log de palpites */}
            <div className="rounded-2xl border border-white/8 bg-white/2 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Palpites Recebidos</p>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-gray-700">!p &lt;valor&gt; no chat</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(147,197,253,0.1)", color: "#93c5fd" }}>
                    {rodada?.palpites.length ?? 0} palpite{(rodada?.palpites.length ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {!rodada || rodada.palpites.length === 0 ? (
                <p className="text-center text-gray-700 text-sm py-10">
                  {aberta ? "Aguardando palpites do chat..." : "Abra uma rodada para começar."}
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {[...rodada.palpites].sort((a, b) => b.createdAt - a.createdAt).map((p, i) => (
                    <div key={p.username} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/5 bg-white/3 text-sm">
                      <span className="w-5 text-xs text-gray-600 font-bold text-center">{rodada.palpites.length - i}º</span>
                      <div className="w-7 h-7 rounded-full bg-[#1d4ed8]/30 border border-[#1d4ed8]/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-blue-300 uppercase">{p.username[0]}</span>
                      </div>
                      <span className="flex-1 font-semibold text-white truncate">{p.username}</span>
                      <span className="font-black tabular-nums text-[#93c5fd]">R$ {p.valor.toLocaleString("pt-BR")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Histórico colapsável */}
        <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
          <button
            onClick={() => setShowHistorico(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Histórico de Rodadas</p>
              {historico.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400">
                  {historico.length}
                </span>
              )}
            </div>
            <span className="text-gray-600 text-xs">{showHistorico ? "▲" : "▼"}</span>
          </button>

          {showHistorico && (
            <div className="px-5 pb-5">
              {historico.length > 0 && (
                <div className="flex justify-end mb-3">
                  <button
                    onClick={async () => {
                      await fetch("/api/palpites/historico", { method: "DELETE" });
                      setHistorico([]);
                    }}
                    className="text-[11px] font-bold text-red-500/60 hover:text-red-400 transition-colors px-2 py-1 rounded border border-red-500/20 hover:border-red-500/40"
                  >
                    🗑 Limpar Histórico
                  </button>
                </div>
              )}

              {historico.length === 0 ? (
                <p className="text-center text-gray-700 text-sm py-6">Nenhuma rodada encerrada ainda.</p>
              ) : (
                <div className="space-y-2">
                  {historico.map((r) => {
                    const top = r.vencedores[0];
                    const destaque = top ?? r.palpites?.[0];
                    return (
                      <div key={r.id} className="rounded-xl border border-white/5 bg-white/3 px-4 py-3">
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

      </div>
    </div>
  );
}

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

function Card({ children, className, accent }: { children: React.ReactNode; className?: string; accent?: "yellow" | "blue" | "green" | "default" }) {
  const borders: Record<string, string> = {
    yellow:  "border-[#ffba00]/25",
    blue:    "border-[#3b82f6]/25",
    green:   "border-[#22c55e]/25",
    default: "border-white/10",
  };
  const glows: Record<string, string> = {
    yellow:  "shadow-[0_0_40px_rgba(255,186,0,0.06)]",
    blue:    "shadow-[0_0_40px_rgba(59,130,246,0.06)]",
    green:   "shadow-[0_0_40px_rgba(34,197,94,0.06)]",
    default: "",
  };
  const key = accent ?? "default";
  return (
    <div
      className={`rounded-2xl border ${borders[key]} ${glows[key]} ${className ?? ""}`}
      style={{ background: "rgba(5,7,18,0.97)", backdropFilter: "blur(12px)" }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 mb-4">{children}</p>
  );
}

function VencedorPanel({ r, onNovaRodada }: { r: ResultadoRodada; onNovaRodada: () => void }) {
  return (
    <div className="space-y-4">
      <Card accent="yellow" className="p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
            style={{ background: "rgba(255,186,0,0.12)", border: "1px solid rgba(255,186,0,0.25)" }}>🏆</div>
          <p className="text-sm font-black text-yellow-300 uppercase tracking-widest">Resultado da Rodada</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Valor do Bônus", value: `R$ ${r.buyIn.toLocaleString("pt-BR")}`, color: "#fff" },
            { label: "Resultado Real", value: r.resultado > 0 ? `R$ ${r.resultado.toLocaleString("pt-BR")}` : "—", color: r.resultado > 0 ? "#4ade80" : "#4b5563" },
            { label: "Participantes", value: String(r.totalParticipantes), color: "#fff" },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-3 py-2.5 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-base font-black" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {r.vencedores.length > 0 ? (
          <div className="space-y-2">
            {r.vencedores.map((v) => (
              <div key={v.username} className="px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,186,0,0.07)", border: "1px solid rgba(255,186,0,0.2)" }}>
                <div className="flex items-center gap-3 mb-2.5">
                  <span className="text-lg">{v.posicao === 1 ? "🥇" : v.posicao === 2 ? "🥈" : "🥉"}</span>
                  <p className="text-sm font-black text-white">@{v.username}</p>
                  <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(255,186,0,0.15)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.3)" }}>
                    {v.posicao === 1 ? "Vencedor" : `${v.posicao}º lugar`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Palpite", value: `R$ ${v.valor.toLocaleString("pt-BR")}`, color: "#93c5fd" },
                    { label: "Real", value: `R$ ${r.resultado.toLocaleString("pt-BR")}`, color: "#4ade80" },
                    { label: "Diferença", value: `R$ ${v.diferenca.toLocaleString("pt-BR")}`, color: "#fbbf24" },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg px-3 py-2 text-center"
                      style={{ background: "rgba(0,0,0,0.3)" }}>
                      <p className="text-[10px] text-gray-600 mb-0.5">{s.label}</p>
                      <p className="text-sm font-black" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : r.palpites?.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Participantes</p>
            {r.palpites.map((p) => (
              <div key={p.username} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-7 h-7 rounded-full bg-[#1d4ed8]/30 border border-[#1d4ed8]/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-blue-300 uppercase">{p.username[0]}</span>
                </div>
                <p className="text-sm font-bold text-white flex-1 truncate">@{p.username}</p>
                <span className="text-sm font-black text-[#93c5fd]">R$ {p.valor.toLocaleString("pt-BR")}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600 text-sm py-2">Nenhum participante nesta rodada.</p>
        )}
      </Card>

      <button onClick={onNovaRodada}
        className="w-full py-3.5 rounded-xl font-black text-black text-sm transition-all hover:scale-[1.02]"
        style={{ background: "linear-gradient(135deg, #ffba00, #e6a000)" }}>
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
  const [modoVitoria, setModoVitoria] = useState<"aproximado" | "exato">("aproximado");
  const [multiplos, setMultiplos] = useState(false);
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
        <div className="w-8 h-8 rounded-full border-2 border-[#ffba00] border-t-transparent animate-spin" />
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
        body: JSON.stringify({ action: "open", buyIn: parseValor(buyIn), numVencedores: parseInt(numVencedores) || 1, modoVitoria, multiplosPalpites: multiplos }),
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
    setBuyIn(""); setNumVencedores("1"); setResultado("");
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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                style={{ background: "rgba(255,186,0,0.12)", border: "1px solid rgba(255,186,0,0.25)" }}>
                🎯
              </div>
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase"
                  style={{ color: "#ffba00" }}>👑 Admin</p>
                <h1 className="text-2xl font-black text-white leading-tight">Painel · Palpites</h1>
              </div>
            </div>
          </div>

          {aberta ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", boxShadow: "0 0 20px rgba(34,197,94,0.1)" }}>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-black text-green-400 uppercase tracking-widest">Aberto</span>
              <span className="text-xs font-black text-green-300 ml-1">{rodada!.palpites.length} palpites</span>
            </div>
          ) : travada ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.35)", boxShadow: "0 0 20px rgba(251,146,60,0.1)" }}>
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-xs font-black text-orange-400 uppercase tracking-widest">Travado</span>
              <span className="text-xs font-black text-orange-300 ml-1">{rodada!.palpites.length} palpites</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <span className="w-2 h-2 rounded-full bg-gray-600" />
              <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Fechado</span>
            </div>
          )}
        </div>
        {ultimoResultado && !rodadaAtiva ? (
          <VencedorPanel r={ultimoResultado} onNovaRodada={novaRodada} />
        ) : (
          <>
            <Card accent="yellow" className="p-6">
              <SectionLabel>Configuração da Rodada</SectionLabel>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">Valor do Bônus</label>
                  <input type="text" value={buyIn} onChange={e => setBuyIn(e.target.value)} disabled={rodadaAtiva}
                    placeholder="R$ 0,00"
                    onBlur={() => setBuyIn(v => formatarValor(v))}
                    className="w-full rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">Nº de Vencedores</label>
                  <input type="number" min={1} value={numVencedores} onChange={e => setNumVencedores(e.target.value)} disabled={rodadaAtiva}
                    className="w-full rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }} />
                </div>
              </div>

              {/* Configurações de modo — só ao abrir nova rodada */}
              {!rodadaAtiva && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  {/* Modo de vitória */}
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">Como ganha?</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { key: "aproximado", label: "Mais perto", sub: "Aproximado" },
                        { key: "exato",      label: "Valor exato", sub: "Cravado" },
                      ] as const).map(o => {
                        const sel = modoVitoria === o.key;
                        return (
                          <button key={o.key} type="button" onClick={() => setModoVitoria(o.key)}
                            className="flex flex-col items-start px-3 py-2 rounded-xl transition-all"
                            style={sel
                              ? { background: "rgba(255,186,0,0.1)", border: "1px solid rgba(255,186,0,0.4)" }
                              : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                            <span className="text-xs font-black" style={{ color: sel ? "#ffba00" : "#9ca3af" }}>{o.label}</span>
                            <span className="text-[10px] text-gray-600">{o.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quantidade de palpites por pessoa */}
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">Palpites por pessoa</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { val: false, label: "Apenas um", sub: "Substitui" },
                        { val: true,  label: "Vários",     sub: "Sem limite" },
                      ] as const).map(o => {
                        const sel = multiplos === o.val;
                        return (
                          <button key={String(o.val)} type="button" onClick={() => setMultiplos(o.val)}
                            className="flex flex-col items-start px-3 py-2 rounded-xl transition-all"
                            style={sel
                              ? { background: "rgba(255,186,0,0.1)", border: "1px solid rgba(255,186,0,0.4)" }
                              : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                            <span className="text-xs font-black" style={{ color: sel ? "#ffba00" : "#9ca3af" }}>{o.label}</span>
                            <span className="text-[10px] text-gray-600">{o.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Resumo do modo durante rodada ativa */}
              {rodadaAtiva && rodada && (
                <div className="flex items-center gap-2 flex-wrap mb-5">
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(255,186,0,0.1)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.25)" }}>
                    {rodada.modoVitoria === "exato" ? "🎯 Valor exato" : "📏 Mais perto ganha"}
                  </span>
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(255,255,255,0.05)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {rodada.multiplosPalpites ? "♾️ Vários palpites" : "1️⃣ Um palpite por pessoa"}
                  </span>
                </div>
              )}

              {!rodadaAtiva && (
                <button onClick={abrirPalpites} disabled={!podAbrir}
                  className="w-full py-3.5 rounded-xl font-black text-black text-sm transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ background: "linear-gradient(135deg, #ffba00, #e6a000)", boxShadow: podAbrir ? "0 0 24px rgba(255,186,0,0.3)" : "none" }}>
                  {loading ? "Abrindo..." : "▶ Abrir Palpites"}
                </button>
              )}

              {rodadaAtiva && (
                <div className="space-y-3">
                  <button onClick={travarPalpites} disabled={!aberta || loading}
                    className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                    style={aberta
                      ? { background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171", boxShadow: "0 0 20px rgba(239,68,68,0.1)" }
                      : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#374151" }
                    }>
                    {loading && aberta ? "Fechando..." : aberta ? "■ Fechar Palpites" : "■ Palpites Fechados"}
                  </button>

                  <div>
                    <label className="text-xs font-semibold mb-2 block transition-colors"
                      style={{ color: travada ? "#9ca3af" : "#374151" }}>
                      Valor real do bônus
                      {travada && <span className="ml-1 text-gray-600">— informe o resultado</span>}
                    </label>
                    <input type="text" value={resultado} onChange={e => setResultado(e.target.value)}
                      disabled={!travada} placeholder="R$ 0,00"
                      onBlur={() => setResultado(v => formatarValor(v))}
                      className="w-full rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none transition-all disabled:opacity-30 disabled:cursor-not-allowed mb-3"
                      style={{ background: "rgba(255,255,255,0.06)", border: travada ? "1px solid rgba(255,186,0,0.25)" : "1px solid rgba(255,255,255,0.08)" }} />
                    <button onClick={definirVencedor} disabled={!podDefinir}
                      className="w-full py-3.5 rounded-xl font-black text-sm transition-all"
                      style={podDefinir
                        ? { background: "linear-gradient(135deg, #ffba00, #e6a000)", color: "#000", boxShadow: "0 0 24px rgba(255,186,0,0.3)" }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#2d3748" }
                      }>
                      {loading && travada ? "Definindo..." : "🏆 Definir Vencedor"}
                    </button>
                  </div>
                </div>
              )}
            </Card>
            <Card accent="blue" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <SectionLabel>Palpites Recebidos</SectionLabel>
                <div className="flex items-center gap-3 -mt-4">
                  <span className="text-[11px] font-mono text-gray-700">!p &lt;valor&gt; no chat</span>
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(59,130,246,0.12)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.2)" }}>
                    {rodada?.palpites.length ?? 0} palpite{(rodada?.palpites.length ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {!rodada || rodada.palpites.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {aberta ? "⏳" : "🔒"}
                  </div>
                  <p className="text-sm text-gray-600">
                    {aberta ? "Aguardando palpites do chat..." : "Abra uma rodada para começar."}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {[...rodada.palpites].sort((a, b) => b.createdAt - a.createdAt).map((p, i) => (
                    <div key={p.username} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <span className="w-5 text-[11px] text-gray-600 font-black text-center tabular-nums flex-shrink-0">
                        {rodada.palpites.length - i}
                      </span>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(29,78,216,0.25)", border: "1px solid rgba(29,78,216,0.35)" }}>
                        <span className="text-[10px] font-black text-blue-300 uppercase">{p.username[0]}</span>
                      </div>
                      <span className="flex-1 text-sm font-semibold text-white truncate">{p.username}</span>
                      <span className="text-sm font-black tabular-nums" style={{ color: "#93c5fd" }}>
                        R$ {p.valor.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
        <Card className="overflow-hidden">
          <button onClick={() => setShowHistorico(v => !v)}
            className="w-full flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/3">
            <div className="flex items-center gap-3">
              <span className="text-base">📋</span>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">Histórico de Rodadas</p>
              {historico.length > 0 && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.08)", color: "#6b7280" }}>
                  {historico.length}
                </span>
              )}
            </div>
            <span className="text-gray-600 text-xs transition-transform" style={{ display: "inline-block", transform: showHistorico ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
          </button>

          {showHistorico && (
            <div className="px-6 pb-6 border-t border-white/6">
              {historico.length > 0 && (
                <div className="flex justify-end mt-4 mb-3">
                  <button
                    onClick={async () => {
                      await fetch("/api/palpites/historico", { method: "DELETE" });
                      setHistorico([]);
                    }}
                    className="text-[11px] font-bold text-red-500/50 hover:text-red-400 transition-colors px-2.5 py-1 rounded-lg"
                    style={{ border: "1px solid rgba(239,68,68,0.2)" }}>
                    🗑 Limpar
                  </button>
                </div>
              )}

              {historico.length === 0 ? (
                <p className="text-center text-gray-700 text-sm py-8">Nenhuma rodada encerrada ainda.</p>
              ) : (
                <div className="space-y-2 mt-4">
                  {historico.map((r) => {
                    const top = r.vencedores[0];
                    const destaque = top ?? r.palpites?.[0];
                    return (
                      <div key={r.id} className="rounded-xl px-4 py-3 transition-all"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🏆</span>
                            {destaque
                              ? <p className="text-sm font-bold text-white">@{destaque.username}</p>
                              : <p className="text-sm font-bold text-gray-600">Sem participantes</p>
                            }
                          </div>
                          <p className="text-[10px] text-gray-600">{timeAgo(r.encerradaEm)}</p>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                          <span className="text-gray-600">Bônus: <span className="text-white font-bold">R$ {r.buyIn.toLocaleString("pt-BR")}</span></span>
                          {r.resultado > 0 && <span className="text-gray-600">Real: <span className="text-green-400 font-bold">R$ {r.resultado.toLocaleString("pt-BR")}</span></span>}
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
        </Card>

      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { isAdmin } from "@/lib/admins";
import type { Jackpot } from "@/lib/jackpotStore";
import { useToast, ToastContainer } from "@/components/toast";
import { useConfirm } from "@/components/confirm-modal";

const RW = 160;
const RG = 10;
const RUNIT = RW + RG;
const WINNER_POS = 42;

function IdleRoleta({ jogadores }: { jogadores: Jackpot["jogadores"] }) {
  const items = Array.from({ length: 20 }, (_, i) => jogadores[i % jogadores.length]);
  const all = [...items, ...items];
  return (
    <div className="relative overflow-hidden" style={{ height: 100, background: "rgba(8,10,20,0.98)" }}>
      <style>{`
        @keyframes idle-jk {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
        <div className="w-0 h-0" style={{ borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid rgba(245,158,11,0.4)" }} />
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20">
        <div className="w-0 h-0" style={{ borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderBottom: "8px solid rgba(245,158,11,0.4)" }} />
      </div>
      <div className="absolute inset-y-0 left-0 w-32 z-10 pointer-events-none"
        style={{ background: "linear-gradient(90deg,rgba(8,10,20,1) 0%,transparent 100%)" }} />
      <div className="absolute inset-y-0 right-0 w-32 z-10 pointer-events-none"
        style={{ background: "linear-gradient(270deg,rgba(8,10,20,1) 0%,transparent 100%)" }} />
      <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
        <div style={{ display: "flex", gap: RG, width: "max-content", animation: "idle-jk 22s linear infinite" }}>
          {all.map((p, i) => (
            <div key={i} style={{
              width: RW, height: 72, flexShrink: 0, borderRadius: 10, padding: "10px 14px",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              filter: "blur(1.5px)", opacity: 0.4, display: "flex", flexDirection: "column", justifyContent: "center",
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

function SpinRoleta({ randomPool, target, onFinished }: {
  randomPool: Jackpot["jogadores"];
  target: Jackpot["jogadores"][0];
  onFinished: () => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [strip,     setStrip]     = useState<Jackpot["jogadores"]>([]);
  const [finalizado, setFinalizado] = useState(false);

  useEffect(() => {
    const pool = randomPool.length > 0 ? randomPool : [target];
    const arr: Jackpot["jogadores"] = [];
    for (let i = 0; i < WINNER_POS + 14; i++) {
      arr.push(i === WINNER_POS
        ? target
        : pool[Math.floor(Math.random() * pool.length)]);
    }
    setStrip(arr);

    const t1 = setTimeout(() => {
      if (!stripRef.current) return;
      const containerW = stripRef.current.parentElement?.clientWidth ?? 600;
      const target = WINNER_POS * RUNIT - (containerW / 2 - RW / 2);
      stripRef.current.style.transition = "transform 7.5s cubic-bezier(0.06,0.85,0.08,1.0)";
      stripRef.current.style.transform  = `translateX(-${target}px)`;
      const t2 = setTimeout(() => {
        setFinalizado(true);
        setTimeout(onFinished, 600);
      }, 7700);
      return () => clearTimeout(t2);
    }, 120);

    return () => clearTimeout(t1);
  }, []);

  return (
    <div className="relative overflow-hidden" style={{ height: 110, background: "rgba(8,10,20,0.98)" }}>
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 transition-all duration-500">
        <div className="w-0 h-0" style={{ borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: `10px solid ${finalizado ? "#f59e0b" : "rgba(245,158,11,0.5)"}` }} />
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 transition-all duration-500">
        <div className="w-0 h-0" style={{ borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: `10px solid ${finalizado ? "#f59e0b" : "rgba(245,158,11,0.5)"}` }} />
      </div>
      <div className="absolute inset-y-0 left-0 w-36 z-10 pointer-events-none"
        style={{ background: "linear-gradient(90deg,rgba(8,10,20,1) 0%,rgba(8,10,20,0.7) 65%,transparent 100%)" }} />
      <div className="absolute inset-y-0 right-0 w-36 z-10 pointer-events-none"
        style={{ background: "linear-gradient(270deg,rgba(8,10,20,1) 0%,rgba(8,10,20,0.7) 65%,transparent 100%)" }} />
      <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
        <div ref={stripRef} style={{ display: "flex", gap: RG, willChange: "transform" }}>
          {strip.map((p, i) => {
            const isWinner = i === WINNER_POS && finalizado;
            return (
              <div key={i} style={{
                width: RW, height: 80, flexShrink: 0, borderRadius: 11, padding: "10px 14px",
                background: isWinner ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${isWinner ? "rgba(245,158,11,0.55)" : "rgba(255,255,255,0.07)"}`,
                boxShadow: isWinner ? "0 0 28px rgba(245,158,11,0.28)" : "none",
                filter: isWinner ? "none" : "blur(1px) brightness(0.55)",
                transition: "all 0.55s ease",
                display: "flex", flexDirection: "column", justifyContent: "center",
              }}>
                <p className="font-black truncate text-sm" style={{ color: isWinner ? "#fff" : "rgba(255,255,255,0.45)" }}>{p?.nome ?? "—"}</p>
                <p className="text-[11px] truncate mt-0.5" style={{ color: isWinner ? "#9ca3af" : "rgba(156,163,175,0.35)" }}>{p?.jogo || "—"}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon, label, value, color, highlight }: { icon: string; label: string; value: string; color?: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl flex-1 min-w-[120px]"
      style={{
        background: highlight ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${highlight ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.07)"}`,
        boxShadow: highlight ? "0 0 24px rgba(245,158,11,0.08)" : "none",
      }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
        style={{ background: highlight ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${highlight ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.08)"}` }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 leading-tight">{label}</p>
        <p className="text-base font-black tabular-nums leading-tight truncate" style={{ color: color ?? "#fff" }}>{value}</p>
      </div>
    </div>
  );
}

export default function AdminJackpotPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toasts, toast, dismiss } = useToast();
  const { confirm, ConfirmModal } = useConfirm();

  const [jackpot, setJackpot] = useState<Jackpot | null>(null);
  const [loading, setLoading] = useState(false);
  const [waitingToSpin, setWaitingToSpin] = useState(true);
  const [spinning,      setSpinning]      = useState(false);
  const [livepixOk,     setLivepixOk]     = useState<boolean | null>(null);

  const [formNome,  setFormNome]  = useState("");
  const [formValor, setFormValor] = useState("");

  const [pNome, setPNome] = useState("");
  const [pJogo, setPJogo] = useState("");

  const [regValor, setRegValor] = useState("");
  const regRef = useRef<HTMLInputElement>(null);

  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editNome,    setEditNome]    = useState("");
  const [editJogo,    setEditJogo]    = useState("");

  const [editValorId, setEditValorId] = useState<string | null>(null);
  const [editValor,   setEditValor]   = useState("");

  const [addingInRun, setAddingInRun] = useState(false);
  const [runNome,     setRunNome]     = useState("");
  const [runJogo,     setRunJogo]     = useState("");

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    fetch("/api/livepix/status").then(r => r.json()).then(d => setLivepixOk(!!d.connected)).catch(() => setLivepixOk(false));
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!isAdmin(session?.user?.twitchLogin)) router.replace("/arena/jackpot");
  }, [status, session, router]);

  const fetchJackpot = useCallback(async () => {
    try {
      const res = await fetch("/api/jackpot", { cache: "no-store" });
      setJackpot(await res.json());
    } catch { /* ignora */ }
  }, []);

  useEffect(() => {
    fetchJackpot();
    const iv = setInterval(fetchJackpot, 2000);
    return () => clearInterval(iv);
  }, [fetchJackpot]);

  if (status === "loading" || !isAdmin(session?.user?.twitchLogin)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#f59e0b] border-t-transparent animate-spin" />
      </div>
    );
  }

  async function post(body: object) {
    setLoading(true);
    try {
      const res  = await fetch("/api/jackpot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? "Erro", "error"); return null; }
      setJackpot(data.id ? data : null);
      return data;
    } catch { toast("Erro de conexão", "error"); return null; }
    finally { setLoading(false); }
  }

  function parseVal(v: string) {
    return parseFloat(v.replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", "."));
  }

  function fmtValor(v: string) {
    const t = v.trim().replace(/R\$\s*/g, "");
    const n = Number(t.replace(",", "."));
    if (t && !isNaN(n) && isFinite(n) && n >= 0)
      return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return v.trim();
  }

  if (!jackpot) {
    return (
      <div className="relative min-h-[calc(100vh-4rem)]">
        <ToastContainer toasts={toasts} dismiss={dismiss} />
        {ConfirmModal}
        <div className="page-enter max-w-lg mx-auto px-4 sm:px-6 pt-14 pb-24">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/admin/jackpot/historico" className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-400 transition-colors">🏆 Histórico</Link>
          </div>
          <div className="mb-5">
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 mb-2"
              style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
              🎰 PAINEL ADMIN
            </span>
            <h1 className="text-3xl font-black text-white">Jackpot</h1>
          </div>
          <div className="rounded-2xl border border-white/10 p-6" style={{ background: "rgba(8,10,20,0.97)", backdropFilter: "blur(12px)" }}>
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-5">Criar Sessão</p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Nome da Batalha</label>
                <input value={formNome} onChange={e => setFormNome(e.target.value)}
                  placeholder="Nome da batalha"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#f59e0b]/50 transition-colors" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Valor de Entrada (R$)</label>
                <input value={formValor} onChange={e => setFormValor(e.target.value)}
                  placeholder="Valor de entrada"
                  onBlur={() => setFormValor(v => fmtValor(v))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#f59e0b]/50 transition-colors" />
              </div>
            </div>
            <button
              onClick={async () => {
                if (!formNome.trim()) return;
                await post({ action: "criar", nome: formNome, valorEntrada: parseVal(formValor) });
                toast("Sessão criada! Adicione os jogadores.", "success");
              }}
              disabled={!formNome.trim() || loading}
              className="w-full py-3.5 rounded-xl font-black text-black text-sm disabled:opacity-40 transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)" }}
            >
              {loading ? "Criando..." : "▶ Criar Jackpot"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const jogados    = jackpot.jogadores.filter(j => j.valor !== null).length;
  const total      = jackpot.jogadores.length;
  const custo      = total * jackpot.valorEntrada;
  const ganhadorAtual = jackpot.jogadores.filter(j => j.valor !== null)
    .reduce<Jackpot["jogadores"][0] | null>((best, j) => (j.valor ?? -1) > (best?.valor ?? -1) ? j : best, null);

  if (jackpot.status === "finalizado" && jackpot.vencedor) {
    const premioFinal    = jackpot.jogadores.reduce((sum, j) => sum + (j.valor ?? 0), 0);
    const rankingSorted  = [...jackpot.jogadores].sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1));
    return (
      <div className="relative min-h-[calc(100vh-4rem)]">
        <ToastContainer toasts={toasts} dismiss={dismiss} />
        {ConfirmModal}
        <div className="page-enter max-w-lg mx-auto px-4 sm:px-6 pt-14 pb-24 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/admin/jackpot/historico" className="text-xs text-amber-600 hover:text-amber-400 transition-colors">🏆 Histórico</Link>
          </div>
          <div className="rounded-2xl border border-[#f59e0b]/40 p-8 text-center" style={{ background: "rgba(245,158,11,0.06)" }}>
            <p className="text-5xl mb-3">🏆</p>
            <p className="text-[11px] font-black text-amber-500 uppercase tracking-widest mb-2">Campeão do Jackpot</p>
            <h2 className="text-4xl font-black text-white mb-1">{jackpot.vencedor.nome}</h2>
            {jackpot.vencedor.jogo && <p className="text-sm font-black text-gray-400 mb-4">{jackpot.vencedor.jogo}</p>}
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Bônus mais alto</p>
                <p className="text-2xl font-black text-white">R$ {jackpot.vencedor.valor!.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>
              {premioFinal > 0 && (
                <div className="pt-3 border-t border-white/8">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5">Prêmio Total Ganho</p>
                  <p className="text-4xl font-black" style={{
                    background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}>R$ {premioFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: "rgba(8,10,20,0.97)", backdropFilter: "blur(12px)" }}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Ranking</p>
              <span className="text-[10px] font-black text-gray-700">{rankingSorted.length} participantes · {jackpot.nome}</span>
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

          <button
            onClick={async () => {
              if (!await confirm("Encerrar esta sessão e começar uma nova?", { confirmLabel: "Encerrar", danger: true })) return;
              await post({ action: "cancelar" });
              toast("Sessão encerrada.", "info");
            }}
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-black text-black text-sm disabled:opacity-40 transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)" }}
          >✚ Nova Sessão</button>
        </div>
      </div>
    );
  }

  if (jackpot.status === "aguardando") {
    return (
      <div className="relative min-h-[calc(100vh-4rem)]">
        <ToastContainer toasts={toasts} dismiss={dismiss} />
        {ConfirmModal}
        <div className="page-enter max-w-2xl mx-auto px-4 sm:px-6 pt-12 pb-24 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
                  style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                  🎰 PAINEL ADMIN
                </span>
                <Link href="/admin/jackpot/historico" className="text-xs text-amber-600 hover:text-amber-400 transition-colors">🏆 Histórico</Link>
              </div>
              <h1 className="text-2xl font-black text-white">{jackpot.nome}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 text-gray-400">
                {total} jogador{total !== 1 ? "es" : ""}
              </span>
              {jackpot.valorEntrada > 0 && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }}>
                  Entrada: R$ {jackpot.valorEntrada.toLocaleString("pt-BR")}
                </span>
              )}
              <button
                onClick={async () => {
                  if (!await confirm(`Cancelar o jackpot "${jackpot.nome}"?`, { confirmLabel: "Cancelar", danger: true })) return;
                  await post({ action: "cancelar" });
                  toast("Jackpot cancelado.", "warning");
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-red-500/35 bg-red-500/8 text-red-400 hover:bg-red-500/18 transition-all"
              >Cancelar</button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 p-5" style={{ background: "rgba(8,10,20,0.97)", backdropFilter: "blur(12px)" }}>
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-4">Adicionar Jogador</p>
            <div className="flex gap-2">
              <input value={pNome} onChange={e => setPNome(e.target.value)}
                placeholder="Nome do jogador"
                onKeyDown={e => e.key === "Enter" && document.getElementById("btn-add-jogador")?.click()}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#f59e0b]/50 transition-colors" />
              <input value={pJogo} onChange={e => setPJogo(e.target.value)}
                placeholder="Jogo"
                onKeyDown={e => e.key === "Enter" && document.getElementById("btn-add-jogador")?.click()}
                className="w-40 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#f59e0b]/50 transition-colors" />
              <button
                id="btn-add-jogador"
                onClick={async () => {
                  if (!pNome.trim()) return;
                  await post({ action: "add-jogador", nome: pNome, jogo: pJogo });
                  setPNome(""); setPJogo("");
                }}
                disabled={!pNome.trim() || loading}
                className="px-4 py-2.5 rounded-xl font-black text-black text-sm disabled:opacity-40 transition-all hover:scale-[1.02] flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)" }}
              >+ Add</button>
            </div>
          </div>

          {total > 0 && (
            <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(8,10,20,0.97)", backdropFilter: "blur(12px)" }}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Jogadores ({total})</p>
                {custo > 0 && <p className="text-xs font-black text-amber-400">Custo total: R$ {custo.toLocaleString("pt-BR")}</p>}
              </div>
              <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                {jackpot.jogadores.map((j, i) => (
                  <div key={j.id} className="px-5 py-3">
                    {editingId === j.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editNome} onChange={e => setEditNome(e.target.value)}
                          className="flex-1 bg-white/5 border border-[#f59e0b]/50 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none"
                          autoFocus
                        />
                        <input
                          value={editJogo} onChange={e => setEditJogo(e.target.value)}
                          className="w-32 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none"
                          placeholder="Jogo"
                        />
                        <button
                          onClick={async () => {
                            if (!editNome.trim()) return;
                            await post({ action: "edit-jogador", id: j.id, nome: editNome, jogo: editJogo });
                            setEditingId(null);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-black text-black"
                          style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)" }}
                        >✓</button>
                        <button onClick={() => setEditingId(null)} className="px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-white transition-colors">✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-700 w-5 text-center">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm truncate">{j.nome}</p>
                          {j.jogo && <p className="text-xs text-gray-600 truncate">{j.jogo}</p>}
                        </div>
                        <button
                          onClick={() => { setEditingId(j.id); setEditNome(j.nome); setEditJogo(j.jogo); }}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-600 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                          title="Editar"
                        >✏️</button>
                        <button
                          onClick={() => post({ action: "remove-jogador", id: j.id })}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >✕</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={async () => {
              const res = await post({ action: "iniciar" });
              if (res) {
                toast("Jackpot iniciado! ⚡", "success");
                setWaitingToSpin(true);
              }
            }}
            disabled={total < 2 || loading}
            className="w-full py-3.5 rounded-xl font-black text-black text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02] disabled:hover:scale-100"
            style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)" }}
          >
            {loading ? "Iniciando..." : `▶ Iniciar Jackpot (${total} jogadores)`}
          </button>
        </div>
      </div>
    );
  }

  const jogadorAtual      = jackpot.jogadores[jackpot.jogadorAtualIdx];
  const sorted            = [...jackpot.jogadores].filter(j => j.valor !== null).sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));
  const premioTotal       = jackpot.jogadores.reduce((sum, j) => sum + (j.valor ?? 0), 0);
  const progPct           = total > 0 ? (jogados / total) * 100 : 0;
  const restantes         = total - jogados;
  const jogadoresNaRoleta = jackpot.jogadores.filter((j, i) => {
    if (j.valor !== null) return false;
    if (!waitingToSpin && !spinning && i === jackpot.jogadorAtualIdx) return false;
    return true;
  });

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      {ConfirmModal}
      <div className="page-enter max-w-[1700px] mx-auto px-4 sm:px-6 pt-8 pb-24 space-y-4">

        {/* ── Header ── */}
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
                style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />EM ANDAMENTO
              </span>
              <Link href="/admin/jackpot/historico" className="text-xs text-amber-600 hover:text-amber-400 transition-colors">🏆 Histórico</Link>
            </div>
            <h1 className="text-3xl font-black text-white truncate">{jackpot.nome}</h1>
          </div>
          <button
            onClick={async () => {
              if (!await confirm(`Cancelar o jackpot "${jackpot.nome}"?`, { confirmLabel: "Cancelar", danger: true })) return;
              await post({ action: "cancelar" });
              toast("Jackpot cancelado.", "warning");
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-red-500/35 bg-red-500/8 text-red-400 hover:bg-red-500/18 transition-all flex-shrink-0"
          >Cancelar</button>
        </div>

        {/* ── Stats ── */}
        <div className="flex items-stretch gap-2.5 flex-wrap">
          <StatBox icon="🎮" label="Jogados" value={`${jogados}/${total}`} />
          <StatBox icon="🏆" label="Prêmio Total" highlight value={premioTotal > 0 ? `R$ ${premioTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"} color="#f59e0b" />
          {jackpot.valorEntrada > 0 && <StatBox icon="🎟️" label="Entrada" value={`R$ ${jackpot.valorEntrada.toLocaleString("pt-BR")}`} />}
          {jackpot.valorEntrada > 0 && <StatBox icon="💰" label="Custo Total" value={`R$ ${custo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progPct}%`, background: "linear-gradient(90deg,#f59e0b,#fbbf24)" }} />
        </div>

        {/* ── Layout: Aguardando (esq) · Roleta (centro) · Placar (dir) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)_290px] gap-4 items-start">

        {/* ════ COLUNA CENTRAL — Roleta + Jogando Agora ════ */}
        <div className="order-1 lg:order-2 min-w-0 space-y-4">

        {/* ── Roleta central ── */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            background: "rgba(8,10,20,0.98)",
            borderColor: spinning ? "rgba(245,158,11,0.35)" : !waitingToSpin && jogadorAtual ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)",
            boxShadow: spinning ? "0 0 40px rgba(245,158,11,0.12)" : "none",
            transition: "all 0.4s ease",
          }}
        >
          {!spinning && jogadoresNaRoleta.length > 0 && <IdleRoleta jogadores={jogadoresNaRoleta} />}
          {spinning && jackpot.jogadores[jackpot.jogadorAtualIdx] && (
            <SpinRoleta
              key={jackpot.jogadorAtualIdx}
              randomPool={jogadoresNaRoleta}
              target={jackpot.jogadores[jackpot.jogadorAtualIdx]}
              onFinished={() => {
                setSpinning(false);
                setWaitingToSpin(false);
                setTimeout(() => regRef.current?.focus(), 80);
              }}
            />
          )}
          {waitingToSpin && !spinning && (
            <div
              className="border-t px-6 py-8 flex flex-col items-center gap-5"
              style={{ borderColor: "rgba(245,158,11,0.12)" }}
            >
              <p className="text-xs font-black text-gray-600 uppercase tracking-widest text-center">
                {jackpot.jogadorAtualIdx === 0
                  ? "Sorteie o primeiro jogador"
                  : `${restantes} jogador${restantes !== 1 ? "es" : ""} restante${restantes !== 1 ? "s" : ""}`}
              </p>
              <button
                onClick={() => setSpinning(true)}
                className="group relative flex items-center gap-3 px-14 py-4 rounded-2xl font-black text-black text-xl transition-all hover:scale-[1.06] active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                  boxShadow: "0 0 50px rgba(245,158,11,0.5), 0 8px 32px rgba(0,0,0,0.35)",
                }}
              >
                🎰 GIRAR
              </button>
            </div>
          )}
          {spinning && (
            <div
              className="border-t px-6 py-4 text-center"
              style={{ borderColor: "rgba(245,158,11,0.15)" }}
            >
              <p className="text-sm font-black text-amber-400 uppercase tracking-widest animate-pulse">
                ✦ Sorteando próximo jogador... ✦
              </p>
            </div>
          )}
        </div>

        {/* ── Painel de Registrar (destacado, mais embaixo) ── */}
        {!waitingToSpin && !spinning && jogadorAtual && (
          <div
            className="rounded-3xl border overflow-hidden"
            style={{
              borderColor: "rgba(34,197,94,0.35)",
              background: "linear-gradient(135deg, rgba(34,197,94,0.07), rgba(8,10,20,0.98))",
              boxShadow: "0 0 50px rgba(34,197,94,0.1)",
              animation: "jkRegIn 0.4s ease-out",
            }}
          >
            <style>{`@keyframes jkRegIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }`}</style>

            {/* Faixa "JOGANDO AGORA" */}
            <div className="flex items-center justify-center gap-2 px-6 py-2.5"
              style={{ background: "rgba(34,197,94,0.1)", borderBottom: "1px solid rgba(34,197,94,0.18)" }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-widest text-green-400">Jogando Agora</span>
            </div>

            <div className="px-6 py-6 flex flex-col items-center gap-5">
              {/* Nome + jogo destacados */}
              <div className="text-center">
                <p className="text-4xl sm:text-5xl font-black text-white leading-none tracking-tight"
                  style={{ textShadow: "0 0 30px rgba(34,197,94,0.25)" }}>
                  {jogadorAtual.nome}
                </p>
                {jogadorAtual.jogo && (
                  <p className="text-sm font-bold text-gray-500 mt-2 inline-flex items-center gap-1.5">
                    🎮 {jogadorAtual.jogo}
                  </p>
                )}
              </div>

              {/* Input de resultado + botão */}
              <div className="w-full max-w-sm flex flex-col items-center gap-3">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Resultado do Bônus</span>
                <div className="w-full flex items-center gap-2.5">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-green-500">R$</span>
                    <input
                      ref={regRef}
                      value={regValor}
                      onChange={e => setRegValor(e.target.value)}
                      placeholder="0,00"
                      onKeyDown={e => { if (e.key === "Enter") document.getElementById("btn-registrar")?.click(); }}
                      className="w-full bg-white/5 border rounded-2xl pl-11 pr-4 py-3.5 text-white text-xl text-center font-black placeholder-gray-700 focus:outline-none transition-colors"
                      style={{ borderColor: "rgba(34,197,94,0.3)" }}
                      onFocus={e => e.currentTarget.style.borderColor = "rgba(34,197,94,0.6)"}
                      onBlur={e => e.currentTarget.style.borderColor = "rgba(34,197,94,0.3)"}
                    />
                  </div>
                  <button
                    id="btn-registrar"
                    onClick={async () => {
                      const v = parseVal(regValor);
                      if (isNaN(v) || v < 0) { toast("Informe um valor válido", "warning"); return; }
                      const res = await post({ action: "registrar", valor: regValor });
                      if (res) {
                        const nome = jogadorAtual.nome;
                        setRegValor("");
                        if (res.status === "finalizado") {
                          toast(`Jackpot finalizado! 🏆`, "success");
                        } else {
                          toast(`${nome} → R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} registrado`, "success");
                          setWaitingToSpin(true);
                        }
                      }
                    }}
                    disabled={!regValor.trim() || loading}
                    className="px-7 py-3.5 rounded-2xl font-black text-black text-sm disabled:opacity-40 transition-all hover:scale-[1.03] active:scale-95 flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)", boxShadow: "0 4px 20px rgba(34,197,94,0.25)" }}
                  >✓ Registrar</button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>{/* ════ fim COLUNA CENTRAL ════ */}

        {/* ════ COLUNA ESQUERDA — Aguardando ════ */}
        <div className="order-2 lg:order-1 rounded-2xl border border-white/10 p-5" style={{ background: "rgba(8,10,20,0.97)", backdropFilter: "blur(12px)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                ⏳ Aguardando ({restantes})
              </p>
              <button
                onClick={() => { setAddingInRun(v => !v); setRunNome(""); setRunJogo(""); }}
                className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-lg transition-all hover:scale-110"
                style={{ background: addingInRun ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.06)", color: addingInRun ? "#f59e0b" : "#6b7280", border: `1px solid ${addingInRun ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.08)"}` }}
                title="Adicionar jogador"
              >+</button>
            </div>

            {addingInRun && (
              <div className="flex gap-2 mb-3">
                <input value={runNome} onChange={e => setRunNome(e.target.value)}
                  placeholder="Nome do jogador"
                  autoFocus
                  onKeyDown={e => e.key === "Enter" && document.getElementById("btn-add-run")?.click()}
                  className="flex-1 bg-white/5 border border-[#f59e0b]/40 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#f59e0b]/70 transition-colors" />
                <input value={runJogo} onChange={e => setRunJogo(e.target.value)}
                  placeholder="Jogo"
                  onKeyDown={e => e.key === "Enter" && document.getElementById("btn-add-run")?.click()}
                  className="w-28 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#f59e0b]/50 transition-colors" />
                <button
                  id="btn-add-run"
                  onClick={async () => {
                    if (!runNome.trim()) return;
                    const res = await post({ action: "add-jogador", nome: runNome, jogo: runJogo });
                    if (res) { toast("Adicionado!", "success"); setRunNome(""); setRunJogo(""); setAddingInRun(false); }
                  }}
                  disabled={!runNome.trim() || loading}
                  className="px-3 py-2 rounded-xl font-black text-black text-sm disabled:opacity-40 flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)" }}
                >✓</button>
              </div>
            )}

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {jackpot.jogadores
                .map((j, i) => ({ ...j, origIdx: i }))
                .filter(j => j.valor === null)
                .map(j => {
                  const isAtual = j.origIdx === jackpot.jogadorAtualIdx && !waitingToSpin && !spinning;
                  return (
                    <div key={j.id}>
                      {editingId === j.id ? (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)" }}>
                          <input value={editNome} onChange={e => setEditNome(e.target.value)}
                            className="flex-1 bg-white/5 border border-[#f59e0b]/50 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none" autoFocus />
                          <input value={editJogo} onChange={e => setEditJogo(e.target.value)}
                            placeholder="Jogo"
                            className="w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none" />
                          <button onClick={async () => { if (!editNome.trim()) return; const res = await post({ action: "edit-jogador", id: j.id, nome: editNome, jogo: editJogo }); if (res) { toast("Editado!", "success"); setEditingId(null); } }}
                            className="px-2 py-1.5 rounded-lg text-xs font-black text-black" style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)" }}>✓</button>
                          <button onClick={() => setEditingId(null)} className="text-gray-600 hover:text-white text-xs transition-colors">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all"
                          style={{
                            background: isAtual ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)",
                            border: `1px solid ${isAtual ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.05)"}`,
                          }}>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                            style={{ background: isAtual ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)", color: isAtual ? "#22c55e" : "#6b7280" }}>
                            {j.origIdx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white text-sm truncate">{j.nome}</p>
                            {j.jogo && <p className="text-[11px] text-gray-600 truncate">{j.jogo}</p>}
                          </div>
                          {isAtual
                            ? <span className="text-[10px] font-black text-green-400 flex-shrink-0">AGORA</span>
                            : (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button onClick={() => { setEditingId(j.id); setEditNome(j.nome); setEditJogo(j.jogo); }}
                                  className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-600 hover:text-amber-400 hover:bg-amber-500/10 transition-colors text-xs"
                                  title="Editar">✏️</button>
                                <button onClick={() => post({ action: "remove-jogador", id: j.id })}
                                  className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs"
                                  title="Remover">✕</button>
                              </div>
                            )
                          }
                        </div>
                      )}
                    </div>
                  );
                })}
              {restantes === 0 && <p className="text-xs text-gray-700 text-center py-3">Todos jogaram!</p>}
            </div>
        </div>{/* ════ fim COLUNA ESQUERDA ════ */}

        {/* ════ COLUNA DIREITA — Placar ao Vivo ════ */}
        <div className="order-3 rounded-2xl border border-white/10 p-5" style={{ background: "rgba(8,10,20,0.97)", backdropFilter: "blur(12px)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">🏆 Placar ao Vivo</p>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">{sorted.length}</span>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {sorted.map((j, i) => (
                <div key={j.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                  style={{
                    background: i === 0 ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${i === 0 ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.05)"}`,
                  }}>
                  {i === 0 && <span className="text-xs flex-shrink-0">🏆</span>}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{j.nome}</p>
                    {j.jogo && <p className="text-[11px] text-gray-600 truncate">{j.jogo}</p>}
                  </div>
                  {editValorId === j.id ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <input
                        value={editValor} onChange={e => setEditValor(e.target.value)}
                        className="w-24 bg-white/5 border border-[#f59e0b]/50 rounded-lg px-2 py-1 text-white text-xs focus:outline-none"
                        placeholder="0,00"
                        autoFocus
                      />
                      <button
                        onClick={async () => {
                          await post({ action: "edit-valor", id: j.id, valor: editValor });
                          setEditValorId(null);
                        }}
                        className="px-2 py-1 rounded-lg text-[10px] font-black text-black"
                        style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)" }}
                      >✓</button>
                      <button onClick={() => setEditValorId(null)} className="text-gray-600 hover:text-white text-xs transition-colors">✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <p className="font-black tabular-nums text-sm" style={{ color: i === 0 ? "#f59e0b" : "#22c55e" }}>
                        R$ {j.valor!.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      <button
                        onClick={() => { setEditValorId(j.id); setEditValor(String(j.valor)); }}
                        className="text-gray-600 hover:text-amber-400 transition-colors text-xs"
                        title="Editar valor"
                      >✏️</button>
                    </div>
                  )}
                </div>
              ))}
              {sorted.length === 0 && <p className="text-xs text-gray-700 text-center py-3">Aguardando resultados...</p>}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admins";
import type { Sorteio, Participante } from "@/lib/sorteio-store";
import { useToast, ToastContainer } from "@/components/toast";
import { useConfirm } from "@/components/confirm-modal";

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

export default function AdminSorteioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  // view=criar → formulário de criação | default → sorteios ativos
  const view = searchParams.get("view") ?? "ativo";

  const { toasts, toast, dismiss } = useToast();
  const { confirm, ConfirmModal } = useConfirm();
  const [sorteios, setSorteios] = useState<Sorteio[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ titulo: "", valor: "", minutosTicket: "10", dias: "0", horas: "1", minutos: "0", segundos: "0" });
  const [criando, setCriando] = useState(false);
  const [limpandoHistorico, setLimpandoHistorico] = useState(false);

  const fetchSorteios = useCallback(async () => {
    const res = await fetch("/api/sorteio");
    const data = await res.json();
    setSorteios(data.sorteios ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSorteios();
    const iv = setInterval(fetchSorteios, 3000);
    return () => clearInterval(iv);
  }, [fetchSorteios]);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !isAdmin(session?.user?.twitchLogin)) router.replace("/");
  }, [status, session, router]);

  function formatarValor(v: string): string {
    const t = v.trim();
    const num = Number(t.replace(",", "."));
    if (t !== "" && !isNaN(num) && isFinite(num) && num > 0) {
      return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
    return t;
  }

  function duracaoMsTotal(): number {
    const d = Number(form.dias) || 0;
    const h = Number(form.horas) || 0;
    const m = Number(form.minutos) || 0;
    const s = Number(form.segundos) || 0;
    return ((d * 86400) + (h * 3600) + (m * 60) + s) * 1000;
  }

  async function criar() {
    if (!form.titulo.trim()) return;
    const duracaoMs = duracaoMsTotal();
    if (duracaoMs < 60_000) { toast("A duração mínima é de 1 minuto.", "warning"); return; }
    setCriando(true);
    try {
      const res = await fetch("/api/sorteio", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "criar",
          titulo: form.titulo,
          valor: form.valor,
          minutosTicket: Number(form.minutosTicket),
          duracaoMs,
        }),
      });
      const data = await res.json();
      setSorteios(data.sorteios ?? []);
      setForm({ titulo: "", valor: "", minutosTicket: "10", dias: "0", horas: "1", minutos: "0", segundos: "0" });
      toast("Sorteio criado com sucesso! 🎟️", "success");
      // Redireciona para a view de sorteios ativos
      router.push("/admin/sorteio");
    } catch { toast("Erro ao criar sorteio.", "error"); }
    finally { setCriando(false); }
  }

  async function cancelar(id: string) {
    if (!await confirm("Remover este sorteio?", { confirmLabel: "Remover", danger: true })) return;
    try {
      const res = await fetch("/api/sorteio", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancelar", id }),
      });
      const data = await res.json();
      setSorteios(data.sorteios ?? []);
      toast("Sorteio removido.", "warning");
    } catch { toast("Erro ao remover sorteio.", "error"); }
  }

  async function limparHistorico() {
    if (finalizados.length === 0 || limpandoHistorico) return;
    if (!await confirm("Limpar todo o histórico de sorteios finalizados?", { confirmLabel: "Limpar", danger: true })) return;

    setLimpandoHistorico(true);
    try {
      const res = await fetch("/api/sorteio", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "limpar-historico" }),
      });
      if (!res.ok) throw new Error("Erro ao limpar histórico");
      const data = await res.json();
      setSorteios(data.sorteios ?? []);
      toast("Histórico de sorteios limpo.", "warning");
    } catch {
      toast("Erro ao limpar histórico.", "error");
    } finally {
      setLimpandoHistorico(false);
    }
  }

  const ativos = sorteios.filter(s => s.status === "ativo" || s.status === "pronto");
  const finalizados = sorteios.filter(s => s.status === "finalizado");

  if (status === "loading" || loading) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#ffba00] border-t-transparent animate-spin" />
    </div>;
  }

  return (
    <div className="page-enter relative min-h-[calc(100vh-4rem)]">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      {ConfirmModal}
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-12 pb-24 space-y-5">

        {/* ── VIEW: CRIAR SORTEIO ── */}
        {view === "criar" && (
          <>
            <div>
              <h1 className="text-3xl font-black text-white">Criar Sorteio</h1>
              <p className="text-sm text-gray-600 mt-1">Configure e lance um novo sorteio para sua live</p>
            </div>
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(6,15,9,0.92)", border: "1px solid rgba(255,186,0,0.2)", backdropFilter: "blur(20px)", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
              <div className="px-5 py-4 border-b border-white/5">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Novo sorteio</p>
              </div>
              <div className="p-5 space-y-3">
                <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Título do sorteio"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white font-semibold focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                  onFocus={e => (e.target.style.borderColor = "rgba(255,186,0,0.5)")}
                  onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
                <input value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                  placeholder="Premiação (ex: R$ 100, iPhone 15...)"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white font-semibold focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                  onFocus={e => (e.target.style.borderColor = "rgba(255,186,0,0.5)")}
                  onBlur={e => {
                    e.target.style.borderColor = "rgba(255,255,255,0.1)";
                    setForm(f => ({ ...f, valor: formatarValor(f.valor) }));
                  }} />
                {/* Duração do sorteio — dias / horas / minutos / segundos */}
                <div>
                  <label className="text-[10px] text-gray-600 font-bold uppercase tracking-wide block mb-1.5">Duração do sorteio</label>
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      { key: "dias",     label: "Dias" },
                      { key: "horas",    label: "Horas" },
                      { key: "minutos",  label: "Min" },
                      { key: "segundos", label: "Seg" },
                    ] as const).map(u => (
                      <div key={u.key}>
                        <input type="number" min="0" value={form[u.key]}
                          onChange={e => setForm(f => ({ ...f, [u.key]: e.target.value }))}
                          className="w-full px-2 py-3 rounded-xl text-sm text-white font-black text-center focus:outline-none"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
                        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-wide text-center mt-1">{u.label}</p>
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const total = duracaoMsTotal();
                    if (total < 60_000) return <p className="text-[10px] text-yellow-500 mt-1.5">Mínimo de 1 minuto.</p>;
                    const d = Math.floor(total / 86400000);
                    const h = Math.floor((total % 86400000) / 3600000);
                    const m = Math.floor((total % 3600000) / 60000);
                    const s = Math.floor((total % 60000) / 1000);
                    const partes = [d && `${d}d`, h && `${h}h`, m && `${m}min`, s && `${s}s`].filter(Boolean).join(" ");
                    return <p className="text-[10px] text-gray-500 mt-1.5">Encerra em <strong className="text-[#ffba00]">{partes}</strong></p>;
                  })()}
                </div>

                {/* Ticket a cada X minutos */}
                <div>
                  <label className="text-[10px] text-gray-600 font-bold uppercase tracking-wide block mb-1">Ticket a cada X minutos</label>
                  <input type="number" min="1" value={form.minutosTicket}
                    onChange={e => setForm(f => ({ ...f, minutosTicket: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white font-semibold focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
                </div>
                <button onClick={criar} disabled={criando || !form.titulo.trim()}
                  className="w-full py-3.5 rounded-xl font-black text-sm text-black disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-100"
                  style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)", boxShadow: "0 4px 20px rgba(255,186,0,0.25)" }}>
                  {criando ? "Criando..." : "🎟️ Criar Sorteio"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── VIEW: SORTEIOS ATIVOS (default) ── */}
        {view !== "criar" && (
          <>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-3xl font-black text-white">Sorteio Ativo</h1>
                <p className="text-sm text-gray-600 mt-1">Sorteios em andamento na sua live</p>
              </div>
              <Link href="/admin/sorteio?view=criar"
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm text-black transition-all hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
                + Criar Sorteio
              </Link>
            </div>

            {ativos.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Em andamento ({ativos.length})</p>
                {ativos.map(s => (
                  <SorteioCard key={s.id} s={s} onCancelar={() => cancelar(s.id)} />
                ))}
              </div>
            )}

            {ativos.length === 0 && (
              <div className="text-center py-16 rounded-2xl"
                style={{ background: "rgba(6,15,9,0.7)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                  style={{ background: "rgba(255,186,0,0.08)", border: "1px solid rgba(255,186,0,0.2)" }}>
                  <span className="text-3xl">🎟️</span>
                </div>
                <h3 className="text-base font-black text-white mb-1">Nenhum sorteio ativo</h3>
                <p className="text-gray-500 text-sm mb-4">Crie um sorteio para sua live e deixe o chat participar!</p>
                <Link href="/admin/sorteio?view=criar"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm text-black transition-all hover:scale-[1.03]"
                  style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
                  + Criar Sorteio
                </Link>
              </div>
            )}
          </>
        )}

        {finalizados.length > 0 && (
          <HistoricoAcordeon
            finalizados={finalizados}
            onCancelar={cancelar}
            onLimpar={limparHistorico}
            limpando={limpandoHistorico}
          />
        )}
      </div>
    </div>
  );
}

function HistoricoAcordeon({ finalizados, onCancelar, onLimpar, limpando }: {
  finalizados: Sorteio[];
  onCancelar: (id: string) => void;
  onLimpar: () => void;
  limpando: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(8,20,12,0.7)", border: "1px solid rgba(255,186,0,0.12)", backdropFilter: "blur(12px)" }}>
      <button
        onClick={() => setAberto(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span className="text-base">🏆</span>
        <span className="text-sm font-black text-white flex-1">Histórico de Sorteios</span>
        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold"
          style={{ background: "rgba(255,186,0,0.1)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.25)" }}>
          {finalizados.length}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onLimpar(); }}
          disabled={limpando}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-black text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
          style={{ border: "1px solid rgba(239,68,68,0.24)" }}
        >
          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.75 1A1.75 1.75 0 007 2.75V3H4.25a.75.75 0 000 1.5H5v11.75A2.75 2.75 0 007.75 19h4.5A2.75 2.75 0 0015 16.25V4.5h.75a.75.75 0 000-1.5H13v-.25A1.75 1.75 0 0011.25 1h-2.5zM8.5 3v-.25a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V3h-3zM8.75 7.5a.75.75 0 00-1.5 0v7a.75.75 0 001.5 0v-7zm4 0a.75.75 0 00-1.5 0v7a.75.75 0 001.5 0v-7z" clipRule="evenodd" />
          </svg>
          {limpando ? "Limpando..." : "Limpar histórico"}
        </button>
        <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 flex-shrink-0 ${aberto ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {aberto && (
        <div className="border-t border-white/5">
          {finalizados.map((s, idx) => (
            <div key={s.id}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.025]"
              style={{ borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{ background: "rgba(255,186,0,0.1)", border: "1px solid rgba(255,186,0,0.2)" }}>
                🏆
              </div>
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Título</p>
                    <p className="text-sm font-black text-white truncate leading-tight">{s.titulo}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Premiação</p>
                    {s.valor
                      ? <p className="text-sm font-black truncate leading-tight" style={{
                          background: "linear-gradient(90deg,#ffba00,#ffdd55)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}>{s.valor}</p>
                      : <p className="text-sm font-black text-gray-600 leading-tight">—</p>
                    }
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {s.vencedor && (
                  <div className="flex items-center gap-2.5">
                    {s.vencedor.image
                      ? <img src={s.vencedor.image} alt={s.vencedor.displayName}
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-[#ffba00]/30" />
                      : <div className="w-8 h-8 rounded-full bg-[#ffba00]/10 border border-[#ffba00]/20 flex items-center justify-center">
                          <span className="text-xs font-black text-[#ffba00]">{s.vencedor.displayName[0].toUpperCase()}</span>
                        </div>
                    }
                    <div>
                      <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest leading-none mb-0.5">Vencedor</p>
                      <p className="text-xs font-black text-white leading-tight">{s.vencedor.displayName}</p>
                    </div>
                  </div>
                )}
                <button onClick={() => onCancelar(s.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SorteioCard({ s, onCancelar }: {
  s: Sorteio; onCancelar: () => void;
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: s.status === "finalizado" ? "rgba(255,255,255,0.02)" : "rgba(255,186,0,0.05)", border: `1px solid ${s.status === "finalizado" ? "rgba(255,255,255,0.07)" : "rgba(255,186,0,0.2)"}` }}>
      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-white/5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.status === "finalizado" ? "#6b7280" : s.status === "pronto" ? "#22c55e" : "#ffba00", boxShadow: s.status === "ativo" ? "0 0 6px #ffba00" : "none" }} />
        <span className="text-[11px] font-black uppercase tracking-widest"
          style={{ color: s.status === "finalizado" ? "#6b7280" : s.status === "pronto" ? "#22c55e" : "#ffba00" }}>
          {s.status === "ativo" ? "Ativo" : s.status === "pronto" ? "Pronto para sortear" : "Finalizado"}
        </span>
        {s.status === "ativo" && (
          <span className="ml-auto text-xs font-black text-white font-mono">
            <Countdown endsAt={s.iniciadoEm + s.duracaoMs} />
          </span>
        )}
      </div>
      <div className="px-5 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="font-black text-white truncate">{s.titulo}</p>
          {s.valor && <p className="text-sm font-black" style={{ color: "#ffba00" }}>{s.valor}</p>}
          <p className="text-[11px] text-gray-600 mt-0.5">{s.participantes.length} participantes · {s.participantes.reduce((a: number, p: Participante) => a + p.tickets, 0)} tickets</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {s.status !== "finalizado" ? (
            <Link href={`/sorteio/${s.id}`}
              className="px-4 py-2 rounded-lg font-black text-xs transition-all hover:scale-[1.03]"
              style={{ background: "rgba(255,186,0,0.12)", border: "1px solid rgba(255,186,0,0.35)", color: "#ffba00" }}>
              👁 Ver sorteio
            </Link>
          ) : s.vencedor ? (
            <span className="text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}>
              🏆 {s.vencedor.displayName}
            </span>
          ) : null}
          <button onClick={onCancelar}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

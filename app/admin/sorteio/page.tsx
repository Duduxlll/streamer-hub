"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admins";
import type { Sorteio, Participante } from "@/app/api/sorteio/route";
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
  const { toasts, toast, dismiss } = useToast();
  const { confirm, ConfirmModal } = useConfirm();
  const [sorteios, setSorteios] = useState<Sorteio[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ titulo: "", valor: "", minutosTicket: "10", duracaoMinutos: "60" });
  const [criando, setCriando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

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

  async function criar() {
    if (!form.titulo.trim()) return;
    setCriando(true);
    try {
      const res = await fetch("/api/sorteio", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "criar", ...form, minutosTicket: Number(form.minutosTicket), duracaoMinutos: Number(form.duracaoMinutos) }),
      });
      const data = await res.json();
      setSorteios(data.sorteios ?? []);
      setForm({ titulo: "", valor: "", minutosTicket: "10", duracaoMinutos: "60" });
      setMostrarForm(false);
      toast("Sorteio criado com sucesso! 🎟️", "success");
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

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest"
            style={{ background: "rgba(255,186,0,0.12)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.35)" }}>
            🎟️ Admin · Sorteio
          </div>
          <button onClick={() => setMostrarForm(f => !f)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm text-black transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
            {mostrarForm ? "✕ Fechar" : "+ Novo Sorteio"}
          </button>
        </div>

        {/* Form criar */}
        {mostrarForm && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-black text-white">Criar Novo Sorteio</h2>
            </div>
            <div className="p-5 space-y-3">
              <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Título do sorteio"
                className="w-full px-4 py-3 rounded-xl text-sm text-white font-semibold focus:outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                onFocus={e => (e.target.style.borderColor = "rgba(255,186,0,0.5)")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
              <input value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                placeholder="Premiação"
                className="w-full px-4 py-3 rounded-xl text-sm text-white font-semibold focus:outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                onFocus={e => (e.target.style.borderColor = "rgba(255,186,0,0.5)")}
                onBlur={e => {
                  e.target.style.borderColor = "rgba(255,255,255,0.1)";
                  setForm(f => ({ ...f, valor: formatarValor(f.valor) }));
                }} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-600 font-bold uppercase tracking-wide block mb-1">Duração (min)</label>
                  <input type="number" min="1" value={form.duracaoMinutos}
                    onChange={e => setForm(f => ({ ...f, duracaoMinutos: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white font-semibold focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 font-bold uppercase tracking-wide block mb-1">Ticket a cada X min</label>
                  <input type="number" min="1" value={form.minutosTicket}
                    onChange={e => setForm(f => ({ ...f, minutosTicket: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white font-semibold focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
                </div>
              </div>
              <button onClick={criar} disabled={criando || !form.titulo.trim()}
                className="w-full py-3.5 rounded-xl font-black text-sm text-black disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
                {criando ? "Criando..." : "🎟️ Criar Sorteio"}
              </button>
            </div>
          </div>
        )}

        {/* Sorteios ativos */}
        {ativos.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Sorteios Ativos ({ativos.length})</p>
            {ativos.map(s => (
              <SorteioCard key={s.id} s={s} onCancelar={() => cancelar(s.id)} />
            ))}
          </div>
        )}

        {/* Finalizados */}
        {finalizados.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Finalizados ({finalizados.length})</p>
            {finalizados.map(s => (
              <SorteioCard key={s.id} s={s} onCancelar={() => cancelar(s.id)} />
            ))}
          </div>
        )}

        {sorteios.length === 0 && !mostrarForm && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🎟️</p>
            <p className="text-gray-500 text-sm">Nenhum sorteio criado ainda.</p>
          </div>
        )}
      </div>
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

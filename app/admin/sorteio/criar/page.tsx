"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admins";
import { useToast, ToastContainer } from "@/components/toast";

export default function CriarSorteioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toasts, toast, dismiss } = useToast();

  const [form, setForm] = useState({ titulo: "", valor: "", minutosTicket: "10", dias: "0", horas: "1", minutos: "0", segundos: "0" });
  const [criando, setCriando] = useState(false);

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
      if (!res.ok) throw new Error();
      toast("Sorteio criado com sucesso! 🎟️", "success");
      // Rota separada → navegação limpa para a lista de sorteios ativos
      router.push("/admin/sorteio");
      router.refresh();
    } catch { toast("Erro ao criar sorteio.", "error"); setCriando(false); }
  }

  if (status === "loading") {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#ffba00] border-t-transparent animate-spin" />
    </div>;
  }

  return (
    <div className="page-enter relative min-h-[calc(100vh-4rem)]">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-12 pb-24 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-black text-white">Criar Sorteio</h1>
            <p className="text-sm text-gray-600 mt-1">Configure e lance um novo sorteio para sua live</p>
          </div>
          <Link href="/admin/sorteio"
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm transition-all hover:bg-white/5"
            style={{ color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)" }}>
            ← Sorteios ativos
          </Link>
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
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admins";
import type { Sorteio } from "@/app/api/sorteio/route";

function Countdown({ endsAt }: { endsAt: number }) {
  const [left, setLeft] = useState(Math.max(0, endsAt - Date.now()));
  useEffect(() => {
    const iv = setInterval(() => setLeft(Math.max(0, endsAt - Date.now())), 500);
    return () => clearInterval(iv);
  }, [endsAt]);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1_000);
  const fmt = (n: number) => String(n).padStart(2, "0");
  return <span className="font-mono">{fmt(m)}:{fmt(s)}</span>;
}

function SorteioCard({ s }: { s: Sorteio }) {
  const totalTickets = s.participantes.reduce((a, p) => a + p.tickets, 0);
  const pronto = s.status === "pronto";

  return (
    <div className="rounded-2xl overflow-hidden transition-all hover:scale-[1.01]"
      style={{ background: "rgba(8,6,20,0.75)", border: "1px solid rgba(255,186,0,0.22)", backdropFilter: "blur(12px)" }}>
      <div className="flex items-center gap-2.5 px-5 py-2.5 border-b border-white/5">
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffba00] opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ffba00]" />
        </span>
        <span className="text-[11px] font-black text-[#ffba00] uppercase tracking-widest flex-1">
          {pronto ? "Pronto para sortear" : "Sorteio ao Vivo"}
        </span>
        {!pronto && (
          <span className="text-sm font-black text-white font-mono">
            <Countdown endsAt={s.iniciadoEm + s.duracaoMs} />
          </span>
        )}
      </div>
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Título</p>
            <p className="font-black text-white text-lg truncate">{s.titulo}</p>
          </div>
          {s.valor && (
            <div>
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Premiação</p>
              <p className="text-base font-black" style={{
                background: "linear-gradient(135deg, #ffba00, #ffdd55)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>{s.valor}</p>
            </div>
          )}
          <p className="text-[11px] text-gray-600">
            {s.participantes.length} participantes · {totalTickets} tickets
          </p>
        </div>
        <Link href={`/sorteio/${s.id}`}
          className="flex-shrink-0 px-5 py-3 rounded-xl font-black text-sm text-black transition-all hover:scale-[1.04] active:scale-95"
          style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
          Acessar
        </Link>
      </div>
    </div>
  );
}

export default function SorteioListPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const admin = isAdmin((session?.user as { twitchLogin?: string })?.twitchLogin);
  const [sorteios, setSorteios] = useState<Sorteio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && admin) {
      router.replace("/admin/sorteio");
    }
  }, [status, admin, router]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/sorteio");
      const data = await res.json();
      setSorteios(data.sorteios ?? []);
      setLoading(false);
    };
    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, []);

  const ativos = sorteios.filter(s => s.status === "ativo" || s.status === "pronto");
  const finalizados = sorteios.filter(s => s.status === "finalizado");
  const [historicoAberto, setHistoricoAberto] = useState(false);

  if (loading || status === "loading" || (status === "authenticated" && admin)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#ffba00] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-enter relative min-h-[calc(100vh-4rem)]">
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-14 pb-24 space-y-5">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Link href="/" className="hover:text-gray-400 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-gray-400">Sorteio</span>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-white">Sorteios</h1>
          <p className="text-sm text-gray-500 mt-1">Participe dos sorteios ativos na live</p>
        </div>

        {ativos.length === 0 ? (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6"
              style={{ background: "rgba(255,186,0,0.08)", border: "1px solid rgba(255,186,0,0.2)" }}>
              <span className="text-4xl">🎟️</span>
            </div>
            <h2 className="text-xl font-black text-white mb-2">Nenhum sorteio ativo</h2>
            <p className="text-gray-500 text-sm">Fique de olho! Em breve um novo sorteio será lançado na live.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ativos.map(s => <SorteioCard key={s.id} s={s} />)}
          </div>
        )}

        {/* Histórico */}
        {finalizados.length > 0 && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(8,6,20,0.65)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}>
            <button
              onClick={() => setHistoricoAberto(o => !o)}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/3"
            >
              <span className="text-sm font-black text-white flex-1">Histórico de Sorteios</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.08)" }}>
                {finalizados.length}
              </span>
              <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${historicoAberto ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {historicoAberto && (
              <div className="border-t border-white/5 divide-y divide-white/5">
                {finalizados.map(s => (
                  <div key={s.id} className="px-5 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div>
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Título</p>
                        <p className="text-sm font-black text-white truncate">{s.titulo}</p>
                      </div>
                      {s.valor && (
                        <div>
                          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Premiação</p>
                          <p className="text-sm font-black" style={{ color: "#ffba00" }}>{s.valor}</p>
                        </div>
                      )}
                    </div>
                    {s.vencedor && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {s.vencedor.image && (
                          <img src={s.vencedor.image} alt={s.vencedor.displayName}
                            className="w-7 h-7 rounded-full object-cover border border-[#ffba00]/40" />
                        )}
                        <div className="text-right">
                          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Vencedor</p>
                          <p className="text-xs font-black text-white">{s.vencedor.displayName}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

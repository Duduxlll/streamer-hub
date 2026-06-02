"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admins";
import type { Sorteio } from "@/lib/sorteio-store";

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

function HistoricoSorteios({ sorteios: lista, onLimpar, limpando }: {
  sorteios: Sorteio[];
  onLimpar?: () => void;
  limpando?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(8,6,20,0.7)", border: "1px solid rgba(255,186,0,0.12)", backdropFilter: "blur(12px)" }}>
      <button
        onClick={() => setAberto(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span className="text-base">🏆</span>
        <span className="text-sm font-black text-white flex-1">Histórico de Sorteios</span>
        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold"
          style={{ background: "rgba(255,186,0,0.1)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.25)" }}>
          {lista.length}
        </span>
        {onLimpar && (
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
        )}
        <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 flex-shrink-0 ${aberto ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {aberto && (
        <div className="border-t border-white/5">
          {lista.map((s, idx) => (
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
              {s.vencedor && (
                <div className="flex items-center gap-2.5 flex-shrink-0">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
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

  if (loading || status === "loading") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#ffba00] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-enter relative min-h-[calc(100vh-4rem)]">
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-14 pb-24 space-y-5">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Link href="/" className="hover:text-gray-400 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-gray-400">Sorteio</span>
        </div>
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
        {finalizados.length > 0 && (
          <HistoricoSorteios sorteios={finalizados} />
        )}

      </div>
    </div>
  );
}

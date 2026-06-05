"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PlayerAvatar from "@/components/PlayerAvatar";
import type { CallState } from "@/lib/callStore";

const C = "#22c55e";

const CSS = `
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0);   }
  }
  @keyframes pulse-cyan {
    0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.35); }
    50%      { box-shadow: 0 0 0 8px rgba(34,197,94,0);  }
  }
`;

export default function ArenaCallPage() {
  const [call, setCall] = useState<CallState | null>(null);

  const fetchCall = useCallback(async () => {
    try {
      const res = await fetch("/api/call", { cache: "no-store" });
      if (res.ok) setCall(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchCall(); }, [fetchCall]);
  useEffect(() => {
    const iv = setInterval(fetchCall, 3000);
    return () => clearInterval(iv);
  }, [fetchCall]);

  const aberta = call?.status === "aberta";
  const entries = call?.entries ?? [];

  return (
    <div className="page-enter relative min-h-[calc(100vh-4rem)]">
      <style>{CSS}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.03]"
          style={{ background: `radial-gradient(ellipse, ${C}, transparent 70%)`, filter: "blur(80px)" }}
        />
      </div>

      <div className="relative max-w-xl mx-auto px-4 sm:px-6 pt-14 pb-24 space-y-6">


        <div className="flex items-center gap-2 text-xs text-gray-700">
          <Link href="/arena" className="hover:text-gray-400 transition-colors">← Arena</Link>
          <span>/</span>
          <span className="text-gray-500">Call de Slot</span>
        </div>


        <div>
          <span
            className="text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 mb-3"
            style={{ background: "rgba(34,197,94,0.1)", color: C, border: "1px solid rgba(34,197,94,0.3)" }}
          >
            📋 ARENA
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Call de Slot</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Peça o jogo que quero ver. Quando aberto, use{" "}
            <span className="font-mono text-gray-300">!call [nome do jogo]</span> no chat.
          </p>
        </div>


        <div>
          {call === null ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black text-gray-600"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-4 h-4 rounded-full border border-gray-600 border-t-transparent animate-spin" />
              Carregando...
            </div>
          ) : aberta ? (
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black"
              style={{ background: "rgba(34,197,94,0.1)", color: C, border: "1px solid rgba(34,197,94,0.35)", animation: "pulse-cyan 2s infinite" }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: C }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: C }} />
              </span>
              ABERTA · {entries.length} call{entries.length !== 1 ? "s" : ""}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black text-gray-600"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="w-2 h-2 rounded-full bg-gray-700" />
              FECHADA
            </div>
          )}
        </div>


        {call !== null && !aberta && (

          <div
            className="rounded-3xl text-center py-20 px-6"
            style={{ background: "rgba(6,16,10,0.97)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div
              className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6"
              style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.12)" }}
            >
              <span className="text-4xl">📋</span>
            </div>
            <h2 className="text-lg font-black text-white mb-2">Nenhuma call aberta agora</h2>
            <p className="text-sm text-gray-600 max-w-xs mx-auto">
              Quando o streamer abrir a call, aparecerá aqui o comando para você enviar o jogo que quer ver.
            </p>
          </div>
        )}

        {call !== null && aberta && (

          <div className="space-y-4">

            <div
              className="rounded-2xl px-5 py-5"
              style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.22)" }}
            >
              <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: C }}>
                Comando ativo no chat
              </p>
              <p className="font-black font-mono text-xl text-white">!call [nome do jogo]</p>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Digite esse comando no chat da Twitch com o nome do jogo que você quer ver.
                Cada pessoa pode enviar <strong className="text-gray-400">apenas 1 call</strong>.
              </p>
            </div>


            <div
              className="rounded-3xl overflow-hidden"
              style={{ background: "rgba(6,16,10,0.97)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex-1">
                  Calls recebidas
                </p>
                <span
                  className="text-[10px] font-black px-2.5 py-0.5 rounded-full"
                  style={{ background: "rgba(34,197,94,0.1)", color: C, border: "1px solid rgba(34,197,94,0.25)" }}
                >
                  {entries.length}
                </span>
              </div>

              <div className="p-4">
                {entries.length === 0 ? (
                  <div className="text-center py-14">
                    <p className="text-3xl mb-3">💬</p>
                    <p className="text-sm font-black text-gray-600">Aguardando calls...</p>
                    <p className="text-xs text-gray-700 mt-1">
                      Seja o primeiro! Digite{" "}
                      <span className="font-mono">!call [jogo]</span> no chat.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {entries.map((e, i) => (
                      <div
                        key={e.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                        style={{
                          background: "rgba(34,197,94,0.03)",
                          border: "1px solid rgba(34,197,94,0.12)",
                          animation: "slideUp 0.3s ease-out both",
                          animationDelay: `${i * 0.04}s`,
                        }}
                      >
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-[11px] flex-shrink-0"
                          style={{ background: "rgba(34,197,94,0.1)", color: C, border: "1px solid rgba(34,197,94,0.2)" }}
                        >
                          {i + 1}
                        </div>
                        <PlayerAvatar image={e.image} name={e.displayName} size={32} color={C} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 font-semibold truncate">{e.displayName} · @{e.username}</p>
                          <p className="text-sm font-black text-white truncate leading-tight">{e.jogo}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>


            <p className="text-center text-xs text-gray-700 px-4">
              A lista é atualizada automaticamente · Acompanhe ao vivo
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

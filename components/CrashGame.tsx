"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ParticipanteSessao } from "@/lib/gorjeta-store";

// ── Parâmetros do jogo (fáceis de ajustar) ──────────────────────────────────
const MAX_MULT        = 4;      // teto do multiplicador
const GROWTH_PER_SEC  = 1.45;   // ~45% por segundo (composto) — sobe acelerando
const AZAR_PROB       = 0.10;   // chance de estourar cedo (azar)
const AZAR_MAX        = 1.30;   // limite do estouro de azar
const CURVE_EXP       = 1.1;    // < menor = mais favorável ao jogador

// Ponto de estouro: favorável ao jogador (mais chance de ganhar que perder),
// teto em 4x e estouro lá embaixo (1.0–1.3) é raro. Oculto do admin.
function gerarCrashPoint(): number {
  const r = Math.random();
  if (r < AZAR_PROB) return 1 + Math.random() * (AZAR_MAX - 1);
  const u = (r - AZAR_PROB) / (1 - AZAR_PROB);
  const val = AZAR_MAX + (MAX_MULT - AZAR_MAX) * Math.pow(u, CURVE_EXP);
  return Math.min(MAX_MULT, Math.round(val * 100) / 100);
}

function fmtBRL(v: number) { return v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }); }

function corMult(m: number): string {
  if (m < 1.5) return "#4ade80";
  if (m < 2.5) return "#ffba00";
  if (m < 3.3) return "#ff8c00";
  return "#f87171";
}

export function CrashGame({ participante, aposta, teto, saldoRestante, onEnviar, onClose }: {
  participante: ParticipanteSessao;
  aposta: number;
  teto?: number;
  saldoRestante: number;
  onEnviar: (valor: number, modo: "auto" | "fila") => Promise<boolean>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"playing" | "win" | "bust">("playing");
  const [mult, setMult]   = useState(1);
  const [ganho, setGanho] = useState(0);
  const [enviando, setEnviando] = useState<"" | "auto" | "fila">("");
  const [enviado, setEnviado]   = useState<"auto" | "fila" | "">("");

  const crashPointRef = useRef(1);
  const multRef = useRef(1);
  const rafRef  = useRef(0);
  const lastRef = useRef(0);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const startRound = useCallback(() => {
    stop();
    crashPointRef.current = gerarCrashPoint();
    multRef.current = 1;
    setMult(1); setGanho(0); setEnviado(""); setEnviando("");
    setPhase("playing");
    lastRef.current = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - lastRef.current) / 1000);
      lastRef.current = now;
      let m = multRef.current * Math.pow(GROWTH_PER_SEC, dt);
      if (m >= crashPointRef.current) {
        m = crashPointRef.current;
        multRef.current = m; setMult(m);
        setPhase("bust"); stop(); return;
      }
      multRef.current = m; setMult(m);
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [stop]);

  useEffect(() => { startRound(); return stop; }, [startRound, stop]);

  function tirar() {
    if (phase !== "playing") return;
    stop();
    const m = multRef.current;
    let g = aposta * m;
    if (teto && teto > 0) g = Math.min(g, teto);
    g = Math.min(g, saldoRestante);
    g = Math.round(g * 100) / 100;
    setMult(m); setGanho(g); setPhase("win");
  }

  async function enviar(modo: "auto" | "fila") {
    if (enviado || enviando) return;
    setEnviando(modo);
    const ok = await onEnviar(ganho, modo);
    setEnviando("");
    if (ok) setEnviado(modo);
  }

  const progresso = Math.min(1, (mult - 1) / (MAX_MULT - 1));
  const cor = corMult(mult);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
      <div className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: "rgba(6,17,10,0.98)", border: `1px solid ${phase === "bust" ? "rgba(248,113,113,0.4)" : "rgba(255,186,0,0.3)"}`, boxShadow: `0 0 80px ${phase === "bust" ? "rgba(248,113,113,0.12)" : "rgba(255,186,0,0.1)"}` }}>

        {/* Header */}
        <div className="px-5 py-3.5 flex items-center gap-3 border-b border-white/5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-black text-[#ffba00]"
            style={{ background: "rgba(255,186,0,0.12)", border: "2px solid rgba(255,186,0,0.25)", overflow: "hidden" }}>
            {participante.image
              ? <img src={participante.image} alt="" className="w-full h-full object-cover rounded-full" />
              : (participante.displayName[0]?.toUpperCase())}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white truncate">{participante.displayName}</p>
            <p className="text-[10px] text-gray-600">Aposta: <span className="text-[#ffba00] font-black">R$ {fmtBRL(aposta)}</span></p>
          </div>
          <button onClick={() => { stop(); onClose(); }} className="text-gray-600 hover:text-white text-lg transition-colors">✕</button>
        </div>

        {/* Tela do jogo */}
        <div className="relative px-5 pt-6 pb-5 overflow-hidden" style={{ height: 230 }}>
          {/* grid de fundo */}
          <div aria-hidden className="absolute inset-0 opacity-30"
            style={{ backgroundImage: "linear-gradient(rgba(255,186,0,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,186,0,0.06) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />

          {/* foguete subindo */}
          {phase !== "bust" && (
            <div aria-hidden className="absolute text-3xl transition-none"
              style={{ left: `${8 + progresso * 78}%`, bottom: `${14 + progresso * 64}%`, transform: "rotate(-30deg)", filter: `drop-shadow(0 0 10px ${cor})` }}>
              🚀
            </div>
          )}
          {phase === "bust" && (
            <div aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl"
              style={{ animation: "crashBoom 0.4s ease-out" }}>💥</div>
          )}

          {/* Multiplicador */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center">
            <p className="text-6xl font-black tabular-nums"
              style={{ color: phase === "bust" ? "#f87171" : cor, textShadow: `0 0 30px ${phase === "bust" ? "rgba(248,113,113,0.5)" : cor + "55"}`, transition: "color 0.2s" }}>
              {mult.toFixed(2)}x
            </p>
            {phase === "playing" && <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mt-2 animate-pulse">Subindo...</p>}
            {phase === "bust" && <p className="text-sm font-black text-red-400 uppercase tracking-widest mt-2">💥 Estourou!</p>}
            {phase === "win" && (
              <div className="mt-2 text-center">
                <p className="text-[11px] font-black text-green-400 uppercase tracking-widest">Tirou em {mult.toFixed(2)}x</p>
                <p className="text-2xl font-black text-white mt-1">Ganhou <span className="text-green-400">R$ {fmtBRL(ganho)}</span></p>
              </div>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="px-5 pb-5 pt-1 space-y-2 border-t border-white/5">
          {phase === "playing" && (
            <button onClick={tirar}
              className="w-full py-4 rounded-2xl font-black text-base text-black transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)", boxShadow: "0 4px 24px rgba(34,197,94,0.4)" }}>
              💰 TIRAR em {mult.toFixed(2)}x
            </button>
          )}

          {phase === "bust" && (
            <>
              <p className="text-center text-xs text-gray-500 pb-1">Não deu dessa vez. O aviãozinho fugiu! 🫠</p>
              <button onClick={startRound}
                className="w-full py-3 rounded-2xl font-black text-sm text-black transition-all hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
                🔁 Jogar +1
              </button>
              <button onClick={() => { stop(); onClose(); }}
                className="w-full py-2.5 rounded-2xl font-black text-xs transition-all hover:bg-white/5"
                style={{ color: "#6b7280", border: "1px solid rgba(255,255,255,0.06)" }}>
                Fechar
              </button>
            </>
          )}

          {phase === "win" && (
            <>
              {enviado ? (
                <div className="text-center py-2 text-sm font-black text-green-400">
                  ✓ {enviado === "auto" ? "PIX enviado!" : "Adicionado à fila de pagamentos!"}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => enviar("auto")} disabled={!!enviando}
                    className="py-3 rounded-2xl font-black text-xs text-black transition-all hover:scale-[1.02] disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)" }}>
                    {enviando === "auto" ? "..." : "⚡ Enviar PIX"}
                  </button>
                  <button onClick={() => enviar("fila")} disabled={!!enviando}
                    className="py-3 rounded-2xl font-black text-xs text-black transition-all hover:scale-[1.02] disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
                    {enviando === "fila" ? "..." : "💳 Pra fila"}
                  </button>
                </div>
              )}
              <button onClick={startRound}
                className="w-full py-2.5 rounded-2xl font-black text-xs transition-all hover:bg-white/5"
                style={{ color: "#ffba00", border: "1px solid rgba(255,186,0,0.25)" }}>
                🔁 Jogar +1 (mesma aposta)
              </button>
              <button onClick={() => { stop(); onClose(); }}
                className="w-full py-2 rounded-2xl font-black text-xs transition-all hover:bg-white/5"
                style={{ color: "#6b7280" }}>
                Fechar
              </button>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes crashBoom { 0% { transform:translate(-50%,-50%) scale(0.3); opacity:0; } 60% { transform:translate(-50%,-50%) scale(1.3); opacity:1; } 100% { transform:translate(-50%,-50%) scale(1); opacity:1; } }`}</style>
    </div>
  );
}

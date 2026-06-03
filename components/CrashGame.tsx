"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ParticipanteSessao } from "@/lib/gorjeta-store";

// ── Parâmetros do jogo (fáceis de ajustar) ──────────────────────────────────
const MAX_MULT       = 4;       // teto do multiplicador
const GROWTH_PER_SEC = 1.14;    // ~14% por segundo (composto) — sobe BEM devagar e acelera
//  2x ≈ 5.3s · 3x ≈ 8.4s · 4x ≈ 10.6s

// Ponto de estouro. `streak` = quantas rodadas encadeadas (jogar +1 apostando o ganho).
// Quanto maior o streak, MAIS difícil (mais chance de estourar cedo) — protege o bolso.
function gerarCrashPoint(streak: number): number {
  const azar = Math.min(0.62, 0.10 + streak * 0.16);   // streak 0:10% · 1:26% · 2:42% · 3:58%
  const r = Math.random();
  if (r < azar) return Math.round((1 + Math.random() * 0.30) * 100) / 100; // estoura 1.00–1.30
  const u   = (r - azar) / (1 - azar);
  const exp = 1.1 + streak * 0.28;                       // curva endurece com o streak
  const val = 1.30 + (MAX_MULT - 1.30) * Math.pow(u, exp);
  return Math.min(MAX_MULT, Math.round(val * 100) / 100);
}

function fmtBRL(v: number) { return v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }); }
function corMult(m: number): string {
  if (m < 1.5) return "#4ade80";
  if (m < 2.5) return "#ffba00";
  if (m < 3.3) return "#ff8c00";
  return "#f87171";
}

interface Pt { t: number; m: number; }

export function CrashGame({ participante, aposta, teto, saldoRestante, onEnviar, onClose }: {
  participante: ParticipanteSessao;
  aposta: number;
  teto?: number;
  saldoRestante: number;
  onEnviar: (valor: number, modo: "auto" | "fila") => Promise<boolean>;
  onClose: () => void;
}) {
  const [phase, setPhase]       = useState<"playing" | "win" | "bust">("playing");
  const [mult, setMult]         = useState(1);
  const [apostaRound, setApostaRound] = useState(aposta);
  const [streak, setStreak]     = useState(0);
  const [ganho, setGanho]       = useState(0);
  const [enviando, setEnviando] = useState<"" | "auto" | "fila">("");
  const [enviado, setEnviado]   = useState<"auto" | "fila" | "">("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef   = useRef<HTMLDivElement | null>(null);
  const crashRef  = useRef(1);
  const multRef   = useRef(1);
  const apostaRef = useRef(aposta);
  const ptsRef    = useRef<Pt[]>([]);
  const rafRef    = useRef(0);
  const startRef  = useRef(0);
  const lastRef   = useRef(0);
  const phaseRef  = useRef<"playing" | "win" | "bust">("playing");

  const ganhoPotencial = useCallback((m: number, ap: number) => {
    let g = ap * m;
    if (teto && teto > 0) g = Math.min(g, teto);
    g = Math.min(g, saldoRestante);
    return Math.round(g * 100) / 100;
  }, [teto, saldoRestante]);

  const stop = useCallback(() => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = 0; }, []);

  // ── Desenho do gráfico ──
  const draw = useCallback(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const W = wrap.clientWidth, H = wrap.clientHeight;
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr; canvas.height = H * dpr;
    }
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const pts = ptsRef.current;
    const m   = multRef.current;
    const tNow = pts.length ? pts[pts.length - 1].t : 0;
    const xMax = Math.max(5, tNow * 1.05);
    const yMax = Math.max(1.6, m * 1.18);
    const mapX = (t: number) => 40 + (t / xMax) * (W - 56);
    const mapY = (mm: number) => (H - 30) - ((mm - 1) / (yMax - 1)) * (H - 60);

    // grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = 10 + i * ((H - 40) / 4);
      ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 16, y); ctx.stroke();
    }
    // labels de multiplicador no eixo Y
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.font = "11px system-ui"; ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const frac = 1 - i / 4;
      const val = 1 + frac * (yMax - 1);
      const y = 10 + i * ((H - 40) / 4);
      ctx.fillText(`${val.toFixed(1)}x`, 34, y + 4);
    }

    const cor = phaseRef.current === "bust" ? "#f87171" : corMult(m);

    if (pts.length > 1) {
      // área preenchida
      ctx.beginPath();
      ctx.moveTo(mapX(pts[0].t), mapY(pts[0].m));
      for (const p of pts) ctx.lineTo(mapX(p.t), mapY(p.m));
      ctx.lineTo(mapX(pts[pts.length - 1].t), H - 30);
      ctx.lineTo(mapX(pts[0].t), H - 30);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, cor + "44"); grad.addColorStop(1, cor + "00");
      ctx.fillStyle = grad; ctx.fill();

      // linha da curva
      ctx.beginPath();
      ctx.moveTo(mapX(pts[0].t), mapY(pts[0].m));
      for (const p of pts) ctx.lineTo(mapX(p.t), mapY(p.m));
      ctx.strokeStyle = cor; ctx.lineWidth = 4; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.shadowColor = cor; ctx.shadowBlur = 16; ctx.stroke(); ctx.shadowBlur = 0;
    }

    // aviãozinho / explosão no ponto atual
    const last = pts[pts.length - 1];
    if (last) {
      const x = mapX(last.t), y = mapY(last.m);
      ctx.save();
      ctx.translate(x, y);
      if (phaseRef.current === "bust") {
        ctx.font = "34px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("💥", 0, 0);
      } else {
        ctx.rotate(-0.42);
        ctx.font = "30px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("🚀", 0, 0);
      }
      ctx.restore();
    }
  }, []);

  // ── Loop ──
  const startRound = useCallback((apostaInicial: number, streakNum: number) => {
    stop();
    crashRef.current = gerarCrashPoint(streakNum);
    multRef.current  = 1;
    apostaRef.current = apostaInicial;
    ptsRef.current   = [{ t: 0, m: 1 }];
    startRef.current = performance.now();
    lastRef.current  = startRef.current;
    phaseRef.current = "playing";
    setApostaRound(apostaInicial);
    setStreak(streakNum);
    setMult(1); setGanho(0); setEnviado(""); setEnviando("");
    setPhase("playing");

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - lastRef.current) / 1000);
      lastRef.current = now;
      let m = multRef.current * Math.pow(GROWTH_PER_SEC, dt);
      const t = (now - startRef.current) / 1000;
      if (m >= crashRef.current) {
        m = crashRef.current;
        multRef.current = m; ptsRef.current.push({ t, m });
        phaseRef.current = "bust"; setMult(m); setPhase("bust");
        draw(); stop(); return;
      }
      multRef.current = m; ptsRef.current.push({ t, m });
      if (ptsRef.current.length > 1200) ptsRef.current.shift();
      setMult(m); draw();
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [stop, draw]);

  useEffect(() => {
    startRound(aposta, 0);
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => { stop(); window.removeEventListener("resize", onResize); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tirar() {
    if (phaseRef.current !== "playing") return;
    stop();
    const m = multRef.current;
    phaseRef.current = "win";
    setMult(m); setGanho(ganhoPotencial(m, apostaRef.current)); setPhase("win");
    draw();
  }

  async function enviar(modo: "auto" | "fila") {
    if (enviado || enviando) return;
    setEnviando(modo);
    const ok = await onEnviar(ganho, modo);
    setEnviando("");
    if (ok) setEnviado(modo);
  }

  const potAtual = ganhoPotencial(mult, apostaRound);
  const cor = phase === "bust" ? "#f87171" : corMult(mult);

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-5xl flex flex-col rounded-3xl overflow-hidden"
        style={{ height: "min(92vh, 800px)", background: "rgba(5,14,9,0.99)", border: `1px solid ${phase === "bust" ? "rgba(248,113,113,0.4)" : "rgba(255,186,0,0.3)"}`, boxShadow: `0 0 100px ${phase === "bust" ? "rgba(248,113,113,0.1)" : "rgba(255,186,0,0.08)"}` }}>

        {/* Header */}
        <div className="px-5 py-3.5 flex items-center gap-3 border-b border-white/5 flex-shrink-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-black text-[#ffba00] overflow-hidden"
            style={{ background: "rgba(255,186,0,0.12)", border: "2px solid rgba(255,186,0,0.25)" }}>
            {participante.image ? <img src={participante.image} alt="" className="w-full h-full object-cover" /> : participante.displayName[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white truncate">{participante.displayName}</p>
            <p className="text-[11px] text-gray-500">
              Aposta atual: <span className="text-[#ffba00] font-black">R$ {fmtBRL(apostaRound)}</span>
              {streak > 0 && <span className="ml-2 text-orange-400 font-black">🔥 Rodada {streak + 1} · risco alto</span>}
            </p>
          </div>
          <button onClick={() => { stop(); onClose(); }} className="text-gray-500 hover:text-white text-xl transition-colors">✕</button>
        </div>

        {/* Área do gráfico */}
        <div ref={wrapRef} className="relative flex-1 min-h-0">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

          {/* Multiplicador grande sobreposto */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="font-black tabular-nums leading-none"
              style={{ fontSize: "clamp(3.5rem, 11vw, 8rem)", color: cor, textShadow: `0 0 50px ${cor}66`, transition: "color 0.2s" }}>
              {mult.toFixed(2)}x
            </p>
            {phase === "playing" && (
              <p className="mt-3 text-sm font-black uppercase tracking-[0.3em] text-gray-500">
                Ganho atual: <span style={{ color: cor }}>R$ {fmtBRL(potAtual)}</span>
              </p>
            )}
            {phase === "bust" && <p className="mt-2 text-lg font-black text-red-400 uppercase tracking-widest">💥 Estourou!</p>}
            {phase === "win" && (
              <div className="mt-2 text-center">
                <p className="text-sm font-black text-green-400 uppercase tracking-widest">Tirou em {mult.toFixed(2)}x</p>
                <p className="text-3xl sm:text-4xl font-black text-white mt-1">Ganhou <span className="text-green-400">R$ {fmtBRL(ganho)}</span></p>
              </div>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="px-5 py-4 border-t border-white/5 flex-shrink-0">
          {phase === "playing" && (
            <button onClick={tirar}
              className="w-full py-5 rounded-2xl font-black text-xl text-black transition-all hover:scale-[1.01] active:scale-95"
              style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)", boxShadow: "0 6px 30px rgba(34,197,94,0.45)" }}>
              💰 TIRAR — R$ {fmtBRL(potAtual)} ({mult.toFixed(2)}x)
            </button>
          )}

          {phase === "bust" && (
            <div className="space-y-2.5">
              <p className="text-center text-sm text-gray-500">O aviãozinho fugiu! O acumulado foi pro espaço. 🫠</p>
              <div className="grid grid-cols-2 gap-2.5">
                <button onClick={() => startRound(aposta, 0)}
                  className="py-3.5 rounded-2xl font-black text-sm text-black transition-all hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
                  🔁 Jogar de novo (R$ {fmtBRL(aposta)})
                </button>
                <button onClick={() => { stop(); onClose(); }}
                  className="py-3.5 rounded-2xl font-black text-sm transition-all hover:bg-white/5"
                  style={{ color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)" }}>
                  Fechar
                </button>
              </div>
            </div>
          )}

          {phase === "win" && (
            <div className="space-y-2.5">
              {enviado ? (
                <div className="text-center py-3 text-base font-black text-green-400">
                  ✓ {enviado === "auto" ? "PIX enviado!" : "Adicionado à fila de pagamentos!"}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button onClick={() => enviar("auto")} disabled={!!enviando}
                    className="py-4 rounded-2xl font-black text-sm text-black transition-all hover:scale-[1.02] disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)", boxShadow: "0 4px 20px rgba(34,197,94,0.3)" }}>
                    {enviando === "auto" ? "Enviando..." : `⚡ Enviar PIX automático — R$ ${fmtBRL(ganho)}`}
                  </button>
                  <button onClick={() => enviar("fila")} disabled={!!enviando}
                    className="py-4 rounded-2xl font-black text-sm text-black transition-all hover:scale-[1.02] disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)", boxShadow: "0 4px 20px rgba(255,186,0,0.3)" }}>
                    {enviando === "fila" ? "..." : "💳 Pagamento manual (fila)"}
                  </button>
                </div>
              )}
              {!enviado && (
                <button onClick={() => startRound(ganho, streak + 1)}
                  className="w-full py-3.5 rounded-2xl font-black text-sm transition-all hover:scale-[1.01]"
                  style={{ color: "#ff8c00", border: "1px solid rgba(255,140,0,0.35)", background: "rgba(255,140,0,0.06)" }}>
                  🚀 Jogar +1 apostando os R$ {fmtBRL(ganho)} <span className="text-gray-500 font-bold">· chance menor!</span>
                </button>
              )}
              <button onClick={() => { stop(); onClose(); }}
                className="w-full py-2.5 rounded-2xl font-black text-xs transition-all hover:bg-white/5"
                style={{ color: "#6b7280" }}>
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ParticipanteSessao } from "@/lib/gorjeta-store";

// ── Parâmetros do jogo (fáceis de ajustar) ──────────────────────────────────
const MAX_MULT       = 4;       // teto do multiplicador
const GROWTH_PER_SEC = 1.14;    // ~14%/s (composto) — sobe devagar e acelera. 2x≈5.3s · 4x≈10.6s

// Ponto de estouro. streak = rodadas encadeadas (jogar +1 apostando o ganho).
// Quanto maior o streak, mais chance de estourar cedo (protege o bolso).
function gerarCrashPoint(streak: number): number {
  const azar = Math.min(0.62, 0.10 + streak * 0.16);
  const r = Math.random();
  if (r < azar) return Math.round((1 + Math.random() * 0.30) * 100) / 100;
  const u   = (r - azar) / (1 - azar);
  const exp = 1.1 + streak * 0.28;
  const val = 1.30 + (MAX_MULT - 1.30) * Math.pow(u, exp);
  return Math.min(MAX_MULT, Math.round(val * 100) / 100);
}

function fmtBRL(v: number) { return v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }); }
function numColor(m: number, bust: boolean): string {
  if (bust) return "#ff4d4d";
  if (m < 1.8) return "#ffffff";
  if (m < 2.6) return "#ffd24d";
  if (m < 3.3) return "#ff9f43";
  return "#ff5a5a";
}

interface Pt { t: number; m: number; }
interface Star { x: number; y: number; z: number; }

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
  const ptsRef    = useRef<Pt[]>([{ t: 0, m: 1 }]);
  const rafRef    = useRef(0);
  const startRef  = useRef(0);
  const lastBgRef = useRef(0);
  const lastSetRef = useRef(0);
  const phaseRef  = useRef<"playing" | "win" | "bust">("playing");
  const bustAtRef = useRef(0);
  const sunAngRef = useRef(0);
  const starsRef  = useRef<Star[]>([]);

  const ganhoPotencial = useCallback((m: number, ap: number) => {
    let g = ap * m;
    if (teto && teto > 0) g = Math.min(g, teto);
    g = Math.min(g, saldoRestante);
    return Math.round(g * 100) / 100;
  }, [teto, saldoRestante]);

  // ── Desenho (estilo Aviator) ──
  const draw = useCallback((now: number) => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = wrap.clientWidth, H = wrap.clientHeight;
    if (canvas.width !== Math.floor(W * dpr) || canvas.height !== Math.floor(H * dpr)) {
      canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
    }
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // fundo radial escuro
    const bg = ctx.createRadialGradient(W * 0.12, H * 0.95, 10, W * 0.12, H * 0.95, Math.max(W, H));
    bg.addColorStop(0, "#160a0a"); bg.addColorStop(1, "#070504");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const isBust = phaseRef.current === "bust";
    const ox = 46, oy = H - 30;                  // origem do gráfico (canto inf. esq.)

    // ── radar girando (sunburst) ──
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(-sunAngRef.current);
    const R = Math.hypot(W, H) * 1.2, N = 16;
    for (let i = 0; i < N; i++) {
      const a1 = (-Math.PI * 0.12) + (i / N) * (Math.PI * 0.85);
      const a2 = (-Math.PI * 0.12) + ((i + 0.5) / N) * (Math.PI * 0.85);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a1) * R, -Math.sin(a1) * R);
      ctx.lineTo(Math.cos(a2) * R, -Math.sin(a2) * R);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? "rgba(255,90,70,0.05)" : "rgba(255,160,90,0.018)";
      ctx.fill();
    }
    ctx.restore();

    // ── estrelas passando ──
    ctx.fillStyle = "#fff";
    for (const s of starsRef.current) {
      ctx.globalAlpha = 0.10 + s.z * 0.35;
      const sx = s.x * W, sy = s.y * H, r = 0.6 + s.z * 1.6;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── escala ──
    const pts = ptsRef.current;
    const m   = multRef.current;
    const tNow = pts.length ? pts[pts.length - 1].t : 0;
    const xMax = Math.max(6, tNow * 1.06);
    const yMax = Math.max(1.6, m * 1.20);
    const mapX = (t: number) => ox + (t / xMax) * (W - ox - 18);
    const mapY = (mm: number) => oy - ((mm - 1) / (yMax - 1)) * (oy - 18);

    // labels do eixo Y
    ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.font = "11px system-ui"; ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const frac = 1 - i / 4, val = 1 + frac * (yMax - 1);
      const y = 14 + i * ((oy - 14) / 4);
      ctx.fillText(`${val.toFixed(1)}x`, ox - 8, y + 4);
      ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(W - 14, y); ctx.stroke();
    }

    // ── curva + área ──
    if (pts.length > 1) {
      const lastX = mapX(pts[pts.length - 1].t), lastY = mapY(pts[pts.length - 1].m);
      // área
      ctx.beginPath(); ctx.moveTo(ox, oy);
      for (const p of pts) ctx.lineTo(mapX(p.t), mapY(p.m));
      ctx.lineTo(lastX, oy); ctx.closePath();
      const fill = ctx.createLinearGradient(0, 18, 0, oy);
      fill.addColorStop(0, isBust ? "rgba(255,60,60,0.28)" : "rgba(255,90,60,0.30)");
      fill.addColorStop(1, "rgba(255,90,60,0)");
      ctx.fillStyle = fill; ctx.fill();
      // linha
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const x = mapX(pts[i].t), y = mapY(pts[i].m);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      const lg = ctx.createLinearGradient(0, oy, 0, 18);
      lg.addColorStop(0, "#ffb24d"); lg.addColorStop(1, isBust ? "#ff3b3b" : "#ff5a4d");
      ctx.strokeStyle = lg; ctx.lineWidth = 4.5; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.shadowColor = "#ff5a3c"; ctx.shadowBlur = 18; ctx.stroke(); ctx.shadowBlur = 0;

      // ── aviãozinho ──
      const p0 = pts[Math.max(0, pts.length - 6)];
      const ang = Math.atan2(mapY(pts[pts.length - 1].m) - mapY(p0.m), mapX(pts[pts.length - 1].t) - mapX(p0.t));
      let px = lastX, py = lastY, alpha = 1;
      if (isBust) {
        const dt = (now - bustAtRef.current) / 1000;
        px += dt * 520; py -= dt * 360; alpha = Math.max(0, 1 - dt * 1.1);
      } else {
        py += Math.sin(now * 0.006) * 3;   // leve balanço
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(px, py);
      ctx.rotate(isBust ? -0.7 : Math.max(-0.85, Math.min(-0.05, ang)));
      ctx.shadowColor = "#ff3b3b"; ctx.shadowBlur = 16;
      ctx.fillStyle = "#e8253b";
      ctx.beginPath(); ctx.ellipse(0, 0, 15, 6.5, 0, 0, Math.PI * 2); ctx.fill();      // corpo
      ctx.beginPath(); ctx.moveTo(-13, -1); ctx.lineTo(-22, -9); ctx.lineTo(-10, -3); ctx.closePath(); ctx.fill(); // cauda
      ctx.fillStyle = "#b81b2d";
      ctx.beginPath(); ctx.moveTo(-3, 2); ctx.lineTo(-11, 12); ctx.lineTo(5, 3); ctx.closePath(); ctx.fill();      // asa
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(7, -1, 2.3, 0, Math.PI * 2); ctx.fill();                 // janela
      ctx.restore();
    }
  }, []);

  const stop = useCallback(() => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = 0; }, []);

  // ── loop contínuo (fundo sempre vivo) ──
  const loop = useCallback((now: number) => {
    if (lastBgRef.current === 0) lastBgRef.current = now;
    const dt = Math.min(0.05, (now - lastBgRef.current) / 1000);
    lastBgRef.current = now;

    // fundo: gira radar + move estrelas
    sunAngRef.current += dt * 0.05;
    for (const s of starsRef.current) {
      s.x -= (0.03 + s.z * 0.10) * dt;
      if (s.x < -0.02) { s.x = 1.02; s.y = Math.random(); s.z = Math.random(); }
    }

    // física do multiplicador (só jogando)
    if (phaseRef.current === "playing") {
      let m = multRef.current * Math.pow(GROWTH_PER_SEC, dt);
      const t = (now - startRef.current) / 1000;
      if (m >= crashRef.current) {
        m = crashRef.current;
        multRef.current = m; ptsRef.current.push({ t, m });
        phaseRef.current = "bust"; bustAtRef.current = now;
        setMult(m); setPhase("bust");
      } else {
        multRef.current = m; ptsRef.current.push({ t, m });
        if (ptsRef.current.length > 1400) ptsRef.current.shift();
        if (now - lastSetRef.current > 55) { lastSetRef.current = now; setMult(m); }
      }
    }

    draw(now);
    rafRef.current = requestAnimationFrame(loop);
  }, [draw]);

  const startRound = useCallback((apostaInicial: number, streakNum: number) => {
    crashRef.current = gerarCrashPoint(streakNum);
    multRef.current = 1; apostaRef.current = apostaInicial;
    ptsRef.current = [{ t: 0, m: 1 }];
    startRef.current = performance.now();
    phaseRef.current = "playing";
    setApostaRound(apostaInicial); setStreak(streakNum);
    setMult(1); setGanho(0); setEnviado(""); setEnviando(""); setPhase("playing");
  }, []);

  useEffect(() => {
    // estrelas iniciais
    starsRef.current = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random() }));
    startRound(aposta, 0);
    rafRef.current = requestAnimationFrame(loop);
    const onResize = () => draw(performance.now());
    window.addEventListener("resize", onResize);
    return () => { stop(); window.removeEventListener("resize", onResize); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tirar() {
    if (phaseRef.current !== "playing") return;
    const m = multRef.current;
    phaseRef.current = "win";
    setMult(m); setGanho(ganhoPotencial(m, apostaRef.current)); setPhase("win");
  }

  async function enviar(modo: "auto" | "fila") {
    if (enviado || enviando) return;
    setEnviando(modo);
    const ok = await onEnviar(ganho, modo);
    setEnviando("");
    if (ok) setEnviado(modo);
  }

  const potAtual = ganhoPotencial(mult, apostaRound);
  const cor = numColor(mult, phase === "bust");

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-5xl flex flex-col rounded-3xl overflow-hidden"
        style={{ height: "min(92vh, 800px)", background: "rgba(5,14,9,0.99)", border: `1px solid ${phase === "bust" ? "rgba(255,77,77,0.45)" : "rgba(255,140,60,0.3)"}`, boxShadow: `0 0 110px ${phase === "bust" ? "rgba(255,60,60,0.12)" : "rgba(255,140,60,0.1)"}` }}>

        {/* Header */}
        <div className="px-5 py-3.5 flex items-center gap-3 border-b border-white/5 flex-shrink-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-black text-[#ffba00] overflow-hidden"
            style={{ background: "rgba(255,186,0,0.12)", border: "2px solid rgba(255,186,0,0.25)" }}>
            {participante.image ? <img src={participante.image} alt="" className="w-full h-full object-cover" /> : participante.displayName[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white truncate">{participante.displayName}</p>
            <p className="text-[11px] text-gray-500">
              Aposta: <span className="text-[#ffba00] font-black">R$ {fmtBRL(apostaRound)}</span>
              {streak > 0 && <span className="ml-2 text-orange-400 font-black">🔥 Rodada {streak + 1} · risco alto</span>}
            </p>
          </div>
          <button onClick={() => { stop(); onClose(); }} className="text-gray-500 hover:text-white text-xl transition-colors">✕</button>
        </div>

        {/* Área do jogo */}
        <div ref={wrapRef} className="relative flex-1 min-h-0">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

          {/* Multiplicador sobreposto */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
            <p className="font-black tabular-nums leading-none"
              style={{ fontSize: "clamp(3.5rem, 12vw, 8.5rem)", color: cor, textShadow: `0 0 60px ${cor}77, 0 4px 30px rgba(0,0,0,0.5)`, transition: "color 0.15s" }}>
              {mult.toFixed(2)}x
            </p>
            {phase === "playing" && (
              <p className="mt-3 text-xs sm:text-sm font-black uppercase tracking-[0.3em] text-gray-400">
                Ganho atual <span style={{ color: cor }}>R$ {fmtBRL(potAtual)}</span>
              </p>
            )}
            {phase === "bust" && (
              <p className="mt-2 text-xl sm:text-2xl font-black uppercase tracking-[0.25em] text-red-400" style={{ animation: "crashFloat 0.5s ease-out" }}>
                🛫 Voou!
              </p>
            )}
            {phase === "win" && (
              <div className="mt-2" style={{ animation: "crashPop 0.4s cubic-bezier(.34,1.56,.64,1)" }}>
                <p className="text-sm font-black text-green-400 uppercase tracking-widest">Tirou em {mult.toFixed(2)}x</p>
                <p className="text-3xl sm:text-5xl font-black text-white mt-1">Ganhou <span className="text-green-400">R$ {fmtBRL(ganho)}</span></p>
              </div>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="px-4 sm:px-5 py-4 border-t border-white/5 flex-shrink-0">
          {phase === "playing" && (
            <button onClick={tirar}
              className="w-full py-5 rounded-2xl font-black text-lg sm:text-xl text-black transition-all hover:scale-[1.01] active:scale-95"
              style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)", boxShadow: "0 6px 34px rgba(34,197,94,0.5)" }}>
              💰 TIRAR — R$ {fmtBRL(potAtual)} ({mult.toFixed(2)}x)
            </button>
          )}

          {phase === "bust" && (
            <div className="space-y-2.5">
              <p className="text-center text-sm text-gray-500">O aviãozinho fugiu! O acumulado foi pro espaço. 🫠</p>
              <div className="grid grid-cols-2 gap-2.5">
                <button onClick={() => startRound(aposta, 0)}
                  className="py-4 rounded-2xl font-black text-sm text-black transition-all hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
                  🔁 Jogar de novo (R$ {fmtBRL(aposta)})
                </button>
                <button onClick={() => { stop(); onClose(); }}
                  className="py-4 rounded-2xl font-black text-sm transition-all hover:bg-white/5"
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
                    {enviando === "auto" ? "Enviando..." : `⚡ Enviar PIX — R$ ${fmtBRL(ganho)}`}
                  </button>
                  <button onClick={() => enviar("fila")} disabled={!!enviando}
                    className="py-4 rounded-2xl font-black text-sm text-black transition-all hover:scale-[1.02] disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)", boxShadow: "0 4px 20px rgba(255,186,0,0.3)" }}>
                    {enviando === "fila" ? "..." : "💳 Pagamento manual"}
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
      <style>{`
        @keyframes crashPop { 0% { transform:scale(0.5); opacity:0; } 100% { transform:scale(1); opacity:1; } }
        @keyframes crashFloat { 0% { transform:translateY(10px); opacity:0; } 100% { transform:translateY(0); opacity:1; } }
      `}</style>
    </div>
  );
}

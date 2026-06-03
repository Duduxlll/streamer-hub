"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ParticipanteSessao } from "@/lib/gorjeta-store";

// ── Física / pista ──────────────────────────────────────────────────────────
const R          = 15;     // raio da bolinha
const GRAV        = 0.30;   // gravidade
const REST_WALL   = 0.7;    // ricochete nas paredes
const REST_PEG    = 0.78;   // ricochete nos pinos
const REST_BALL   = 0.85;   // ricochete entre bolinhas
const PEG_R       = 9;
const ROW_GAP     = 165;    // distância entre fileiras de pinos
const N_ROWS      = 16;     // nº de fileiras → pista longa e disputada
const MAX_TIME    = 70_000; // trava de segurança (ms)

function fmtBRL(v: number) { return v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }); }
function corDe(name: string): string {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 70% 55%)`;
}

interface Ball {
  p: ParticipanteSessao;
  x: number; y: number; vx: number; vy: number;
  cor: string;
  img: HTMLImageElement | null;
  finished: boolean; place: number;
}
interface Peg { x: number; y: number; }

export function MarbleRace({ participantes, numVencedores, saldoRestante, autoDisponivel, onEnviarLote, onClose }: {
  participantes: ParticipanteSessao[];
  numVencedores: number;
  saldoRestante: number;
  autoDisponivel: boolean;
  onEnviarLote: (itens: { username: string; displayName: string; valor: number }[], modo: "auto" | "fila") => Promise<boolean>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"corrida" | "resultado">("corrida");
  const [vencedores, setVencedores] = useState<Ball[]>([]);
  const [valores, setValores] = useState<number[]>([]);
  const [enviando, setEnviando] = useState<"" | "auto" | "fila">("");
  const [enviado, setEnviado] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef   = useRef<HTMLDivElement | null>(null);
  const ballsRef  = useRef<Ball[]>([]);
  const pegsRef   = useRef<Peg[]>([]);
  const rafRef    = useRef(0);
  const camRef    = useRef(0);
  const finishCntRef = useRef(0);
  const startTsRef = useRef(0);
  const endedRef  = useRef(false);
  const worldWRef = useRef(800);
  const finishYRef = useRef(0);

  const nVenc = Math.max(1, Math.min(numVencedores, participantes.length));

  // ── Setup do mundo ──
  const setup = useCallback(() => {
    const wrap = wrapRef.current; if (!wrap) return;
    const W = wrap.clientWidth;
    worldWRef.current = W;
    const startY = 120;
    const finishY = startY + N_ROWS * ROW_GAP + 160;
    finishYRef.current = finishY;

    // pinos em fileiras escalonadas + algumas "rampas" (linhas de pinos diagonais)
    const pegs: Peg[] = [];
    for (let row = 0; row < N_ROWS; row++) {
      const y = startY + 90 + row * ROW_GAP;
      const cols = 5 + (row % 3);
      const gap = W / (cols + 1);
      const off = (row % 2) * (gap / 2);
      for (let c = 0; c < cols; c++) {
        const x = gap * (c + 1) + off - (row % 2 ? gap / 2 : 0);
        if (x > 30 && x < W - 30) pegs.push({ x, y });
      }
      // mini-rampa diagonal a cada 4 fileiras (desvia o fluxo)
      if (row % 4 === 2) {
        const dir = row % 8 === 2 ? 1 : -1;
        for (let k = 0; k < 5; k++) {
          pegs.push({ x: W / 2 + dir * (k - 2) * 46, y: y + 70 + k * 18 });
        }
      }
    }
    pegsRef.current = pegs;

    // bolinhas: espalhadas no topo
    const balls: Ball[] = participantes.map((p, i) => {
      const img = p.image ? new Image() : null;
      if (img && p.image) { img.referrerPolicy = "no-referrer"; img.src = p.image; }
      const perRow = Math.max(1, Math.floor((W - 80) / 46));
      const col = i % perRow, rw = Math.floor(i / perRow);
      return {
        p, x: 40 + col * 46 + (rw % 2) * 23 + (Math.random() * 8 - 4),
        y: 20 + rw * 40, vx: Math.random() * 1.5 - 0.75, vy: 0,
        cor: corDe(p.displayName || p.username), img,
        finished: false, place: 0,
      };
    });
    ballsRef.current = balls;
    camRef.current = 0;
    finishCntRef.current = 0;
    endedRef.current = false;
    startTsRef.current = performance.now();
  }, [participantes]);

  // ── Física + render ──
  const step = useCallback((now: number) => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = wrap.clientWidth, H = wrap.clientHeight;
    if (canvas.width !== Math.floor(W * dpr) || canvas.height !== Math.floor(H * dpr)) {
      canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
    }
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const balls = ballsRef.current, pegs = pegsRef.current;
    const finishY = finishYRef.current;

    // ── física ──
    if (!endedRef.current) {
      for (const b of balls) {
        if (b.finished) continue;
        b.vy += GRAV;
        b.x += b.vx; b.y += b.vy;
        // paredes
        if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx) * REST_WALL; }
        if (b.x > W - R) { b.x = W - R; b.vx = -Math.abs(b.vx) * REST_WALL; }
        // pinos (só os próximos em Y)
        for (const pg of pegs) {
          if (Math.abs(pg.y - b.y) > 60) continue;
          const dx = b.x - pg.x, dy = b.y - pg.y;
          const d2 = dx * dx + dy * dy, rr = R + PEG_R;
          if (d2 < rr * rr) {
            const d = Math.sqrt(d2) || 0.01, nx = dx / d, ny = dy / d;
            b.x = pg.x + nx * rr; b.y = pg.y + ny * rr;
            const dot = b.vx * nx + b.vy * ny;
            b.vx = (b.vx - 2 * dot * nx) * REST_PEG;
            b.vy = (b.vy - 2 * dot * ny) * REST_PEG;
            b.vx += (Math.random() - 0.5) * 0.6; // caos sutil
          }
        }
        // limite de velocidade
        b.vy = Math.min(b.vy, 22);
        // chegada
        if (b.y >= finishY) {
          b.finished = true; b.place = ++finishCntRef.current;
          b.y = finishY;
          if (finishCntRef.current >= nVenc && !endedRef.current) {
            endedRef.current = true;
            const top = [...balls].filter(x => x.finished).sort((a, c) => a.place - c.place).slice(0, nVenc);
            setTimeout(() => finalizar(top), 700);
          }
        }
      }
      // colisão bolinha-bolinha (n pequeno)
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i]; if (a.finished) continue;
        for (let j = i + 1; j < balls.length; j++) {
          const c = balls[j]; if (c.finished) continue;
          const dx = c.x - a.x, dy = c.y - a.y;
          if (Math.abs(dy) > 2 * R) continue;
          const d2 = dx * dx + dy * dy, rr = 2 * R;
          if (d2 < rr * rr && d2 > 0.01) {
            const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, overlap = (rr - d) / 2;
            a.x -= nx * overlap; a.y -= ny * overlap; c.x += nx * overlap; c.y += ny * overlap;
            const dvx = c.vx - a.vx, dvy = c.vy - a.vy, dot = dvx * nx + dvy * ny;
            if (dot < 0) {
              const imp = dot * REST_BALL;
              a.vx += imp * nx; a.vy += imp * ny; c.vx -= imp * nx; c.vy -= imp * ny;
            }
          }
        }
      }
      // trava de tempo
      if (!endedRef.current && now - startTsRef.current > MAX_TIME) {
        endedRef.current = true;
        const rank = [...balls].sort((a, c) => (c.finished ? 1e9 + c.place : c.y) - (a.finished ? 1e9 + a.place : a.y));
        // os que faltam ganham por posição atual
        let cnt = finishCntRef.current;
        for (const b of rank) if (!b.finished && cnt < nVenc) { b.finished = true; b.place = ++cnt; }
        const top = [...balls].filter(x => x.finished).sort((a, c) => a.place - c.place).slice(0, nVenc);
        setTimeout(() => finalizar(top), 400);
      }
    }

    // ── câmera segue o líder ──
    let leadY = 0;
    for (const b of balls) if (!b.finished && b.y > leadY) leadY = b.y;
    const targetCam = Math.max(0, Math.min(finishY + 80 - H, leadY - H * 0.42));
    camRef.current += (targetCam - camRef.current) * 0.12;
    const cam = camRef.current;

    // ── desenho ──
    const bgg = ctx.createLinearGradient(0, 0, 0, H);
    bgg.addColorStop(0, "#0a1410"); bgg.addColorStop(1, "#05100a");
    ctx.fillStyle = bgg; ctx.fillRect(0, 0, W, H);

    // paredes laterais
    ctx.fillStyle = "rgba(34,197,94,0.06)";
    ctx.fillRect(0, 0, 6, H); ctx.fillRect(W - 6, 0, 6, H);

    // linha de chegada
    const fy = finishY - cam;
    if (fy < H + 40) {
      const sq = 16;
      for (let x = 0; x < W; x += sq) {
        for (let r2 = 0; r2 < 2; r2++) {
          ctx.fillStyle = ((x / sq) + r2) % 2 === 0 ? "#ffba00" : "#1a1a1a";
          ctx.fillRect(x, fy + r2 * sq, sq, sq);
        }
      }
      ctx.fillStyle = "#ffba00"; ctx.font = "bold 13px system-ui"; ctx.textAlign = "center";
      ctx.fillText("🏁 CHEGADA", W / 2, fy - 10);
    }

    // pinos (com sombra/3D)
    for (const pg of pegs) {
      const y = pg.y - cam;
      if (y < -20 || y > H + 20) continue;
      ctx.beginPath(); ctx.arc(pg.x + 1.5, y + 2.5, PEG_R, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fill();
      const g = ctx.createRadialGradient(pg.x - 3, y - 3, 1, pg.x, y, PEG_R);
      g.addColorStop(0, "#9aa0a6"); g.addColorStop(1, "#4a4f55");
      ctx.beginPath(); ctx.arc(pg.x, y, PEG_R, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    }

    // bolinhas
    const ordered = [...balls].sort((a, c) => a.y - c.y);
    for (const b of ordered) {
      const y = b.y - cam;
      if (y < -40 || y > H + 40) continue;
      // sombra
      ctx.beginPath(); ctx.ellipse(b.x, y + R + 3, R * 0.8, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fill();
      // corpo
      ctx.save();
      ctx.beginPath(); ctx.arc(b.x, y, R, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
      if (b.img && b.img.complete && b.img.naturalWidth > 0) {
        ctx.drawImage(b.img, b.x - R, y - R, R * 2, R * 2);
      } else {
        ctx.fillStyle = b.cor; ctx.fillRect(b.x - R, y - R, R * 2, R * 2);
        ctx.fillStyle = "#fff"; ctx.font = `bold ${R}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText((b.p.displayName || b.p.username)[0]?.toUpperCase() ?? "?", b.x, y);
      }
      // brilho 3D
      const sh = ctx.createRadialGradient(b.x - R * 0.4, y - R * 0.4, 1, b.x, y, R);
      sh.addColorStop(0, "rgba(255,255,255,0.45)"); sh.addColorStop(0.5, "rgba(255,255,255,0)");
      ctx.fillStyle = sh; ctx.fillRect(b.x - R, y - R, R * 2, R * 2);
      ctx.restore();
      // aro
      ctx.beginPath(); ctx.arc(b.x, y, R, 0, Math.PI * 2);
      ctx.strokeStyle = b.cor; ctx.lineWidth = 2.5; ctx.stroke();
      // nome
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      const nm = (b.p.displayName || b.p.username);
      ctx.font = "bold 10px system-ui"; ctx.textAlign = "center";
      const tw = ctx.measureText(nm).width + 8;
      ctx.fillRect(b.x - tw / 2, y + R + 4, tw, 13);
      ctx.fillStyle = "#fff"; ctx.fillText(nm, b.x, y + R + 14);
    }

    rafRef.current = requestAnimationFrame(step);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nVenc]);

  function finalizar(top: Ball[]) {
    cancelAnimationFrame(rafRef.current); rafRef.current = 0;
    setVencedores(top);
    // valor sugerido = divide o saldo igualmente, arredondado (mín 1)
    const sugestao = Math.max(1, Math.floor((saldoRestante / Math.max(1, top.length)) * 0.5));
    setValores(top.map(() => sugestao));
    setPhase("resultado");
  }

  useEffect(() => {
    setup();
    rafRef.current = requestAnimationFrame(step);
    const onResize = () => { /* mantém; o step relê dimensões */ };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", onResize); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = valores.reduce((s, v) => s + (v || 0), 0);
  const cobre = total <= saldoRestante;

  async function enviar(modo: "auto" | "fila") {
    if (enviado || enviando) return;
    if (!cobre) return;
    setEnviando(modo);
    const itens = vencedores.map((b, i) => ({ username: b.p.username, displayName: b.p.displayName, valor: valores[i] || 0 }))
      .filter(it => it.valor > 0);
    const ok = await onEnviarLote(itens, modo);
    setEnviando("");
    if (ok) setEnviado(true);
  }

  const medalha = (i: number) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`;

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="w-full h-full max-w-6xl flex flex-col rounded-3xl overflow-hidden"
        style={{ background: "rgba(5,14,9,0.99)", border: "1px solid rgba(255,186,0,0.3)", boxShadow: "0 0 110px rgba(255,186,0,0.08)" }}>

        {/* Header */}
        <div className="px-5 py-3 flex items-center gap-3 border-b border-white/5 flex-shrink-0">
          <span className="text-lg">🏁</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white">Corrida de Bolinhas</p>
            <p className="text-[11px] text-gray-500">
              {participantes.length} na pista · <span className="text-[#ffba00] font-black">Top {nVenc} ganham</span>
            </p>
          </div>
          <button onClick={() => { cancelAnimationFrame(rafRef.current); onClose(); }} className="text-gray-500 hover:text-white text-xl transition-colors">✕</button>
        </div>

        {/* Pista */}
        {phase === "corrida" && (
          <div ref={wrapRef} className="relative flex-1 min-h-0">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          </div>
        )}

        {/* Resultado */}
        {phase === "resultado" && (
          <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6">
            <div className="max-w-xl mx-auto space-y-4">
              <div className="text-center">
                <p className="text-3xl font-black text-white">🏆 Vencedores!</p>
                <p className="text-sm text-gray-500 mt-1">Top {nVenc} da corrida</p>
              </div>

              {/* valor pra todos */}
              <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(255,186,0,0.06)", border: "1px solid rgba(255,186,0,0.2)" }}>
                <span className="text-xs font-black text-gray-400 flex-1">Mesmo valor pra todos (R$)</span>
                <input type="text" inputMode="decimal" placeholder="0,00"
                  onChange={e => { const v = parseFloat(e.target.value.replace(",", ".")); if (!isNaN(v)) setValores(vencedores.map(() => v)); }}
                  className="w-28 px-3 py-2 rounded-xl text-sm font-black text-white text-right outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,186,0,0.3)" }} />
              </div>

              {/* lista vencedores com valor por colocação */}
              <div className="space-y-2">
                {vencedores.map((b, i) => (
                  <div key={b.p.username} className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-base w-8 text-center flex-shrink-0">{medalha(i)}</span>
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-black text-white"
                      style={{ background: b.cor }}>
                      {b.p.image ? <img src={b.p.image} alt="" className="w-full h-full object-cover" /> : (b.p.displayName || b.p.username)[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white truncate">{b.p.displayName}</p>
                      <p className="text-[10px] text-gray-600">@{b.p.username}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs font-black text-[#ffba00]">R$</span>
                      <input type="text" inputMode="decimal" value={valores[i] ?? ""}
                        onChange={e => { const v = parseFloat(e.target.value.replace(",", ".")); setValores(arr => arr.map((x, k) => k === i ? (isNaN(v) ? 0 : v) : x)); }}
                        className="w-20 px-2 py-1.5 rounded-lg text-sm font-black text-white text-right outline-none"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* total + saldo */}
              <div className="flex items-center justify-between px-4 py-3 rounded-2xl"
                style={{ background: cobre ? "rgba(34,197,94,0.06)" : "rgba(248,113,113,0.08)", border: `1px solid ${cobre ? "rgba(34,197,94,0.2)" : "rgba(248,113,113,0.3)"}` }}>
                <span className="text-xs font-black text-gray-400">Total a pagar</span>
                <span className="text-lg font-black" style={{ color: cobre ? "#4ade80" : "#f87171" }}>
                  R$ {fmtBRL(total)} <span className="text-[11px] text-gray-600">/ saldo R$ {fmtBRL(saldoRestante)}</span>
                </span>
              </div>
              {!cobre && <p className="text-center text-xs text-red-400 font-bold">O total passou do saldo da sessão. Reduza os valores.</p>}

              {/* ações */}
              {enviado ? (
                <div className="text-center py-3 text-base font-black text-green-400">✓ Pagamentos registrados!</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button onClick={() => enviar("auto")} disabled={!!enviando || !cobre || !autoDisponivel}
                    title={autoDisponivel ? "" : "Configure o GGPix para enviar automático"}
                    className="py-3.5 rounded-2xl font-black text-sm transition-all hover:scale-[1.02] disabled:hover:scale-100 disabled:cursor-not-allowed"
                    style={(autoDisponivel && cobre)
                      ? { background: "linear-gradient(135deg, #4ade80, #22c55e)", color: "#000" }
                      : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#4b5563" }}>
                    {!autoDisponivel ? "⚡ PIX automático (GGPix off)" : enviando === "auto" ? "Enviando..." : "⚡ Enviar PIX a todos"}
                  </button>
                  <button onClick={() => enviar("fila")} disabled={!!enviando || !cobre}
                    className="py-3.5 rounded-2xl font-black text-sm text-black transition-all hover:scale-[1.02] disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}>
                    {enviando === "fila" ? "..." : "💳 Pagamento manual (todos)"}
                  </button>
                </div>
              )}
              <button onClick={() => { cancelAnimationFrame(rafRef.current); onClose(); }}
                className="w-full py-2.5 rounded-2xl font-black text-xs transition-all hover:bg-white/5"
                style={{ color: "#6b7280" }}>
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

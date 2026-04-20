"use client";

import { useEffect, useRef } from "react";

const TRAIL = ["♠", "♥", "♦", "♣", "✦", "◆"];
const BURST = ["♠", "♥", "♦", "♣", "✦", "★", "◆", "✧", "⬟"];
const COLORS = [
  "96,165,250",   // azul
  "167,139,250",  // roxo
  "250,202,21",   // dourado
  "248,113,113",  // vermelho
  "52,211,153",   // esmeralda
  "251,146,60",   // laranja
];

interface P {
  x: number; y: number; vx: number; vy: number;
  life: number; decay: number;
  sym: string; size: number; color: string; burst: boolean;
}

export default function CursorTrail() {
  const ref = useRef<HTMLCanvasElement>(null);
  const ps  = useRef<P[]>([]);
  const mx  = useRef({ x: -999, y: -999 });
  const lt  = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx    = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const trail = (x: number, y: number) => {
      const now = Date.now();
      if (now - lt.current < 50) return;
      lt.current = now;
      ps.current.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 1.8 - 0.5,
        life: 1, decay: 0.020 + Math.random() * 0.018,
        sym: TRAIL[Math.floor(Math.random() * TRAIL.length)],
        size: 12 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        burst: false,
      });
    };

    const burst = (x: number, y: number) => {
      const n = 16 + Math.floor(Math.random() * 8);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.35;
        const s = 3 + Math.random() * 6;
        ps.current.push({
          x, y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s - 2,
          life: 1, decay: 0.010 + Math.random() * 0.010,
          sym: BURST[Math.floor(Math.random() * BURST.length)],
          size: 14 + Math.random() * 16,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          burst: true,
        });
      }
    };

    const onMove  = (e: MouseEvent) => { mx.current = { x: e.clientX, y: e.clientY }; trail(e.clientX, e.clientY); };
    const onClick = (e: MouseEvent) => burst(e.clientX, e.clientY);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const { x: gx, y: gy } = mx.current;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 100);
      g.addColorStop(0,   "rgba(59,130,246,0.13)");
      g.addColorStop(0.5, "rgba(59,130,246,0.04)");
      g.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(gx, gy, 100, 0, Math.PI * 2); ctx.fill();

      for (let i = ps.current.length - 1; i >= 0; i--) {
        const p = ps.current[i];
        p.x  += p.vx;
        p.y  += p.vy;
        if (p.burst) { p.vy += 0.20; p.vx *= 0.97; }
        p.life -= p.decay;
        if (p.life <= 0) { ps.current.splice(i, 1); continue; }

        const alpha = Math.pow(p.life, 0.6) * 0.95;
        const sz    = p.burst ? p.size * (0.25 + p.life * 0.75) : p.size * p.life;

        ctx.save();
        ctx.globalAlpha  = alpha;
        ctx.font         = `bold ${sz}px Arial`;
        ctx.fillStyle    = `rgb(${p.color})`;
        ctx.shadowColor  = `rgba(${p.color},1)`;
        ctx.shadowBlur   = p.burst ? 18 : 10;
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.sym, p.x, p.y);
        ctx.restore();
      }

      raf.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return <canvas ref={ref} style={{ position:"fixed", inset:0, zIndex:9998, pointerEvents:"none" }} />;
}

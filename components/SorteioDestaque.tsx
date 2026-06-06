"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import type { Sorteio } from "@/lib/sorteio-store";

function useCountdown(endsAt: number) {
  const [left, setLeft] = useState(Math.max(0, endsAt - Date.now()));
  useEffect(() => {
    const iv = setInterval(() => setLeft(Math.max(0, endsAt - Date.now())), 500);
    return () => clearInterval(iv);
  }, [endsAt]);

  const totalSec = Math.floor(left / 1000);
  const dias     = Math.floor(totalSec / 86400);
  const horas    = Math.floor((totalSec % 86400) / 3600);
  const minutos  = Math.floor((totalSec % 3600) / 60);
  const segundos = totalSec % 60;

  const unidades: { label: string; value: number }[] = [];
  if (dias > 0)               unidades.push({ label: "Dias",     value: dias     });
  if (dias > 0 || horas > 0)  unidades.push({ label: "Horas",    value: horas    });
  unidades.push({ label: "Minutos",  value: minutos  });
  unidades.push({ label: "Segundos", value: segundos });

  return { unidades, encerrado: left === 0 };
}

function Digit({ value }: { value: string }) {
  const prev = useRef(value);
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    if (prev.current !== value) {
      setFlip(true);
      prev.current = value;
      setTimeout(() => setFlip(false), 300);
    }
  }, [value]);

  return (
    <span
      className="inline-block tabular-nums"
      style={{
        transition: "transform 0.18s ease, opacity 0.18s ease",
        transform: flip ? "translateY(-4px) scale(1.08)" : "translateY(0) scale(1)",
        opacity:   flip ? 0.6 : 1,
      }}
    >
      {value}
    </span>
  );
}

function CountdownBox({ value, label }: { value: number; label: string }) {
  const str = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(255,186,0,0.12) 0%, rgba(255,140,0,0.06) 100%)",
          border: "1px solid rgba(255,186,0,0.3)",
          boxShadow: "0 0 20px rgba(255,186,0,0.1), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <span className="text-3xl sm:text-4xl font-black text-white font-mono">
          <Digit value={str[0]} /><Digit value={str[1]} />
        </span>
      </div>
      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-500">{label}</span>
    </div>
  );
}

function SorteioCard({ s }: { s: Sorteio }) {
  const endsAt = s.iniciadoEm + s.duracaoMs;
  const { unidades, encerrado } = useCountdown(endsAt);
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 60); }, []);

  return (
    <div
      style={{
        transition: "opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.3,0.64,1)",
        opacity:   visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
      }}
    >
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: "rgba(8,20,13,0.95)",
          border: "1px solid rgba(255,186,0,0.22)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        {/* Imagem de fundo opcional — adapta-se a QUALQUER tamanho (estilo Spotify):
            fundo borrado preenche o card + imagem inteira nítida no centro (nunca corta). */}
        {s.temImagem && (
          <>
            {/* fundo borrado (preenche sem barras pretas, qualquer proporção) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/sorteio?imagem=${s.id}`}
              alt="" aria-hidden
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{ filter: "blur(26px) brightness(0.4) saturate(1.15)", transform: "scale(1.18)" }}
            />
            {/* imagem inteira, nítida, centralizada — bordas suavizadas (fundem no fundo) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/sorteio?imagem=${s.id}`}
              alt="" aria-hidden
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{
                WebkitMaskImage: "radial-gradient(ellipse 78% 82% at 50% 50%, #000 42%, rgba(0,0,0,0.4) 72%, transparent 95%)",
                maskImage: "radial-gradient(ellipse 78% 82% at 50% 50%, #000 42%, rgba(0,0,0,0.4) 72%, transparent 95%)",
              }}
            />
            {/* vinheta suave: pontas escurecidas (texto à esquerda e cronômetro à direita legíveis) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg, rgba(7,10,8,0.9) 0%, rgba(7,10,8,0.1) 36%, rgba(7,10,8,0.1) 64%, rgba(7,10,8,0.9) 100%)," +
                  "radial-gradient(ellipse 78% 135% at 50% 50%, transparent 50%, rgba(7,10,8,0.45) 100%)",
              }}
            />
          </>
        )}

        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ffba00]/30 to-transparent" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-stretch gap-0">

          <div className="flex-1 px-6 sm:px-8 py-6 sm:py-7">

            <div className="flex items-center gap-2 mb-5">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                style={{ background: "rgba(255,186,0,0.12)", border: "1px solid rgba(255,186,0,0.3)", color: "#ffba00" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffba00]" style={{ boxShadow: encerrado ? "none" : "0 0 6px #ffba00", animation: encerrado ? "none" : "pulse 2s infinite" }} />
                {encerrado ? "Aguardando sorteio" : "Sorteio Ativo"}
              </span>
            </div>

            <div className="mb-1">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-600 mb-1">Título</p>
              <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">{s.titulo}</h3>
            </div>

            {s.valor && (
              <div className="mt-3 mb-5">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-600 mb-1">Premiação</p>
                <p
                  className="text-2xl font-black"
                  style={{
                    background: "linear-gradient(135deg, #ffdd55, #ffba00)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {s.valor}
                </p>
              </div>
            )}

            <Link
              href={`/sorteio/${s.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-black text-sm transition-all hover:scale-[1.04] hover:shadow-[0_0_28px_rgba(255,186,0,0.4)] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #ffdd55, #ffba00)" }}
            >
              🎟️ Acessar Sorteio
            </Link>
          </div>

          <div className="hidden sm:block w-px self-stretch my-6" style={{ background: "rgba(255,186,0,0.12)" }} />
          <div className="block sm:hidden h-px mx-6" style={{ background: "rgba(255,186,0,0.12)" }} />

          <div className="flex items-center justify-center px-6 sm:px-8 py-6 sm:py-7 gap-3 sm:gap-4">
            {unidades.map((u, i) => (
              <div key={u.label} className="flex items-center gap-3 sm:gap-4">
                <CountdownBox value={u.value} label={u.label} />
                {i < unidades.length - 1 && (
                  <span
                    className="text-2xl font-black mb-5 leading-none select-none"
                    style={{ color: "rgba(255,186,0,0.35)" }}
                  >:</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#ffba00]/20 to-transparent" />
      </div>
    </div>
  );
}

export default function SorteioDestaque({ sorteiosIniciais = [] }: { sorteiosIniciais?: Sorteio[] }) {
  // Começa já com os dados vindos do servidor (SSR) — aparece junto com o resto da home,
  // sem esperar o fetch do navegador.
  const [sorteios, setSorteios] = useState<Sorteio[]>(sorteiosIniciais);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch("/api/sorteio");
        const data = await res.json();
        const ativos: Sorteio[] = (data.sorteios ?? []).filter(
          (s: Sorteio) => s.status === "ativo" || s.status === "pronto"
        );
        setSorteios(ativos);
      } catch {  }
    }
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, []);

  if (sorteios.length === 0) return null;

  return (
    <section
      className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 animate-in"
      style={{ animationDelay: "0.05s", opacity: 0 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-600">🎟️ Sorteios Ativos</span>
        <div className="flex-1 h-px bg-gradient-to-r from-[#ffba00]/20 to-transparent" />
      </div>

      <div className="space-y-3">
        {sorteios.map(s => <SorteioCard key={s.id} s={s} />)}
      </div>
    </section>
  );
}

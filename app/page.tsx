import TwitchStatus from "@/components/TwitchStatus";
import SorteioDestaque from "@/components/SorteioDestaque";
import { JONBET_URL, JONBET_LOGO } from "@/lib/partner";

function TwitchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">

      <div className="orb w-[520px] h-[520px] bg-green-900/25 -top-40 -left-32" style={{ animationDelay: "0s" }} />

      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${8 + i * 10}%`,
            animationDuration: `${9 + i * 1.8}s`,
            animationDelay: `${i * 0.9}s`,
            width: i % 3 === 0 ? "3px" : "2px",
            height: i % 3 === 0 ? "3px" : "2px",
            background: i % 2 === 0 ? "rgba(34,197,94,0.6)" : "rgba(34,197,94,0.35)",
          }}
        />
      ))}

      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 lg:pr-[38%]">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

          <div className="flex-shrink-0 flex flex-col items-center gap-0 animate-in animate-in-delay-1">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#16a34a]/20 to-transparent blur-3xl scale-125 pointer-events-none" />
              <div className="glow-card w-52 h-52 lg:w-64 lg:h-64 rounded-full border-2 border-[#16a34a]/40 overflow-hidden relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/stain-icon.jpg"
                  alt="stainzincs"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                <TwitchStatus />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <a
                href="https://twitch.tv/stainzincs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/40 hover:bg-[#22c55e]/25 hover:border-[#22c55e]/70 transition-all shadow-lg shadow-purple-950/30"
              >
                <TwitchIcon className="w-5 h-5 text-[#22c55e]" />
              </a>

              {/* Logo JonBet — parceiro oficial, clicável */}
              <a
                href={JONBET_URL}
                target="_blank"
                rel="noopener noreferrer"
                title="Parceiro oficial — JonBet"
                className="flex items-center px-4 py-2.5 rounded-full transition-all hover:scale-[1.04]"
                style={{ background: "rgba(5,225,13,0.1)", border: "1px solid rgba(5,225,13,0.35)", boxShadow: "0 0 18px rgba(5,225,13,0.12)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={JONBET_LOGO} alt="JonBet" className="h-4 w-auto" />
              </a>
            </div>
          </div>

          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#16a34a]/25 bg-[#16a34a]/8 mb-5 animate-in animate-in-delay-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              <span className="text-xs text-[#86efac] font-semibold uppercase tracking-widest">Streamer Oficial</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight mb-3 animate-in animate-in-delay-2">
              <span className="text-white">stain</span><span className="gradient-text">zincs</span>
            </h1>

            <p className="text-gray-500 text-sm mb-10 max-w-md animate-in animate-in-delay-2">
              Lives de cassino ao vivo e a melhor comunidade do Brasil. Entre e participe!
            </p>

          </div>
        </div>
      </section>

      {/* ─── Banner Parceiro Oficial — JonBet ─── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <style>{`
          @keyframes jbGlow {
            0%, 100% { box-shadow: 0 0 26px rgba(34,197,94,0.06), inset 0 0 40px rgba(34,197,94,0.02); border-color: rgba(34,197,94,0.18); }
            50%      { box-shadow: 0 0 44px rgba(34,197,94,0.12), inset 0 0 50px rgba(34,197,94,0.04); border-color: rgba(34,197,94,0.3); }
          }
          @keyframes jbShine { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }
          @keyframes jbFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
          @keyframes jbRise  { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
          .jb-banner  { animation: jbGlow 5s ease-in-out infinite, jbRise 0.6s ease-out both; }
          .jb-logo    { animation: jbFloat 4.5s ease-in-out infinite; }
          .jb-cta     { position: relative; overflow: hidden; }
          .jb-cta::after {
            content: ""; position: absolute; inset: 0;
            background: linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.4) 50%, transparent 65%);
            background-size: 220% 100%;
            animation: jbShine 3.6s ease-in-out infinite;
            pointer-events: none;
          }
        `}</style>

        <div className="jb-banner rounded-3xl overflow-hidden relative"
          style={{
            background: "linear-gradient(150deg, rgba(34,197,94,0.07) 0%, rgba(6,12,9,0.96) 45%, rgba(4,8,6,0.98) 100%)",
            border: "1px solid rgba(34,197,94,0.2)",
          }}>

          {/* Linha de luz no topo */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(34,197,94,0.5), transparent)" }} />
          {/* Orbe de brilho suave */}
          <div className="absolute -top-24 -left-16 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(34,197,94,0.1), transparent 70%)", filter: "blur(55px)" }} />

          <div className="relative px-6 sm:px-10 py-9 flex flex-col lg:flex-row items-center gap-8 text-center lg:text-left">
            <div className="flex-1 flex flex-col items-center lg:items-start">

              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5"
                style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                </span>
                <span className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: "#4ade80" }}>Parceiro Oficial</span>
              </div>

              {/* Logo */}
              <div className="jb-logo mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={JONBET_LOGO} alt="JonBet" className="h-8 sm:h-10 w-auto" style={{ filter: "drop-shadow(0 0 14px rgba(34,197,94,0.2))" }} />
              </div>

              {/* Headline */}
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3">
                A casa oficial do{" "}
                <span className="text-white">stain</span><span className="gradient-text">zincs</span>
              </h2>

              {/* Texto */}
              <p className="text-gray-400 text-sm sm:text-base max-w-lg leading-relaxed">
                A <strong className="text-white">melhor casa do Brasil</strong>, com o <strong className="text-white">saque mais rápido</strong> via Pix direto na sua conta.
                Cadastre-se agora e jogue junto com a comunidade!
              </p>
              <p className="text-[10px] text-gray-600 mt-3">+18 · Jogue com responsabilidade</p>
            </div>

            {/* CTA */}
            <div className="flex-shrink-0">
              <a
                href={JONBET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="jb-cta inline-flex items-center gap-2 px-9 py-4 rounded-2xl font-black text-black text-sm sm:text-base transition-all hover:scale-[1.04] active:scale-95"
                style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)", boxShadow: "0 8px 26px rgba(34,197,94,0.25)" }}
              >
                🎁 Cadastre-se agora
              </a>
            </div>
          </div>
        </div>
      </section>

      <SorteioDestaque />

    </div>
  );
}

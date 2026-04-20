import TwitchStatus from "@/components/TwitchStatus";
import SorteioDestaque from "@/components/SorteioDestaque";

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

      {/* Orbs animados */}
      <div className="orb w-[520px] h-[520px] bg-blue-900/25 -top-40 -left-32" style={{ animationDelay: "0s" }} />

      {/* Partículas */}
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
            background: i % 2 === 0 ? "rgba(37,99,235,0.6)" : "rgba(145,70,255,0.35)",
          }}
        />
      ))}

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 lg:pr-[38%]">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

          {/* Avatar */}
          <div className="flex-shrink-0 flex flex-col items-center gap-0 animate-in animate-in-delay-1">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#1d4ed8]/20 to-transparent blur-3xl scale-125 pointer-events-none" />
              <div className="glow-card w-52 h-52 lg:w-64 lg:h-64 rounded-full border-2 border-[#1d4ed8]/40 overflow-hidden relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://static-cdn.jtvnw.net/jtv_user_pictures/8c7083c8-3b8e-4f5e-abe2-d681f5b6df8b-profile_image-300x300.png"
                  alt="stainzincs"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                <TwitchStatus />
              </div>
            </div>

            {/* Links abaixo da foto */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <a
                href="https://twitch.tv/stainzincs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#9146ff]/15 border border-[#9146ff]/40 hover:bg-[#9146ff]/25 hover:border-[#9146ff]/70 transition-all shadow-lg shadow-purple-950/30"
              >
                <TwitchIcon className="w-5 h-5 text-[#9146ff]" />
              </a>

              <a
                href="https://www.betdasorte.bet.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2 rounded-full bg-[#1d4ed8]/10 border border-[#1d4ed8]/30 hover:bg-[#1d4ed8]/20 hover:border-[#1d4ed8]/60 transition-all shadow-lg shadow-blue-950/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/betdasorte-icon.svg" alt="Bet da Sorte" className="h-6 w-6" />
              </a>
            </div>
          </div>

          {/* Texto */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#1d4ed8]/25 bg-[#1d4ed8]/8 mb-5 animate-in animate-in-delay-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse" />
              <span className="text-xs text-[#93c5fd] font-semibold uppercase tracking-widest">Streamer Oficial</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-black tracking-tight mb-3 animate-in animate-in-delay-2">
              <span className="text-white">stain</span><span className="gradient-text">zincs</span>
            </h1>

            <p className="text-gray-400 text-lg mb-2 animate-in animate-in-delay-2">
              Parceiro oficial{" "}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/betdasorte-logo.svg" alt="Bet da Sorte" className="inline-block h-5 w-auto align-middle ml-1" />
            </p>
            <p className="text-gray-500 text-sm mb-10 max-w-md animate-in animate-in-delay-2">
              Lives de cassino ao vivo e a melhor comunidade do Brasil. Entre e participe!
            </p>

          </div>
        </div>
      </section>

      {/* ── SORTEIOS ATIVOS ──────────────────────────────────── */}
      <SorteioDestaque />

      {/* ── SEÇÃO BET DA SORTE ───────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 animate-in" style={{ animationDelay: "0.2s", opacity: 0 }}>
        <div className="relative rounded-2xl overflow-hidden border border-[#1d4ed8]/20"
          style={{ background: "linear-gradient(135deg, rgba(2,4,12,0.98) 0%, rgba(7,15,46,0.96) 50%, rgba(2,4,12,0.98) 100%)" }}>

          {/* Glow azul suave */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 70% at 50% 50%, rgba(29,78,216,0.1) 0%, transparent 70%)" }} />

          <div className="relative flex flex-col lg:flex-row items-center gap-10 px-8 py-12 lg:px-16">

            {/* Logo */}
            <div className="flex-shrink-0" style={{ animation: "float 5s ease-in-out infinite" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/betdasorte-logo.svg" alt="Bet da Sorte" className="h-12 lg:h-16 w-auto" />
            </div>

            {/* Divisor */}
            <div className="hidden lg:block w-px h-16 bg-[#1d4ed8]/25" />

            {/* Texto */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#ffba00]/40 bg-[#ffba00]/10 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ffba00] animate-pulse" />
                <span className="text-xs font-bold text-[#ffba00] uppercase tracking-widest">Parceiro Oficial</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-black text-white mb-2">
                Jogue na melhor plataforma do Brasil
              </h2>
              <p className="text-gray-400 text-sm max-w-md">
                Cassino ao vivo, esportes e muito mais. Use o bônus exclusivo do stainzincs e comece a jogar agora!
              </p>
            </div>

            {/* CTA */}
            <div className="flex-shrink-0">
              <a
                href="https://www.betdasorte.bet.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full font-black text-black text-sm transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,186,0,0.4)]"
                style={{ background: "linear-gradient(135deg, #ffba00, #e6a000)" }}
              >
                Jogar Agora
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 transition-transform group-hover:translate-x-1">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>

          {/* Linha topo */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2563eb]/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#1d4ed8]/25 to-transparent" />
        </div>
      </section>

    </div>
  );
}

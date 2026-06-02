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

      <div className="orb w-[520px] h-[520px] bg-blue-900/25 -top-40 -left-32" style={{ animationDelay: "0s" }} />

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

      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 lg:pr-[38%]">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

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

            <div className="mt-8 flex items-center justify-center gap-3">
              <a
                href="https://twitch.tv/stainzincs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#9146ff]/15 border border-[#9146ff]/40 hover:bg-[#9146ff]/25 hover:border-[#9146ff]/70 transition-all shadow-lg shadow-purple-950/30"
              >
                <TwitchIcon className="w-5 h-5 text-[#9146ff]" />
              </a>

              {/* Logo JonBet — parceiro oficial, clicável */}
              <a
                href={JONBET_URL}
                target="_blank"
                rel="noopener noreferrer"
                title="Parceiro oficial — JonBet"
                className="flex items-center px-4 py-2 rounded-full transition-all hover:scale-[1.04]"
                style={{ background: "rgba(31,224,107,0.1)", border: "1px solid rgba(31,224,107,0.35)", boxShadow: "0 0 18px rgba(31,224,107,0.12)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={JONBET_LOGO} alt="JonBet" className="h-5 w-auto" />
              </a>
            </div>
          </div>

          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#1d4ed8]/25 bg-[#1d4ed8]/8 mb-5 animate-in animate-in-delay-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse" />
              <span className="text-xs text-[#93c5fd] font-semibold uppercase tracking-widest">Streamer Oficial</span>
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
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-3xl overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, rgba(31,224,107,0.12), rgba(8,20,12,0.9))",
            border: "1px solid rgba(31,224,107,0.3)",
            boxShadow: "0 0 60px rgba(31,224,107,0.1)",
          }}>
          {/* brilho de fundo */}
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(31,224,107,0.18), transparent 70%)", filter: "blur(40px)" }} />

          <div className="relative px-6 sm:px-10 py-10 flex flex-col lg:flex-row items-center gap-8 text-center lg:text-left">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
                style={{ background: "rgba(31,224,107,0.12)", border: "1px solid rgba(31,224,107,0.3)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#1fe06b] animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "#1fe06b" }}>Parceiro Oficial</span>
              </div>

              <div className="mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={JONBET_LOGO} alt="JonBet" className="h-10 w-auto mx-auto lg:mx-0" />
              </div>

              <p className="text-gray-400 text-sm sm:text-base max-w-lg leading-relaxed mb-1">
                A <strong className="text-white">JonBet</strong> é a casa oficial do <strong className="text-white">stainzincs</strong>!
                Cassino e apostas com saque rápido via Pix. Cadastre-se agora e jogue junto com a comunidade. 🎰
              </p>
              <p className="text-[11px] text-gray-600">+18 · Jogue com responsabilidade</p>
            </div>

            <a
              href={JONBET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 px-8 py-4 rounded-2xl font-black text-black text-sm transition-all hover:scale-[1.04] active:scale-95"
              style={{ background: "linear-gradient(135deg, #1fe06b, #16b85a)", boxShadow: "0 8px 28px rgba(31,224,107,0.35)" }}
            >
              🎁 Cadastre-se agora
            </a>
          </div>
        </div>
      </section>

      <SorteioDestaque />

    </div>
  );
}

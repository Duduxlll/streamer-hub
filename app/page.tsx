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

      <SorteioDestaque />

    </div>
  );
}

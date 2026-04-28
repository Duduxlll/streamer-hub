"use client";

import Link from "next/link";

function TwitchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

const overlayBase: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  fontWeight: 900,
  overflow: "hidden",
  userSelect: "none",
  pointerEvents: "none",
  whiteSpace: "nowrap",
  animationFillMode: "both",
};

export default function Footer() {
  return (
    <footer
      className="relative border-t border-[rgba(29,78,216,0.1)]"
      style={{ zIndex: 10, background: "rgb(2,4,12)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6">

        <div className="flex flex-col lg:flex-row items-start gap-10 lg:gap-20 mb-10">

          <div className="flex flex-wrap items-center gap-5 lg:gap-8">

            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://static-cdn.jtvnw.net/jtv_user_pictures/8c7083c8-3b8e-4f5e-abe2-d681f5b6df8b-profile_image-300x300.png"
                alt="stainzincs"
                className="w-11 h-11 rounded-full border-2 border-[#1d4ed8]/40 object-cover flex-shrink-0"
              />

              <span
                style={{
                  position: "relative",
                  display: "inline-block",
                  lineHeight: 1,
                  fontWeight: 900,
                  fontSize: "clamp(1.7rem, 3.5vw, 2.5rem)",
                  animation: "glitch-body 3s 0s infinite linear",
                }}
              >
                <span style={{ fontWeight: 900 }}>
                  <span style={{ color: "#ffffff" }}>stain</span>
                  <span
                    style={{
                      background: "linear-gradient(135deg, #1d4ed8 0%, #93c5fd 50%, #1d4ed8 100%)",
                      backgroundSize: "200% auto",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      animation: "shimmer 3.5s linear infinite",
                      fontWeight: 900,
                    }}
                  >
                    zincs
                  </span>
                </span>

                <span
                  aria-hidden
                  style={{
                    ...overlayBase,
                    color: "rgba(0,200,255,0.9)",
                    transform: "translateX(-4px)",
                    animation: "glitch-overlay-a 3s 0s infinite linear",
                  }}
                >
                  stainzincs
                </span>

                <span
                  aria-hidden
                  style={{
                    ...overlayBase,
                    color: "rgba(255,0,64,0.9)",
                    transform: "translateX(4px)",
                    animation: "glitch-overlay-b 3s 0s infinite linear",
                  }}
                >
                  stainzincs
                </span>
              </span>
            </div>

            <span className="text-2xl font-black text-gray-600 select-none">×</span>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/betdasorte-logo.svg"
              alt="Bet da Sorte"
              className="h-9 w-auto flex-shrink-0"
            />
          </div>

          <div className="hidden lg:block flex-1" />

          <div className="grid grid-cols-2 gap-6 sm:gap-12 shrink-0">

            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-4">
                Links Rápidos
              </p>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/arena" className="text-sm text-gray-400 hover:text-purple-300 transition-colors">
                    Arena
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-4">
                Redes Sociais
              </p>
              <ul className="space-y-2.5">
                <li>
                  <a
                    href="https://twitch.tv/stainzincs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-purple-300 transition-colors"
                  >
                    <TwitchIcon className="w-3.5 h-3.5" />
                    Twitch
                  </a>
                </li>
                <li>
                  <a
                    href="https://instagram.com/stainzincs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#e1306c] transition-colors"
                  >
                    <InstagramIcon className="w-3.5 h-3.5" />
                    Instagram
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <div className="flex flex-wrap items-center justify-between gap-y-2 text-xs text-gray-600">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>© 2026 stainzincs</span>
              <span>·</span>
              <span>Todos os direitos reservados</span>
              <span>·</span>
              <span>+18</span>
              <span>·</span>
              <span>Jogue com responsabilidade</span>
            </div>
            <div className="flex items-center gap-x-3">
              <Link href="/termos" className="hover:text-gray-300 transition-colors">Termos</Link>
              <span>·</span>
              <Link href="/privacidade" className="hover:text-gray-300 transition-colors">Privacidade</Link>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}

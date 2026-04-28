"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { isAdmin } from "@/lib/admins";

function NavLink({ href, label, from, to, alsoActiveOn }: { href: string; label: string; from: string; to: string; alsoActiveOn?: string[] }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" :
    pathname.startsWith(href) || (alsoActiveOn?.some(p => pathname.startsWith(p)) ?? false);
  return (
    <Link
      href={href}
      className="relative px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 group"
    >
      <span
        className={`transition-all duration-200 ${active ? "font-black" : "text-gray-400 group-hover:text-white"}`}
        style={active ? {
          background: `linear-gradient(135deg, ${from}, ${to})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        } : {}}
      >
        {label}
      </span>
      <span
        className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300 ${
          active ? "w-4/5" : "w-0 group-hover:w-4/5"
        }`}
        style={{
          background: `linear-gradient(90deg, ${from}, ${to})`,
          boxShadow: active ? `0 0 8px ${from}cc` : undefined,
        }}
      />
    </Link>
  );
}

function TwitchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  );
}

function nameToColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const s = 0.65, l = 0.58;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const r = Math.round(hue2rgb(hue / 360 + 1 / 3) * 255);
  const g = Math.round(hue2rgb(hue / 360) * 255);
  const b = Math.round(hue2rgb(hue / 360 - 1 / 3) * 255);
  return `${r},${g},${b}`;
}

function useImageColor(src: string | null | undefined, name: string): string {
  const fallback = nameToColor(name);
  const [color, setColor] = useState(fallback);

  useEffect(() => {
    setColor(nameToColor(name));
  }, [name]);

  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 16; canvas.height = 16;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i], pg = data[i + 1], pb = data[i + 2], pa = data[i + 3];
          if (pa < 128) continue;
          const max = Math.max(pr, pg, pb);
          const min = Math.min(pr, pg, pb);
          if (max - min < 20) continue;
          r += pr; g += pg; b += pb; count++;
        }
        if (count > 0) {
          setColor(`${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)}`);
        }
      } catch { }
    };
    img.onerror = () => setColor(nameToColor(name));
    img.src = src;
  }, [src, name]);

  return color;
}

function useConfigAlert(admin: boolean) {
  const [alerta, setAlerta] = useState(false);
  useEffect(() => {
    if (!admin) return;
    fetch("/api/config")
      .then(r => r.ok ? r.json() : null)
      .then((d: { ggpix?: { ok: boolean }; livepix?: { ok: boolean } } | null) => {
        if (!d) return;
        setAlerta(!d.ggpix?.ok);
      })
      .catch(() => {});
  }, [admin]);
  return alerta;
}

function UserMenu({ name, image, admin }: { name: string; image?: string | null; admin: boolean }) {
  const [open, setOpen] = useState(false);
  const color = useImageColor(image, name);
  const configAlerta = useConfigAlert(admin);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all"
        style={{
          border: `1px solid rgba(${color},0.45)`,
          background: `rgba(${color},0.12)`,
        }}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-[#9146ff]/50 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-white uppercase">{name[0]}</span>
          </div>
        )}
        <span className="text-sm font-semibold max-w-[100px] truncate" style={{ color: `rgb(${color})`, filter: "brightness(1.4) saturate(0.9)" }}>{name}</span>

        {admin && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black tracking-wide"
            style={{ background: "rgba(255,186,0,0.15)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.35)" }}>
            👑 Admin
          </span>
        )}
        {configAlerta && (
          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" title="Há problemas de configuração" />
        )}

        <svg className={`w-3 h-3 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/8 bg-[#070f1f] shadow-2xl shadow-black/50 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-bold text-white truncate">{name}</p>
                {admin && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(255,186,0,0.15)", color: "#ffba00" }}>
                    👑 Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600">Twitch</p>
            </div>
            {admin && (
              <>
                <Link
                  href="/admin/palpites"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold hover:bg-white/5 transition-colors"
                  style={{ color: "#ffba00" }}
                >
                  <span className="text-base">🎯</span>
                  Admin · Palpites
                </Link>
                <Link
                  href="/admin/torneio"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold hover:bg-white/5 transition-colors"
                  style={{ color: "#ffba00" }}
                >
                  <span className="text-base">🏆</span>
                  Admin · Torneio
                </Link>
                <Link
                  href="/admin/sorteio"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold hover:bg-white/5 transition-colors"
                  style={{ color: "#ffba00" }}
                >
                  <span className="text-base">🎟️</span>
                  Admin · Sorteio
                </Link>
                <Link
                  href="/admin/batalha"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold hover:bg-white/5 transition-colors"
                  style={{ color: "#ffba00" }}
                >
                  <span className="text-base">⚔️</span>
                  Admin · Batalha
                </Link>
                <Link
                  href="/admin/jackpot"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold hover:bg-white/5 transition-colors"
                  style={{ color: "#ffba00" }}
                >
                  <span className="text-base">🎰</span>
                  Admin · Jackpot
                </Link>
                <Link
                  href="/admin/gorjeta"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold hover:bg-white/5 transition-colors"
                  style={{ color: "#ffba00" }}
                >
                  <span className="text-base">💰</span>
                  Admin · Gorjeta
                </Link>
                <div className="border-t border-white/5 my-1" />
                <Link
                  href="/admin/config"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold hover:bg-white/5 transition-colors"
                  style={{ color: configAlerta ? "#ef4444" : "#6b7280" }}
                >
                  <span className="text-base">{configAlerta ? "⚠️" : "⚙️"}</span>
                  <span className="flex-1">Configurações</span>
                  {configAlerta && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                </Link>
              </>
            )}
            <button
              onClick={() => { setOpen(false); signOut({ callbackUrl: "/" }); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              Sair da conta
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const isLoggedIn = status === "authenticated";
  const admin = isAdmin(session?.user?.twitchLogin);

  return (
    <nav className="navbar-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-[#1d4ed8]/40 shadow-lg shadow-blue-950/50 group-hover:shadow-blue-700/40 transition-all flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://static-cdn.jtvnw.net/jtv_user_pictures/8c7083c8-3b8e-4f5e-abe2-d681f5b6df8b-profile_image-300x300.png"
                alt="stainzincs"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-bold text-lg tracking-tight">
              <span className="text-white">stain</span>
              <span className="gradient-text">zincs</span>
            </span>
          </Link>

          <a
            href="https://www.betdasorte.bet.br/?affiliate=hotaeqgfhbzovkzkuicsvyxop&activateModal=signup&ID=533314"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1d4ed8]/40 bg-[#1d4ed8]/8 hover:bg-[#1d4ed8]/15 transition-all"
          >
            <span className="text-xs text-gray-500 uppercase tracking-widest">parceiro</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/betdasorte-logo.svg" alt="Bet da Sorte" className="h-4 w-auto" />
          </a>

          <div className="hidden md:flex items-center gap-2">
            <NavLink href="/" label="Home" from="#93c5fd" to="#3b82f6" />
            <NavLink href="/arena" label="Arena" from="#c084fc" to="#9146ff" alsoActiveOn={["/admin/palpites", "/admin/torneio", "/admin/batalha", "/admin/jackpot"]} />
            <NavLink href={admin ? "/admin/sorteio" : "/sorteio"} label="Sorteio" from="#ffba00" to="#e6a000" alsoActiveOn={["/admin/sorteio", "/sorteio"]} />
            <NavLink href={admin ? "/admin/gorjeta" : "/gorjeta"} label="Gorjeta" from="#4ade80" to="#22c55e" alsoActiveOn={["/admin/gorjeta", "/gorjeta"]} />
          </div>

          <div className="hidden md:flex items-center">
            {isLoading && (
              <div className="w-8 h-8 rounded-full border-2 border-[#9146ff]/40 border-t-[#9146ff] animate-spin" />
            )}
            {!isLoading && isLoggedIn && session.user && (
              <UserMenu
                name={session.user.twitchLogin ?? session.user.name ?? "Usuário"}
                image={session.user.image}
                admin={admin}
              />
            )}
            {!isLoading && !isLoggedIn && (
              <Link
                href="/login"
                className="btn-twitch flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold text-white"
              >
                <TwitchIcon className="w-4 h-4" />
                Login com Twitch
              </Link>
            )}
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(29,78,216,0.12)] transition-colors"
          >
            <div className="space-y-1.5">
              <span className={`block h-0.5 w-6 bg-current transition-all duration-300 ${open ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block h-0.5 w-6 bg-current transition-all duration-300 ${open ? "opacity-0 scale-x-0" : ""}`} />
              <span className={`block h-0.5 w-6 bg-current transition-all duration-300 ${open ? "-rotate-45 -translate-y-2" : ""}`} />
            </div>
          </button>
        </div>

        {open && (
          <div className="md:hidden pb-4 space-y-1 border-t border-white/5 pt-2 mt-1">
            <div onClick={() => setOpen(false)} className="block px-0">
              <NavLink href="/" label="Home" from="#93c5fd" to="#3b82f6" />
            </div>
            <div onClick={() => setOpen(false)} className="block px-0">
              <NavLink href="/arena" label="Arena" from="#c084fc" to="#9146ff" alsoActiveOn={["/admin/palpites", "/admin/torneio", "/admin/batalha", "/admin/jackpot"]} />
            </div>
            <div onClick={() => setOpen(false)} className="block px-0">
              <NavLink href={admin ? "/admin/sorteio" : "/sorteio"} label="Sorteio" from="#ffba00" to="#e6a000" alsoActiveOn={["/admin/sorteio", "/sorteio"]} />
            </div>
            <div onClick={() => setOpen(false)} className="block px-0">
              <NavLink href={admin ? "/admin/gorjeta" : "/gorjeta"} label="Gorjeta" from="#4ade80" to="#22c55e" alsoActiveOn={["/admin/gorjeta", "/gorjeta"]} />
            </div>
            <a
              href="https://twitch.tv/stainzincs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm text-gray-300 hover:text-purple-300 hover:bg-[rgba(145,70,255,0.08)]"
              onClick={() => setOpen(false)}
            >
              <TwitchIcon className="w-4 h-4 text-purple-400" />
              Twitch
            </a>
            <div className="pt-2 px-4">
              {isLoggedIn && session.user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    {session.user.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
                    )}
                    <span className="text-sm font-semibold text-white">
                      {session.user.twitchLogin ?? session.user.name}
                    </span>
                  </div>
                  <button
                    onClick={() => { setOpen(false); signOut({ callbackUrl: "/" }); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold text-red-400 border border-red-500/30 bg-red-500/8 hover:bg-red-500/15 transition-all"
                  >
                    Sair da conta
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="btn-twitch flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-sm font-bold text-white"
                  onClick={() => setOpen(false)}
                >
                  <TwitchIcon className="w-4 h-4" />
                  Login com Twitch
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

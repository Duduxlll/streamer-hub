"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/lib/admins";

const STREAMER_IMG = "https://static-cdn.jtvnw.net/jtv_user_pictures/8c7083c8-3b8e-4f5e-abe2-d681f5b6df8b-profile_image-300x300.png";

interface StatusData { cadastrosPendentes: number }

// ── Active link helper ────────────────────────────────────────────────────────

function useLinkActive(href: string) {
  const pathname = usePathname();
  const params   = useSearchParams();
  const [path, qs] = href.split("?");

  if (path === "/admin") return pathname === "/admin";
  if (pathname !== path) return false;

  const hrefEntries = [...new URLSearchParams(qs ?? "").entries()];

  // Sem params no href → ativo só quando não há nenhum param de navegação na URL
  if (hrefEntries.length === 0) {
    return !params.get("tab") && !params.get("view");
  }

  // Com params → todos devem casar com os da URL atual
  return hrefEntries.every(([key, val]) => params.get(key) === val);
}

// ── Sub-link ─────────────────────────────────────────────────────────────────

function SideLink({
  href, icon, label, dot, onClose,
}: {
  href: string; icon: string; label: string;
  dot?: "yellow" | "green"; onClose?: () => void;
}) {
  const active = useLinkActive(href);
  return (
    <Link href={href} onClick={onClose}
      className="flex items-center gap-2.5 pl-9 pr-3 py-1.5 rounded-xl text-xs font-bold transition-all relative overflow-hidden"
      style={active
        ? { background: "rgba(255,186,0,0.12)", color: "#ffba00", boxShadow: "inset 0 0 12px rgba(255,186,0,0.06)" }
        : { color: "#4b5563" }}>
      {active && (
        <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-yellow-400"
          style={{ boxShadow: "0 0 6px #ffba00" }} />
      )}
      <span className="text-sm w-4 text-center flex-shrink-0">{icon}</span>
      <span className="truncate flex-1">{label}</span>
      {dot && (
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${dot === "yellow" ? "bg-yellow-400" : "bg-green-400"}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dot === "yellow" ? "bg-yellow-400" : "bg-green-400"}`} />
        </span>
      )}
    </Link>
  );
}

// ── Accordion group ───────────────────────────────────────────────────────────

function AccordionGroup({
  icon, label, children, defaultPaths, onClose,
}: {
  icon: string; label: string; children: React.ReactNode;
  defaultPaths: string[]; onClose?: () => void;
}) {
  const pathname     = usePathname();
  const isPathActive = defaultPaths.some(p => pathname.startsWith(p));
  const [open, setOpen] = useState(isPathActive);

  useEffect(() => { if (isPathActive) setOpen(true); }, [isPathActive]);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black transition-all hover:bg-white/[0.03]"
        style={{ color: isPathActive ? "#e5e7eb" : "#6b7280" }}>
        <span className="text-sm w-4 text-center flex-shrink-0">{icon}</span>
        {/* whitespace-normal permite que textos longos quebrem linha */}
        <span className="flex-1 text-left leading-tight whitespace-normal">{label}</span>
        <span
          className="text-gray-700 flex-shrink-0 transition-transform duration-300"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>
          ▾
        </span>
      </button>

      {/* Slide-down animation */}
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? "300px" : "0px", opacity: open ? 1 : 0 }}>
        <div className="mt-0.5 space-y-0.5 pb-1">
          {children}
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="mx-3 my-2" style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />;
}

// ── Sidebar content ───────────────────────────────────────────────────────────

function SidebarContent({ status, onClose }: { status: StatusData; onClose?: () => void }) {
  const pending = status.cadastrosPendentes;

  return (
    <div className="flex flex-col h-full">
      {/* Logo com foto do streamer */}
      <div className="px-4 py-4 border-b border-white/5 flex-shrink-0">
        <Link href="/admin" onClick={onClose} className="flex items-center gap-3 group">
          <div className="relative flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={STREAMER_IMG}
              alt="stainzincs"
              className="w-8 h-8 rounded-xl object-cover"
              style={{ border: "2px solid rgba(255,186,0,0.4)", boxShadow: "0 0 12px rgba(255,186,0,0.25)" }}
            />
            {/* Pulsing glow */}
            <span className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ boxShadow: "0 0 16px rgba(255,186,0,0.4)" }} />
          </div>
          <div>
            <p className="text-sm font-black text-white leading-tight">Painel Admin</p>
            <p className="text-[10px] text-gray-600 leading-tight">stainzincs</p>
          </div>
        </Link>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5"
        style={{ scrollbarWidth: "none" }}>

        {/* Dashboard */}
        <SideLink href="/admin" icon="◈" label="Dashboard" onClose={onClose} />

        <Divider />

        {/* Gorjeta */}
        <AccordionGroup icon="💰" label="Gorjeta" defaultPaths={["/admin/gorjeta"]} onClose={onClose}>
          <SideLink href="/admin/gorjeta"                  icon="▶"  label="Sessão"     onClose={onClose} />
          <SideLink href="/admin/gorjeta/pagamentos"       icon="💳" label="Pagamentos" onClose={onClose} />
          <SideLink href="/admin/gorjeta?tab=cadastros"    icon="📋" label="Cadastros"  onClose={onClose}
            dot={pending > 0 ? "yellow" : undefined} />
          <SideLink href="/admin/gorjeta?tab=historico"    icon="📜" label="Histórico"  onClose={onClose} />
        </AccordionGroup>

        <Divider />

        {/* Interações com a live */}
        <AccordionGroup
          icon="📺" label="Interações com a live"
          defaultPaths={["/admin/palpites", "/admin/jackpot", "/admin/torneio", "/admin/batalha", "/admin/call"]}
          onClose={onClose}>
          <SideLink href="/admin/palpites" icon="🎯" label="Palpites"     onClose={onClose} />
          <SideLink href="/admin/jackpot"  icon="🎰" label="Jackpot"      onClose={onClose} />
          <SideLink href="/admin/torneio"  icon="🏆" label="Torneio"      onClose={onClose} />
          <SideLink href="/admin/batalha"  icon="⚔️"  label="Batalha"     onClose={onClose} />
          <SideLink href="/admin/call"     icon="📋" label="Call de Slot" onClose={onClose} />
        </AccordionGroup>

        <Divider />

        {/* Sorteio */}
        <AccordionGroup icon="🎁" label="Sorteio" defaultPaths={["/admin/sorteio"]} onClose={onClose}>
          <SideLink href="/admin/sorteio?view=criar" icon="✨" label="Criar Sorteio"  onClose={onClose} />
          <SideLink href="/admin/sorteio"            icon="🟢" label="Sorteio Ativo" onClose={onClose} />
        </AccordionGroup>

      </nav>

      {/* Nav inferior */}
      <div className="border-t border-white/5 py-3 px-2 space-y-0.5 flex-shrink-0">
        <SideLink href="/admin/usuarios" icon="👥" label="Usuários"          onClose={onClose} />
        <SideLink href="/admin/logs"     icon="🔒" label="Logs de Segurança" onClose={onClose} />
        <SideLink href="/admin/config"   icon="⚙️"  label="Configurações"    onClose={onClose} />
        <div className="mt-2 px-1">
          <Link href="/" className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors"
            style={{ color: "#374151" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#9ca3af"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#374151"; e.currentTarget.style.background = "transparent"; }}>
            ← Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Layout principal ──────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sideStatus, setSideStatus] = useState<StatusData>({ cadastrosPendentes: 0 });

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !isAdmin(session?.user?.twitchLogin)) router.replace("/");
  }, [status, session, router]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/gorjeta?tipo=cadastros");
      if (!res.ok) return;
      const data = await res.json() as { cadastros?: Array<{ status: string }> };
      const pending = (data.cadastros ?? []).filter(c => c.status === "pendente").length;
      setSideStatus({ cadastrosPendentes: pending });
    } catch { /**/ }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchStatus();
    const iv = setInterval(fetchStatus, 15_000);
    return () => clearInterval(iv);
  }, [status, fetchStatus]);

  if (status === "loading" || (status === "authenticated" && !isAdmin(session?.user?.twitchLogin))) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#ffba00] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes sidebarFadeIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes cardPop {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .admin-sidebar-anim { animation: sidebarFadeIn 0.3s ease-out both; }
        .admin-card-anim    { animation: cardPop 0.4s ease-out both; }
      `}</style>

      <div className="flex relative">
        {/* Sidebar desktop */}
        <aside
          className="admin-sidebar-anim hidden md:flex flex-col fixed left-0 top-16 w-56 h-[calc(100vh-4rem)] z-30"
          style={{
            background: "rgba(4,3,14,0.97)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(24px)",
          }}>
          <SidebarContent status={sideStatus} />
        </aside>

        {/* Botão hamburguer mobile */}
        <button
          className="md:hidden fixed bottom-5 right-5 z-50 w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-2xl transition-transform hover:scale-110 active:scale-95"
          style={{ background: "linear-gradient(135deg, #ffba00, #ff8c00)", color: "#000" }}
          onClick={() => setMobileOpen(true)}>
          ☰
        </button>

        {/* Drawer mobile */}
        {mobileOpen && (
          <>
            <div className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)} />
            <aside
              className="admin-sidebar-anim md:hidden fixed left-0 top-0 w-64 h-full z-50 flex flex-col"
              style={{ background: "rgba(4,3,14,0.99)", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
                <span className="text-sm font-black text-white">Painel Admin</span>
                <button onClick={() => setMobileOpen(false)} className="text-gray-500 hover:text-white text-lg transition-colors">✕</button>
              </div>
              <div className="flex-1 overflow-hidden">
                <SidebarContent status={sideStatus} onClose={() => setMobileOpen(false)} />
              </div>
            </aside>
          </>
        )}

        {/* Conteúdo principal */}
        <main className="flex-1 md:ml-56 min-h-[calc(100vh-4rem)] w-full">
          {children}
        </main>
      </div>
    </>
  );
}

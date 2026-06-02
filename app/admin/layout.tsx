"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/lib/admins";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  tab?: string;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    items: [
      { href: "/admin", label: "Dashboard", icon: "◈" },
    ],
  },
  {
    items: [
      { href: "/admin/gorjeta", label: "Gorjeta", icon: "💰", tab: "sessao" },
      { href: "/admin/gorjeta?tab=cadastros", label: "Cadastros", icon: "📋" },
      { href: "/admin/gorjeta?tab=historico", label: "Histórico", icon: "📜" },
    ],
  },
  {
    label: "INTERAÇÕES COM A LIVE",
    items: [
      { href: "/admin/palpites", label: "Palpites",      icon: "🎯" },
      { href: "/admin/jackpot",  label: "Jackpot",       icon: "🎰" },
      { href: "/admin/torneio",  label: "Torneio",       icon: "🏆" },
      { href: "/admin/batalha",  label: "Batalha",       icon: "⚔️"  },
      { href: "/admin/call",     label: "Call de Slot",  icon: "📋" },
    ],
  },
  {
    items: [
      { href: "/admin/sorteio", label: "Sorteio", icon: "🎁" },
    ],
  },
];

const NAV_BOTTOM: NavItem[] = [
  { href: "/admin/usuarios", label: "Usuários",          icon: "👥" },
  { href: "/admin/logs",     label: "Logs de Segurança", icon: "🔒" },
  { href: "/admin/config",   label: "Configurações",     icon: "⚙️"  },
];

function SidebarLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const currentTab  = searchParams.get("tab") ?? "";

  const hrefParts = item.href.split("?");
  const hrefPath  = hrefParts[0];
  const hrefTab   = new URLSearchParams(hrefParts[1] ?? "").get("tab") ?? "";

  const active = (() => {
    if (item.href === "/admin") return pathname === "/admin";
    if (!hrefTab) return pathname === hrefPath && !currentTab;
    return pathname === hrefPath && currentTab === hrefTab;
  })();

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all"
      style={active
        ? { background: "rgba(255,186,0,0.12)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.25)" }
        : { color: "#6b7280" }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#d1d5db"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "#6b7280"; e.currentTarget.style.background = "transparent"; } }}
    >
      <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
      <span className="font-bold text-xs truncate">{item.label}</span>
      {active && <span className="ml-auto w-1 h-4 rounded-full bg-yellow-400 flex-shrink-0" />}
    </Link>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/5 flex-shrink-0">
        <Link href="/admin" onClick={onClose} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black text-black"
            style={{ background: "linear-gradient(135deg, #ffba00, #ff8c00)" }}>
            A
          </div>
          <span className="text-sm font-black text-white">Painel Admin</span>
        </Link>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1"
        style={{ scrollbarWidth: "none" }}>
        {NAV.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-2" : ""}>
            {group.label && (
              <p className="px-3 py-1.5 text-[9px] font-black text-gray-700 uppercase tracking-widest">
                {group.label}
              </p>
            )}
            {gi > 0 && !group.label && gi !== NAV.length - 1 && (
              <div className="mx-3 my-2" style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
            )}
            {group.items.map(item => (
              <SidebarLink key={item.href} item={item} onClick={onClose} />
            ))}
          </div>
        ))}
      </nav>

      {/* Nav inferior */}
      <div className="border-t border-white/5 py-3 px-2 space-y-0.5 flex-shrink-0">
        {NAV_BOTTOM.map(item => (
          <SidebarLink key={item.href} item={item} onClick={onClose} />
        ))}
        <div className="mt-2 px-1">
          <Link href="/" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
            style={{ color: "#374151" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#9ca3af"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#374151"; }}>
            ← Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !isAdmin(session?.user?.twitchLogin)) router.replace("/");
  }, [status, session, router]);

  if (status === "loading" || (status === "authenticated" && !isAdmin(session?.user?.twitchLogin))) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#ffba00] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex relative">
      {/* Sidebar desktop — fixo, começa abaixo do navbar (top-16 = 4rem) */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-16 w-52 h-[calc(100vh-4rem)] z-30"
        style={{
          background: "rgba(4,3,14,0.97)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
        }}
      >
        <SidebarContent />
      </aside>

      {/* Botão hamburguer mobile */}
      <button
        className="md:hidden fixed bottom-5 right-5 z-50 w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-2xl"
        style={{ background: "linear-gradient(135deg, #ffba00, #ff8c00)", color: "#000" }}
        onClick={() => setMobileOpen(true)}
      >
        ☰
      </button>

      {/* Drawer mobile */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)} />
          <aside
            className="md:hidden fixed left-0 top-0 w-64 h-full z-50 flex flex-col"
            style={{
              background: "rgba(4,3,14,0.99)",
              borderRight: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
              <span className="text-sm font-black text-white">Painel Admin</span>
              <button onClick={() => setMobileOpen(false)} className="text-gray-500 hover:text-white transition-colors text-lg">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SidebarContent onClose={() => setMobileOpen(false)} />
            </div>
          </aside>
        </>
      )}

      {/* Conteúdo principal — com margin-left do sidebar no desktop */}
      <main className="flex-1 md:ml-52 min-h-[calc(100vh-4rem)] w-full">
        {children}
      </main>
    </div>
  );
}

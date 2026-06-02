"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DashData {
  ggpix: { ok: boolean };
  livepix: { ok: boolean };
}

interface UserStats { total: number; banidos: number; suspensos: number }

function StatusCard({ icon, title, subtitle, ok, href, badge }: {
  icon: string; title: string; subtitle: string; ok?: boolean; href: string; badge?: string;
}) {
  return (
    <Link href={href}
      className="rounded-2xl p-4 flex flex-col gap-3 transition-all hover:scale-[1.02] group"
      style={{
        background: "rgba(5,4,16,0.92)",
        border: ok === undefined
          ? "1px solid rgba(255,255,255,0.08)"
          : ok
            ? "1px solid rgba(34,197,94,0.2)"
            : "1px solid rgba(234,179,8,0.25)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      }}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black"
              style={{ background: "rgba(255,186,0,0.15)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.3)" }}>
              {badge}
            </span>
          )}
          {ok !== undefined && (
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ok ? "bg-green-400" : "bg-yellow-400"}`}
              style={ok ? { boxShadow: "0 0 6px #4ade80" } : {}} />
          )}
        </div>
      </div>
      <div>
        <p className="text-sm font-black text-white group-hover:text-[#ffba00] transition-colors">{title}</p>
        <p className="text-[11px] text-gray-600 mt-0.5">{subtitle}</p>
      </div>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const [dash, setDash] = useState<DashData | null>(null);
  const [users, setUsers] = useState<UserStats | null>(null);

  useEffect(() => {
    fetch("/api/config").then(r => r.ok ? r.json() : null).then(d => setDash(d)).catch(() => {});
    fetch("/api/admin/users").then(r => r.ok ? r.json() : null).then(d => {
      if (!d?.users) return;
      const list = d.users as Array<{ status: string }>;
      setUsers({ total: list.length, banidos: list.filter(u => u.status === "banido").length, suspensos: list.filter(u => u.status === "suspenso").length });
    }).catch(() => {});
  }, []);

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Visão geral do painel de administração</p>
      </div>

      {/* Integrações */}
      <div className="mb-6">
        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3">Integrações</p>
        <div className="grid grid-cols-2 gap-3">
          <StatusCard icon="💰" title="GGPix" subtitle="API PIX — gorjetas"
            ok={dash?.ggpix.ok} href="/admin/gorjeta" />
          <StatusCard icon="🎰" title="LivePix" subtitle="Doações — jackpot"
            ok={dash?.livepix.ok} href="/admin/jackpot" />
        </div>
        {dash && (!dash.ggpix.ok || !dash.livepix.ok) && (
          <Link href="/admin/config"
            className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black text-yellow-400 transition-all hover:bg-yellow-400/5"
            style={{ border: "1px solid rgba(234,179,8,0.2)" }}>
            ⚠️ Configurações pendentes — clique para configurar
          </Link>
        )}
      </div>

      {/* Funcionalidades */}
      <div className="mb-6">
        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3">Funcionalidades</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatusCard icon="💰" title="Gorjeta"      subtitle="Sessão · Cadastros · Histórico" href="/admin/gorjeta" />
          <StatusCard icon="🎯" title="Palpites"     subtitle="Rodadas e apostas"              href="/admin/palpites" />
          <StatusCard icon="🎰" title="Jackpot"      subtitle="Doações LivePix"               href="/admin/jackpot" />
          <StatusCard icon="🏆" title="Torneio"      subtitle="Competições"                   href="/admin/torneio" />
          <StatusCard icon="⚔️"  title="Batalha"     subtitle="Batalha de bônus"              href="/admin/batalha" />
          <StatusCard icon="📋" title="Call de Slot" subtitle="Chamadas ao vivo"              href="/admin/call" />
          <StatusCard icon="🎁" title="Sorteio"      subtitle="Sorteios públicos"             href="/admin/sorteio" />
        </div>
      </div>

      {/* Usuários */}
      <div>
        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3">Usuários &amp; Segurança</p>
        <div className="grid grid-cols-2 gap-3">
          <StatusCard icon="👥" title="Usuários"
            subtitle={users ? `${users.total} cadastrados · ${users.banidos} banidos · ${users.suspensos} suspensos` : "Carregando..."}
            href="/admin/usuarios"
            badge={users && users.banidos > 0 ? `${users.banidos} banidos` : undefined}
          />
          <StatusCard icon="🔒" title="Logs de Segurança"
            subtitle="Histórico de ações admin"
            href="/admin/logs" />
        </div>
      </div>
    </div>
  );
}

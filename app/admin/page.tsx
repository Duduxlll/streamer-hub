"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ConfigData { ggpix: { ok: boolean }; livepix: { ok: boolean } }
interface UserStats  { total: number; banidos: number; suspensos: number }
interface SiteStatus {
  gorjeta:  { sessaoAtiva: boolean; cadastrosPendentes: number };
  palpites: { rodadaAtiva: boolean };
}

function ActiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
    </span>
  );
}

function Card({ icon, title, subtitle, href, active, badge, warn }: {
  icon: string; title: string; subtitle: string; href: string;
  active?: boolean; badge?: string; warn?: boolean;
}) {
  return (
    <Link href={href}
      className="rounded-2xl p-4 flex flex-col gap-3 transition-all hover:scale-[1.02] group cursor-pointer"
      style={{
        background: "rgba(5,4,16,0.92)",
        border: warn
          ? "1px solid rgba(234,179,8,0.25)"
          : active
            ? "1px solid rgba(34,197,94,0.2)"
            : "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
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
          {active && <ActiveDot />}
          {warn && !active && <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" style={{ boxShadow: "0 0 6px #fbbf24" }} />}
        </div>
      </div>
      <div>
        <p className="text-sm font-black text-white group-hover:text-[#ffba00] transition-colors">{title}</p>
        <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3">{children}</p>;
}

export default function AdminDashboardPage() {
  const [config,  setConfig]  = useState<ConfigData | null>(null);
  const [users,   setUsers]   = useState<UserStats | null>(null);
  const [siteStatus, setSiteStatus] = useState<SiteStatus | null>(null);

  useEffect(() => {
    // Config (integrações)
    fetch("/api/config").then(r => r.ok ? r.json() : null).then(d => setConfig(d)).catch(() => {});

    // Usuários
    fetch("/api/admin/users").then(r => r.ok ? r.json() : null).then(d => {
      if (!d?.users) return;
      const list = d.users as Array<{ status: string }>;
      setUsers({ total: list.length, banidos: list.filter(u => u.status === "banido").length, suspensos: list.filter(u => u.status === "suspenso").length });
    }).catch(() => {});

    // Status de features ativas
    Promise.all([
      fetch("/api/gorjeta").then(r => r.ok ? r.json() : null),
      fetch("/api/gorjeta?tipo=cadastros").then(r => r.ok ? r.json() : null),
    ]).then(([gorjetaData, cadastrosData]) => {
      const sessao   = gorjetaData?.sessao;
      const cadastros = cadastrosData?.cadastros ?? [];
      setSiteStatus({
        gorjeta: {
          sessaoAtiva: sessao?.status === "aberta" || sessao?.status === "sorteada",
          cadastrosPendentes: cadastros.filter((c: { status: string }) => c.status === "pendente").length,
        },
        palpites: { rodadaAtiva: false },
      });
    }).catch(() => {});
  }, []);

  const gorjetaPendentes = siteStatus?.gorjeta.cadastrosPendentes ?? 0;

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-24 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Visão geral do painel de administração</p>
      </div>

      {/* ── Gorjeta ──────────────────────────────────────────── */}
      <div>
        <SectionLabel>Gorjeta</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card icon="▶" title="Sessão"
            subtitle={siteStatus?.gorjeta.sessaoAtiva ? "Gorjeta ao vivo" : "Nenhuma sessão ativa"}
            href="/admin/gorjeta"
            active={siteStatus?.gorjeta.sessaoAtiva} />
          <Card icon="📋" title="Cadastros"
            subtitle={gorjetaPendentes > 0 ? `${gorjetaPendentes} pendentes de aprovação` : "Nenhum cadastro pendente"}
            href="/admin/gorjeta?tab=cadastros"
            warn={gorjetaPendentes > 0}
            badge={gorjetaPendentes > 0 ? `${gorjetaPendentes}` : undefined} />
          <Card icon="📜" title="Histórico"
            subtitle="Sessões encerradas e transações"
            href="/admin/gorjeta?tab=historico" />
        </div>
      </div>

      {/* ── Interações com a live ─────────────────────────────── */}
      <div>
        <SectionLabel>Interações com a live</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card icon="🎯" title="Palpites"     subtitle="Rodadas e apostas do chat"  href="/admin/palpites" />
          <Card icon="🎰" title="Jackpot"      subtitle="Doações via LivePix"        href="/admin/jackpot"  />
          <Card icon="🏆" title="Torneio"      subtitle="Competições entre viewers"  href="/admin/torneio"  />
          <Card icon="⚔️"  title="Batalha"     subtitle="Batalha de bônus"           href="/admin/batalha"  />
          <Card icon="📋" title="Call de Slot" subtitle="Chamadas ao vivo"           href="/admin/call"     />
        </div>
      </div>

      {/* ── Sorteio ──────────────────────────────────────────── */}
      <div>
        <SectionLabel>Sorteio</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card icon="🎁" title="Sorteios" subtitle="Criar e gerenciar sorteios" href="/admin/sorteio" />
        </div>
      </div>

      {/* ── Usuários & Segurança ──────────────────────────────── */}
      <div>
        <SectionLabel>Usuários &amp; Segurança</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <Card icon="👥" title="Usuários"
            subtitle={users ? `${users.total} cadastrados · ${users.banidos} banidos · ${users.suspensos} suspensos` : "Carregando..."}
            href="/admin/usuarios"
            badge={users && users.banidos > 0 ? `${users.banidos} banidos` : undefined} />
          <Card icon="🔒" title="Logs de Segurança"
            subtitle="Histórico de ações do painel"
            href="/admin/logs" />
        </div>
      </div>

      {/* ── Integrações (embaixo) ─────────────────────────────── */}
      <div>
        <SectionLabel>Integrações</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <Card icon="💰" title="GGPix"
            subtitle={config ? (config.ggpix.ok ? "Conectado — envio de gorjetas ativo" : "Não configurado — gorjetas desativadas") : "Carregando..."}
            href="/admin/config"
            active={config?.ggpix.ok}
            warn={config ? !config.ggpix.ok : false} />
          <Card icon="🎰" title="LivePix"
            subtitle={config ? (config.livepix.ok ? "Conectado — jackpot ativo" : "Não configurado — jackpot desativado") : "Carregando..."}
            href="/admin/config"
            active={config?.livepix.ok}
            warn={config ? !config.livepix.ok : false} />
        </div>
        {config && (!config.ggpix.ok || !config.livepix.ok) && (
          <Link href="/admin/config"
            className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black text-yellow-400 transition-all hover:bg-yellow-400/5"
            style={{ border: "1px solid rgba(234,179,8,0.2)" }}>
            ⚠️ Configurações pendentes — clique para configurar
          </Link>
        )}
      </div>
    </div>
  );
}

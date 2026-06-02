"use client";

import { useState, useEffect, useCallback } from "react";
import type { SiteUser } from "@/lib/users-store";

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function fmtDuration(ms: number): string {
  const h = Math.floor(ms / 3600000); const d = Math.floor(h / 24);
  if (d > 0) return `${d}d`;
  return `${h}h`;
}

function Avatar({ user }: { user: SiteUser }) {
  if (user.image) return (
    <img src={user.image} alt={user.displayName}
      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      style={{ border: "2px solid rgba(255,255,255,0.1)" }} />
  );
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm"
      style={{ background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.1)" }}>
      {user.displayName[0]?.toUpperCase()}
    </div>
  );
}

function StatusBadge({ status, suspAte }: { status: SiteUser["status"]; suspAte?: number }) {
  if (status === "banido") return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-black"
      style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
      Banido
    </span>
  );
  if (status === "suspenso") {
    const remaining = suspAte ? Math.max(0, suspAte - Date.now()) : 0;
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-black"
        style={{ background: "rgba(234,179,8,0.12)", color: "#fbbf24", border: "1px solid rgba(234,179,8,0.3)" }}>
        Suspenso {remaining > 0 ? `· ${fmtDuration(remaining)}` : "· expirado"}
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-black"
      style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }}>
      Ativo
    </span>
  );
}

function HistoricoModal({ twitchLogin, onClose }: { twitchLogin: string; onClose: () => void }) {
  const [ganhos, setGanhos] = useState<Array<{ valor: number; tipo: string; abertaEm: number }>>([]);
  const [loading, setLoading] = useState(true);
  const total = ganhos.reduce((s, g) => s + g.valor, 0);

  useEffect(() => {
    fetch(`/api/admin/users?history=${encodeURIComponent(twitchLogin)}`)
      .then(r => r.json()).then(d => setGanhos(d.ganhos ?? [])).finally(() => setLoading(false));
  }, [twitchLogin]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}
        style={{ background: "rgba(5,4,16,0.98)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
          <div>
            <p className="text-sm font-black text-white">Histórico de ganhos</p>
            <p className="text-[11px] text-gray-600">@{twitchLogin}</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors text-lg">✕</button>
        </div>
        <div className="px-5 py-4 max-h-80 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {loading && <p className="text-center text-xs text-gray-600 py-8">Carregando...</p>}
          {!loading && ganhos.length === 0 && (
            <p className="text-center text-xs text-gray-600 py-8">Nenhum ganho registrado</p>
          )}
          {ganhos.map((g, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
              <div>
                <p className="text-xs text-gray-500">{fmtDate(g.abertaEm)}</p>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded"
                  style={{ background: g.tipo === "sorteio" ? "rgba(255,186,0,0.1)" : "rgba(139,92,246,0.15)", color: g.tipo === "sorteio" ? "#ffba00" : "#a78bfa" }}>
                  {g.tipo}
                </span>
              </div>
              <span className="text-sm font-black text-green-400">R$ {g.valor.toFixed(2)}</span>
            </div>
          ))}
        </div>
        {!loading && ganhos.length > 0 && (
          <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
            <p className="text-xs text-gray-500">{ganhos.length} transações</p>
            <p className="text-sm font-black text-white">Total: <span className="text-green-400">R$ {total.toFixed(2)}</span></p>
          </div>
        )}
      </div>
    </div>
  );
}

type ModalState =
  | { type: "ban";     user: SiteUser }
  | { type: "suspend"; user: SiteUser }
  | { type: "history"; user: SiteUser }
  | null;

function BanModal({ user, onClose, onSave }: { user: SiteUser; onClose: () => void; onSave: (motivo: string) => Promise<void> }) {
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-xs rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}
        style={{ background: "rgba(5,4,16,0.98)", border: "1px solid rgba(239,68,68,0.25)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        <div className="px-5 py-4 border-b border-white/5">
          <p className="text-sm font-black text-white">Banir usuário</p>
          <p className="text-[11px] text-gray-500">@{user.twitchLogin} — bloqueia conta + IPs</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <input type="text" placeholder="Motivo do ban (opcional)" value={motivo}
            onChange={e => setMotivo(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)" }} />
          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-black transition-all hover:bg-white/5"
              style={{ color: "#6b7280", border: "1px solid rgba(255,255,255,0.07)" }}>
              Cancelar
            </button>
            <button disabled={saving} onClick={async () => { setSaving(true); await onSave(motivo); }}
              className="flex-1 py-2.5 rounded-xl text-xs font-black text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
              style={{ background: "rgba(239,68,68,0.4)", border: "1px solid rgba(239,68,68,0.4)" }}>
              {saving ? "..." : "🚫 Banir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const SUSPEND_OPTS = [
  { label: "1 hora",   ms: 3_600_000 },
  { label: "6 horas",  ms: 21_600_000 },
  { label: "12 horas", ms: 43_200_000 },
  { label: "1 dia",    ms: 86_400_000 },
  { label: "3 dias",   ms: 259_200_000 },
  { label: "7 dias",   ms: 604_800_000 },
  { label: "30 dias",  ms: 2_592_000_000 },
];

function SuspendModal({ user, onClose, onSave }: { user: SiteUser; onClose: () => void; onSave: (ms: number, motivo: string) => Promise<void> }) {
  const [dur, setDur] = useState(SUSPEND_OPTS[3].ms);
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-xs rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}
        style={{ background: "rgba(5,4,16,0.98)", border: "1px solid rgba(234,179,8,0.25)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        <div className="px-5 py-4 border-b border-white/5">
          <p className="text-sm font-black text-white">Suspender usuário</p>
          <p className="text-[11px] text-gray-500">@{user.twitchLogin}</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-4 gap-1.5">
            {SUSPEND_OPTS.map(o => (
              <button key={o.ms} onClick={() => setDur(o.ms)}
                className="py-1.5 rounded-lg text-[10px] font-black transition-all"
                style={dur === o.ms
                  ? { background: "rgba(234,179,8,0.2)", color: "#fbbf24", border: "1px solid rgba(234,179,8,0.4)" }
                  : { color: "#6b7280", border: "1px solid rgba(255,255,255,0.07)" }}>
                {o.label}
              </button>
            ))}
          </div>
          <input type="text" placeholder="Motivo (opcional)" value={motivo}
            onChange={e => setMotivo(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
            style={{ background: "rgba(234,179,8,0.04)", border: "1px solid rgba(234,179,8,0.2)" }} />
          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-black transition-all hover:bg-white/5"
              style={{ color: "#6b7280", border: "1px solid rgba(255,255,255,0.07)" }}>
              Cancelar
            </button>
            <button disabled={saving} onClick={async () => { setSaving(true); await onSave(dur, motivo); }}
              className="flex-1 py-2.5 rounded-xl text-xs font-black text-black disabled:opacity-50 transition-all hover:scale-[1.02]"
              style={{ background: "rgba(234,179,8,0.8)" }}>
              {saving ? "..." : "⏸ Suspender"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserCard({ user, onAction, busy = false }: {
  user: SiteUser;
  onAction: (type: "ban" | "unban" | "suspend" | "unsuspend" | "history") => void;
  busy?: boolean;
}) {
  const isBanned    = user.status === "banido";
  const isSuspended = user.status === "suspenso";

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: isBanned
          ? "rgba(30,4,4,0.92)"
          : isSuspended
            ? "rgba(20,16,2,0.92)"
            : "rgba(5,4,16,0.92)",
        border: isBanned
          ? "1px solid rgba(239,68,68,0.2)"
          : isSuspended
            ? "1px solid rgba(234,179,8,0.2)"
            : "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
      }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <Avatar user={user} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-black text-white truncate">{user.displayName}</p>
            <StatusBadge status={user.status} suspAte={user.suspAte} />
          </div>
          <p className="text-[11px] text-gray-600">@{user.twitchLogin}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pb-3 grid grid-cols-3 gap-2 border-t border-white/[0.04] pt-3">
        <div>
          <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest">Logins</p>
          <p className="text-xs font-black text-white">{user.totalLogins}</p>
        </div>
        <div>
          <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest">1º Login</p>
          <p className="text-xs font-black text-white">{fmtDate(user.primeiroLogin)}</p>
        </div>
        <div>
          <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest">Último</p>
          <p className="text-xs font-black text-white">{fmtDate(user.ultimoLogin)}</p>
        </div>
      </div>

      {/* Motivo de ban/suspensão */}
      {(user.banMotivo || user.suspMotivo) && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-xl text-[11px]"
          style={isBanned
            ? { background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.15)" }
            : { background: "rgba(234,179,8,0.07)", color: "#fbbf24", border: "1px solid rgba(234,179,8,0.15)" }}>
          {isBanned ? `Banido por: ${user.banMotivo} (por @${user.banPor})` : `Suspenso: ${user.suspMotivo} (por @${user.suspPor})`}
        </div>
      )}

      {/* Ações */}
      <div className="px-4 pb-4 flex gap-2 flex-wrap border-t border-white/[0.04] pt-3">
        <button onClick={() => onAction("history")}
          className="flex-1 py-1.5 rounded-lg text-[11px] font-black transition-all hover:bg-white/5"
          style={{ color: "#6b7280", border: "1px solid rgba(255,255,255,0.07)" }}>
          📊 Histórico
        </button>

        {!isBanned && !isSuspended && (
          <>
            <button onClick={() => onAction("suspend")}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-black transition-all hover:scale-[1.02]"
              style={{ color: "#fbbf24", border: "1px solid rgba(234,179,8,0.25)", background: "rgba(234,179,8,0.06)" }}>
              ⏸ Suspender
            </button>
            <button onClick={() => onAction("ban")}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-black transition-all hover:scale-[1.02]"
              style={{ color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.06)" }}>
              🚫 Banir
            </button>
          </>
        )}

        {isSuspended && (
          <button onClick={() => onAction("unsuspend")} disabled={busy}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-black transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
            style={{ color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)", background: "rgba(34,197,94,0.06)" }}>
            {busy ? "..." : "✓ Levantar suspensão"}
          </button>
        )}

        {isBanned && (
          <button onClick={() => onAction("unban")} disabled={busy}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-black transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
            style={{ color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)", background: "rgba(34,197,94,0.06)" }}>
            {busy ? "..." : "✓ Desbanir"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const [users,     setUsers]     = useState<SiteUser[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [busca,     setBusca]     = useState("");
  const [filtro,    setFiltro]    = useState<"todos" | "ativo" | "banido" | "suspenso">("todos");
  const [modal,     setModal]     = useState<ModalState>(null);
  const [msg,       setMsg]       = useState<{ text: string; ok: boolean } | null>(null);
  // twitchId do usuário sendo processado — impede double-click
  const [busyUser,  setBusyUser]  = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) { const d = await res.json(); setUsers(d.users ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  }

  async function apiAction(action: string, twitchLogin: string, extra?: object) {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, twitchLogin, ...extra }),
    });
    const d = await res.json();
    if (d.ok) { await fetchUsers(); return true; }
    return false;
  }

  const filtered = users.filter(u => {
    const q = busca.toLowerCase();
    const matchSearch = !q || u.twitchLogin.includes(q) || u.displayName.toLowerCase().includes(q);
    const matchFiltro = filtro === "todos" || u.status === filtro;
    return matchSearch && matchFiltro;
  });

  const stats = {
    total:     users.length,
    ativos:    users.filter(u => u.status === "ativo").length,
    banidos:   users.filter(u => u.status === "banido").length,
    suspensos: users.filter(u => u.status === "suspenso").length,
  };

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-24">
      {/* Modais */}
      {modal?.type === "history" && (
        <HistoricoModal twitchLogin={modal.user.twitchLogin} onClose={() => setModal(null)} />
      )}
      {modal?.type === "ban" && (
        <BanModal user={modal.user} onClose={() => setModal(null)} onSave={async (motivo) => {
          const ok = await apiAction("ban", modal.user.twitchLogin, { motivo });
          flash(ok ? `@${modal.user.twitchLogin} banido.` : "Erro ao banir", ok);
          setModal(null);
        }} />
      )}
      {modal?.type === "suspend" && (
        <SuspendModal user={modal.user} onClose={() => setModal(null)} onSave={async (ms, motivo) => {
          const suspAte = Date.now() + ms;
          const ok = await apiAction("suspend", modal.user.twitchLogin, { suspAte, motivo });
          flash(ok ? `@${modal.user.twitchLogin} suspenso por ${fmtDuration(ms)}.` : "Erro ao suspender", ok);
          setModal(null);
        }} />
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">Usuários</h1>
        <p className="text-sm text-gray-600 mt-1">{stats.total} usuários registrados</p>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-2.5 rounded-xl text-xs font-black ${msg.ok ? "text-green-400" : "text-red-400"}`}
          style={msg.ok
            ? { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }
            : { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
          {msg.ok ? "✅" : "❌"} {msg.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {([
          { key: "todos",    label: "Todos",     count: stats.total,     color: "#9ca3af" },
          { key: "ativo",    label: "Ativos",    count: stats.ativos,    color: "#4ade80" },
          { key: "suspenso", label: "Suspensos", count: stats.suspensos, color: "#fbbf24" },
          { key: "banido",   label: "Banidos",   count: stats.banidos,   color: "#f87171" },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className="rounded-xl py-2.5 flex flex-col items-center gap-0.5 transition-all"
            style={filtro === f.key
              ? { background: `${f.color}18`, border: `1px solid ${f.color}40`, color: f.color }
              : { background: "rgba(5,4,16,0.7)", border: "1px solid rgba(255,255,255,0.06)", color: "#374151" }}>
            <span className="text-lg font-black">{f.count}</span>
            <span className="text-[10px] font-black">{f.label}</span>
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative mb-5">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 text-sm">🔍</span>
        <input type="text" placeholder="Buscar por nome ou @login..."
          value={busca} onChange={e => setBusca(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all"
          style={{ background: "rgba(5,4,16,0.92)", border: `1px solid ${busca ? "rgba(255,186,0,0.35)" : "rgba(255,255,255,0.08)"}`, backdropFilter: "blur(20px)" }} />
        {busca && <button onClick={() => setBusca("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">✕</button>}
      </div>

      {/* Lista */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-[#ffba00] border-t-transparent animate-spin" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-sm text-gray-600">{busca ? `Nenhum usuário encontrado para "${busca}"` : "Nenhum usuário ainda"}</p>
        </div>
      )}

      {/* Scroll interno — só a lista de usuários rola, não a página inteira */}
      <div
        className="overflow-y-auto pr-1"
        style={{ maxHeight: "calc(100vh - 340px)", scrollbarWidth: "thin", scrollbarColor: "rgba(255,186,0,0.2) transparent" }}>
        <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map(u => (
          <UserCard key={u.twitchId} user={u} onAction={(type) => {
            if (type === "history") { setModal({ type: "history", user: u }); return; }
            if (type === "ban")     { setModal({ type: "ban",     user: u }); return; }
            if (type === "suspend") { setModal({ type: "suspend", user: u }); return; }
            if (type === "unban") {
              setBusyUser(u.twitchId);
              apiAction("unban", u.twitchLogin)
                .then(ok => flash(ok ? `@${u.twitchLogin} desbanido.` : "Erro ao desbanir", ok))
                .finally(() => setBusyUser(null));
            }
            if (type === "unsuspend") {
              setBusyUser(u.twitchId);
              apiAction("unsuspend", u.twitchLogin)
                .then(ok => flash(ok ? `Suspensão de @${u.twitchLogin} levantada.` : "Erro", ok))
                .finally(() => setBusyUser(null));
            }
          }} busy={busyUser === u.twitchId} />
        ))}
        </div>
      </div>
    </div>
  );
}

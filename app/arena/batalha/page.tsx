"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { isAdmin } from "@/lib/admins";
import type { Batalha, BatalhaMatch, BatalhaSlot } from "@/lib/batalhaStore";

// ── Bracket layout ────────────────────────────────────────────────────────────
const MH   = 140;
const MW   = 310;
const RG   = 24;
const CW   = 72;
const UNIT = MH + RG;

function matchPos(r: number, m: number) {
  const x = r * (MW + CW);
  const y = (Math.pow(2, r) - 1) * UNIT / 2 + m * Math.pow(2, r) * UNIT;
  return { x, y };
}

function canvasSize(vagas: number) {
  const numRounds = Math.log2(vagas);
  const w = numRounds * (MW + CW) - CW;
  const h = (vagas / 2 - 1) * UNIT + MH;
  return { w, h };
}

function roundLabel(idx: number, total: number) {
  const fromFinal = total - 1 - idx;
  if (fromFinal === 0) return "Final";
  if (fromFinal === 1) return "Semifinal";
  if (fromFinal === 2) return "Quartas";
  if (fromFinal === 3) return "Oitavas";
  return `Rodada ${idx + 1}`;
}

// ── SVG Connectors ────────────────────────────────────────────────────────────
function Connectors({ rounds }: { rounds: BatalhaMatch[][] }) {
  if (!rounds.length) return null;
  const vagas = rounds[0].length * 2;
  const { w, h } = canvasSize(vagas);
  const lines: React.ReactNode[] = [];
  rounds.forEach((round, r) => {
    if (r === 0) return;
    round.forEach((_, m) => {
      const top = matchPos(r - 1, m * 2);
      const bot = matchPos(r - 1, m * 2 + 1);
      const tgt = matchPos(r, m);
      const x1 = top.x + MW;
      const x2 = x1 + CW / 2;
      const cy_top = top.y + MH / 2;
      const cy_bot = bot.y + MH / 2;
      const cy_tgt = tgt.y + MH / 2;
      lines.push(
        <g key={`${r}-${m}`}>
          <path d={`M${x1},${cy_top} H${x2} V${cy_tgt}`} stroke="rgba(255,255,255,0.15)" fill="none" strokeWidth="1.5" strokeLinecap="round" />
          <path d={`M${x1},${cy_bot} H${x2} V${cy_tgt}`} stroke="rgba(255,255,255,0.15)" fill="none" strokeWidth="1.5" strokeLinecap="round" />
          <path d={`M${x2},${cy_tgt} H${tgt.x}`} stroke="rgba(255,255,255,0.15)" fill="none" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      );
    });
  });
  return <svg className="absolute inset-0 pointer-events-none" width={w} height={h}>{lines}</svg>;
}

// ── Slot público (read-only) ───────────────────────────────────────────────────
function SlotPublic({ slot }: { slot: BatalhaSlot }) {
  const isWin     = slot.resultado === "win";
  const isLose    = slot.resultado === "lose";
  const hasPlayer = !!slot.jogador;

  return (
    <div className={`flex-1 min-h-0 px-3 flex flex-col justify-center gap-1.5 transition-all ${isLose ? "opacity-35" : ""}`}>
      {/* Nome */}
      <div className="flex items-center gap-1.5">
        <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-black ${
          isWin ? "bg-green-500/30 text-green-300"
          : hasPlayer ? "bg-[#9146ff]/30 text-purple-300"
          : "bg-white/8 text-gray-700"
        }`}>
          {hasPlayer ? slot.jogador!.displayName[0].toUpperCase() : "—"}
        </div>
        <span className={`flex-1 text-xs font-bold truncate ${
          isWin ? "text-green-300" : isLose ? "text-gray-600" : hasPlayer ? "text-white" : "text-gray-700 italic"
        }`}>
          {hasPlayer ? slot.jogador!.displayName : "Vaga livre"}
        </span>
        {isWin && (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-green-500/22 text-green-400 uppercase tracking-wide flex-shrink-0">WIN</span>
        )}
        {isLose && (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 uppercase tracking-wide flex-shrink-0">LOSE</span>
        )}
      </div>

      {/* Jogo + Valor (quando disponíveis) */}
      {hasPlayer && (slot.jogoNome || (slot.jogoValor != null && slot.jogoValor > 0)) && (
        <div className="flex items-center gap-2 ml-6">
          {slot.jogoNome && (
            <span className="text-[10px] text-gray-500 truncate">{slot.jogoNome}</span>
          )}
          {slot.jogoValor != null && slot.jogoValor > 0 && (
            <span className="text-[10px] font-black text-blue-400 tabular-nums flex-shrink-0">
              R$ {slot.jogoValor.toLocaleString("pt-BR")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Match público ─────────────────────────────────────────────────────────────
function MatchPublic({ match }: { match: BatalhaMatch }) {
  const decided = !!(match.slot1.resultado || match.slot2.resultado);
  return (
    <div
      className={`flex flex-col rounded-xl overflow-hidden border transition-all ${
        decided ? "border-white/10" : "border-white/18"
      }`}
      style={{ width: MW, height: MH, background: "rgba(5,7,16,0.92)" }}
    >
      <SlotPublic slot={match.slot1} />
      <div className="h-px bg-white/8 flex-shrink-0" />
      <SlotPublic slot={match.slot2} />
    </div>
  );
}

// ── Bracket público ───────────────────────────────────────────────────────────
function BracketPublic({ batalha }: { batalha: Batalha }) {
  const { rounds } = batalha;
  const { w, h } = canvasSize(batalha.vagas);
  const totalRounds = rounds.length;
  return (
    <div className="pb-2">
      <div className="relative mb-4" style={{ width: w, height: 20 }}>
        {rounds.map((_, r) => (
          <div
            key={r}
            className="absolute text-[10px] font-black text-gray-500 uppercase tracking-widest text-center"
            style={{ left: r * (MW + CW), width: MW }}
          >
            {roundLabel(r, totalRounds)}
          </div>
        ))}
      </div>
      <div className="relative" style={{ width: w, height: h }}>
        <Connectors rounds={rounds} />
        {rounds.flatMap((round, r) =>
          round.map((match, m) => {
            const { x, y } = matchPos(r, m);
            return (
              <div key={match.id} className="absolute" style={{ left: x, top: y }}>
                <MatchPublic match={match} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ArenaTransferePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [batalha, setBatalha] = useState<Batalha | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && isAdmin(session?.user?.twitchLogin)) {
      router.replace("/admin/batalha");
    }
  }, [status, session, router]);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/batalha", { cache: "no-store" });
      setBatalha(await res.json());
    } catch { /* ignora */ } finally { setCarregando(false); }
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 3000);
    return () => clearInterval(id);
  }, [fetch_]);

  if (carregando || status === "loading" || (status === "authenticated" && isAdmin(session?.user?.twitchLogin))) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Tela do vencedor ─────────────────────────────────────────────────────
  if (batalha?.status === "finalizada" && batalha.vencedorFinal) {
    return (
      <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden flex items-center justify-center">
        <div className="relative text-center px-4 max-w-md">
          <p className="text-7xl mb-4 animate-bounce">🏆</p>
          <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: "#ffba00" }}>
            Campeão da Batalha
          </p>
          <h1 className="text-5xl lg:text-6xl font-black text-white mb-1 leading-tight">
            {batalha.vencedorFinal.displayName}
          </h1>
          <p className="text-lg font-bold text-gray-500 mb-3">@{batalha.vencedorFinal.username}</p>
          {batalha.premiacao > 0 && (
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-green-500/40 bg-green-500/12 mb-4"
              style={{ boxShadow: "0 0 30px rgba(34,197,94,0.15)" }}>
              <span className="text-2xl font-black text-green-400">
                🎉 R$ {batalha.premiacao.toLocaleString("pt-BR")}
              </span>
            </div>
          )}
          <p className="text-sm text-gray-600 mb-6">{batalha.nome}</p>
          <Link
            href="/arena"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border border-white/15 text-gray-300 hover:bg-white/8 transition-all"
          >
            ← Voltar à Arena
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-4rem)]">

<div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-14 pb-24">

        {/* Breadcrumb */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-600 mb-8">
          <Link href="/arena" className="hover:text-gray-400 transition-colors">Arena</Link>
          <span>/</span>
          <span className="text-gray-400">Batalha de Bônus</span>
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2 flex-wrap">
            <h1 className="text-4xl font-black">
              <span className="text-white">⚔️ </span>
              <span style={{
                background: "linear-gradient(135deg, #fff 0%, #a78bfa 60%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                Batalha de Bônus
              </span>
            </h1>
            {batalha?.status === "inscricao" && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/40 bg-green-500/12 text-green-400"
                style={{ boxShadow: "0 0 15px rgba(34,197,94,0.2)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                INSCRIÇÕES ABERTAS
              </span>
            )}
            {batalha?.status === "ativa" && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-500/40 bg-red-500/12 text-red-400"
                style={{ boxShadow: "0 0 15px rgba(239,68,68,0.2)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                AO VIVO
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">
            {batalha ? <span className="text-gray-300 font-semibold">{batalha.nome}</span> : "Nenhuma batalha ativa."}
          </p>
        </div>

        {!batalha ? (
          <div className="text-center py-20 rounded-2xl border border-white/10 max-w-md mx-auto" style={{ background: "rgba(5,7,16,0.88)" }}>
            <p className="text-6xl mb-4">⚔️</p>
            <p className="text-white font-black text-xl mb-2">Sem batalha ativa</p>
            <p className="text-gray-600 text-sm max-w-xs mx-auto leading-relaxed">
              Fique de olho no chat! Quando uma batalha começar, aparece aqui em tempo real.
            </p>
          </div>
        ) : batalha.status === "inscricao" ? (
          <div className="max-w-lg mx-auto space-y-4">
            <div className="rounded-2xl border border-purple-500/25 p-5" style={{ background: "rgba(5,7,16,0.92)", boxShadow: "0 0 30px rgba(145,70,255,0.08)" }}>
              <p className="text-[11px] font-black text-purple-400 uppercase tracking-widest mb-2">⚡ Como participar</p>
              <p className="text-sm text-gray-400 mb-3">Digite no chat da Twitch:</p>
              <span className="font-mono font-black text-lg px-5 py-2.5 rounded-xl border border-purple-500/35 text-purple-200 inline-block"
                style={{ background: "rgba(145,70,255,0.18)" }}>
                {batalha.comando}
              </span>
            </div>

            <div className="rounded-2xl border border-white/12 p-5" style={{ background: "rgba(5,7,16,0.90)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Inscritos</p>
                <span className="text-sm font-black">
                  <span className="text-[#93c5fd]">{batalha.inscricoes.length}</span>
                  <span className="text-gray-600">/{batalha.vagas}</span>
                </span>
              </div>
              {batalha.inscricoes.length === 0 ? (
                <p className="text-sm text-gray-700 text-center py-3">Aguardando inscrições...</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {batalha.inscricoes.map(j => (
                    <span key={j.username} className="text-xs font-bold px-2.5 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300">
                      {j.displayName}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {batalha.premiacao > 0 && (
              <div className="rounded-2xl border border-green-500/25 px-5 py-4 text-center" style={{ background: "rgba(5,7,16,0.90)" }}>
                <p className="text-[11px] text-gray-600 uppercase tracking-widest mb-1">Premiação</p>
                <p className="text-2xl font-black text-green-400">R$ {batalha.premiacao.toLocaleString("pt-BR")}</p>
              </div>
            )}
          </div>
        ) : (
          /* ── Bracket view ── */
          <div>
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              {batalha.premiacao > 0 && (
                <div className="rounded-xl border border-green-500/25 px-4 py-2.5" style={{ background: "rgba(5,7,16,0.90)" }}>
                  <p className="text-[10px] text-gray-600">Premiação</p>
                  <p className="text-base font-black text-green-400">R$ {batalha.premiacao.toLocaleString("pt-BR")}</p>
                </div>
              )}
              <div className="rounded-xl border border-white/10 px-4 py-2.5" style={{ background: "rgba(5,7,16,0.90)" }}>
                <p className="text-[10px] text-gray-600">Participantes</p>
                <p className="text-base font-black text-white">{batalha.inscricoes.length}</p>
              </div>
            </div>

            <div className="overflow-x-auto max-w-full">
              <div className="rounded-2xl border border-white/10 p-6 w-fit" style={{ background: "rgba(5,7,16,0.88)" }}>
                <BracketPublic batalha={batalha} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

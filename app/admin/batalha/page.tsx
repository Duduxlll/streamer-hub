"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { isAdmin } from "@/lib/admins";
import PlayerAvatar from "@/components/PlayerAvatar";
import type { Batalha, BatalhaMatch, BatalhaSlot } from "@/lib/batalhaStore";
import { useToast, ToastContainer } from "@/components/toast";
import { useConfirm } from "@/components/confirm-modal";

const MH   = 168;
const MW   = 310;
const RG   = 24;
const CW   = 72;
const UNIT = MH + RG;

type BatalhaActionBody = {
  action?: string;
  [key: string]: unknown;
};

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
      const x3 = tgt.x;
      const cy_top = top.y + MH / 2;
      const cy_bot = bot.y + MH / 2;
      const cy_tgt = tgt.y + MH / 2;
      lines.push(
        <g key={`${r}-${m}`}>
          <path d={`M${x1},${cy_top} H${x2} V${cy_tgt}`} stroke="rgba(255,255,255,0.15)" fill="none" strokeWidth="1.5" strokeLinecap="round" />
          <path d={`M${x1},${cy_bot} H${x2} V${cy_tgt}`} stroke="rgba(255,255,255,0.15)" fill="none" strokeWidth="1.5" strokeLinecap="round" />
          <path d={`M${x2},${cy_tgt} H${x3}`} stroke="rgba(255,255,255,0.15)" fill="none" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      );
    });
  });

  return (
    <svg className="absolute inset-0 pointer-events-none" width={w} height={h}>
      {lines}
    </svg>
  );
}

function SlotRow({
  slot,
  canWin,
  onWin,
  onJogo,
  corrigivel = false,
  onCorrigir,
}: {
  slot: BatalhaSlot;
  canWin: boolean;
  onWin: () => void;
  onJogo: (nome: string, valor: string) => void;
  corrigivel?: boolean;
  onCorrigir?: () => void;
}) {
  const [editNome,  setEditNome]  = useState(slot.jogoNome ?? "");
  const [editValor, setEditValor] = useState(
    slot.jogoValor != null && slot.jogoValor !== 0 ? String(slot.jogoValor) : ""
  );

  const isWin     = slot.resultado === "win";
  const isLose    = slot.resultado === "lose";
  const hasPlayer = !!slot.jogador;

  return (
    <div className={`flex-1 min-h-0 px-3 flex flex-col justify-center gap-1.5 transition-all ${isLose ? "opacity-35" : ""}`}>
      <div className="flex items-center gap-1.5">
        {hasPlayer && slot.jogador!.image ? (
          <PlayerAvatar image={slot.jogador!.image} name={slot.jogador!.displayName} size={20} color={isWin ? "#22c55e" : "#22c55e"} />
        ) : (
          <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-black ${
            isWin ? "bg-green-500/30 text-green-300"
            : hasPlayer ? "bg-[#22c55e]/30 text-green-300"
            : "bg-white/8 text-gray-700"
          }`}>
            {hasPlayer ? slot.jogador!.displayName[0].toUpperCase() : "—"}
          </div>
        )}
        <span className={`flex-1 text-xs font-bold truncate ${
          isWin ? "text-green-300" : isLose ? "text-gray-600" : hasPlayer ? "text-white" : "text-gray-700 italic"
        }`}>
          {hasPlayer ? slot.jogador!.displayName : "Vaga livre"}
        </span>
        {canWin && hasPlayer && (
          <button
            onClick={onWin}
            title="Clique para definir como vencedor"
            className="group text-[9px] font-black px-2 py-0.5 rounded-md border border-red-500/45 bg-red-500/14 text-red-400 hover:bg-green-500/20 hover:border-green-500/55 hover:text-green-400 active:scale-95 transition-all flex-shrink-0"
          >
            <span className="group-hover:hidden">LOSE</span>
            <span className="hidden group-hover:inline">WIN ✓</span>
          </button>
        )}

        {isWin && (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-green-500/22 text-green-400 uppercase tracking-wide flex-shrink-0">WIN</span>
        )}
        {isLose && (
          corrigivel && onCorrigir ? (
            <button
              onClick={onCorrigir}
              title="Corrigir: tornar este o vencedor"
              className="group/c text-[9px] font-black px-2 py-0.5 rounded-md border border-red-500/40 bg-red-500/12 text-red-500 hover:bg-green-500/20 hover:border-green-500/55 hover:text-green-400 active:scale-95 transition-all flex-shrink-0"
            >
              <span className="group-hover/c:hidden">LOSE</span>
              <span className="hidden group-hover/c:inline">WIN ✓</span>
            </button>
          ) : (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 uppercase tracking-wide flex-shrink-0">LOSE</span>
          )
        )}
      </div>

      {hasPlayer && !slot.resultado && (
        <div className="flex items-center gap-1.5 ml-6">
          <input
            type="text"
            placeholder="Nome do jogo"
            value={editNome}
            onChange={e => setEditNome(e.target.value)}
            onBlur={() => onJogo(editNome, editValor)}
            onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
            className="flex-1 text-[10px] bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white placeholder-gray-700 focus:outline-none focus:border-white/28 transition-colors min-w-0"
          />
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={editValor}
            onChange={e => setEditValor(e.target.value)}
            onBlur={() => onJogo(editNome, editValor)}
            onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
            className="w-[68px] flex-shrink-0 text-[10px] bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-green-300 placeholder-gray-700 focus:outline-none focus:border-green-500/40 transition-colors"
          />
        </div>
      )}

      {hasPlayer && slot.resultado && (slot.jogoNome || (slot.jogoValor != null && slot.jogoValor > 0)) && (
        <div className="flex items-center gap-2 ml-6">
          {slot.jogoNome && <span className="text-[10px] text-gray-500 truncate">{slot.jogoNome}</span>}
          {slot.jogoValor != null && slot.jogoValor > 0 && (
            <span className="text-[10px] font-black text-green-400 tabular-nums flex-shrink-0">
              R$ {slot.jogoValor.toLocaleString("pt-BR")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function MatchCard({
  match, roundIdx, matchIdx, onAction, onCorrigir,
}: {
  match: BatalhaMatch;
  roundIdx: number;
  matchIdx: number;
  onAction: (body: BatalhaActionBody) => void | Promise<void>;
  onCorrigir: (roundIdx: number, matchIdx: number, winner: "slot1" | "slot2") => void;
}) {
  const decided    = !!(match.slot1.resultado || match.slot2.resultado);
  const canWin     = !decided && !!match.slot1.jogador && !!match.slot2.jogador;
  const canCorrigir = decided && !!match.slot1.jogador && !!match.slot2.jogador;
  const isFinished = match.slot1.resultado === "win" || match.slot2.resultado === "win";

  // Salva o jogo/valor e, se os DOIS slots já têm valor, declara o maior como vencedor
  // automaticamente. Empate não decide (deixa pro admin clicar manualmente).
  async function handleJogo(slot: "slot1" | "slot2", nome: string, valorStr: string) {
    const valor = parseFloat(valorStr.replace(",", ".")) || 0;
    await onAction({ action: "set-jogo", roundIdx, matchIdx, slot, jogoNome: nome, jogoValor: valor });
    const v1 = slot === "slot1" ? valor : (match.slot1.jogoValor ?? 0);
    const v2 = slot === "slot2" ? valor : (match.slot2.jogoValor ?? 0);
    if (canWin && v1 > 0 && v2 > 0 && v1 !== v2) {
      await onAction({ action: "set-vencedor", roundIdx, matchIdx, winner: v1 > v2 ? "slot1" : "slot2" });
    }
  }

  return (
    <div
      className={`flex flex-col rounded-xl overflow-hidden border transition-all ${
        isFinished ? "border-white/10" : "border-white/18"
      }`}
      style={{ width: MW, height: MH, background: "rgba(6,18,11,0.97)", backdropFilter: "blur(8px)" }}
    >
      <SlotRow
        slot={match.slot1}
        canWin={canWin}
        onWin={() => onAction({ action: "set-vencedor", roundIdx, matchIdx, winner: "slot1" })}
        onJogo={(n, v) => handleJogo("slot1", n, v)}
        corrigivel={canCorrigir}
        onCorrigir={() => onCorrigir(roundIdx, matchIdx, "slot1")}
      />

      <div className="h-px bg-white/8 flex-shrink-0" />

      <SlotRow
        slot={match.slot2}
        canWin={canWin}
        onWin={() => onAction({ action: "set-vencedor", roundIdx, matchIdx, winner: "slot2" })}
        onJogo={(n, v) => handleJogo("slot2", n, v)}
        corrigivel={canCorrigir}
        onCorrigir={() => onCorrigir(roundIdx, matchIdx, "slot2")}
      />
    </div>
  );
}

function Bracket({ batalha, onAction, onCorrigir }: {
  batalha: Batalha;
  onAction: (body: BatalhaActionBody) => void | Promise<void>;
  onCorrigir: (roundIdx: number, matchIdx: number, winner: "slot1" | "slot2") => void;
}) {
  const { rounds } = batalha;
  const { w, h } = canvasSize(batalha.vagas);
  const totalRounds = rounds.length;
  const contentW = w + 56; // respiro à direita para a Final não ficar colada/cortada na borda

  return (
    <div className="w-full overflow-x-auto overflow-y-hidden pb-4">
      <div className="relative mb-4 flex-shrink-0" style={{ width: contentW, height: 20 }}>
        {rounds.map((_, r) => {
          const x = r * (MW + CW);
          return (
            <div
              key={r}
              className="absolute text-[10px] font-black text-gray-500 uppercase tracking-widest text-center"
              style={{ left: x, width: MW }}
            >
              {roundLabel(r, totalRounds)}
            </div>
          );
        })}
      </div>

      <div className="relative flex-shrink-0" style={{ width: contentW, height: h }}>
        <Connectors rounds={rounds} />
        {rounds.flatMap((round, r) =>
          round.map((match, m) => {
            const { x, y } = matchPos(r, m);
            return (
              <div key={match.id} className="absolute" style={{ left: x, top: y }}>
                <MatchCard
                  match={match}
                  roundIdx={r}
                  matchIdx={m}
                  onAction={onAction}
                  onCorrigir={onCorrigir}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function AdminBatalhaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const { toasts, toast, dismiss } = useToast();
  const { confirm, ConfirmModal } = useConfirm();
  const [batalha,      setBatalha]      = useState<Batalha | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [carregando,   setCarregando]   = useState(true);
  const [verChave,     setVerChave]     = useState(false);
  const [nome,         setNome]         = useState("");

  function formatarValor(v: string): string {
    const t = v.trim().replace(/R\$\s*/g, "");
    const num = Number(t.replace(",", "."));
    if (t !== "" && !isNaN(num) && isFinite(num) && num > 0)
      return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    return v.trim();
  }
  const [vagas,        setVagas]        = useState<8 | 16 | 32>(8);
  const [premiacao,    setPremiacao]    = useState("");
  const [comando,      setComando]      = useState("!entrar");

  useEffect(() => {
    if (status === "loading") return;
    if (!isAdmin(session?.user?.twitchLogin)) router.replace("/arena/batalha");
  }, [status, session, router]);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/batalha", { cache: "no-store" });
      setBatalha(await res.json());
    } catch {  }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 2000);
    return () => clearInterval(id);
  }, [fetch_]);

  if (status === "loading" || carregando || !isAdmin(session?.user?.twitchLogin)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#22c55e] border-t-transparent animate-spin" />
      </div>
    );
  }

  async function post(body: BatalhaActionBody) {
    setLoading(true);
    try {
      const res = await fetch("/api/batalha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast(data?.error ?? "Erro ao executar ação", "error"); return; }
      if (data && "id" in data) {
        setBatalha(data as Batalha);
        const action = (body as { action?: string }).action;
        if (action === "criar")   toast("Batalha criada com sucesso!", "success");
        if (action === "iniciar") toast("Batalha iniciada! Boa sorte a todos ⚔️", "success");
        if (action === "set-vencedor") toast("Vencedor definido!", "success");
      } else if (data?.ok === true) {
        setBatalha(null);
        toast("Batalha encerrada.", "warning");
      }
    } catch {
      toast("Erro de conexão. Tente novamente.", "error");
    } finally { setLoading(false); }
  }

  async function corrigir(roundIdx: number, matchIdx: number, winner: "slot1" | "slot2") {
    const ok = await confirm(
      "Trocar o vencedor deste confronto? As partidas seguintes que dependiam dele serão refeitas.",
      { confirmLabel: "Trocar vencedor" }
    );
    if (!ok) return;
    await post({ action: "corrigir-vencedor", roundIdx, matchIdx, winner });
    toast("Vencedor corrigido!", "success");
  }

  if (batalha?.status === "finalizada" && batalha.vencedorFinal && !verChave) {
    return (
      <div className="page-enter relative min-h-[calc(100vh-4rem)] overflow-hidden flex items-center justify-center">
        <div className="relative text-center px-4">
          <p className="text-6xl mb-4 animate-bounce">🏆</p>
          <p className="text-[11px] font-black text-yellow-500 uppercase tracking-widest mb-2">Campeão da Batalha</p>
          <h1 className="text-5xl font-black text-white mb-1">{batalha.vencedorFinal.displayName}</h1>
          <p className="text-xl font-black text-yellow-400 mb-1">@{batalha.vencedorFinal.username}</p>
          {batalha.premiacao > 0 && (
            <p className="text-2xl font-black text-green-400 mb-6">
              🎉 R$ {batalha.premiacao.toLocaleString("pt-BR")}
            </p>
          )}
          <p className="text-gray-500 font-bold mb-4 text-sm">{batalha.nome}</p>
          <div className="flex justify-center gap-3 flex-wrap">
            <button
              onClick={() => setVerChave(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold border border-white/15 text-gray-300 hover:bg-white/8 transition-all"
            >
              Ver Chave
            </button>
            <button
              onClick={() => post({ action: "finalizar" })}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-sm font-black text-black transition-all hover:scale-[1.03] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #ffba00, #e6a000)" }}
            >
              {loading ? "..." : "Finalizar Batalha"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      {ConfirmModal}

<div className="relative w-full max-w-[1600px] mx-auto px-4 sm:px-6 pt-12 pb-24">

        <div className={`flex items-center flex-wrap gap-3 mb-6 ${
          !batalha ? "justify-between max-w-lg mx-auto" :
          batalha.status === "inscricao" ? "justify-between max-w-xl mx-auto" : "justify-start"
        }`}>
          <div>
            <div>
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 mb-2"
                style={{ background: "rgba(255,186,0,0.15)", color: "#ffba00", border: "1px solid rgba(255,186,0,0.3)" }}>
                👑 PAINEL ADMIN
              </span>
              <h1 className="text-3xl font-black text-white">Batalha de Bônus</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {batalha?.status === "inscricao" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border bg-green-500/10 border-green-500/40 text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Inscrições Abertas
              </span>
            )}
            {batalha?.status === "ativa" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border bg-green-500/10 border-green-500/40 text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Em Andamento
              </span>
            )}
            {batalha?.status === "finalizada" && verChave && batalha.vencedorFinal && (
              <button
                onClick={() => setVerChave(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border border-yellow-500/40 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-all"
              >
                🏆 Ver Campeão
              </button>
            )}
            {batalha && (
              <button
                onClick={async () => {
                  if (!await confirm(`Cancelar a batalha "${batalha.nome}"?`, { confirmLabel: "Cancelar Batalha", danger: true })) return;
                  await post({ action: "finalizar" });
                }}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-red-500/35 bg-red-500/8 text-red-400 hover:bg-red-500/18 transition-all disabled:opacity-50"
              >
                Cancelar Batalha
              </button>
            )}
          </div>
        </div>

        {!batalha ? (
          <div className="max-w-lg mx-auto rounded-2xl border border-white/12 p-6" style={{ background: "rgba(6,18,11,0.97)", backdropFilter: "blur(12px)" }}>
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-5">Criar Batalha</p>

            <div className="space-y-4 mb-5">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Nome da Batalha</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Nome da batalha"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#ffba00]/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Vagas</label>
                  <div className="flex gap-2">
                    {([8, 16, 32] as const).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVagas(v)}
                        className="flex-1 py-3 rounded-xl text-sm font-black border transition-all"
                        style={vagas === v ? {
                          background: "rgba(255,186,0,0.18)",
                          borderColor: "rgba(255,186,0,0.5)",
                          color: "#ffba00",
                        } : {
                          background: "rgba(255,255,255,0.04)",
                          borderColor: "rgba(255,255,255,0.10)",
                          color: "#6b7280",
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Premiação (R$)</label>
                  <input
                    type="text"
                    value={premiacao}
                    onChange={e => setPremiacao(e.target.value)}
                    placeholder="Premiação"
                    onBlur={() => setPremiacao(v => formatarValor(v))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#ffba00]/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Comando para entrar</label>
                <input
                  type="text"
                  value={comando}
                  onChange={e => setComando(e.target.value)}
                  placeholder="!entrar"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white font-mono text-sm placeholder-gray-700 focus:outline-none focus:border-[#ffba00]/50 transition-colors"
                />
                <p className="text-[11px] text-gray-600 mt-1">
                  Ex.: <span className="text-gray-400 font-mono">!entrar</span>, <span className="text-gray-400 font-mono">#batalha</span>, <span className="text-gray-400 font-mono">!slot</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => post({ action: "criar", nome, vagas, premiacao: parseFloat(premiacao.replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".")) || 0, comando })}
              disabled={!nome.trim() || !comando.trim() || loading}
              className="w-full py-3.5 rounded-xl font-black text-black text-sm transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: "linear-gradient(135deg, #ffba00, #e6a000)" }}
            >
              {loading ? "Criando..." : "▶ Criar Batalha"}
            </button>
          </div>
        ) : batalha.status === "inscricao" ? (
          <div className="max-w-xl mx-auto space-y-4">
            <div className="rounded-2xl border border-yellow-500/25 px-5 py-4" style={{ background: "rgba(6,16,10,0.92)", boxShadow: "0 0 30px rgba(251,191,36,0.06)" }}>
              <p className="text-[11px] font-black text-yellow-600 uppercase tracking-widest mb-0.5">⚔️ Batalha Criada</p>
              <p className="text-xl font-black text-white mb-1">{batalha.nome}</p>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                <span>{batalha.vagas} vagas</span>
                {batalha.premiacao > 0 && <span>R$ {batalha.premiacao.toLocaleString("pt-BR")}</span>}
                <span>Comando: <span className="text-green-300 font-mono font-bold">{batalha.comando}</span></span>
              </div>
            </div>

            <div className="rounded-2xl border border-green-500/25 p-5" style={{ background: "rgba(6,18,11,0.97)", backdropFilter: "blur(12px)" }}>
              <p className="text-[11px] font-black text-green-400 uppercase tracking-widest mb-2">⚡ Divulgue no Chat</p>
              <div className="flex items-center gap-3">
                <span className="font-mono font-black text-lg text-white px-4 py-2 rounded-xl border border-green-500/35" style={{ background: "rgba(34,197,94,0.15)" }}>
                  {batalha.comando}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(batalha.comando)}
                  className="text-xs font-bold text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded-lg border border-white/10"
                >
                  📋 Copiar
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/12 p-5" style={{ background: "rgba(6,18,11,0.97)", backdropFilter: "blur(12px)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Inscritos</p>
                <span className="text-sm font-black text-white">
                  <span className={batalha.inscricoes.length === batalha.vagas ? "text-green-400" : "text-[#86efac]"}>
                    {batalha.inscricoes.length}
                  </span>
                  <span className="text-gray-600">/{batalha.vagas}</span>
                </span>
              </div>

              {batalha.inscricoes.length === 0 ? (
                <p className="text-sm text-gray-700 text-center py-4">Aguardando inscrições...</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {batalha.inscricoes.map(j => (
                    <span key={j.username} className="flex items-center gap-1.5 text-xs font-bold pl-1 pr-2.5 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-300">
                      <PlayerAvatar image={j.image} name={j.displayName} size={20} color="#22c55e" />
                      {j.displayName}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => post({ action: "iniciar" })}
              disabled={batalha.inscricoes.length < 2 || loading}
              className="w-full py-3.5 rounded-xl font-black text-black text-sm transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: "linear-gradient(135deg, #ffba00, #e6a000)" }}
            >
              {loading ? "Iniciando..." : `▶ Iniciar Batalha (${batalha.inscricoes.length} inscritos)`}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-4 mb-5 flex-wrap">
              <div className="rounded-xl border border-yellow-500/25 px-4 py-2.5" style={{ background: "rgba(6,18,11,0.97)", backdropFilter: "blur(12px)" }}>
                <p className="text-[10px] text-gray-600">Batalha</p>
                <p className="text-base font-black text-white">{batalha.nome}</p>
              </div>
              {batalha.premiacao > 0 && (
                <div className="rounded-xl border border-green-500/25 px-4 py-2.5" style={{ background: "rgba(6,18,11,0.97)", backdropFilter: "blur(12px)" }}>
                  <p className="text-[10px] text-gray-600">Premiação</p>
                  <p className="text-base font-black text-green-400">R$ {batalha.premiacao.toLocaleString("pt-BR")}</p>
                </div>
              )}
              <div className="rounded-xl border border-white/10 px-4 py-2.5" style={{ background: "rgba(6,18,11,0.97)", backdropFilter: "blur(12px)" }}>
                <p className="text-[10px] text-gray-600">Participantes</p>
                <p className="text-base font-black text-white">{batalha.inscricoes.length}</p>
              </div>

            </div>

            <div className="rounded-2xl border border-white/10 p-4 sm:p-6 max-w-full" style={{ background: "rgba(6,18,11,0.97)", backdropFilter: "blur(12px)" }}>
              <Bracket batalha={batalha} onAction={post} onCorrigir={corrigir} />
            </div>

            <p className="text-xs text-gray-700 mt-3">
              Preencha jogo/valor nos campos · Clique no nome do vencedor para avançar na chave
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

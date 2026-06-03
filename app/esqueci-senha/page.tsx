"use client";

import { useState } from "react";
import Link from "next/link";

const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" } as const;
const inputCls = "w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-[#22c55e]/50";

export default function EsqueciSenhaPage() {
  const [etapa, setEtapa] = useState<"email" | "codigo" | "sucesso">("email");
  const [email, setEmail] = useState("");
  const [code, setCode]   = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  async function enviarCodigo(e?: React.FormEvent) {
    e?.preventDefault();
    setErro(""); setInfo("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErro("Digite um e-mail válido"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/esqueci-senha", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error ?? "Erro ao enviar o código"); setLoading(false); return; }
      setEtapa("codigo");
      setInfo("Se houver uma conta com esse e-mail, enviamos um código. Verifique sua caixa de entrada e o spam.");
    } catch { setErro("Erro de conexão. Tente novamente."); }
    finally { setLoading(false); }
  }

  async function redefinir(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setInfo("");
    if (!/^\d{6}$/.test(code.trim())) { setErro("O código tem 6 dígitos"); return; }
    if (senha.length < 6) { setErro("A senha precisa ter no mínimo 6 caracteres"); return; }
    if (senha !== confirmar) { setErro("As senhas não coincidem"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/redefinir-senha", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim(), novaSenha: senha }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error ?? "Erro ao redefinir a senha"); setLoading(false); return; }
      setEtapa("sucesso");
    } catch { setErro("Erro de conexão. Tente novamente."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="w-full max-w-sm relative scale-in">
        <div className="card-dark rounded-2xl overflow-hidden border-[#16a34a]/20">
          <div className="h-1 w-full bg-gradient-to-r from-[#22c55e] via-[#4ade80] to-[#22c55e]" />

          <div className="p-8">
            {/* ── Etapa: e-mail ─────────────────────────────────── */}
            {etapa === "email" && (
              <>
                <div className="text-center mb-7">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-green-950/50">
                    <span className="text-3xl">✉️</span>
                  </div>
                  <h1 className="text-2xl font-black text-white">Esqueci minha senha</h1>
                  <p className="text-gray-500 text-sm mt-1.5">Enviaremos um código para o seu e-mail</p>
                </div>
                <form onSubmit={enviarCodigo} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">E-mail da conta</label>
                    <input type="email" autoCapitalize="none" placeholder="voce@email.com"
                      value={email} onChange={e => setEmail(e.target.value)}
                      className={inputCls} style={inputStyle} />
                  </div>
                  {erro && <ErroBox>{erro}</ErroBox>}
                  <Botao loading={loading}>Enviar código</Botao>
                </form>
              </>
            )}

            {/* ── Etapa: código + nova senha ────────────────────── */}
            {etapa === "codigo" && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-green-950/50">
                    <span className="text-3xl">🔑</span>
                  </div>
                  <h1 className="text-2xl font-black text-white">Criar nova senha</h1>
                  <p className="text-gray-500 text-sm mt-1.5">Digite o código que enviamos para <span className="text-gray-300">{email}</span></p>
                </div>
                {info && <InfoBox>{info}</InfoBox>}
                <form onSubmit={redefinir} className="space-y-4 mt-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">Código (6 dígitos)</label>
                    <input type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                      value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className={`${inputCls} text-center tracking-[0.5em] text-lg font-black`} style={inputStyle} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">Nova senha</label>
                    <input type="password" placeholder="mín. 6 caracteres"
                      value={senha} onChange={e => setSenha(e.target.value)}
                      className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">Confirmar nova senha</label>
                    <input type="password" placeholder="repita a senha"
                      value={confirmar} onChange={e => setConfirmar(e.target.value)}
                      className={inputCls} style={inputStyle} />
                  </div>
                  {erro && <ErroBox>{erro}</ErroBox>}
                  <Botao loading={loading}>Redefinir senha</Botao>
                </form>
                <button onClick={() => enviarCodigo()} disabled={loading}
                  className="mt-4 w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors">
                  Não recebeu? Reenviar código
                </button>
              </>
            )}

            {/* ── Etapa: sucesso ────────────────────────────────── */}
            {etapa === "sucesso" && (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}>
                  <span className="text-3xl">✅</span>
                </div>
                <h1 className="text-2xl font-black text-white">Senha redefinida!</h1>
                <p className="text-gray-500 text-sm mt-2 mb-6">Já pode entrar com sua nova senha.</p>
                <Link href="/login"
                  className="inline-flex items-center justify-center w-full py-3.5 rounded-xl font-black text-white text-base transition-all hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 4px 18px rgba(34,197,94,0.3)" }}>
                  Ir para o login
                </Link>
              </div>
            )}

            {etapa !== "sucesso" && (
              <div className="mt-5 pt-5 border-t border-white/5 text-center">
                <Link href="/login" className="text-sm text-[#4ade80] font-bold hover:underline">← Voltar ao login</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ErroBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl px-3 py-2.5 text-sm text-red-400 font-bold"
      style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
      {children}
    </div>
  );
}
function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs text-green-300"
      style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
      {children}
    </div>
  );
}
function Botao({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-white text-base transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
      style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 4px 18px rgba(34,197,94,0.3)" }}>
      {loading ? <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : children}
    </button>
  );
}

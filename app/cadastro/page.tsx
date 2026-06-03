"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

function formatCpf(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" } as const;
const inputCls = "w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-[#22c55e]/50";

export default function CadastroPage() {
  const { status } = useSession();
  const router = useRouter();

  const [form, setForm] = useState({
    twitchLogin: "", nomeCompleto: "", cpf: "", email: "", senha: "", confirmar: "",
  });
  const [screenshot, setScreenshot] = useState("");
  const [screenshotName, setScreenshotName] = useState("");
  const [aceito, setAceito] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setErro("Envie uma imagem (PNG, JPG, etc.)"); return; }
    if (file.size > 5 * 1024 * 1024) { setErro("Imagem muito grande (máx 5MB)"); return; }
    setErro("");
    setScreenshotName(file.name);
    const reader = new FileReader();
    reader.onload = e => setScreenshot(e.target?.result as string ?? "");
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!form.twitchLogin.trim()) return setErro("Informe seu nome da Twitch");
    if (!/^[a-zA-Z0-9_]{3,25}$/.test(form.twitchLogin.trim())) return setErro("Nome da Twitch inválido (letras, números e _ )");
    if (form.nomeCompleto.trim().length < 3 || !form.nomeCompleto.trim().includes(" ")) return setErro("Informe seu nome completo (nome e sobrenome)");
    if (form.cpf.replace(/\D/g, "").length !== 11) return setErro("CPF incompleto");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setErro("E-mail inválido");
    if (form.senha.length < 6) return setErro("A senha precisa ter no mínimo 6 caracteres");
    if (form.senha !== form.confirmar) return setErro("As senhas não coincidem");
    if (!screenshot) return setErro("Envie o print do seu histórico de depósito na JonBet");
    if (!aceito) return setErro("É preciso aceitar os Termos de Uso");

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          twitchLogin: form.twitchLogin.trim(),
          nomeCompleto: form.nomeCompleto.trim(),
          cpf: form.cpf,
          email: form.email.trim(),
          senha: form.senha,
          screenshot,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error ?? "Erro ao cadastrar"); setLoading(false); return; }

      // Loga automaticamente após o cadastro (pelo e-mail)
      const login = await signIn("credentials", {
        email: form.email.trim(),
        password: form.senha,
        redirect: false,
      });
      if (login?.error) {
        router.replace("/login");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#22c55e] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="w-full max-w-md relative scale-in">
        <div className="card-dark rounded-2xl overflow-hidden border-[#16a34a]/20">
          <div className="h-1 w-full bg-gradient-to-r from-[#22c55e] via-[#4ade80] to-[#22c55e]" />

          <div className="p-7 sm:p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-black text-white">Criar conta</h1>
              <p className="text-gray-500 text-sm mt-1.5">Preencha seus dados para participar das gorjetas</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Nome da Twitch" hint="Precisa ser o mesmo do chat. Identifica você e não pode ser repetido.">
                <input type="text" autoCapitalize="none" autoCorrect="off" placeholder="seu_nome_na_twitch"
                  value={form.twitchLogin} onChange={e => set("twitchLogin", e.target.value)}
                  className={inputCls} style={inputStyle} />
              </Field>

              <Field label="Nome completo">
                <input type="text" placeholder="Seu nome como no banco"
                  value={form.nomeCompleto} onChange={e => set("nomeCompleto", e.target.value)}
                  className={inputCls} style={inputStyle} />
              </Field>

              <Field label="CPF" hint="Será usado como chave PIX para receber as gorjetas.">
                <input type="text" inputMode="numeric" placeholder="000.000.000-00"
                  value={form.cpf} onChange={e => set("cpf", formatCpf(e.target.value))}
                  className={inputCls} style={inputStyle} />
              </Field>

              <Field label="E-mail" hint="Será seu login de acesso à plataforma.">
                <input type="email" autoCapitalize="none" placeholder="voce@email.com"
                  value={form.email} onChange={e => set("email", e.target.value)}
                  className={inputCls} style={inputStyle} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Senha">
                  <input type="password" placeholder="mín. 6 caracteres"
                    value={form.senha} onChange={e => set("senha", e.target.value)}
                    className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Confirmar senha">
                  <input type="password" placeholder="repita a senha"
                    value={form.confirmar} onChange={e => set("confirmar", e.target.value)}
                    className={inputCls} style={inputStyle} />
                </Field>
              </div>

              {/* Print do depósito — obrigatório */}
              <Field label="Print do depósito na JonBet" hint="Obrigatório para aprovação. Envie o print do seu histórico de depósito.">
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all hover:bg-white/[0.03]"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(34,197,94,0.3)" }}>
                  {screenshot
                    ? <><span className="text-green-400 font-bold">✓</span><span className="text-white text-xs truncate flex-1 text-left">{screenshotName}</span></>
                    : <><span className="text-xl">📎</span><span className="text-gray-500 text-sm">Clique para enviar o print</span></>
                  }
                </button>
                {screenshot && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={screenshot} alt="preview" className="w-full max-h-44 object-cover" />
                  </div>
                )}
              </Field>

              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={aceito} onChange={e => setAceito(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#22c55e] flex-shrink-0" />
                <span className="text-[12px] text-gray-500 leading-relaxed">
                  Li e aceito os{" "}
                  <Link href="/termos" className="text-[#4ade80] hover:underline">Termos de Uso</Link>{" "}e a{" "}
                  <Link href="/privacidade" className="text-[#4ade80] hover:underline">Política de Privacidade</Link>.
                </span>
              </label>

              {erro && (
                <div className="rounded-xl px-3 py-2.5 text-sm text-red-400 font-bold"
                  style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                  {erro}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-white text-base transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 4px 18px rgba(34,197,94,0.3)" }}>
                {loading ? <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : "Criar conta"}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-white/5 text-center">
              <p className="text-sm text-gray-500">
                Já tem conta?{" "}
                <Link href="/login" className="text-[#4ade80] font-bold hover:underline">Entrar</Link>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-700 mt-4">
          +18 · Jogue com responsabilidade
        </p>
      </div>
    </div>
  );
}

"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AuthShell, AuthHeader, AuthField, AuthInput, AuthButton, AuthAlert, Icons } from "@/components/auth-ui";
import { JONBET_URL } from "@/lib/partner";

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

function formatCpf(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export default function CadastroPage() {
  const { status } = useSession();
  const router = useRouter();

  const [form, setForm] = useState({ twitchLogin: "", nomeCompleto: "", cpf: "", email: "", senha: "", confirmar: "" });
  const [screenshot, setScreenshot] = useState("");
  const [screenshotName, setScreenshotName] = useState("");
  const [aceito, setAceito] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (status === "authenticated") router.replace("/"); }, [status, router]);

  function set<K extends keyof typeof form>(k: K, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setErro("Envie uma imagem (PNG, JPG, etc.)"); return; }
    if (file.size > MAX_SCREENSHOT_BYTES) { setErro("Imagem muito grande (máx 5MB)"); return; }
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
          twitchLogin: form.twitchLogin.trim(), nomeCompleto: form.nomeCompleto.trim(),
          cpf: form.cpf, email: form.email.trim(), senha: form.senha, screenshot,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error ?? "Erro ao cadastrar"); setLoading(false); return; }

      const login = await signIn("credentials", { email: form.email.trim(), password: form.senha, redirect: false });
      if (login?.error) { router.replace("/login"); return; }
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
    <AuthShell wide>
      <AuthHeader icon={Icons.user("w-7 h-7")} title="Criar conta" subtitle="Preencha seus dados para participar das gorjetas" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Nome da Twitch" delay={70}>
          <AuthInput type="text" autoCapitalize="none" autoCorrect="off" placeholder="seu_nome_na_twitch"
            icon={Icons.at()} value={form.twitchLogin} onChange={e => set("twitchLogin", e.target.value)} />
          <p className="text-[11px] text-gray-600 mt-1">Precisa ser o mesmo do chat. Identifica você e não pode ser repetido.</p>
        </AuthField>

        <AuthField label="Nome completo" delay={100}>
          <AuthInput type="text" placeholder="Seu nome como no banco"
            icon={Icons.user()} value={form.nomeCompleto} onChange={e => set("nomeCompleto", e.target.value)} />
        </AuthField>

        <AuthField label="CPF" delay={130}>
          <AuthInput type="text" inputMode="numeric" placeholder="000.000.000-00"
            icon={Icons.id()} value={form.cpf} onChange={e => set("cpf", formatCpf(e.target.value))} />
          <p className="text-[11px] text-gray-600 mt-1">Será usado como chave PIX para receber as gorjetas.</p>
        </AuthField>

        <AuthField label="E-mail" delay={160}>
          <AuthInput type="email" autoCapitalize="none" placeholder="voce@email.com"
            icon={Icons.mail()} value={form.email} onChange={e => set("email", e.target.value)} />
          <p className="text-[11px] text-gray-600 mt-1">Será seu login de acesso à plataforma.</p>
        </AuthField>

        <div className="grid grid-cols-2 gap-3">
          <AuthField label="Senha" delay={190}>
            <AuthInput type="password" placeholder="mín. 6" icon={Icons.lock()}
              value={form.senha} onChange={e => set("senha", e.target.value)} />
          </AuthField>
          <AuthField label="Confirmar" delay={210}>
            <AuthInput type="password" placeholder="repita" icon={Icons.lock()}
              value={form.confirmar} onChange={e => set("confirmar", e.target.value)} />
          </AuthField>
        </div>

        <AuthField label="Print do depósito na JonBet" delay={240}>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <button type="button" onClick={() => fileRef.current?.click()} className="auth-dropzone">
            {screenshot ? (
              <>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>✓</span>
                <span className="text-white text-xs truncate flex-1 text-left">{screenshotName}</span>
                <span className="text-[11px] text-gray-500">trocar</span>
              </>
            ) : (
              <>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80" }}>{Icons.image("w-5 h-5")}</span>
                <span className="text-gray-400 text-sm flex-1 text-left">Clique para enviar o print</span>
              </>
            )}
          </button>
          {screenshot && (
            <div className="mt-2 rounded-xl overflow-hidden border border-white/5">
              <img src={screenshot} alt="preview" className="w-full max-h-40 object-cover" />
            </div>
          )}
        </AuthField>

        <div className="auth-fade relative overflow-hidden rounded-xl" style={{ animationDelay: "255ms", border: "1px solid rgba(255,186,0,0.28)", background: "linear-gradient(135deg, rgba(20,14,2,0.98), rgba(28,20,4,0.98))", boxShadow: "0 2px 20px rgba(255,186,0,0.07)" }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,186,0,0.45), transparent)" }} />
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🎰</span>
              <p className="text-[11px] font-black text-[#ffba00] uppercase tracking-wide">Obrigatório: cadastro pelo link do Stainzinho</p>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Para ter seu cadastro aprovado, você precisa ter se cadastrado na JonBet
              pelo <strong className="text-gray-200">link oficial do Stainzinho</strong>.
              Se ainda não se cadastrou, siga os passos:
            </p>
            <div className="space-y-1.5">
              {[
                { n: "1", text: <>Clique no botão abaixo para abrir a <strong className="text-gray-300">JonBet</strong></> },
                { n: "2", text: <>No site da JonBet, clique em <strong className="text-gray-300">"Cadastre-se"</strong> no canto superior direito</> },
                { n: "3", text: "Conclua seu cadastro e volte aqui para enviar o print do depósito" },
              ].map(item => (
                <div key={item.n} className="flex items-start gap-2">
                  <span className="font-black text-[#ffba00] text-[11px] flex-shrink-0 mt-0.5">{item.n}.</span>
                  <span className="text-[11px] text-gray-500 leading-snug">{item.text}</span>
                </div>
              ))}
            </div>
            <a
              href={JONBET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-black text-xs text-black transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: "linear-gradient(135deg,#ffe55a,#ffba00)", boxShadow: "0 3px 14px rgba(255,186,0,0.32)" }}>
              🎰 Cadastrar na JonBet pelo link do Stainzinho →
            </a>
          </div>
        </div>

        <label className="auth-fade flex items-start gap-2.5 cursor-pointer select-none" style={{ animationDelay: "270ms" }}>
          <input type="checkbox" checked={aceito} onChange={e => setAceito(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#22c55e] flex-shrink-0" />
          <span className="text-[12px] text-gray-500 leading-relaxed">
            Li e aceito os <Link href="/termos" className="text-[#4ade80] hover:underline">Termos de Uso</Link> e a{" "}
            <Link href="/privacidade" className="text-[#4ade80] hover:underline">Política de Privacidade</Link>.
          </span>
        </label>

        {erro && <AuthAlert>{erro}</AuthAlert>}

        <div className="auth-fade pt-1" style={{ animationDelay: "300ms" }}>
          <AuthButton type="submit" loading={loading}>Criar conta →</AuthButton>
        </div>
      </form>

      <div className="auth-fade text-center mt-5 pt-5 border-t border-white/5" style={{ animationDelay: "330ms" }}>
        <p className="text-sm text-gray-500">
          Já tem conta? <Link href="/login" className="text-[#4ade80] font-bold hover:underline">Entrar</Link>
        </p>
      </div>
    </AuthShell>
  );
}

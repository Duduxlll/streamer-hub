import Link from "next/link";

const SORTEIOS = [
  {
    id: 1,
    titulo: "SORTEIO DIÁRIO ★ AK-47 | Wild Lotus",
    descricao: "Sorteio diário com skin lendária do CS2",
    valor: "R$6.000,00",
    tipo: "diario",
    encerra: "Hoje às 23:59",
    participantes: 1247,
    vencedores: 1,
    requisito: "Ser seguidor na Twitch",
    emoji: "🔫",
  },
  {
    id: 2,
    titulo: "SORTEIO GRÁTIS ★ M9 Baioneta | Doppler Gama",
    descricao: "Gratuito! Só criar conta e participar",
    valor: "R$13.000,00",
    tipo: "gratis",
    encerra: "2 dias",
    participantes: 3891,
    vencedores: 1,
    requisito: "Apenas criar conta",
    emoji: "🗡️",
  },
  {
    id: 3,
    titulo: "SORTEIO PREMIUM ★ Pack de Skins",
    descricao: "Pacote com 5 skins raras do CS2",
    valor: "R$22.000,00",
    tipo: "premium",
    encerra: "5 dias",
    participantes: 612,
    vencedores: 3,
    requisito: "Depósito mínimo na TESTBET",
    emoji: "💎",
  },
  {
    id: 4,
    titulo: "SORTEIO MENSAL ★ Inventário R$180.000",
    descricao: "O maior sorteio do mês — 23 vencedores",
    valor: "R$180.000,00",
    tipo: "mensal",
    encerra: "14 dias",
    participantes: 9204,
    vencedores: 23,
    requisito: "Ser inscrito e seguidor",
    emoji: "🏆",
  },
];

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  gratis:  { label: "Grátis",  color: "text-[#00c853]",  bg: "bg-[#00c853]/10",  border: "border-[#00c853]/30" },
  diario:  { label: "Diário",  color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/25" },
  premium: { label: "Premium", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/25" },
  mensal:  { label: "Mensal",  color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/25" },
};

export default function SorteiosPage() {
  return (
    <div className="hero-radial min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10 text-center">
          <p className="text-[#00c853] text-sm font-semibold uppercase tracking-widest mb-2">TestStreamer</p>
          <h1 className="text-4xl lg:text-5xl font-black text-white mb-3">
            Sorteios <span className="gradient-text">Ativos</span>
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto">
            Participe dos nossos sorteios e concorra a prêmios incríveis. Gratuitos e pagos — tem pra todos!
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {["Todos", "Grátis", "Diário", "Premium", "Mensal"].map((f) => (
            <button
              key={f}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                f === "Todos"
                  ? "btn-glow text-black border-transparent"
                  : "border-[rgba(0,200,83,0.2)] text-gray-400 hover:text-[#00c853] hover:border-[#00c853]/40 bg-transparent"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SORTEIOS.map((s) => {
            const cfg = TIPO_CONFIG[s.tipo];
            return (
              <div key={s.id} className="card-dark rounded-2xl p-6 flex flex-col gap-5">
                <div className="flex items-start gap-4">
                  <div className="text-5xl select-none">{s.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-gray-500">Encerra em {s.encerra}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white leading-snug">{s.titulo}</h3>
                    <p className="text-xs text-gray-500 mt-1">{s.descricao}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-[#070d09] rounded-xl py-3">
                    <div className="text-xl font-black text-[#00c853]">{s.valor}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Prêmio</div>
                  </div>
                  <div className="bg-[#070d09] rounded-xl py-3">
                    <div className="text-xl font-black text-white">{s.participantes.toLocaleString("pt-BR")}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Participantes</div>
                  </div>
                  <div className="bg-[#070d09] rounded-xl py-3">
                    <div className="text-xl font-black text-white">{s.vencedores}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Vencedor{s.vencedores > 1 ? "es" : ""}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <svg className="w-3.5 h-3.5 text-[#00c853] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Requisito: {s.requisito}
                </div>

                <Link
                  href="/login"
                  className="btn-glow w-full text-center py-3 rounded-xl font-bold text-black text-sm mt-auto"
                >
                  Participar do Sorteio
                </Link>
              </div>
            );
          })}
        </div>
        <div className="mt-12 text-center p-8 rounded-2xl border border-[#00c853]/15 bg-[#0e1912]">
          <h3 className="text-xl font-black text-white mb-2">Quer participar de todos os sorteios?</h3>
          <p className="text-gray-400 text-sm mb-6">Crie sua conta gratuitamente e nunca perca um sorteio!</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/login" className="btn-glow px-8 py-3 rounded-full font-bold text-black">
              Criar Conta Grátis
            </Link>
            <Link href="/" className="px-8 py-3 rounded-full border border-[#00c853]/25 text-[#00c853] font-semibold hover:bg-[#00c853]/8 transition-all">
              Voltar ao Início
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

import Link from "next/link";

export const metadata = {
  title: "Termos de Uso · stainzincs",
  description: "Termos de uso da plataforma stainzincs",
};

export default function TermosPage() {
  return (
    <main className="min-h-screen relative overflow-hidden">

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 relative z-10">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-8">
          <Link href="/" className="hover:text-gray-300 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-gray-400">Termos de Uso</span>
        </div>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4"
            style={{ background: "rgba(22,163,74,0.15)", color: "#86efac", border: "1px solid rgba(22,163,74,0.3)" }}>
            📄 Documento Legal
          </div>
          <h1 className="text-4xl font-black mb-3">
            <span style={{
              background: "linear-gradient(135deg, #86efac, #22c55e)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Termos de Uso
            </span>
          </h1>
          <p className="text-gray-500 text-sm">Última atualização: 2 de junho de 2026</p>
        </div>
        <div className="space-y-8 text-gray-300 text-sm leading-relaxed">

          <section className="rounded-2xl p-6 space-y-3"
            style={{ background: "rgba(255,186,0,0.05)", border: "1px solid rgba(255,186,0,0.2)" }}>
            <p className="text-[#ffba00] font-bold flex items-center gap-2">
              <span>⚠️</span> Aviso Importante — Conteúdo +18
            </p>
            <p>
              Esta plataforma é destinada exclusivamente a maiores de <strong className="text-white">18 anos</strong>.
              O acesso por menores de idade é estritamente proibido. Ao utilizar qualquer funcionalidade deste site,
              você declara ter pelo menos 18 anos de idade.
            </p>
            <p className="text-yellow-400/70">
              Jogue com responsabilidade. Se o jogo está prejudicando sua vida, busque ajuda.
            </p>
          </section>

          <Section title="1. Aceitação dos Termos">
            <p>
              Ao acessar e utilizar a plataforma <strong className="text-white">stainzincs</strong>, você concorda
              integralmente com estes Termos de Uso. Se não concordar com qualquer parte, não utilize os serviços.
              Estes termos podem ser atualizados a qualquer momento, sendo sua responsabilidade verificá-los periodicamente.
            </p>
          </Section>

          <Section title="2. O Que É a Plataforma">
            <p>
              A plataforma <strong className="text-white">stainzincs.com</strong> é um site de entretenimento
              complementar à live da Twitch do streamer stainzincs. Ela oferece funcionalidades interativas para
              espectadores, como:
            </p>
            <ul className="space-y-2 mt-3 ml-4">
              <Feature icon="🎯" title="Palpites">
                Sistema de previsões usando saldo virtual do chat. Use <code className="text-green-300">!p [valor]</code> no chat da Twitch para participar.
              </Feature>
              <Feature icon="🏆" title="Torneio">
                Campeonatos entre times criados pelos espectadores. Use <code className="text-green-300">!time [nome]</code> no chat para inscrever seu time.
              </Feature>
              <Feature icon="⚔️" title="Batalha de Bônus">
                Confrontos eliminatórios ao vivo entre participantes inscritos pelo chat da Twitch.
              </Feature>
              <Feature icon="🎰" title="Jackpot">
                Disputa de bônus ao vivo entre os participantes; o maior resultado vence.
              </Feature>
              <Feature icon="📋" title="Call de Slot">
                Espectadores sugerem jogos para o streamer. Use <code className="text-green-300">!call [jogo]</code> no chat da Twitch.
              </Feature>
              <Feature icon="🎁" title="Sorteio">
                Sorteios em que cada espectador acumula tickets enquanto assiste à live. Mais tickets = mais chances.
              </Feature>
              <Feature icon="💰" title="Gorjeta">
                Distribuição de gorjetas via <strong className="text-white">PIX real</strong>. Para participar, é necessário
                cadastrar sua chave PIX e dados conforme descrito na Política de Privacidade.
              </Feature>
            </ul>
            <p className="mt-3 text-gray-400">
              A maior parte das funcionalidades é de caráter recreativo e usa saldo/tickets virtuais sem valor monetário.
              <strong className="text-white"> A funcionalidade de Gorjeta, no entanto, envolve transferências de dinheiro real (PIX)</strong>
              {" "}realizadas pelo streamer aos participantes, conforme regras anunciadas ao vivo.
            </p>
          </Section>

          <Section title="3. Cadastro e Autenticação">
            <p>
              O acesso às funcionalidades interativas requer a criação de uma conta própria, informando seu{" "}
              <strong className="text-white">nome da Twitch</strong> (que deve ser o mesmo usado no chat), nome completo,
              CPF, e-mail e uma senha. Os dados são tratados conforme nossa Política de Privacidade.
            </p>
            <p className="mt-3">
              Sua senha é armazenada de forma criptografada (hash) e nunca é exibida a terceiros. Você é responsável
              por manter suas credenciais em sigilo. Qualquer ação realizada com sua conta é de sua inteira responsabilidade.
            </p>
          </Section>

          <Section title="4. Regras de Participação">
            <p>Ao participar de qualquer funcionalidade da plataforma, você concorda em:</p>
            <ul className="mt-3 space-y-2 ml-4 list-disc list-outside text-gray-400">
              <li>Não utilizar bots, scripts ou qualquer método automatizado para interagir com o sistema</li>
              <li>Não tentar manipular resultados, rankings ou qualquer mecânica de jogo</li>
              <li>Não utilizar linguagem ofensiva, discriminatória ou assediante com outros participantes</li>
              <li>Respeitar as decisões do administrador da plataforma, que são finais e irrecorríveis</li>
              <li>Não compartilhar sua conta ou usar a conta de terceiros</li>
              <li>Não explorar bugs ou falhas da plataforma em benefício próprio</li>
            </ul>
          </Section>

          <Section title="5. Prêmios, Gorjetas e Recompensas">
            <p>
              Eventuais prêmios ou recompensas anunciados durante as lives são de responsabilidade exclusiva do
              streamer stainzincs e estão sujeitos às condições anunciadas ao vivo. A plataforma não garante
              nem é responsável pela entrega de qualquer prêmio prometido durante transmissões.
            </p>
            <p className="mt-3">
              O saldo virtual utilizado nos Palpites e os tickets do Sorteio não têm valor monetário real e não
              podem ser convertidos em dinheiro, bens ou serviços.
            </p>
            <p className="mt-3">
              As <strong className="text-white">Gorjetas</strong> consistem em transferências PIX feitas pelo streamer,
              de forma voluntária, aos participantes selecionados. Você é responsável por fornecer uma chave PIX
              correta e válida; a plataforma e o streamer não se responsabilizam por valores enviados a chaves
              informadas incorretamente pelo próprio participante.
            </p>
          </Section>

          <Section title="6. Limitação de Responsabilidade">
            <p>
              A plataforma <strong className="text-white">stainzincs</strong> é fornecida &quot;como está&quot;, sem
              garantias de disponibilidade, precisão ou adequação a qualquer propósito específico. Não nos
              responsabilizamos por:
            </p>
            <ul className="mt-3 space-y-1.5 ml-4 list-disc list-outside text-gray-400">
              <li>Interrupções, falhas técnicas ou indisponibilidade do serviço</li>
              <li>Perda de dados, saldo virtual ou progresso em funcionalidades</li>
              <li>Danos diretos ou indiretos decorrentes do uso da plataforma</li>
              <li>Conteúdo de terceiros linkado ou referenciado no site</li>
              <li>Resultados de apostas em cassinos ou plataformas parceiras externas</li>
            </ul>
          </Section>

          <Section title="7. Links Externos">
            <p>
              Esta plataforma pode conter links para sites externos de terceiros. Ao acessar esses sites,
              você estará sujeito aos termos e condições desses sites, não sendo a plataforma
              stainzincs responsável pelo conteúdo ou práticas dessas plataformas.
            </p>
            <p className="mt-3 text-yellow-400/70">
              Apostas envolvem risco financeiro real. Nunca aposte mais do que pode perder.
            </p>
          </Section>

          <Section title="8. Encerramento de Conta">
            <p>
              Reservamo-nos o direito de suspender ou banir, a qualquer momento e sem aviso prévio, qualquer
              usuário que viole estes Termos de Uso ou que adote comportamento considerado prejudicial à
              comunidade ou à plataforma.
            </p>
            <p className="mt-3">
              Você pode encerrar seu acesso a qualquer momento simplesmente não utilizando mais a plataforma.
              Para solicitar a exclusão dos seus dados, entre em contato pelos canais oficiais.
            </p>
          </Section>

          <Section title="9. Propriedade Intelectual">
            <p>
              Todo o conteúdo da plataforma — incluindo design, código, textos, imagens e logotipos — é
              propriedade de stainzincs ou de seus respectivos licenciadores. É proibida a reprodução,
              distribuição ou uso comercial sem autorização prévia e expressa.
            </p>
          </Section>

          <Section title="10. Legislação Aplicável">
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa
              decorrente do uso desta plataforma será submetida ao foro da comarca competente, com
              renúncia a qualquer outro, por mais privilegiado que seja.
            </p>
          </Section>

          <Section title="11. Contato">
            <p>
              Para dúvidas, solicitações ou relatos de problemas relacionados a estes Termos, entre em contato
              através do chat da live na Twitch ou pelas redes sociais oficiais do canal stainzincs.
            </p>
          </Section>

        </div>
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-white transition-colors flex items-center gap-1.5">
            ← Voltar para Home
          </Link>
          <Link href="/privacidade" className="text-sm text-green-400 hover:text-green-300 transition-colors">
            Ver Política de Privacidade →
          </Link>
        </div>

      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-black text-white mb-3 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full inline-block flex-shrink-0"
          style={{ background: "linear-gradient(180deg, #22c55e, #16a34a)" }} />
        {title}
      </h2>
      <div className="pl-3 border-l border-white/5 space-y-2">
        {children}
      </div>
    </section>
  );
}

function Feature({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="text-lg flex-shrink-0">{icon}</span>
      <div>
        <p className="font-bold text-white text-sm mb-0.5">{title}</p>
        <p className="text-gray-400 text-xs leading-relaxed">{children}</p>
      </div>
    </li>
  );
}

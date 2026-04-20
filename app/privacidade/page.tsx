import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade · stainzincs",
  description: "Política de privacidade da plataforma stainzincs",
};

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen relative overflow-hidden">

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 relative z-10">

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-8">
          <Link href="/" className="hover:text-gray-300 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-gray-400">Política de Privacidade</span>
        </div>

        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4"
            style={{ background: "rgba(145,70,255,0.15)", color: "#c084fc", border: "1px solid rgba(145,70,255,0.3)" }}>
            🔒 Proteção de Dados
          </div>
          <h1 className="text-4xl font-black mb-3">
            <span style={{
              background: "linear-gradient(135deg, #c084fc, #9146ff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Política de Privacidade
            </span>
          </h1>
          <p className="text-gray-500 text-sm">Última atualização: 19 de abril de 2026</p>
        </div>

        <div className="rounded-2xl p-6 mb-8"
          style={{ background: "rgba(145,70,255,0.06)", border: "1px solid rgba(145,70,255,0.2)" }}>
          <p className="text-gray-300 text-sm leading-relaxed">
            A sua privacidade é importante para nós. Esta Política descreve de forma clara e transparente quais
            dados coletamos, como os utilizamos e como os protegemos quando você utiliza a plataforma{" "}
            <strong className="text-white">stainzincs</strong>.
          </p>
        </div>

        <div className="space-y-8 text-gray-300 text-sm leading-relaxed">

          <Section title="1. Dados que Coletamos" color="#9146ff">
            <p>Ao fazer login com sua conta Twitch, coletamos automaticamente as seguintes informações:</p>
            <div className="mt-4 space-y-3">
              <DataCard icon="👤" label="Nome de usuário (login)" description="Seu nome de usuário único na Twitch, usado para identificá-lo nas funcionalidades da plataforma." />
              <DataCard icon="✏️" label="Nome de exibição" description="O nome que aparece publicamente no seu perfil Twitch." />
              <DataCard icon="🖼️" label="Foto de perfil" description="A imagem de avatar da sua conta Twitch, exibida em placares e listas de participantes." />
              <DataCard icon="🔑" label="ID de autenticação (OAuth)" description="Token temporário fornecido pela Twitch para verificar sua identidade. Não armazenamos sua senha." />
            </div>
            <p className="mt-4 text-gray-400">
              <strong className="text-white">Não coletamos</strong> e-mail, número de telefone, dados financeiros,
              localização, endereço IP ou qualquer outro dado sensível além do descrito acima.
            </p>
          </Section>

          <Section title="2. Como Usamos os Dados" color="#9146ff">
            <p>Os dados coletados são utilizados exclusivamente para:</p>
            <ul className="mt-3 space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-purple-400 flex-shrink-0 mt-0.5">▸</span>
                <span>Identificar você dentro da plataforma e nas funcionalidades interativas (Palpites, Torneio, Batalha)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 flex-shrink-0 mt-0.5">▸</span>
                <span>Exibir seu nome e foto nos rankings, chaves de torneio e listas de participantes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 flex-shrink-0 mt-0.5">▸</span>
                <span>Manter sua sessão ativa durante o uso da plataforma</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 flex-shrink-0 mt-0.5">▸</span>
                <span>Verificar permissões de administrador (somente para contas autorizadas)</span>
              </li>
            </ul>
          </Section>

          <Section title="3. Armazenamento dos Dados" color="#9146ff">
            <p>
              Os dados de sessão são armazenados de forma temporária durante sua navegação na plataforma.
              Informações de participação em funcionalidades como Torneio e Batalha são mantidas
              <strong className="text-white"> em memória</strong> — ou seja, são apagadas automaticamente quando
              o servidor é reiniciado ou quando a rodada encerra.
            </p>
            <p className="mt-3">
              Não utilizamos banco de dados permanente para armazenar seus dados pessoais. Suas informações
              da Twitch são obtidas a cada login e mantidas apenas na sua sessão ativa.
            </p>
          </Section>

          <Section title="4. Compartilhamento de Dados" color="#9146ff">
            <p>
              <strong className="text-white">Não vendemos, alugamos ou compartilhamos</strong> seus dados pessoais
              com terceiros para fins comerciais ou de marketing.
            </p>
            <p className="mt-3">
              Seus dados podem ser visíveis para outros usuários da plataforma apenas no contexto das
              funcionalidades (ex.: seu nome em um ranking público ou chave de torneio). Isso é inerente
              ao funcionamento das mecânicas de jogo.
            </p>
            <div className="mt-4 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs text-gray-400">
                <strong className="text-gray-300">Sobre a Twitch:</strong> O login é processado diretamente pela
                Twitch via OAuth 2.0. Ao fazer login, você também está sujeito à{" "}
                <a href="https://www.twitch.tv/p/pt-br/legal/privacy-notice/" target="_blank" rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
                  Política de Privacidade da Twitch
                </a>.
              </p>
            </div>
          </Section>

          <Section title="5. Cookies e Sessão" color="#9146ff">
            <p>
              Utilizamos cookies de sessão estritamente necessários para manter você autenticado enquanto
              navega na plataforma. Esses cookies são temporários e são apagados quando você encerra o
              navegador ou faz logout.
            </p>
            <p className="mt-3">
              Não utilizamos cookies de rastreamento, publicidade ou análise de comportamento.
            </p>
          </Section>

          <Section title="6. Segurança" color="#9146ff">
            <p>
              Adotamos medidas técnicas para proteger seus dados, incluindo comunicação via HTTPS/TLS,
              tokens de sessão seguros e autenticação delegada à Twitch (não armazenamos senhas).
            </p>
            <p className="mt-3 text-gray-400">
              No entanto, nenhum sistema é 100% seguro. Em caso de incidente de segurança que afete seus
              dados, faremos o possível para notificá-lo pelos canais disponíveis.
            </p>
          </Section>

          <Section title="7. Seus Direitos" color="#9146ff">
            <p>Você tem os seguintes direitos em relação aos seus dados:</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <RightCard icon="👁️" title="Acesso" description="Saber quais dados temos sobre você" />
              <RightCard icon="✏️" title="Correção" description="Corrigir dados incorretos (via Twitch)" />
              <RightCard icon="🗑️" title="Exclusão" description="Solicitar a remoção dos seus dados" />
              <RightCard icon="🚪" title="Portabilidade" description="Receber seus dados em formato legível" />
            </div>
            <p className="mt-4 text-gray-400">
              Para exercer qualquer um desses direitos, entre em contato através do chat da Twitch ou
              redes sociais oficiais do stainzincs.
            </p>
          </Section>

          <Section title="8. Menores de Idade" color="#9146ff">
            <p>
              Esta plataforma é destinada exclusivamente a maiores de <strong className="text-white">18 anos</strong>.
              Não coletamos intencionalmente dados de menores. Se tomarmos conhecimento de que coletamos
              dados de um menor, excluiremos essas informações imediatamente.
            </p>
          </Section>

          <Section title="9. Alterações nesta Política" color="#9146ff">
            <p>
              Esta Política pode ser atualizada periodicamente. Alterações significativas serão
              comunicadas na plataforma ou nos canais sociais do stainzincs. O uso continuado da
              plataforma após as alterações constitui aceitação da nova versão.
            </p>
          </Section>

          <Section title="10. Contato" color="#9146ff">
            <p>
              Dúvidas ou solicitações relacionadas à privacidade? Entre em contato pelo chat ao vivo na
              Twitch em{" "}
              <a href="https://twitch.tv/stainzincs" target="_blank" rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
                twitch.tv/stainzincs
              </a>{" "}
              ou pelas redes sociais oficiais do canal.
            </p>
          </Section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-white transition-colors">
            ← Voltar para Home
          </Link>
          <Link href="/termos" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
            Ver Termos de Uso →
          </Link>
        </div>

      </div>
    </main>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-black text-white mb-3 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full inline-block flex-shrink-0"
          style={{ background: `linear-gradient(180deg, ${color}, ${color}88)` }} />
        {title}
      </h2>
      <div className="pl-3 border-l border-white/5 space-y-2">
        {children}
      </div>
    </section>
  );
}

function DataCard({ icon, label, description }: { icon: string; label: string; description: string }) {
  return (
    <div className="flex gap-3 rounded-xl p-3" style={{ background: "rgba(145,70,255,0.05)", border: "1px solid rgba(145,70,255,0.15)" }}>
      <span className="text-lg flex-shrink-0">{icon}</span>
      <div>
        <p className="font-bold text-white text-sm mb-0.5">{label}</p>
        <p className="text-gray-400 text-xs leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function RightCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="text-base flex-shrink-0">{icon}</span>
      <div>
        <p className="font-bold text-white text-xs mb-0.5">{title}</p>
        <p className="text-gray-500 text-xs">{description}</p>
      </div>
    </div>
  );
}

# Streamer Hub

É um site feito pro meu canal na Twitch. Tem sistema de palpites, sorteios, batalha de bônus, torneio por times e jackpot. Tudo integrado com o chat via bot, com login pelo Twitch e pagamentos pelo LivePix.

O projeto tem duas partes: o **site** (Next.js) e o **bot** (Node.js). O site serve a interface pra quem assiste e o painel do admin. O bot fica escutando o chat e processa os comandos.

---

## O que tem aqui

### Palpites

Viewers apostam qual valor vai sair no jogo. Você abre uma rodada, o pessoal manda `!p 230` no chat, o bot registra. Quando fechar, o sistema vê quem chegou mais perto e anuncia no chat.

Tem histórico das últimas 10 rodadas, suporte a múltiplos vencedores e a fila de mensagens que o bot fala automaticamente quando você fecha a rodada.

### Sorteios

Você cria um sorteio com prêmio e intervalo de tickets. Quem participar pelo site começa a ganhar +1 ticket a cada X minutos, mas só se estiver ativo no chat e seguindo o canal. Quando quiser sortear, o sistema escolhe aleatoriamente levando em conta quem tem mais tickets.

### Batalha de Bônus

Torneio de chave eliminatória com 8, 16 ou 32 participantes. Você divulga um comando no chat (tipo `!batalha`), quem mandar entra. Quando fechar as inscrições, o bracket é gerado automaticamente. Você vai definindo o jogo e o vencedor de cada confronto até chegar na final.

### Torneio por Times

Um torneio em fases onde viewers escolhem um time com `!time Flamengo` (ou qualquer nome que você configurar). Ao final de cada fase você define o vencedor e só quem votou no time certo avança pra próxima fase. Vai eliminando até chegar nos finalistas.

### Jackpot

Cada jogador registra o resultado que tirou no jogo. Quem tirou mais alto leva o prêmio. A entrada é automatizada pelo LivePix: quando alguém paga o valor correto, o webhook registra automaticamente. Você só precisa criar o jackpot, adicionar os jogadores e iniciar.

---

## Rodando localmente

```bash
npm install
npm run dev
```

O site sobe em `http://localhost:3000`. Em outro terminal:

```bash
npm run bot
```

Sem as variáveis do Turso configuradas, o projeto usa um arquivo local em `.data/palpites-store.json`. Com `REQUER_LIVE=false` o bot distribui tickets mesmo quando o canal tá offline, útil pra testar.

---

## Variáveis de ambiente

Crie um `.env.local` com:

```env
# Twitch - API pública (fotos dos viewers + status da live). NÃO é mais usado para login.
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=

# Login próprio (e-mail + senha) — assina a sessão JWT
AUTH_SECRET=
# Admins: nicks da Twitch (separados por vírgula). Quem criar a conta com esse nick vira admin.
NEXT_PUBLIC_ADMIN_LOGINS=dudufpss,stainzincs

# URL de produção
NEXTAUTH_URL=https://seudominio.com
SITE_URL=https://seudominio.com

# Bot Twitch
BOT_USERNAME=
BOT_OAUTH=
TWITCH_CHANNEL=seucanal
BOT_SECRET=
REQUER_LIVE=true

# Banco de dados (Turso)
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

# LivePix (só pra jackpot)
LIVEPIX_CLIENT_ID=
LIVEPIX_CLIENT_SECRET=
LIVEPIX_WEBHOOK_SECRET=
```

O `BOT_OAUTH` é o token OAuth do bot (com ou sem `oauth:` no começo, os dois funcionam). O `BOT_SECRET` é uma string qualquer que você define, usada pra validar as requisições do bot pro site.

Para o `AUTH_SECRET`, gere com `openssl rand -base64 32`.

---

## Banco de dados

Usa Turso (SQLite distribuído). Quando as variáveis `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` estiverem configuradas, o projeto cria automaticamente a tabela `app_store` e usa ela. Sem essas variáveis, cai pra um arquivo local ou memória.

Em produção, configura o Turso pra não perder os dados entre deploys. A rota `/api/palpites/debug` mostra o estado do banco se precisar debugar.

---

## Deploy

### Site

No Render, cria um Web Service com:
- Build: `npm run build`
- Start: `npm start`

Na Vercel, só sobe o repositório que ela detecta o Next.js automaticamente.

O importante é configurar `NEXTAUTH_URL` e `SITE_URL` com o domínio de produção, senão o login Twitch quebra.

### Bot

No Render, cria um Background Worker com:
- Command: `npm run bot`

O bot precisa de acesso ao `SITE_URL` pra funcionar, então coloca a URL do site nessa variável.

---

## Autenticação

Login é por conta própria (**e-mail + senha**), via NextAuth com provider Credentials. No cadastro a pessoa informa o **nome da Twitch** (precisa ser o mesmo do chat, para casar com o bot), nome completo, CPF, e-mail, senha e o **print do depósito na JonBet** (obrigatório). E-mail e CPF são únicos. Senhas são guardadas como hash scrypt (`lib/password.ts`).

Os admins são definidos pelos nicks da Twitch em `NEXT_PUBLIC_ADMIN_LOGINS` (fallback em `lib/admins.ts`). Quem cria a conta com um nick admin vira admin automaticamente. Só o admin acessa as rotas `/admin/*`; quem não é admin é redirecionado.

O webhook do LivePix valida a assinatura com `crypto.timingSafeEqual` e tem idempotência por `messageId`, então requisições duplicadas são ignoradas sem problema.

---

## Scripts

```bash
npm run dev     # Desenvolvimento
npm run build   # Build de produção
npm run start   # Roda o build
npm run lint    # Lint
npm run bot     # Roda o bot
```

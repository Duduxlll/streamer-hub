# streamer-hub

Site Next.js e bot da Twitch para interações ao vivo.

## Produção

URL do site: use o domínio que aparece no botão **Visit** do deploy de produção na Vercel.

## Comandos

```bash
npm run dev
npm run build
npm run lint
npm run bot
```

## Deploy

- Site: Render Web Service ou Vercel
- Bot: Render Background Worker ou Railway

Configure `NEXTAUTH_URL`, `AUTH_URL` e `SITE_URL` com o domínio atual de produção.

## Banco dos palpites

Para palpites em produção, configure Turso no site e no bot:

```text
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
```

O app cria automaticamente a tabela `app_store` no Turso com `CREATE TABLE IF NOT EXISTS` quando o storage de palpites e usado. A rota admin `/api/palpites/debug` tambem aciona esse diagnostico e mostra se o Turso esta configurado.

Sem essas variáveis, o projeto usa `.data/palpites-store.json` apenas no desenvolvimento local. Em produção, configure Turso para manter rodadas e historico salvos entre deploys/reinicios.

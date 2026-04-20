# streamer-hub

Site Next.js e bot da Twitch para interações ao vivo.

## Produção

URL do site:

```text
https://streamer-hub-delta.vercel.app
```

## Comandos

```bash
npm run dev
npm run build
npm run lint
npm run bot
```

## Deploy

- Site: Vercel
- Bot: Railway

Configure `NEXTAUTH_URL` e `SITE_URL` com a URL de produção acima.

Para palpites em produção, configure um Redis/Upstash no site e no bot:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Sem essas variáveis, o projeto usa `.data/palpites-store.json` apenas no desenvolvimento local.

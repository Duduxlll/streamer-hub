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

- Site: Vercel
- Bot: Railway

Configure `NEXTAUTH_URL`, `AUTH_URL` e `SITE_URL` com o domínio atual de produção da Vercel.

Para palpites em produção, configure um Redis/Upstash no projeto da Vercel:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Sem essas variáveis, o projeto usa `.data/palpites-store.json` apenas no desenvolvimento local.

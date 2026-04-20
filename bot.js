// Bot da Twitch — escuta comandos e distribui tickets de sorteio
// Executar com: npm run bot
require("dotenv").config({ path: ".env.local" });

const tmi = require("tmi.js");

const FALLBACK_SITE_URL = "https://streamer-hub-delta.vercel.app";

function normalizeSiteUrl(value) {
  if (!value) return "";

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
}

const CHANNEL       = process.env.TWITCH_CHANNEL        || "stainzincs";
const SITE_URL      = normalizeSiteUrl(
  process.env.SITE_URL ||
  process.env.NEXTAUTH_URL ||
  process.env.AUTH_URL ||
  FALLBACK_SITE_URL
);
const BOT_SECRET    = process.env.BOT_SECRET             || "";
const BOT_USER      = process.env.BOT_USERNAME           || "";
const BOT_OAUTH     = process.env.BOT_OAUTH              || "";
const CLIENT_ID     = process.env.TWITCH_CLIENT_ID       || "";
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET   || "";

// false = conta tickets mesmo offline (teste); true = só quando ao vivo
const REQUER_LIVE = process.env.REQUER_LIVE !== "false";

if (!BOT_SECRET) { console.error("❌  BOT_SECRET não definido no .env.local"); process.exit(1); }

console.log(`📺  Canal: #${CHANNEL}`);
console.log(`📡  Requer live: ${REQUER_LIVE ? "SIM" : "NÃO (modo teste)"}`);

/* ─── tmi.js ─── */
const clientOptions = {
  channels: [CHANNEL],
  ...(BOT_USER && BOT_OAUTH ? {
    identity: {
      username: BOT_USER,
      password: BOT_OAUTH.startsWith("oauth:") ? BOT_OAUTH : `oauth:${BOT_OAUTH}`,
    },
  } : {}),
};

const client = new tmi.Client(clientOptions);

client.connect().then(() => {
  const modo = BOT_USER ? `autenticado como ${BOT_USER}` : "anônimo (só leitura)";
  console.log(`🤖  Bot conectado — modo: ${modo}`);
  console.log(`🔗  API: ${SITE_URL}\n`);
}).catch((err) => {
  console.error("❌  Erro ao conectar:", err);
  process.exit(1);
});

/* ─────────────────────────────────────────
   App Access Token (client credentials)
   Usado para verificar live e follows
   ───────────────────────────────────────── */
let _appToken = null;
let _appTokenExpiry = 0;

async function getAppToken() {
  if (_appToken && Date.now() < _appTokenExpiry) return _appToken;
  try {
    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
    });
    const d = await res.json();
    _appToken = d.access_token;
    _appTokenExpiry = Date.now() + ((d.expires_in ?? 3600) - 60) * 1000;
    return _appToken;
  } catch (err) {
    console.error("❌  Falha ao obter app token:", err.message);
    return null;
  }
}

async function helixGet(path) {
  const token = await getAppToken();
  if (!token) return {};
  const res = await fetch(`https://api.twitch.tv/helix${path}`, {
    headers: { "Client-ID": CLIENT_ID, "Authorization": `Bearer ${token}` },
  });
  return res.json();
}

/* ─── Verificar se o canal está ao vivo ─── */
async function canalEstaAoVivo() {
  try {
    const data = await helixGet(`/streams?user_login=${CHANNEL}`);
    return (data.data?.length ?? 0) > 0;
  } catch { return false; }
}

/* ─── IDs e avatares dos usuários ─── */
let broadcasterID = null;
const userIDCache  = new Map(); // login -> twitch_id
const avatarCache  = new Map(); // login -> image_url

async function getBroadcasterID() {
  if (broadcasterID) return broadcasterID;
  try {
    const data = await helixGet(`/users?login=${CHANNEL}`);
    broadcasterID = data.data?.[0]?.id ?? null;
    if (broadcasterID) console.log(`📺  ID do canal #${CHANNEL}: ${broadcasterID}`);
    else console.warn(`⚠️   Não encontrou ID do canal #${CHANNEL}`);
  } catch { broadcasterID = null; }
  return broadcasterID;
}

async function getUserInfo(login) {
  if (userIDCache.has(login)) return userIDCache.get(login);
  try {
    const data = await helixGet(`/users?login=${login}`);
    const user = data.data?.[0];
    if (user) {
      userIDCache.set(login, user.id);
      avatarCache.set(login, user.profile_image_url ?? null);
      if (chatters.has(login)) chatters.get(login).image = user.profile_image_url ?? null;
      return user.id;
    }
  } catch { /* ignora */ }
  return null;
}

/* ─── Checar follow ─── */
const followCache = new Map(); // login -> { segue, ts }
const FOLLOW_TTL  = 5 * 60 * 1000; // 5 min

async function eSeguidorDoCanal(login) {
  const cached = followCache.get(login);
  if (cached && Date.now() - cached.ts < FOLLOW_TTL) return cached.segue;

  try {
    const bId = await getBroadcasterID();
    if (!bId) return true;

    const uId = await getUserInfo(login);
    if (!uId) return false;

    const data = await helixGet(`/channels/followers?broadcaster_id=${bId}&user_id=${uId}`);

    if (data.error || data.status === 401 || data.status === 403) {
      // API exige token do broadcaster ou moderador — fallback permissivo
      followCache.set(login, { segue: true, ts: Date.now() });
      return true;
    }

    const segue = (data.total ?? 0) > 0;
    followCache.set(login, { segue, ts: Date.now() });
    return segue;
  } catch {
    return true;
  }
}

/* ─────────────────────────────────────────
   Rastreamento de chatters ativos
   ───────────────────────────────────────── */
const chatters = new Map(); // login -> { displayName, image, lastSeen }

client.on("message", async (_channel, tags, message, self) => {
  if (self) return;

  const displayName = tags["display-name"] || tags.username || "?";
  const login       = (tags.username || "").toLowerCase();
  const msg         = message.trim();

  // Atualiza registro do chatter
  const existing = chatters.get(login);
  chatters.set(login, {
    displayName,
    image    : existing?.image ?? avatarCache.get(login) ?? null,
    lastSeen : Date.now(),
  });

  /* ── !p / !palpite ── */
  const matchP = msg.match(/^!(?:p|palpite)\s+([\d.,]+)/i);
  if (matchP) {
    const valor = parseFloat(matchP[1].replace(/\./g, "").replace(",", "."));
    if (isNaN(valor) || valor <= 0) return;
    try {
      const res  = await fetch(`${SITE_URL}/api/palpites`, {
        method : "POST",
        headers: { "Content-Type": "application/json", "x-bot-secret": BOT_SECRET },
        body   : JSON.stringify({ username: displayName, valor }),
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`✅  Palpite ${displayName}: R$ ${valor}`);
        if (BOT_USER) {
          const txt = data.updated
            ? `@${displayName} palpite atualizado para R$ ${valor.toLocaleString("pt-BR")} ✅`
            : `@${displayName} palpite de R$ ${valor.toLocaleString("pt-BR")} registrado! 🎯`;
          client.say(_channel, txt).catch(() => {});
        }
      }
    } catch (err) { console.error("❌  Erro palpite:", err.message); }
    return;
  }

  /* ── Batalha ── */
  if (batalhaComando && msg.toLowerCase() === batalhaComando.toLowerCase()) {
    try {
      const res  = await fetch(`${SITE_URL}/api/batalha/entrar`, {
        method : "POST",
        headers: { "Content-Type": "application/json", "x-bot-secret": BOT_SECRET },
        body   : JSON.stringify({ username: login, displayName }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        console.log(`⚔️  Batalha ${displayName}: inscrito!`);
        if (BOT_USER)
          client.say(_channel, `@${displayName} inscrito na batalha! ⚔️`).catch(() => {});
      }
    } catch (err) { console.error("❌  Erro batalha:", err.message); }
    return;
  }

  /* ── !time ── */
  const matchT = msg.match(/^!time\s+(.+)/i);
  if (matchT) {
    const time = matchT[1].trim();
    if (!time) return;
    try {
      const res  = await fetch(`${SITE_URL}/api/torneio/participar`, {
        method : "POST",
        headers: { "Content-Type": "application/json", "x-bot-secret": BOT_SECRET },
        body   : JSON.stringify({ username: login, displayName, time }),
      });
      const data = await res.json();
      console.log(`🏆  Torneio ${displayName}: ${data.ok ? "registrado" : data.motivo}`);
      if (BOT_USER && !SILENCIOSO && data.motivo)
        client.say(_channel, `@${displayName} ${data.motivo}`).catch(() => {});
    } catch (err) { console.error("❌  Erro torneio:", err.message); }
    return;
  }
});

client.on("disconnected", (reason) => {
  console.warn("⚠️   Desconectado:", reason, "— reconectando em 5s...");
  setTimeout(() => client.connect().catch(() => {}), 5000);
});

/* ─────────────────────────────────────────
   Sistema de Tickets
   Distribui +1 ticket a cada minutosTicket
   para quem está no chat e segue o canal
   ───────────────────────────────────────── */
let lastTicketRun = 0;

async function darTickets() {
  try {
    // 1. Verificar se canal está ao vivo (se REQUER_LIVE=true)
    if (REQUER_LIVE) {
      const aoVivo = await canalEstaAoVivo();
      if (!aoVivo) {
        process.stdout.write(".");  // ponto silencioso — canal offline
        return;
      }
    }

    // 2. Buscar sorteio ativo
    const res = await fetch(`${SITE_URL}/api/sorteio`);
    const data = await res.json();
    const sorteio = data.ativo;

    if (!sorteio || sorteio.status !== "ativo") {
      if (!sorteio) lastTicketRun = 0;
      return;
    }

    // 3. Checar se já passou o intervalo desde a última rodada
    const intervalMs = sorteio.minutosTicket * 60 * 1000;
    const now        = Date.now();

    if (lastTicketRun > 0 && now - lastTicketRun < intervalMs) return;
    lastTicketRun = now;

    const janelaAtividade = intervalMs + 15 * 60 * 1000; // intervalo + 15 min de tolerância
    const ativos = [...chatters.entries()].filter(([, v]) => now - v.lastSeen <= janelaAtividade);

    console.log(`\n🎟️  [${new Date().toLocaleTimeString("pt-BR")}] Rodada de tickets`);
    console.log(`   Sorteio: "${sorteio.titulo}" | intervalo: ${sorteio.minutosTicket}min`);
    console.log(`   Chatters ativos: ${ativos.length} | Participantes: ${sorteio.participantes.length}`);

    let total = 0;
    for (const [login, info] of ativos) {
      // Só dá ticket para quem já participou
      const eParticipante = sorteio.participantes.some(p => p.username === login);
      if (!eParticipante) {
        console.log(`  ⏭️  ${info.displayName} — não participou do sorteio`);
        continue;
      }

      // Checar follow
      const segue = await eSeguidorDoCanal(login);
      if (!segue) {
        console.log(`  ⏭️  ${info.displayName} — não segue #${CHANNEL}`);
        continue;
      }

      // Busca avatar se não temos
      if (!info.image) await getUserInfo(login);

      const ticketRes = await fetch(`${SITE_URL}/api/sorteio`, {
        method : "POST",
        headers: { "Content-Type": "application/json", "x-bot-secret": BOT_SECRET },
        body   : JSON.stringify({
          action     : "add-ticket",
          username   : login,
          displayName: info.displayName,
          image      : chatters.get(login)?.image ?? null,
        }),
      });
      const ticketData = await ticketRes.json();

      if (ticketData.ok) {
        total++;
        console.log(`  ✅  ${info.displayName} → +1 ticket`);
      } else {
        console.log(`  ❌  ${info.displayName} → falhou (sorteio encerrado?)`);
      }
    }

    console.log(`  📊  Total nesta rodada: ${total} ticket(s)\n`);
  } catch (err) {
    console.error("❌  Erro na rodada de tickets:", err.message);
  }
}

// Verifica a cada 30s se é hora de dar tickets
setInterval(darTickets, 30 * 1000);

/* ─── Comando de batalha (atualiza a cada 10s) ─── */
let batalhaComando = null;
async function refreshBatalhaComando() {
  try {
    const res = await fetch(`${SITE_URL}/api/batalha`);
    if (!res.ok) return;
    const data = await res.json();
    batalhaComando = data?.status === "inscricao" ? (data.comando ?? null) : null;
  } catch { batalhaComando = null; }
}
refreshBatalhaComando();
setInterval(refreshBatalhaComando, 10000);

/* ─── Mensagens enfileiradas pelo admin ─── */
async function drainAndSend() {
  if (!BOT_USER) return;
  try {
    const res = await fetch(`${SITE_URL}/api/palpites/announce`, {
      headers: { "x-bot-secret": BOT_SECRET },
    });
    if (!res.ok) return;
    const msgs = await res.json();
    for (const msg of msgs) {
      await client.say(`#${CHANNEL}`, msg).catch(() => {});
      console.log(`📢  Chat: ${msg}`);
    }
  } catch { /* ignora */ }
}
setInterval(drainAndSend, 1000);

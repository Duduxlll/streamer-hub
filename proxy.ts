import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import { NextResponse, type NextRequest } from "next/server";

// Cache de IPs banidos — persiste entre requests no mesmo processo Node (Render single instance)
let bannedIpsCache: Set<string> = new Set();
let cacheTs = 0;
const CACHE_TTL = 60_000; // 60s

async function refreshBannedIps(): Promise<void> {
  const dbUrl   = process.env.TURSO_DATABASE_URL;
  const dbToken = process.env.TURSO_AUTH_TOKEN;
  if (!dbUrl || !dbToken) return;

  try {
    const httpUrl = dbUrl.replace("libsql://", "https://").replace(/\/$/, "");
    const res = await fetch(`${httpUrl}/v2/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dbToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            type: "execute",
            stmt: {
              sql: "SELECT value FROM app_store WHERE key = ?",
              args: [{ type: "text", value: "admin:banned-ips:v1" }],
            },
          },
          { type: "close" },
        ],
      }),
      cache: "no-store",
    });

    if (!res.ok) return;
    const data = await res.json() as {
      results?: Array<{ response?: { result?: { rows?: Array<Array<{ value?: string }>> } } }>
    };
    const raw = data.results?.[0]?.response?.result?.rows?.[0]?.[0]?.value;
    bannedIpsCache = raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    cacheTs = Date.now();
  } catch { /* best-effort — nunca bloqueia o request */ }
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    ""
  );
}

export const proxy = auth(async (req) => {
  const { pathname } = req.nextUrl;
  const twitchLogin  = (req.auth?.user as { twitchLogin?: string })?.twitchLogin;

  // ── Verificação de IP banido ─────────────────────────────────────────
  // Não verifica na própria página de banido nem em assets/auth para evitar loop
  const skipIpCheck =
    pathname === "/banido" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth");

  if (!skipIpCheck) {
    if (Date.now() - cacheTs > CACHE_TTL) {
      await refreshBannedIps();
    }
    const ip = getClientIp(req);
    if (ip && bannedIpsCache.has(ip)) {
      return NextResponse.redirect(new URL("/banido", req.url));
    }
  }

  // ── Proteção das rotas /admin ────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!req.auth) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdmin(twitchLogin)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
});

export const config = {
  // Cobre todas as rotas exceto assets estáticos e imagens otimizadas
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

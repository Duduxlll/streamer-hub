import { NextRequest, NextResponse } from "next/server";

// Cache de IPs banidos — funciona porque o Render roda num único processo Node
let bannedIpsCache: Set<string> = new Set();
let cacheTs = 0;
const CACHE_TTL = 60_000; // 60s

async function refreshBannedIps(): Promise<void> {
  const dbUrl   = process.env.TURSO_DATABASE_URL;
  const dbToken = process.env.TURSO_AUTH_TOKEN;
  if (!dbUrl || !dbToken) return;

  try {
    // Usa a API HTTP do Turso diretamente (compatível com Edge/fetch)
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
    const data = await res.json() as { results?: Array<{ response?: { result?: { rows?: Array<Array<{ value?: string }>> } } }> };
    const raw  = data.results?.[0]?.response?.result?.rows?.[0]?.[0]?.value;
    bannedIpsCache = raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    cacheTs = Date.now();
  } catch { /* sem Turso ou erro de rede — ignora */ }
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    (req as unknown as { ip?: string }).ip ??
    ""
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Não bloqueia a própria página de banido nem assets estáticos
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/banido"
  ) {
    return NextResponse.next();
  }

  // Atualiza cache se expirado
  if (Date.now() - cacheTs > CACHE_TTL) {
    await refreshBannedIps();
  }

  const ip = getClientIp(req);
  if (ip && bannedIpsCache.has(ip)) {
    return NextResponse.redirect(new URL("/banido", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import { isConfigured as livepixConfigured } from "@/lib/livepix";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.twitchLogin)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const ggpixOk = !!process.env.GGPIX_API_KEY;

  return NextResponse.json({
    ggpix: { ok: ggpixOk },
    livepix: { ok: livepixConfigured() },
  }, { headers: NO_CACHE });
}

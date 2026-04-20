import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import { setLivePixUserToken } from "@/lib/store";

export async function POST() {
  const session = await auth();
  if (!isAdmin(session?.user?.twitchLogin)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  await setLivePixUserToken(null);
  return NextResponse.json({ ok: true });
}

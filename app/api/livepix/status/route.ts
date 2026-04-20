import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/livepix";

export async function GET() {
  return NextResponse.json({ connected: isConfigured() });
}

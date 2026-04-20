import { NextResponse } from "next/server";

const CHANNEL = process.env.TWITCH_CHANNEL ?? "stainzincs";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: "POST" }
  );

  if (!res.ok) throw new Error("Twitch token error");

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };

  return cachedToken.token;
}

export async function GET() {
  try {
    const token = await getAppToken();

    const res = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${CHANNEL}`,
      {
        headers: {
          "Client-Id": process.env.TWITCH_CLIENT_ID!,
          Authorization: `Bearer ${token}`,
        },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) throw new Error("Twitch API error");

    const data = await res.json();
    const stream = data.data?.[0];

    if (stream) {
      return NextResponse.json({
        isLive: true,
        viewerCount: stream.viewer_count as number,
        title: stream.title as string,
        gameName: stream.game_name as string,
      });
    }

    return NextResponse.json({ isLive: false });
  } catch {
    return NextResponse.json({ isLive: false });
  }
}

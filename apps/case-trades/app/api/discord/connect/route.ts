import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = `${url.origin}/api/auth/discord/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "Missing DISCORD_CLIENT_ID." },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    prompt: "consent",
  });

  return NextResponse.redirect(
    `https://discord.com/oauth2/authorize?${params.toString()}`
  );
}
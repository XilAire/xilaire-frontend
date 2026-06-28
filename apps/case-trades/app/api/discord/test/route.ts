import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_BOT_COMMANDS_CHANNEL;

  if (!token || !channelId) {
    return NextResponse.json(
      { error: "Discord token or channel ID missing." },
      { status: 500 }
    );
  }

  const response = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: "✅ CASE Trades Bot test message sent successfully.",
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      { error: "Discord post failed.", status: response.status, details: text },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
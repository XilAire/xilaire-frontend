"use server";

import { redirect } from "next/navigation";

async function postDiscordMessage(
  channelId: string,
  message: string
) {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    throw new Error("Missing DISCORD_BOT_TOKEN");
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
        content: message,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();

    console.error(
      "Discord post failed:",
      response.status,
      text
    );

    throw new Error("Discord post failed");
  }
}

export async function sendManualDiscordMessage(
  formData: FormData
) {
  const message = String(
    formData.get("message") ?? ""
  ).trim();

  const channelIds = formData
    .getAll("channelIds")
    .map(String);

  if (!message) {
    throw new Error("Message is required");
  }

  if (channelIds.length === 0) {
    throw new Error("Select at least one channel");
  }

  await Promise.all(
    channelIds.map((channelId) =>
      postDiscordMessage(channelId, message)
    )
  );

  redirect(
    "/dashboard/master-admin/discord?success=1"
  );
}
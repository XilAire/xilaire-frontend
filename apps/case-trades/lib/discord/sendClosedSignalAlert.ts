import { createClient } from "@supabase/supabase-js";

type SignalCloseAlertRow = {
  id: string;
  organization_id: string | null;
  status: string | null;
  action: string | null;
  instrument_type: string | null;
  asset: string | null;
  underlying: string | null;
  entry_price: number | null;
  exit_price: number | null;
  underlying_entry_price: number | null;
  option_type: string | null;
  strike_price: number | null;
  expiration_date: string | null;
  confidence: number | null;
  trade_style: string | null;
  outcome: "WIN" | "LOSS" | "BREAKEVEN" | null;
  return_pct: number | null;
  closed_at: string | null;
  discord_channel_id: string | null;
  discord_message_id: string | null;
  discord_close_sent_at: string | null;
};

type DiscordOrganization = {
  id: string;
  slug: string;
  name: string;
};

type DiscordChannelRow = {
  id: string;
  organization_id: string;
  channel_type: string;
  channel_id: string;
  name: string | null;
  active: boolean;
};

const CASE_TRADES_ORG_ID = "491f385c-04e5-4446-97d1-457e5ce15d9d";
const DEFAULT_ORG_SLUG = "case-trades";

function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function formatMoney(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }

  return `$${Number(value).toFixed(2)}`;
}

function formatPercent(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }

  const amount = Number(value);
  const prefix = amount > 0 ? "+" : "";

  return `${prefix}${amount.toFixed(2)}%`;
}

function getTicker(signal: SignalCloseAlertRow) {
  return (signal.asset?.trim() || signal.underlying || "").toUpperCase();
}

function getCloseColor(outcome: SignalCloseAlertRow["outcome"]) {
  if (outcome === "WIN") return 0x00c781;
  if (outcome === "LOSS") return 0xef4444;
  return 0xf59e0b;
}

function getOutcomeEmoji(outcome: SignalCloseAlertRow["outcome"]) {
  if (outcome === "WIN") return "✅";
  if (outcome === "LOSS") return "❌";
  return "➖";
}

function buildSignalTitle(signal: SignalCloseAlertRow) {
  const ticker = getTicker(signal);

  if (signal.instrument_type === "OPTION") {
    return `${signal.action ?? "SIGNAL"} ${ticker} ${
      signal.strike_price ?? ""
    } ${signal.option_type ?? ""}`.trim();
  }

  return `${signal.action ?? "SIGNAL"} ${ticker}`.trim();
}

async function getDiscordOrganization(
  organizationId: string | null
): Promise<DiscordOrganization> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("organizations")
    .select("id, slug, name")
    .eq("id", organizationId ?? CASE_TRADES_ORG_ID)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("Discord close alert organization lookup failed", {
      organization_id: organizationId,
      error,
    });
  }

  if (data) {
    return data as DiscordOrganization;
  }

  return {
    id: organizationId ?? CASE_TRADES_ORG_ID,
    slug: DEFAULT_ORG_SLUG,
    name: "CASE Trades",
  };
}

async function getOrganizationDiscordChannels(organizationId: string) {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("discord_channels")
    .select("id, organization_id, channel_type, channel_id, name, active")
    .eq("organization_id", organizationId)
    .eq("active", true);

  if (error) {
    console.error("Discord close alert channel lookup failed", {
      organization_id: organizationId,
      error,
    });

    return [];
  }

  return (data ?? []) as DiscordChannelRow[];
}

function getCloseAlertChannels(discordChannels: DiscordChannelRow[]) {
  const channelIds = discordChannels
    .filter((channel) =>
      ["signals", "options", "stocks", "small_caps"].includes(
        String(channel.channel_type)
      )
    )
    .map((channel) => channel.channel_id);

  return [...new Set(channelIds.filter(Boolean))];
}

async function postDiscordReply({
  channelId,
  originalMessageId,
  token,
  body,
}: {
  channelId: string;
  originalMessageId: string | null;
  token: string;
  body: unknown;
}) {
  const replyBody =
    originalMessageId && originalMessageId.trim().length > 0
      ? {
          ...(body as Record<string, unknown>),
          message_reference: {
            message_id: originalMessageId,
            channel_id: channelId,
            fail_if_not_exists: false,
          },
        }
      : body;

  const response = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(replyBody),
    }
  );

  if (!response.ok) {
    const text = await response.text();

    console.error(
      `Discord close alert failed for channel ${channelId}:`,
      response.status,
      text
    );

    return false;
  }

  return true;
}

async function markCloseAlertSent(signalId: string) {
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from("signals")
    .update({
      discord_close_sent_at: new Date().toISOString(),
    })
    .eq("id", signalId);

  if (error) {
    console.error("Unable to mark Discord close alert as sent", {
      signalId,
      error,
    });
  }
}

export async function sendClosedSignalAlert(signalId: string) {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    console.warn("Discord bot token missing. Skipping close alert.");
    return;
  }

  const supabase = createSupabaseAdmin();

  const { data: signal, error } = await supabase
    .from("signals")
    .select(
      `
      id,
      organization_id,
      status,
      action,
      instrument_type,
      asset,
      underlying,
      entry_price,
      exit_price,
      underlying_entry_price,
      option_type,
      strike_price,
      expiration_date,
      confidence,
      trade_style,
      outcome,
      return_pct,
      closed_at,
      discord_channel_id,
      discord_message_id,
      discord_close_sent_at
      `
    )
    .eq("id", signalId)
    .maybeSingle();

  if (error || !signal) {
    console.error("Unable to load signal for Discord close alert", {
      signalId,
      error,
    });

    return;
  }

  const closeSignal = signal as SignalCloseAlertRow;

  if (closeSignal.discord_close_sent_at) {
    console.warn("Discord close alert already sent. Skipping duplicate.", {
      signalId,
      discord_close_sent_at: closeSignal.discord_close_sent_at,
    });

    return;
  }

  const organization = await getDiscordOrganization(closeSignal.organization_id);

  const fallbackChannels = closeSignal.discord_channel_id
    ? [closeSignal.discord_channel_id]
    : getCloseAlertChannels(await getOrganizationDiscordChannels(organization.id));

  if (fallbackChannels.length === 0) {
    console.warn("No Discord channels configured for close alert.", {
      organization_id: organization.id,
      signalId,
    });

    return;
  }

  const title = buildSignalTitle(closeSignal);
  const outcome = closeSignal.outcome ?? "BREAKEVEN";
  const outcomeEmoji = getOutcomeEmoji(outcome);

  const content = [
    `${outcomeEmoji} **SIGNAL CLOSED**`,
    "",
    `📣 **${title}**`,
    `📊 **Outcome:** ${outcome}`,
    `📈 **Return:** ${formatPercent(closeSignal.return_pct)}`,
    `💵 **Entry:** ${formatMoney(closeSignal.entry_price)}`,
    `🏁 **Exit:** ${formatMoney(closeSignal.exit_price)}`,
    `@everyone`,
    `@here`,
    "",
    `#${organization.name.replace(/\s+/g, "")} #SignalClosed`,
  ].join("\n");

  const fields = [
    {
      name: "Ticker",
      value: getTicker(closeSignal),
      inline: true,
    },
    {
      name: "Outcome",
      value: `${outcomeEmoji} ${outcome}`,
      inline: true,
    },
    {
      name: "Return",
      value: formatPercent(closeSignal.return_pct),
      inline: true,
    },
    {
      name: "Entry",
      value: formatMoney(closeSignal.entry_price),
      inline: true,
    },
    {
      name: "Exit",
      value: formatMoney(closeSignal.exit_price),
      inline: true,
    },
    {
      name: "Style",
      value: String(closeSignal.trade_style ?? "—").toUpperCase(),
      inline: true,
    },
    {
      name: "Confidence",
      value:
        closeSignal.confidence === null || closeSignal.confidence === undefined
          ? "—"
          : `${closeSignal.confidence}%`,
      inline: true,
    },
    {
      name: "Closed At",
      value: closeSignal.closed_at
        ? new Date(closeSignal.closed_at).toLocaleString()
        : "—",
      inline: true,
    },
  ];

  const embed = {
    title: `${outcomeEmoji} ${organization.name} Signal Closed`,
    description: `**${title}**`,
    color: getCloseColor(outcome),
    fields,
    footer: {
      text: `${organization.name} • Signal ID: ${closeSignal.id}`,
    },
    timestamp: new Date().toISOString(),
  };

  const results = await Promise.all(
    fallbackChannels.map((channelId) =>
      postDiscordReply({
        channelId,
        originalMessageId: closeSignal.discord_message_id,
        token,
        body: {
          content,
          embeds: [embed],
          allowed_mentions: {
            parse: [],
          },
        },
      })
    )
  );

  if (results.some(Boolean)) {
    await markCloseAlertSent(closeSignal.id);
  }
}
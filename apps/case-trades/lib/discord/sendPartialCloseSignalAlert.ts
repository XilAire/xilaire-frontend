import { createClient } from "@supabase/supabase-js";

type SignalPartialCloseAlertRow = {
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
  underlying_exit_price: number | null;
  option_type: string | null;
  strike_price: number | null;
  expiration_date: string | null;
  confidence: number | null;
  trade_style: string | null;
  return_pct: number | null;
  discord_channel_id: string | null;
  discord_message_id: string | null;
};

type DiscordOrganization = {
  id: string;
  slug: string;
  name: string;
};

type PartialCloseAlertInput = {
  signalId: string;
  closedContracts: number;
  totalContracts: number;
  remainingContracts: number;
  exitPrice: number | null;
  realizedReturnPct: number | null;
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

function getTicker(signal: SignalPartialCloseAlertRow) {
  return (signal.asset?.trim() || signal.underlying || "").toUpperCase();
}

function buildSignalTitle(signal: SignalPartialCloseAlertRow) {
  const ticker = getTicker(signal);

  if (signal.instrument_type === "OPTION") {
    return `${signal.action ?? "SIGNAL"} ${ticker} ${
      signal.strike_price ?? ""
    } ${signal.option_type ?? ""}`.trim();
  }

  return `${signal.action ?? "SIGNAL"} ${ticker}`.trim();
}

function calculateClosedPercent({
  closedContracts,
  totalContracts,
}: {
  closedContracts: number;
  totalContracts: number;
}) {
  if (!totalContracts || totalContracts <= 0) {
    return null;
  }

  return Number(((closedContracts / totalContracts) * 100).toFixed(2));
}

function calculateRemainingPercent({
  remainingContracts,
  totalContracts,
}: {
  remainingContracts: number;
  totalContracts: number;
}) {
  if (!totalContracts || totalContracts <= 0) {
    return null;
  }

  return Number(((remainingContracts / totalContracts) * 100).toFixed(2));
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
    console.error("Discord partial close organization lookup failed", {
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
      `Discord partial close alert failed for channel ${channelId}:`,
      response.status,
      text
    );

    return false;
  }

  return true;
}

export async function sendPartialCloseSignalAlert({
  signalId,
  closedContracts,
  totalContracts,
  remainingContracts,
  exitPrice,
  realizedReturnPct,
}: PartialCloseAlertInput) {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    console.warn("Discord bot token missing. Skipping partial close alert.");
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
      underlying_exit_price,
      option_type,
      strike_price,
      expiration_date,
      confidence,
      trade_style,
      return_pct,
      discord_channel_id,
      discord_message_id
      `
    )
    .eq("id", signalId)
    .maybeSingle();

  if (error || !signal) {
    console.error("Unable to load signal for Discord partial close alert", {
      signalId,
      error,
    });

    return;
  }

  const partialSignal = signal as SignalPartialCloseAlertRow;

  if (!partialSignal.discord_channel_id) {
    console.warn("Missing Discord channel ID. Skipping partial close alert.", {
      signalId,
    });

    return;
  }

  const organization = await getDiscordOrganization(
    partialSignal.organization_id
  );

  const title = buildSignalTitle(partialSignal);
  const closedPercent = calculateClosedPercent({
    closedContracts,
    totalContracts,
  });
  const remainingPercent = calculateRemainingPercent({
    remainingContracts,
    totalContracts,
  });

  const content = [
    `🟡 **PARTIAL CLOSE**`,
    "",
    `📣 **${title}**`,
    `📦 **Closed:** ${closedContracts} of ${totalContracts} contracts`,
    `📊 **Closed %:** ${formatPercent(closedPercent)}`,
    `📌 **Remaining:** ${remainingContracts} contracts`,
    `📈 **Remaining %:** ${formatPercent(remainingPercent)}`,
    `🏁 **Exit:** ${formatMoney(exitPrice)}`,
    `📈 **Realized Return:** ${formatPercent(realizedReturnPct)}`,
    "",
    `#${organization.name.replace(/\s+/g, "")} #PartialClose`,
  ].join("\n");

  const embed = {
    title: `🟡 ${organization.name} Partial Close`,
    description: `**${title}**`,
    color: 0xf59e0b,
    fields: [
      {
        name: "Ticker",
        value: getTicker(partialSignal),
        inline: true,
      },
      {
        name: "Closed",
        value: `${closedContracts}/${totalContracts}`,
        inline: true,
      },
      {
        name: "Remaining",
        value: `${remainingContracts}/${totalContracts}`,
        inline: true,
      },
      {
        name: "Closed %",
        value: formatPercent(closedPercent),
        inline: true,
      },
      {
        name: "Remaining %",
        value: formatPercent(remainingPercent),
        inline: true,
      },
      {
        name: "Exit",
        value: formatMoney(exitPrice),
        inline: true,
      },
      {
        name: "Realized Return",
        value: formatPercent(realizedReturnPct),
        inline: true,
      },
      {
        name: "Style",
        value: String(partialSignal.trade_style ?? "—").toUpperCase(),
        inline: true,
      },
      {
        name: "Confidence",
        value:
          partialSignal.confidence === null ||
          partialSignal.confidence === undefined
            ? "—"
            : `${partialSignal.confidence}%`,
        inline: true,
      },
    ],
    footer: {
      text: `${organization.name} • Signal ID: ${partialSignal.id}`,
    },
    timestamp: new Date().toISOString(),
  };

  await postDiscordReply({
    channelId: partialSignal.discord_channel_id,
    originalMessageId: partialSignal.discord_message_id,
    token,
    body: {
      content,
      embeds: [embed],
      allowed_mentions: {
        parse: [],
      },
    },
  });
}
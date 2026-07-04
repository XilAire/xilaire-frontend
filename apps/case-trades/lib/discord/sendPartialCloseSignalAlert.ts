import { createClient } from "@supabase/supabase-js";

type SignalPartialCloseAlertRow = {
  id: string;
  organization_id: string | null;
  status: string | null;
  action: string | null;
  instrument_type: string | null;
  asset: string | null;
  underlying: string | null;
  entry_price: number | string | null;
  exit_price: number | string | null;
  underlying_entry_price: number | string | null;
  option_type: string | null;
  strike_price: number | string | null;
  expiration_date: string | null;
  confidence: number | string | null;
  trade_style: string | null;
  return_pct: number | string | null;
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

function normalizeNumber(value?: number | string | null) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace("%", "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatMoney(value?: number | string | null) {
  const amount = normalizeNumber(value);

  if (amount === null) {
    return "—";
  }

  return `$${amount.toFixed(2)}`;
}

function formatPercent(value?: number | string | null) {
  const amount = normalizeNumber(value);

  if (amount === null) {
    return "—";
  }

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
  body: Record<string, unknown>;
}) {
  const replyBody =
    originalMessageId && originalMessageId.trim().length > 0
      ? {
          ...body,
          message_reference: {
            message_id: originalMessageId,
            channel_id: channelId,
            fail_if_not_exists: false,
          },
        }
      : body;

  console.log("Sending Discord partial close reply", {
    channel_id: channelId,
    original_message_id: originalMessageId,
    has_reference: Boolean(originalMessageId),
  });

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

  const text = await response.text();

  if (!response.ok) {
    console.error("Discord partial close alert failed", {
      channel_id: channelId,
      original_message_id: originalMessageId,
      status: response.status,
      response: text,
    });

    return false;
  }

  console.log("Discord partial close alert sent successfully", {
    channel_id: channelId,
    original_message_id: originalMessageId,
    response: text,
  });

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
    return false;
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
      return_pct,
      discord_channel_id,
      discord_message_id
      `
    )
    .eq("id", signalId)
    .maybeSingle();

  if (error || !signal) {
    console.error("Unable to load signal for Discord partial close alert", {
      signal_id: signalId,
      error,
    });

    return false;
  }

  const partialSignal = signal as SignalPartialCloseAlertRow;

  console.log("Loaded signal for Discord partial close alert", {
    signal_id: partialSignal.id,
    status: partialSignal.status,
    discord_channel_id: partialSignal.discord_channel_id,
    discord_message_id: partialSignal.discord_message_id,
    closed_contracts: closedContracts,
    total_contracts: totalContracts,
    remaining_contracts: remainingContracts,
    exit_price: exitPrice,
    realized_return_pct: realizedReturnPct,
  });

  if (!partialSignal.discord_channel_id) {
    console.warn("Missing Discord channel ID. Skipping partial close alert.", {
      signal_id: signalId,
    });

    return false;
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
        value: getTicker(partialSignal) || "—",
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

  return postDiscordReply({
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
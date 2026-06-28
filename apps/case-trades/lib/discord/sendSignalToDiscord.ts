import { createClient } from "@supabase/supabase-js";

type DiscordSignalInput = {
  organization_id?: string;
  organization_slug?: string;
  organization_name?: string;

  asset?: string;
  action: "BUY" | "SELL";
  instrument_type: "OPTION" | "STOCK";
  underlying: string;
  entry_price: number;
  underlying_entry_price?: number;
  option_type?: "CALL" | "PUT";
  strike_price?: number;
  expiration_date?: string;
  confidence: number;
  trade_style: "scalp" | "swing" | "leap";
  signal_id: string;

  /**
   * Manual Discord posting controls
   */
  manual_channel_ids?: string[];
  manual_message?: string;
  disable_auto_channels?: boolean;
};

type DiscordField = {
  name: string;
  value: string;
  inline?: boolean;
};

type DiscordOrganization = {
  id: string;
  slug: string;
  name: string;
};

type DiscordChannelType =
  | "signals"
  | "options"
  | "stocks"
  | "small_caps";

type DiscordChannelRow = {
  id: string;
  organization_id: string;
  channel_type: DiscordChannelType | string;
  channel_id: string;
  name: string | null;
  active: boolean;
};

const CASE_TRADES_ORG_ID = "491f385c-04e5-4446-97d1-457e5ce15d9d";
const DEFAULT_ORG_SLUG = "case-trades";

const SMALL_CAP_TICKERS = new Set([
  "SOFI",
  "PLTR",
  "OPEN",
  "RIVN",
  "LCID",
  "ASTS",
  "IONQ",
  "SOUN",
  "BBAI",
  "AI",
]);

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

function uniqueChannels(channels: Array<string | null | undefined>) {
  return [...new Set(channels.filter(Boolean))] as string[];
}

function getSignalTicker(input: DiscordSignalInput) {
  return (input.asset?.trim() || input.underlying || "").toUpperCase();
}

function getUnderlyingTicker(input: DiscordSignalInput) {
  return (input.underlying || "").toUpperCase();
}

async function getDiscordOrganization(
  input: DiscordSignalInput
): Promise<DiscordOrganization> {
  const supabase = createSupabaseAdmin();

  let query = supabase
    .from("organizations")
    .select("id, slug, name")
    .eq("active", true);

  if (input.organization_id) {
    query = query.eq("id", input.organization_id);
  } else if (input.organization_slug) {
    query = query.eq("slug", input.organization_slug);
  } else {
    query = query.eq("id", CASE_TRADES_ORG_ID);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Discord organization lookup failed", {
      organization_id: input.organization_id,
      organization_slug: input.organization_slug,
      error,
    });
  }

  if (data) {
    return data as DiscordOrganization;
  }

  return {
    id: input.organization_id ?? CASE_TRADES_ORG_ID,
    slug: input.organization_slug ?? DEFAULT_ORG_SLUG,
    name: input.organization_name ?? "CASE Trades",
  };
}

async function getOrganizationDiscordChannels(
  organizationId: string
): Promise<DiscordChannelRow[]> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("discord_channels")
    .select(
      `
      id,
      organization_id,
      channel_type,
      channel_id,
      name,
      active
    `
    )
    .eq("organization_id", organizationId)
    .eq("active", true);

  if (error) {
    console.error("Discord channel lookup failed", {
      organization_id: organizationId,
      error,
    });

    return [];
  }

  return (data ?? []) as DiscordChannelRow[];
}

function getFallbackAutomaticDiscordChannels(input: DiscordSignalInput) {
  const channels: Array<string | undefined> = [];
  const ticker = getSignalTicker(input);

  if (input.instrument_type === "OPTION") {
    channels.push(process.env.DISCORD_SCALPS_SWINGS_LEAPS_WATCHLIST_CHANNEL);
  }

  if (input.instrument_type === "STOCK") {
    channels.push(process.env.DISCORD_STOCKS_CHANNEL);
  }

  if (SMALL_CAP_TICKERS.has(ticker)) {
    channels.push(process.env.DISCORD_SMALL_CAPS_CHANNEL);
  }

  return channels;
}

function getOrganizationAutomaticDiscordChannels({
  input,
  discordChannels,
}: {
  input: DiscordSignalInput;
  discordChannels: DiscordChannelRow[];
}) {
  const channels: Array<string | null | undefined> = [];
  const ticker = getSignalTicker(input);

  const signalChannels = discordChannels.filter(
    (channel) => channel.channel_type === "signals"
  );

  const optionChannels = discordChannels.filter(
    (channel) => channel.channel_type === "options"
  );

  const stockChannels = discordChannels.filter(
    (channel) => channel.channel_type === "stocks"
  );

  const smallCapChannels = discordChannels.filter(
    (channel) => channel.channel_type === "small_caps"
  );

  channels.push(...signalChannels.map((channel) => channel.channel_id));

  if (input.instrument_type === "OPTION") {
    channels.push(...optionChannels.map((channel) => channel.channel_id));
  }

  if (input.instrument_type === "STOCK") {
    channels.push(...stockChannels.map((channel) => channel.channel_id));
  }

  if (SMALL_CAP_TICKERS.has(ticker)) {
    channels.push(...smallCapChannels.map((channel) => channel.channel_id));
  }

  return channels;
}

function getDiscordChannels({
  input,
  discordChannels,
}: {
  input: DiscordSignalInput;
  discordChannels: DiscordChannelRow[];
}) {
  const autoChannels = input.disable_auto_channels
    ? []
    : [
        ...getOrganizationAutomaticDiscordChannels({
          input,
          discordChannels,
        }),
        ...getFallbackAutomaticDiscordChannels(input),
      ];

  return uniqueChannels([
    ...autoChannels,
    ...(input.manual_channel_ids ?? []),
  ]);
}

function buildSignalTitle(input: DiscordSignalInput) {
  const ticker = getSignalTicker(input);

  if (input.instrument_type === "OPTION") {
    return `${input.action} ${ticker} ${input.strike_price ?? ""} ${
      input.option_type ?? ""
    }`.trim();
  }

  return `${input.action} ${ticker}`;
}

function formatMoney(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }

  return `$${Number(value).toFixed(2)}`;
}

function buildTradeStyleLabel(style: DiscordSignalInput["trade_style"]) {
  return style.toUpperCase();
}

function buildDefaultSignalContent({
  input,
  organization,
}: {
  input: DiscordSignalInput;
  organization: DiscordOrganization;
}) {
  const ticker = getSignalTicker(input);
  const underlying = getUnderlyingTicker(input);

  const timeframe =
    input.trade_style === "scalp"
      ? "1 min"
      : input.trade_style === "swing"
      ? "Daily"
      : "Weekly";

  return [
    `📢 **${organization.name} Alert**`,
    "",
    `📈 **Ticker:** ${ticker}`,
    underlying && underlying !== ticker ? `📌 **Underlying:** ${underlying}` : "",
    `💵 **Entry:** ${formatMoney(input.entry_price)}`,
    `💲 **Underlying Price:** ${formatMoney(input.underlying_entry_price)}`,
    `🕒 **Time:** ${new Date().toISOString()}`,
    `📊 **TimeFrame:** ${timeframe}`,
    "",
    `📣 🚨 **${buildSignalTitle(input)}**`,
    `@everyone`,
    `@here`,
    "",
    `#${organization.name.replace(/\s+/g, "")} #TradingAlert`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildEmbedFields(input: DiscordSignalInput): DiscordField[] {
  const ticker = getSignalTicker(input);
  const underlying = getUnderlyingTicker(input);

  const fields: DiscordField[] = [
    {
      name: "Ticker",
      value: ticker,
      inline: true,
    },
    {
      name: "Underlying",
      value: underlying,
      inline: true,
    },
    {
      name: "Action",
      value: input.action,
      inline: true,
    },
    {
      name: "Style",
      value: buildTradeStyleLabel(input.trade_style),
      inline: true,
    },
    {
      name: "Entry",
      value: formatMoney(input.entry_price),
      inline: true,
    },
    {
      name: "Underlying Price",
      value: formatMoney(input.underlying_entry_price),
      inline: true,
    },
    {
      name: "Confidence",
      value: `${input.confidence}%`,
      inline: true,
    },
    {
      name: "Instrument",
      value: input.instrument_type,
      inline: true,
    },
  ];

  if (input.instrument_type === "OPTION") {
    fields.push(
      {
        name: "Option",
        value: `${input.strike_price ?? "—"} ${input.option_type ?? ""}`.trim(),
        inline: true,
      },
      {
        name: "Expiration",
        value: input.expiration_date ?? "—",
        inline: true,
      }
    );
  }

  return fields;
}

async function postDiscordMessage(
  channelId: string,
  token: string,
  body: unknown
) {
  const response = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const text = await response.text();

    console.error(
      `Discord post failed for channel ${channelId}:`,
      response.status,
      text
    );
  }
}

export async function sendSignalToDiscord(input: DiscordSignalInput) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const organization = await getDiscordOrganization(input);
  const discordChannels = await getOrganizationDiscordChannels(organization.id);

  const channelIds = getDiscordChannels({
    input,
    discordChannels,
  });

  if (!token || channelIds.length === 0) {
    console.warn("Discord not configured. Skipping Discord post.", {
      has_token: !!token,
      channel_count: channelIds.length,
      organization_id: organization.id,
      organization_slug: organization.slug,
      organization_name: organization.name,
      instrument_type: input.instrument_type,
      ticker: getSignalTicker(input),
      underlying: getUnderlyingTicker(input),
    });

    return;
  }

  const title = buildSignalTitle(input);

  const embed = {
    title: `🚨 ${organization.name} Signal`,
    description: `**${title}**`,
    color: input.action === "BUY" ? 0x00c781 : 0xef4444,
    fields: buildEmbedFields(input),
    footer: {
      text: `${organization.name} • Signal ID: ${input.signal_id}`,
    },
    timestamp: new Date().toISOString(),
  };

  const content =
    input.manual_message?.trim() ||
    buildDefaultSignalContent({
      input,
      organization,
    });

  await Promise.all(
    channelIds.map((channelId) =>
      postDiscordMessage(channelId, token, {
        content,
        embeds: [embed],
      })
    )
  );
}
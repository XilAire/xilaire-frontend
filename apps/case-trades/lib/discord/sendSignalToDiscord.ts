import { createClient } from "@supabase/supabase-js";

import type { TradeStyle } from "@/lib/signals/detectTradeStyle";
import {
  buildTradeSummary,
  type TradeSummaryDebitCredit,
  type TradeSummaryOptionLegInput,
} from "@/lib/signals/buildTradeSummary";

type DiscordExecutionStyle =
  | "scalp"
  | "swing"
  | "leap";

type DiscordSignalInput = {
  organization_id?: string;
  organization_slug?: string;
  organization_name?: string;

  asset?: string;

  action: "BUY" | "SELL";

  open_action?:
    | "BUY_TO_OPEN"
    | "SELL_TO_OPEN";

  instrument_type:
    | "OPTION"
    | "STOCK";

  underlying: string;

  entry_price: number;

  underlying_entry_price?: number;

  option_type?:
    | "CALL"
    | "PUT";

  strike_price?: number;

  expiration_date?: string;

  option_legs?: TradeSummaryOptionLegInput[];

  confidence: number;

  /**
   * Execution style:
   *
   * scalp
   * swing
   * leap
   */
  trade_style:
    | TradeStyle
    | string;

  /**
   * Authoritative strategy type:
   *
   * LONG_CALL
   * LONG_PUT
   * IRON_CONDOR
   * BULL_CALL_DEBIT
   * BEAR_CALL_CREDIT
   * etc.
   */
  strategy_type?:
    | TradeStyle
    | string
    | null;

  /**
   * Optional compatibility field.
   *
   * New callers should normally use trade_style
   * for execution style.
   */
  execution_style?:
    | DiscordExecutionStyle
    | string;

  /**
   * Authoritative strategy-entry metadata calculated
   * by the signal creation workflow.
   *
   * buildTradeSummary() remains the centralized fallback
   * when these values are not supplied.
   */
  strategy_entry_type?:
    | "DEBIT"
    | "CREDIT"
    | "EVEN";

  signed_strategy_entry?: number;

  total_debit?: number;

  total_credit?: number;

  signal_id: string;

  /**
   * Manual Discord posting controls.
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
  channel_type:
    | DiscordChannelType
    | string;
  channel_id: string;
  name: string | null;
  active: boolean;
};

type DiscordPostedMessage = {
  id: string;
  channel_id: string;
};

type StrategyEntryDisplay = {
  type: TradeSummaryDebitCredit;
  amount: number | null;
  signedAmount: number | null;
  totalPaid: number;
  totalReceived: number;
};

const CASE_TRADES_ORG_ID =
  "491f385c-04e5-4446-97d1-457e5ce15d9d";

const DEFAULT_ORG_SLUG =
  "case-trades";

const SMALL_CAP_TICKERS =
  new Set([
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

/* -------------------------------------------------
   SUPABASE ADMIN CLIENT
------------------------------------------------- */
function createSupabaseAdmin() {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES;

  const serviceRoleKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES;

  if (!supabaseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES",
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

/* -------------------------------------------------
   GENERIC HELPERS
------------------------------------------------- */
function uniqueChannels(
  channels:
    Array<
      | string
      | null
      | undefined
    >,
) {
  return [
    ...new Set(
      channels.filter(
        (
          channel,
        ): channel is string =>
          Boolean(channel),
      ),
    ),
  ];
}

function toNullableNumber(
  value:
    | number
    | string
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed)
  ) {
    return null;
  }

  return parsed;
}

function normalizeStrategyEntryType(
  value?:
    | string
    | null,
): TradeSummaryDebitCredit {
  const normalized =
    String(
      value ?? "",
    )
      .trim()
      .toUpperCase();

  if (
    normalized === "DEBIT" ||
    normalized === "CREDIT" ||
    normalized === "EVEN"
  ) {
    return normalized;
  }

  return "UNKNOWN";
}

function normalizeExecutionStyle(
  value?:
    | string
    | null,
) {
  const normalized =
    String(
      value ?? "",
    )
      .trim()
      .toLowerCase();

  if (
    normalized === "scalp"
  ) {
    return "scalp";
  }

  if (
    normalized === "swing"
  ) {
    return "swing";
  }

  if (
    normalized === "leap"
  ) {
    return "leap";
  }

  return normalized || null;
}

function formatDisplayText(
  value?:
    | string
    | null,
) {
  if (!value) {
    return "—";
  }

  const normalized =
    String(value).trim();

  if (!normalized) {
    return "—";
  }

  if (
    normalized.toLowerCase() ===
    "leap"
  ) {
    return "LEAP";
  }

  return normalized
    .replace(
      /_/g,
      " ",
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function formatMoney(
  value?:
    | number
    | string
    | null,
) {
  const amount =
    toNullableNumber(value);

  if (amount === null) {
    return "—";
  }

  const prefix =
    amount < 0
      ? "-"
      : "";

  return `${prefix}$${Math.abs(
    amount,
  ).toFixed(2)}`;
}

function formatNumber(
  value: number,
) {
  if (
    Number.isInteger(value)
  ) {
    return String(value);
  }

  return value.toFixed(2);
}

function formatDebitCredit(
  value:
    TradeSummaryDebitCredit,
) {
  if (
    value === "DEBIT"
  ) {
    return "Debit";
  }

  if (
    value === "CREDIT"
  ) {
    return "Credit";
  }

  if (
    value === "EVEN"
  ) {
    return "Even";
  }

  return "Unknown";
}

function getStrategyEntryLabel(
  type:
    TradeSummaryDebitCredit,
) {
  if (
    type === "DEBIT"
  ) {
    return "Net Debit";
  }

  if (
    type === "CREDIT"
  ) {
    return "Net Credit";
  }

  if (
    type === "EVEN"
  ) {
    return "Net Entry";
  }

  return "Entry";
}

function getExecutionTimeframe(
  executionStyle?:
    | string
    | null,
) {
  const normalized =
    normalizeExecutionStyle(
      executionStyle,
    );

  if (
    normalized === "scalp"
  ) {
    return "Intraday";
  }

  if (
    normalized === "swing"
  ) {
    return "Multi-Day";
  }

  if (
    normalized === "leap"
  ) {
    return "Long-Term";
  }

  return "—";
}

/* -------------------------------------------------
   SIGNAL IDENTITY
------------------------------------------------- */
function getSignalTicker(
  input:
    DiscordSignalInput,
) {
  return (
    input.asset?.trim() ||
    input.underlying ||
    ""
  ).toUpperCase();
}

function getUnderlyingTicker(
  input:
    DiscordSignalInput,
) {
  return String(
    input.underlying ?? "",
  )
    .trim()
    .toUpperCase();
}

/* -------------------------------------------------
   CENTRALIZED TRADE SUMMARY
------------------------------------------------- */
function getTradeSummary(
  input:
    DiscordSignalInput,
) {
  const executionStyle =
    normalizeExecutionStyle(
      input.execution_style ??
        input.trade_style,
    );

  return buildTradeSummary({
    symbol:
      input.asset,

    underlying:
      input.underlying,

    instrument_type:
      input.instrument_type,

    /**
     * strategy_type is authoritative.
     *
     * When absent, buildTradeSummary() detects the
     * strategy from the supplied option legs.
     */
    trade_style:
      input.strategy_type ??
      input.trade_style,

    execution_style:
      executionStyle,

    action:
      input.action,

    open_action:
      input.open_action,

    entry_price:
      input.entry_price,

    option_type:
      input.option_type,

    strike_price:
      input.strike_price,

    expiration_date:
      input.expiration_date,

    option_legs:
      input.option_legs,
  });
}

function normalizeSignedEntryForType({
  value,
  type,
}: {
  value: number;
  type:
    TradeSummaryDebitCredit;
}) {
  const amount =
    Math.abs(value);

  if (
    type === "DEBIT"
  ) {
    return -amount;
  }

  if (
    type === "CREDIT"
  ) {
    return amount;
  }

  if (
    type === "EVEN"
  ) {
    return 0;
  }

  return value;
}

function getStrategyEntryDisplay(
  input:
    DiscordSignalInput,
): StrategyEntryDisplay {
  const tradeSummary =
    getTradeSummary(input);

  const authoritativeType =
    normalizeStrategyEntryType(
      input.strategy_entry_type,
    );

  const type =
    authoritativeType !==
    "UNKNOWN"
      ? authoritativeType
      : tradeSummary.debitCredit;

  const authoritativeSignedEntry =
    toNullableNumber(
      input.signed_strategy_entry,
    );

  const signedAmount =
    authoritativeSignedEntry !==
    null
      ? normalizeSignedEntryForType({
          value:
            authoritativeSignedEntry,
          type,
        })
      : tradeSummary.netEntry;

  const amount =
    signedAmount !== null
      ? Math.abs(
          signedAmount,
        )
      : tradeSummary.netEntryAmount;

  const authoritativeTotalPaid =
    toNullableNumber(
      input.total_debit,
    );

  const authoritativeTotalReceived =
    toNullableNumber(
      input.total_credit,
    );

  return {
    type,

    amount,

    signedAmount,

    totalPaid:
      authoritativeTotalPaid ??
      tradeSummary.totalPaid,

    totalReceived:
      authoritativeTotalReceived ??
      tradeSummary.totalReceived,
  };
}

/* -------------------------------------------------
   ORGANIZATION LOOKUP
------------------------------------------------- */
async function getDiscordOrganization(
  input:
    DiscordSignalInput,
): Promise<DiscordOrganization> {
  const supabase =
    createSupabaseAdmin();

  let query =
    supabase
      .from(
        "organizations",
      )
      .select(
        "id, slug, name",
      )
      .eq(
        "active",
        true,
      );

  if (
    input.organization_id
  ) {
    query =
      query.eq(
        "id",
        input.organization_id,
      );
  } else if (
    input.organization_slug
  ) {
    query =
      query.eq(
        "slug",
        input.organization_slug,
      );
  } else {
    query =
      query.eq(
        "id",
        CASE_TRADES_ORG_ID,
      );
  }

  const {
    data,
    error,
  } =
    await query.maybeSingle();

  if (error) {
    console.error(
      "Discord organization lookup failed",
      {
        organization_id:
          input.organization_id,
        organization_slug:
          input.organization_slug,
        error,
      },
    );
  }

  if (data) {
    return data as DiscordOrganization;
  }

  return {
    id:
      input.organization_id ??
      CASE_TRADES_ORG_ID,

    slug:
      input.organization_slug ??
      DEFAULT_ORG_SLUG,

    name:
      input.organization_name ??
      "CASE Trades",
  };
}

/* -------------------------------------------------
   CHANNEL LOOKUP
------------------------------------------------- */
async function getOrganizationDiscordChannels(
  organizationId: string,
): Promise<DiscordChannelRow[]> {
  const supabase =
    createSupabaseAdmin();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "discord_channels",
      )
      .select(
        `
        id,
        organization_id,
        channel_type,
        channel_id,
        name,
        active
      `,
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .eq(
        "active",
        true,
      );

  if (error) {
    console.error(
      "Discord channel lookup failed",
      {
        organization_id:
          organizationId,
        error,
      },
    );

    return [];
  }

  return (
    data ?? []
  ) as DiscordChannelRow[];
}

function getFallbackAutomaticDiscordChannels(
  input:
    DiscordSignalInput,
) {
  const channels:
    Array<
      string | undefined
    > = [];

  const ticker =
    getSignalTicker(input);

  if (
    input.instrument_type ===
    "OPTION"
  ) {
    channels.push(
      process.env
        .DISCORD_SCALPS_SWINGS_LEAPS_WATCHLIST_CHANNEL,
    );
  }

  if (
    input.instrument_type ===
    "STOCK"
  ) {
    channels.push(
      process.env
        .DISCORD_STOCKS_CHANNEL,
    );
  }

  if (
    SMALL_CAP_TICKERS.has(
      ticker,
    )
  ) {
    channels.push(
      process.env
        .DISCORD_SMALL_CAPS_CHANNEL,
    );
  }

  return channels;
}

function getOrganizationAutomaticDiscordChannels({
  input,
  discordChannels,
}: {
  input:
    DiscordSignalInput;
  discordChannels:
    DiscordChannelRow[];
}) {
  const channels:
    Array<
      | string
      | null
      | undefined
    > = [];

  const ticker =
    getSignalTicker(input);

  const signalChannels =
    discordChannels.filter(
      (channel) =>
        channel.channel_type ===
        "signals",
    );

  const optionChannels =
    discordChannels.filter(
      (channel) =>
        channel.channel_type ===
        "options",
    );

  const stockChannels =
    discordChannels.filter(
      (channel) =>
        channel.channel_type ===
        "stocks",
    );

  const smallCapChannels =
    discordChannels.filter(
      (channel) =>
        channel.channel_type ===
        "small_caps",
    );

  channels.push(
    ...signalChannels.map(
      (channel) =>
        channel.channel_id,
    ),
  );

  if (
    input.instrument_type ===
    "OPTION"
  ) {
    channels.push(
      ...optionChannels.map(
        (channel) =>
          channel.channel_id,
      ),
    );
  }

  if (
    input.instrument_type ===
    "STOCK"
  ) {
    channels.push(
      ...stockChannels.map(
        (channel) =>
          channel.channel_id,
      ),
    );
  }

  if (
    SMALL_CAP_TICKERS.has(
      ticker,
    )
  ) {
    channels.push(
      ...smallCapChannels.map(
        (channel) =>
          channel.channel_id,
      ),
    );
  }

  return channels;
}

function getDiscordChannels({
  input,
  discordChannels,
}: {
  input:
    DiscordSignalInput;
  discordChannels:
    DiscordChannelRow[];
}) {
  const automaticChannels =
    input.disable_auto_channels
      ? []
      : [
          ...getOrganizationAutomaticDiscordChannels(
            {
              input,
              discordChannels,
            },
          ),

          ...getFallbackAutomaticDiscordChannels(
            input,
          ),
        ];

  return uniqueChannels([
    ...automaticChannels,
    ...(
      input.manual_channel_ids ??
      []
    ),
  ]);
}

/* -------------------------------------------------
   TITLE
------------------------------------------------- */
function buildSignalTitle(
  input:
    DiscordSignalInput,
) {
  const tradeSummary =
    getTradeSummary(input);

  const ticker =
    tradeSummary.symbol ||
    getSignalTicker(input);

  if (
    input.instrument_type ===
    "OPTION"
  ) {
    const strategyLabel =
      tradeSummary.tradeStyleLabel;

    if (
      strategyLabel &&
      strategyLabel !== "Unknown"
    ) {
      return `${ticker} ${strategyLabel}`;
    }

    return `${input.action} ${ticker} ${
      input.strike_price ?? ""
    } ${
      input.option_type ?? ""
    }`.trim();
  }

  return `${input.action} ${ticker}`;
}

/* -------------------------------------------------
   OPTION LEG DISPLAY
------------------------------------------------- */
function formatOptionLegLines(
  input:
    DiscordSignalInput,
) {
  if (
    input.instrument_type !==
    "OPTION"
  ) {
    return [];
  }

  const tradeSummary =
    getTradeSummary(input);

  return tradeSummary.legs.map(
    (leg) => {
      const strike =
        leg.strikePrice !== null
          ? formatNumber(
              leg.strikePrice,
            )
          : "—";

      const expiration =
        leg.expirationDate ??
        "—";

      const premium =
        leg.entryPrice !== null
          ? formatMoney(
              leg.entryPrice,
            )
          : "—";

      return (
        `**Leg ${leg.legOrder}:** ` +
        `${leg.action} ` +
        `${leg.contracts} ` +
        `${tradeSummary.symbol} ` +
        `${strike} ` +
        `${leg.optionType} ` +
        `@ ${premium} ` +
        `• Exp ${expiration}`
      );
    },
  );
}

/* -------------------------------------------------
   DEFAULT MESSAGE CONTENT
------------------------------------------------- */
function buildDefaultSignalContent({
  input,
  organization,
}: {
  input:
    DiscordSignalInput;
  organization:
    DiscordOrganization;
}) {
  const tradeSummary =
    getTradeSummary(input);

  const strategyEntry =
    getStrategyEntryDisplay(
      input,
    );

  const ticker =
    tradeSummary.symbol ||
    getSignalTicker(input);

  const underlying =
    getUnderlyingTicker(
      input,
    );

  const executionStyle =
    normalizeExecutionStyle(
      input.execution_style ??
        input.trade_style,
    );

  const formattedOptionLegLines =
    formatOptionLegLines(
      input,
    );

  const optionLegLines =
    formattedOptionLegLines.length >
    0
      ? [
          "",
          `🧩 **Option Legs (${formattedOptionLegLines.length})**`,
          ...formattedOptionLegLines,
        ]
      : [];

  const strategyEntryLines =
    input.instrument_type ===
    "OPTION"
      ? [
          `💵 **${getStrategyEntryLabel(
            strategyEntry.type,
          )}:** ${formatMoney(
            strategyEntry.amount,
          )}`,

          `🏷️ **Entry Type:** ${formatDebitCredit(
            strategyEntry.type,
          )}`,

          `💳 **Premium Paid:** ${formatMoney(
            strategyEntry.totalPaid,
          )}`,

          `💰 **Premium Received:** ${formatMoney(
            strategyEntry.totalReceived,
          )}`,
        ]
      : [
          `💵 **Entry:** ${formatMoney(
            input.entry_price,
          )}`,
        ];

  return [
    `📢 **${organization.name} Trading Alert**`,
    "",
    `📈 **Ticker:** ${ticker}`,

    underlying &&
    underlying !== ticker
      ? `📌 **Underlying:** ${underlying}`
      : "",

    `🧠 **Strategy:** ${tradeSummary.tradeStyleLabel}`,

    `⚙️ **Execution Style:** ${formatDisplayText(
      executionStyle,
    )}`,

    ...strategyEntryLines,

    `💲 **Underlying Price:** ${formatMoney(
      input.underlying_entry_price,
    )}`,

    `🎯 **Confidence:** ${input.confidence}%`,

    `📊 **Trade Horizon:** ${getExecutionTimeframe(
      executionStyle,
    )}`,

    ...optionLegLines,

    "",
    `🚨 **${buildSignalTitle(
      input,
    )}**`,
    "@everyone",
    "@here",
    "",
    `#${organization.name.replace(
      /\s+/g,
      "",
    )} #TradingAlert`,
  ]
    .filter(Boolean)
    .join("\n");
}

/* -------------------------------------------------
   EMBED FIELDS
------------------------------------------------- */
function buildEmbedFields(
  input:
    DiscordSignalInput,
): DiscordField[] {
  const tradeSummary =
    getTradeSummary(input);

  const strategyEntry =
    getStrategyEntryDisplay(
      input,
    );

  const ticker =
    tradeSummary.symbol ||
    getSignalTicker(input);

  const underlying =
    getUnderlyingTicker(
      input,
    ) || ticker;

  const executionStyle =
    normalizeExecutionStyle(
      input.execution_style ??
        input.trade_style,
    );

  const fields:
    DiscordField[] = [
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
      name: "Instrument",
      value:
        input.instrument_type,
      inline: true,
    },
    {
      name: "Strategy",
      value:
        tradeSummary.tradeStyleLabel,
      inline: true,
    },
    {
      name: "Execution Style",
      value:
        formatDisplayText(
          executionStyle,
        ),
      inline: true,
    },
    {
      name: "Action",
      value:
        input.open_action
          ? formatDisplayText(
              input.open_action,
            )
          : input.action,
      inline: true,
    },
  ];

  if (
    input.instrument_type ===
    "OPTION"
  ) {
    fields.push(
      {
        name:
          getStrategyEntryLabel(
            strategyEntry.type,
          ),
        value:
          formatMoney(
            strategyEntry.amount,
          ),
        inline: true,
      },
      {
        name: "Entry Type",
        value:
          formatDebitCredit(
            strategyEntry.type,
          ),
        inline: true,
      },
      {
        name: "Legs",
        value:
          String(
            tradeSummary.legCount,
          ),
        inline: true,
      },
      {
        name: "Premium Paid",
        value:
          formatMoney(
            strategyEntry.totalPaid,
          ),
        inline: true,
      },
      {
        name:
          "Premium Received",
        value:
          formatMoney(
            strategyEntry.totalReceived,
          ),
        inline: true,
      },
      {
        name:
          "Strategy Contracts",
        value:
          String(
            tradeSummary.strategyContracts,
          ),
        inline: true,
      },
    );
  } else {
    fields.push({
      name: "Entry",
      value:
        formatMoney(
          input.entry_price,
        ),
      inline: true,
    });
  }

  fields.push(
    {
      name:
        "Underlying Price",
      value:
        formatMoney(
          input.underlying_entry_price,
        ),
      inline: true,
    },
    {
      name: "Confidence",
      value:
        `${input.confidence}%`,
      inline: true,
    },
    {
      name: "Trade Horizon",
      value:
        getExecutionTimeframe(
          executionStyle,
        ),
      inline: true,
    },
  );

  const optionLegLines =
    formatOptionLegLines(
      input,
    );

  if (
    input.instrument_type ===
      "OPTION" &&
    optionLegLines.length > 0
  ) {
    fields.push({
      name:
        `Option Legs (${optionLegLines.length})`,
      value:
        optionLegLines.join(
          "\n",
        ),
      inline: false,
    });

    if (
      tradeSummary.primaryExpirationDate
    ) {
      fields.push({
        name:
          "Primary Expiration",
        value:
          tradeSummary.primaryExpirationDate,
        inline: true,
      });
    }
  } else if (
    input.instrument_type ===
    "OPTION"
  ) {
    fields.push(
      {
        name: "Option",
        value:
          `${
            input.strike_price ??
            "—"
          } ${
            input.option_type ??
            ""
          }`.trim(),
        inline: true,
      },
      {
        name: "Expiration",
        value:
          input.expiration_date ??
          "—",
        inline: true,
      },
    );
  }

  return fields;
}

/* -------------------------------------------------
   SAVE MESSAGE REFERENCE
------------------------------------------------- */
async function saveDiscordMessageReference({
  signalId,
  message,
}: {
  signalId: string;
  message:
    DiscordPostedMessage;
}) {
  const supabase =
    createSupabaseAdmin();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "signals",
      )
      .update({
        discord_channel_id:
          message.channel_id,

        discord_message_id:
          message.id,

        discord_alert_sent_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        signalId,
      )
      .select(
        `
        id,
        discord_channel_id,
        discord_message_id,
        discord_alert_sent_at
      `,
      );

  if (error) {
    console.error(
      "Unable to save Discord message reference.",
      {
        signal_id:
          signalId,

        discord_channel_id:
          message.channel_id,

        discord_message_id:
          message.id,

        error,
      },
    );

    return;
  }

  if (
    !data ||
    data.length === 0
  ) {
    console.error(
      "Discord message reference update matched zero rows.",
      {
        signal_id:
          signalId,

        discord_channel_id:
          message.channel_id,

        discord_message_id:
          message.id,
      },
    );

    return;
  }

  console.log(
    "Discord message reference saved.",
    {
      signal_id:
        signalId,

      discord_channel_id:
        message.channel_id,

      discord_message_id:
        message.id,
    },
  );
}

/* -------------------------------------------------
   POST DISCORD MESSAGE
------------------------------------------------- */
async function postDiscordMessage({
  channelId,
  token,
  signalId,
  body,
}: {
  channelId: string;
  token: string;
  signalId: string;
  body: unknown;
}): Promise<DiscordPostedMessage | null> {
  const response =
    await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bot ${token}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            body,
          ),
      },
    );

  if (!response.ok) {
    const text =
      await response.text();

    console.error(
      `Discord post failed for channel ${channelId}:`,
      {
        status:
          response.status,

        response:
          text,

        signal_id:
          signalId,
      },
    );

    return null;
  }

  const message =
    (
      await response.json()
    ) as DiscordPostedMessage;

  if (
    !message?.id ||
    !message.channel_id
  ) {
    console.error(
      "Discord post succeeded but response was missing IDs.",
      {
        signal_id:
          signalId,

        channel_id:
          channelId,

        message,
      },
    );

    return null;
  }

  return message;
}

/* -------------------------------------------------
   SEND SIGNAL TO DISCORD
------------------------------------------------- */
export async function sendSignalToDiscord(
  input:
    DiscordSignalInput,
) {
  const token =
    process.env
      .DISCORD_BOT_TOKEN;

  const organization =
    await getDiscordOrganization(
      input,
    );

  const discordChannels =
    await getOrganizationDiscordChannels(
      organization.id,
    );

  const channelIds =
    getDiscordChannels({
      input,
      discordChannels,
    });

  if (
    !token ||
    channelIds.length === 0
  ) {
    console.warn(
      "Discord not configured. Skipping Discord post.",
      {
        has_token:
          Boolean(token),

        channel_count:
          channelIds.length,

        organization_id:
          organization.id,

        organization_slug:
          organization.slug,

        organization_name:
          organization.name,

        instrument_type:
          input.instrument_type,

        ticker:
          getSignalTicker(
            input,
          ),

        underlying:
          getUnderlyingTicker(
            input,
          ),

        strategy_type:
          input.strategy_type,

        execution_style:
          input.execution_style ??
          input.trade_style,

        signal_id:
          input.signal_id,
      },
    );

    return [];
  }

  const tradeSummary =
    getTradeSummary(input);

  const title =
    buildSignalTitle(
      input,
    );

  const embed = {
    title:
      `🚨 ${organization.name} • ${tradeSummary.tradeStyleLabel}`,

    description:
      `**${title}**`,

    color:
      input.action === "BUY"
        ? 0x00c781
        : 0xef4444,

    fields:
      buildEmbedFields(
        input,
      ),

    footer: {
      text:
        `${organization.name} • Signal ID: ${input.signal_id}`,
    },

    timestamp:
      new Date().toISOString(),
  };

  const content =
    input.manual_message?.trim() ||
    buildDefaultSignalContent({
      input,
      organization,
    });

  const postedMessages =
    await Promise.all(
      channelIds.map(
        (channelId) =>
          postDiscordMessage({
            channelId,
            token,
            signalId:
              input.signal_id,

            body: {
              content,

              embeds: [
                embed,
              ],

              allowed_mentions: {
                parse: [
                  "everyone",
                ],
              },
            },
          }),
      ),
    );

  const successfulMessages =
    postedMessages.filter(
      (
        message,
      ): message is DiscordPostedMessage =>
        message !== null,
    );

  /**
   * Save one canonical message reference for future
   * partial-close and final-close replies.
   *
   * Saving a reference from every channel would create
   * a race and could pair the wrong message ID with the
   * wrong Discord channel.
   */
  const canonicalMessage =
    successfulMessages[0] ??
    null;

  if (canonicalMessage) {
    await saveDiscordMessageReference(
      {
        signalId:
          input.signal_id,

        message:
          canonicalMessage,
      },
    );
  }

  return successfulMessages;
}
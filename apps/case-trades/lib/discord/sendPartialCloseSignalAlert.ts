import { createClient } from "@supabase/supabase-js";

import {
  buildTradeSummary,
  type TradeSummaryOptionLegInput,
} from "@/lib/signals/buildTradeSummary";

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
type SignalPartialCloseAlertRow = {
  id: string;
  organization_id: string | null;
  status: string | null;
  action: string | null;
  open_action: string | null;
  instrument_type: string | null;
  asset: string | null;
  underlying: string | null;
  quantity: number | string | null;
  contracts: number | string | null;
  shares: number | string | null;
  entry_price: number | string | null;
  exit_price: number | string | null;
  underlying_entry_price: number | string | null;
  option_type: string | null;
  strike_price: number | string | null;
  expiration_date: string | null;
  confidence: number | string | null;

  /**
   * Execution style:
   * scalp, swing, leap
   */
  trade_style: string | null;

  /**
   * Options strategy:
   * long_call, long_put, iron_condor, etc.
   */
  strategy_type: string | null;

  return_pct: number | string | null;
  discord_channel_id: string | null;
  discord_message_id: string | null;
};

type SignalOptionLegRow = {
  id: string;
  signal_id: string;
  leg_order: number;
  action: string;
  option_type: string;
  strike_price: number | string | null;
  expiration_date: string | null;
  contracts: number | string | null;
  entry_price: number | string | null;
  exit_price: number | string | null;
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

export type PartialCloseLegInput = {
  signalOptionLegId: string;
  contracts: number;
  price: number;
  realizedPnl?: number | null;
};

export type PartialCloseAlertInput = {
  signalId: string;

  /**
   * Cumulative number of strategy contracts closed after this fill.
   */
  closedContracts: number;

  /**
   * Original number of strategy contracts opened.
   */
  totalContracts: number;

  /**
   * Remaining number of strategy contracts after this fill.
   */
  remainingContracts: number;

  /**
   * Aggregate strategy exit price for the partial close.
   */
  exitPrice: number | null;

  /**
   * Cumulative realized P/L in dollars after this partial close.
   */
  realizedPnl?: number | null;

  /**
   * Cumulative realized return after this partial close.
   */
  realizedReturnPct: number | null;

  /**
   * Legs affected by this specific partial-close event.
   */
  legCloses?: PartialCloseLegInput[];
};

type PartialCloseLegDisplay = {
  id: string;
  legOrder: number;
  action: string;
  closeAction: string;
  optionType: string;
  strikePrice: number | null;
  expirationDate: string | null;
  contracts: number;
  entryPrice: number | null;
  exitPrice: number;
  realizedPnl: number | null;
};

type DiscordPostResult = {
  channelId: string;
  success: boolean;
  status: number | null;
  response: string | null;
  usedMessageReference: boolean;
  retriedWithoutReference: boolean;
};

/* -------------------------------------------------
   CONSTANTS
------------------------------------------------- */
const CASE_TRADES_ORG_ID =
  "491f385c-04e5-4446-97d1-457e5ce15d9d";

const DEFAULT_ORG_SLUG =
  "case-trades";

/* -------------------------------------------------
   SUPABASE
------------------------------------------------- */
function createSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES;

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
   NUMBER HELPERS
------------------------------------------------- */
function normalizeNumber(
  value?: number | string | null,
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(
      value
        .replace("%", "")
        .trim(),
    );

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function roundPercent(value: number) {
  return Number(value.toFixed(2));
}

/* -------------------------------------------------
   FORMAT HELPERS
------------------------------------------------- */
function formatMoney(
  value?: number | string | null,
) {
  const amount =
    normalizeNumber(value);

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

function formatPercent(
  value?: number | string | null,
) {
  const amount =
    normalizeNumber(value);

  if (amount === null) {
    return "—";
  }

  const prefix =
    amount > 0
      ? "+"
      : "";

  return `${prefix}${amount.toFixed(
    2,
  )}%`;
}

function formatStrike(
  value?: number | string | null,
) {
  const amount =
    normalizeNumber(value);

  if (amount === null) {
    return "—";
  }

  if (Number.isInteger(amount)) {
    return String(amount);
  }

  return amount.toFixed(2);
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "—";
  }

  return new Date(
    value,
  ).toLocaleDateString();
}

function formatDebitCredit(
  value: string,
) {
  if (value === "DEBIT") {
    return "Debit";
  }

  if (value === "CREDIT") {
    return "Credit";
  }

  if (value === "EVEN") {
    return "Even";
  }

  return "Unknown";
}

function formatDisplayText(
  value?: string | null,
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
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function getStrategyEntryLabel(
  debitCredit: string,
) {
  if (debitCredit === "DEBIT") {
    return "Net Debit";
  }

  if (debitCredit === "CREDIT") {
    return "Net Credit";
  }

  if (debitCredit === "EVEN") {
    return "Net Entry";
  }

  return "Entry";
}

/* -------------------------------------------------
   ACTION HELPERS
------------------------------------------------- */
function normalizeAction(
  value?: string | null,
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function isLongOpeningAction(
  value?: string | null,
) {
  const action =
    normalizeAction(value);

  return (
    action === "BUY_TO_OPEN" ||
    action === "BTO" ||
    action === "BUY" ||
    action === "LONG"
  );
}

function isShortOpeningAction(
  value?: string | null,
) {
  const action =
    normalizeAction(value);

  return (
    action === "SELL_TO_OPEN" ||
    action === "STO" ||
    action === "SELL" ||
    action === "SHORT"
  );
}

function formatAction(
  value?: string | null,
) {
  const action =
    normalizeAction(value);

  if (action === "BUY_TO_OPEN") {
    return "BTO";
  }

  if (action === "SELL_TO_OPEN") {
    return "STO";
  }

  if (action === "BUY_TO_CLOSE") {
    return "BTC";
  }

  if (action === "SELL_TO_CLOSE") {
    return "STC";
  }

  return action || "—";
}

function getClosingAction(
  value?: string | null,
) {
  if (isLongOpeningAction(value)) {
    return "STC";
  }

  if (isShortOpeningAction(value)) {
    return "BTC";
  }

  return "CLOSE";
}

/* -------------------------------------------------
   SIGNAL HELPERS
------------------------------------------------- */
function getTicker(
  signal: SignalPartialCloseAlertRow,
) {
  return (
    signal.asset?.trim() ||
    signal.underlying ||
    ""
  ).toUpperCase();
}

function calculateClosedPercent({
  closedContracts,
  totalContracts,
}: {
  closedContracts: number;
  totalContracts: number;
}) {
  if (
    !totalContracts ||
    totalContracts <= 0
  ) {
    return null;
  }

  return roundPercent(
    (
      closedContracts /
      totalContracts
    ) * 100,
  );
}

function calculateRemainingPercent({
  remainingContracts,
  totalContracts,
}: {
  remainingContracts: number;
  totalContracts: number;
}) {
  if (
    !totalContracts ||
    totalContracts <= 0
  ) {
    return null;
  }

  return roundPercent(
    (
      remainingContracts /
      totalContracts
    ) * 100,
  );
}

/* -------------------------------------------------
   ORGANIZATION
------------------------------------------------- */
async function getDiscordOrganization(
  organizationId: string | null,
): Promise<DiscordOrganization> {
  const supabase =
    createSupabaseAdmin();

  const {
    data,
    error,
  } = await supabase
    .from("organizations")
    .select(
      "id, slug, name",
    )
    .eq(
      "id",
      organizationId ??
        CASE_TRADES_ORG_ID,
    )
    .eq(
      "active",
      true,
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Discord partial close organization lookup failed",
      {
        organization_id:
          organizationId,
        error,
      },
    );
  }

  if (data) {
    return data as DiscordOrganization;
  }

  return {
    id:
      organizationId ??
      CASE_TRADES_ORG_ID,
    slug:
      DEFAULT_ORG_SLUG,
    name:
      "CASE Trades",
  };
}

/* -------------------------------------------------
   CHANNELS
------------------------------------------------- */
async function getOrganizationDiscordChannels(
  organizationId: string,
) {
  const supabase =
    createSupabaseAdmin();

  const {
    data,
    error,
  } = await supabase
    .from("discord_channels")
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
      "Discord partial close channel lookup failed",
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

function getPartialCloseAlertChannels(
  discordChannels:
    DiscordChannelRow[],
) {
  const channelIds =
    discordChannels
      .filter((channel) =>
        [
          "signals",
          "options",
          "stocks",
          "small_caps",
        ].includes(
          String(
            channel.channel_type,
          ),
        ),
      )
      .map(
        (channel) =>
          channel.channel_id,
      );

  return [
    ...new Set(
      channelIds.filter(Boolean),
    ),
  ];
}

/* -------------------------------------------------
   OPTION LEGS
------------------------------------------------- */
async function getSignalOptionLegs(
  signalId: string,
) {
  const supabase =
    createSupabaseAdmin();

  const {
    data,
    error,
  } = await supabase
    .from("signal_option_legs")
    .select(
      `
      id,
      signal_id,
      leg_order,
      action,
      option_type,
      strike_price,
      expiration_date,
      contracts,
      entry_price,
      exit_price
    `,
    )
    .eq(
      "signal_id",
      signalId,
    )
    .order(
      "leg_order",
      {
        ascending: true,
      },
    );

  if (error) {
    console.error(
      "Unable to load signal option legs for partial close alert",
      {
        signalId,
        error,
      },
    );

    return [];
  }

  return (
    data ?? []
  ) as SignalOptionLegRow[];
}

function buildPartialCloseLegs({
  optionLegs,
  legCloses,
}: {
  optionLegs:
    SignalOptionLegRow[];
  legCloses:
    PartialCloseLegInput[];
}): PartialCloseLegDisplay[] {
  const optionLegsById =
    new Map(
      optionLegs.map(
        (leg) => [
          leg.id,
          leg,
        ],
      ),
    );

  return legCloses
    .map((legClose) => {
      const optionLeg =
        optionLegsById.get(
          legClose.signalOptionLegId,
        );

      if (!optionLeg) {
        return null;
      }

      return {
        id:
          optionLeg.id,
        legOrder:
          optionLeg.leg_order,
        action:
          formatAction(
            optionLeg.action,
          ),
        closeAction:
          getClosingAction(
            optionLeg.action,
          ),
        optionType:
          String(
            optionLeg.option_type ??
              "",
          ).toUpperCase(),
        strikePrice:
          normalizeNumber(
            optionLeg.strike_price,
          ),
        expirationDate:
          optionLeg.expiration_date,
        contracts:
          legClose.contracts,
        entryPrice:
          normalizeNumber(
            optionLeg.entry_price,
          ),
        exitPrice:
          legClose.price,
        realizedPnl:
          legClose.realizedPnl ===
            null ||
          legClose.realizedPnl ===
            undefined
            ? null
            : roundMoney(
                legClose.realizedPnl,
              ),
      };
    })
    .filter(
      (
        leg,
      ): leg is PartialCloseLegDisplay =>
        leg !== null,
    )
    .sort(
      (
        firstLeg,
        secondLeg,
      ) =>
        firstLeg.legOrder -
        secondLeg.legOrder,
    );
}

/* -------------------------------------------------
   DISCORD POST
------------------------------------------------- */
async function postDiscordMessage({
  channelId,
  originalMessageId,
  token,
  body,
}: {
  channelId: string;
  originalMessageId: string | null;
  token: string;
  body: Record<string, unknown>;
}): Promise<DiscordPostResult> {
  const normalizedMessageId =
    String(originalMessageId ?? "").trim();

  const hasMessageReference =
    normalizedMessageId.length > 0;

  async function performRequest(
    includeMessageReference: boolean,
  ) {
    const requestBody =
      includeMessageReference &&
      hasMessageReference
        ? {
            ...body,
            message_reference: {
              message_id: normalizedMessageId,
              channel_id: channelId,
              fail_if_not_exists: false,
            },
          }
        : body;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      15_000,
    );

    try {
      const response = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bot ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        },
      );

      return {
        ok: response.ok,
        status: response.status,
        responseText: await response.text(),
      };
    } catch (error) {
      return {
        ok: false,
        status: null,
        responseText:
          error instanceof Error
            ? error.message
            : String(error),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  console.log(
    "Discord partial close request starting",
    {
      channel_id: channelId,
      original_message_id:
        normalizedMessageId || null,
      has_reference: hasMessageReference,
    },
  );

  const firstAttempt = await performRequest(
    hasMessageReference,
  );

  if (firstAttempt.ok) {
    console.log(
      "Discord partial close alert sent successfully",
      {
        channel_id: channelId,
        status: firstAttempt.status,
        used_message_reference:
          hasMessageReference,
      },
    );

    return {
      channelId,
      success: true,
      status: firstAttempt.status,
      response: firstAttempt.responseText,
      usedMessageReference: hasMessageReference,
      retriedWithoutReference: false,
    };
  }

  console.error(
    "Discord partial close first attempt failed",
    {
      channel_id: channelId,
      status: firstAttempt.status,
      response: firstAttempt.responseText,
      used_message_reference:
        hasMessageReference,
    },
  );

  if (!hasMessageReference) {
    return {
      channelId,
      success: false,
      status: firstAttempt.status,
      response: firstAttempt.responseText,
      usedMessageReference: false,
      retriedWithoutReference: false,
    };
  }

  const retryAttempt = await performRequest(false);

  if (retryAttempt.ok) {
    console.log(
      "Discord partial close alert sent after removing message reference",
      {
        channel_id: channelId,
        status: retryAttempt.status,
      },
    );
  } else {
    console.error(
      "Discord partial close retry failed",
      {
        channel_id: channelId,
        status: retryAttempt.status,
        response: retryAttempt.responseText,
      },
    );
  }

  return {
    channelId,
    success: retryAttempt.ok,
    status: retryAttempt.status,
    response: retryAttempt.responseText,
    usedMessageReference: false,
    retriedWithoutReference: true,
  };
}

/* -------------------------------------------------
   PARTIAL-CLOSE ALERT
------------------------------------------------- */
export async function sendPartialCloseSignalAlert({
  signalId,
  closedContracts,
  totalContracts,
  remainingContracts,
  exitPrice,
  realizedPnl = null,
  realizedReturnPct,
  legCloses = [],
}: PartialCloseAlertInput) {
  console.log(
    "Discord partial close alert invoked",
    {
      signalId,
      closedContracts,
      totalContracts,
      remainingContracts,
      exitPrice,
      realizedPnl,
      realizedReturnPct,
      legCloseCount: legCloses.length,
    },
  );

  const token =
    process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    console.warn(
      "Discord bot token missing. Skipping partial close alert.",
    );

    return false;
  }

  if (!signalId) {
    console.warn(
      "Missing signal ID. Skipping partial close alert.",
    );

    return false;
  }

  if (
    !Number.isFinite(
      totalContracts,
    ) ||
    totalContracts <= 0
  ) {
    console.warn(
      "Invalid total contract count. Skipping partial close alert.",
      {
        signalId,
        totalContracts,
      },
    );

    return false;
  }

  if (
    !Number.isFinite(
      closedContracts,
    ) ||
    closedContracts <= 0
  ) {
    console.warn(
      "Invalid closed contract count. Skipping partial close alert.",
      {
        signalId,
        closedContracts,
      },
    );

    return false;
  }

  if (
    !Number.isFinite(
      remainingContracts,
    ) ||
    remainingContracts < 0
  ) {
    console.warn(
      "Invalid remaining contract count. Skipping partial close alert.",
      {
        signalId,
        remainingContracts,
      },
    );

    return false;
  }

  const supabase =
    createSupabaseAdmin();

  const {
    data: signal,
    error,
  } = await supabase
    .from("signals")
    .select(
      `
      id,
      organization_id,
      status,
      action,
      open_action,
      instrument_type,
      asset,
      underlying,
      quantity,
      contracts,
      shares,
      entry_price,
      exit_price,
      underlying_entry_price,
      option_type,
      strike_price,
      expiration_date,
      confidence,
      trade_style,
      strategy_type,
      return_pct,
      discord_channel_id,
      discord_message_id
    `,
    )
    .eq(
      "id",
      signalId,
    )
    .maybeSingle();

  if (
    error ||
    !signal
  ) {
    console.error(
      "Unable to load signal for Discord partial close alert",
      {
        signal_id:
          signalId,
        error,
      },
    );

    return false;
  }

  const partialSignal =
    signal as SignalPartialCloseAlertRow;

  const organization =
    await getDiscordOrganization(
      partialSignal.organization_id,
    );

  const optionLegs =
    await getSignalOptionLegs(
      partialSignal.id,
    );

  /* -------------------------------------------------
     CENTRALIZED TRADE SUMMARY

     strategy_type is the strategy structure.
     trade_style is the execution style.
  ------------------------------------------------- */
  const tradeSummary =
    buildTradeSummary({
      symbol:
        partialSignal.asset,

      underlying:
        partialSignal.underlying,

      instrument_type:
        partialSignal.instrument_type,

      trade_style:
        partialSignal.strategy_type ??
        partialSignal.trade_style,

      execution_style:
        partialSignal.trade_style,

      action:
        partialSignal.action,

      open_action:
        partialSignal.open_action,

      entry_price:
        partialSignal.entry_price,

      exit_price:
        partialSignal.exit_price,

      contracts:
        partialSignal.contracts,

      quantity:
        partialSignal.quantity,

      shares:
        partialSignal.shares,

      option_type:
        partialSignal.option_type,

      strike_price:
        partialSignal.strike_price,

      expiration_date:
        partialSignal.expiration_date,

      option_legs:
        optionLegs as TradeSummaryOptionLegInput[],
    });

  const partialCloseLegs =
    buildPartialCloseLegs({
      optionLegs,
      legCloses,
    });

  const configuredChannels =
    getPartialCloseAlertChannels(
      await getOrganizationDiscordChannels(
        organization.id,
      ),
    );

  const channels = Array.from(
    new Set(
      [
        partialSignal.discord_channel_id,
        ...configuredChannels,
      ].filter(
        (channelId): channelId is string =>
          Boolean(channelId && channelId.trim()),
      ),
    ),
  );

  if (
    channels.length === 0
  ) {
    console.warn(
      "No Discord channels configured for partial close alert.",
      {
        organization_id:
          organization.id,
        signalId,
      },
    );

    return false;
  }

  const ticker =
    tradeSummary.symbol ||
    getTicker(
      partialSignal,
    );

  const strategyLabel =
    tradeSummary.tradeStyleLabel;

  const executionStyleLabel =
    formatDisplayText(
      partialSignal.trade_style,
    );

  const title =
    tradeSummary.title &&
    tradeSummary.title !==
      "UNKNOWN Unknown"
      ? tradeSummary.title
      : `${partialSignal.action ?? "SIGNAL"} ${ticker}`.trim();

  const closedPercent =
    calculateClosedPercent({
      closedContracts,
      totalContracts,
    });

  const remainingPercent =
    calculateRemainingPercent({
      remainingContracts,
      totalContracts,
    });

  const legContentLines =
    partialCloseLegs.length > 0
      ? [
          "",
          "🧩 **Legs Closed:**",
          ...partialCloseLegs.map(
            (leg) =>
              `• ${leg.closeAction} ${leg.contracts} ${ticker} ${formatStrike(
                leg.strikePrice,
              )} ${leg.optionType} @ ${formatMoney(
                leg.exitPrice,
              )}`,
          ),
        ]
      : [];

  const strategyEntryLines =
    partialSignal.instrument_type ===
    "OPTION"
      ? [
          `🏷️ **Entry Type:** ${formatDebitCredit(
            tradeSummary.debitCredit,
          )}`,
          `💵 **${getStrategyEntryLabel(
            tradeSummary.debitCredit,
          )}:** ${formatMoney(
            tradeSummary.netEntryAmount,
          )}`,
          `💳 **Premium Paid:** ${formatMoney(
            tradeSummary.totalPaid,
          )}`,
          `💰 **Premium Received:** ${formatMoney(
            tradeSummary.totalReceived,
          )}`,
        ]
      : [];

  const content = [
    "🟡 **PARTIAL CLOSE**",
    "",
    `📣 **${title}**`,
    `🧠 **Strategy:** ${strategyLabel}`,
    `⚙️ **Execution Style:** ${executionStyleLabel}`,
    ...strategyEntryLines,
    `📦 **Closed:** ${closedContracts} of ${totalContracts} strategy contract${
      totalContracts === 1
        ? ""
        : "s"
    }`,
    `📊 **Closed %:** ${formatPercent(
      closedPercent,
    )}`,
    `📌 **Remaining:** ${remainingContracts} strategy contract${
      remainingContracts === 1
        ? ""
        : "s"
    }`,
    `📈 **Remaining %:** ${formatPercent(
      remainingPercent,
    )}`,
    `🏁 **Aggregate Exit:** ${formatMoney(
      exitPrice,
    )}`,
    realizedPnl !== null
      ? `💰 **Realized P/L:** ${formatMoney(
          realizedPnl,
        )}`
      : "",
    `📈 **Realized Return:** ${formatPercent(
      realizedReturnPct,
    )}`,
    ...legContentLines,
    "",
    `#${organization.name.replace(
      /\s+/g,
      "",
    )} #PartialClose`,
  ]
    .filter(Boolean)
    .join("\n");

  const fields: Array<{
    name: string;
    value: string;
    inline: boolean;
  }> = [
    {
      name: "Ticker",
      value:
        ticker || "—",
      inline: true,
    },
    {
      name: "Strategy",
      value:
        strategyLabel,
      inline: true,
    },
    {
      name: "Execution Style",
      value:
        executionStyleLabel,
      inline: true,
    },
    {
      name: "Entry Type",
      value:
        formatDebitCredit(
          tradeSummary.debitCredit,
        ),
      inline: true,
    },
    {
      name:
        getStrategyEntryLabel(
          tradeSummary.debitCredit,
        ),
      value:
        formatMoney(
          tradeSummary.netEntryAmount,
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
          tradeSummary.totalPaid,
        ),
      inline: true,
    },
    {
      name:
        "Premium Received",
      value:
        formatMoney(
          tradeSummary.totalReceived,
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
    {
      name: "Closed",
      value:
        `${closedContracts}/${totalContracts}`,
      inline: true,
    },
    {
      name: "Remaining",
      value:
        `${remainingContracts}/${totalContracts}`,
      inline: true,
    },
    {
      name: "Closed %",
      value:
        formatPercent(
          closedPercent,
        ),
      inline: true,
    },
    {
      name: "Remaining %",
      value:
        formatPercent(
          remainingPercent,
        ),
      inline: true,
    },
    {
      name: "Aggregate Exit",
      value:
        formatMoney(
          exitPrice,
        ),
      inline: true,
    },
    {
      name: "Realized P/L",
      value:
        formatMoney(
          realizedPnl,
        ),
      inline: true,
    },
    {
      name: "Realized Return",
      value:
        formatPercent(
          realizedReturnPct,
        ),
      inline: true,
    },
    {
      name: "Confidence",
      value:
        partialSignal.confidence ===
          null ||
        partialSignal.confidence ===
          undefined
          ? "—"
          : `${partialSignal.confidence}%`,
      inline: true,
    },
  ];

  if (
    partialCloseLegs.length > 0
  ) {
    fields.push({
      name:
        `Legs Closed (${partialCloseLegs.length})`,
      value:
        partialCloseLegs
          .map((leg) => {
            const entryText =
              leg.entryPrice ===
              null
                ? ""
                : ` • Entry ${formatMoney(
                    leg.entryPrice,
                  )}`;

            const pnlText =
              leg.realizedPnl ===
              null
                ? ""
                : ` • P/L ${formatMoney(
                    leg.realizedPnl,
                  )}`;

            const expirationText =
              leg.expirationDate
                ? ` • Exp ${formatDate(
                    leg.expirationDate,
                  )}`
                : "";

            return (
              `${leg.closeAction} ` +
              `${leg.contracts} ` +
              `${ticker} ` +
              `${formatStrike(
                leg.strikePrice,
              )} ` +
              `${leg.optionType} ` +
              `@ ${formatMoney(
                leg.exitPrice,
              )}` +
              entryText +
              pnlText +
              expirationText
            );
          })
          .join("\n"),
      inline: false,
    });
  }

  const embed = {
    title:
      `🟡 ${organization.name} • ${strategyLabel} Partial Close`,

    description:
      `**${title}**`,

    color:
      0xf59e0b,

    fields,

    footer: {
      text:
        `${organization.name} • Signal ID: ${partialSignal.id}`,
    },

    timestamp:
      new Date().toISOString(),
  };

  console.log(
    "Discord partial close alert dispatch",
    {
      signal_id: partialSignal.id,
      organization_id: organization.id,
      channels,
      original_message_id:
        partialSignal.discord_message_id,
      closed_contracts: closedContracts,
      total_contracts: totalContracts,
      remaining_contracts: remainingContracts,
      leg_close_count: partialCloseLegs.length,
    },
  );

  const results = await Promise.all(
    channels.map((channelId) =>
      postDiscordMessage({
        channelId,
        originalMessageId:
          partialSignal.discord_message_id,
        token,
        body: {
          content,
          embeds: [embed],
          allowed_mentions: {
            parse: [],
          },
        },
      }),
    ),
  );

  const successfulChannels = results.filter(
    (result) => result.success,
  );

  const failedChannels = results.filter(
    (result) => !result.success,
  );

  console.log(
    "Discord partial close alert dispatch completed",
    {
      signal_id: partialSignal.id,
      total_channels: results.length,
      successful_channels:
        successfulChannels.map(
          (result) => result.channelId,
        ),
      failed_channels:
        failedChannels.map((result) => ({
          channel_id: result.channelId,
          status: result.status,
          response: result.response,
          retried_without_reference:
            result.retriedWithoutReference,
        })),
    },
  );

  return successfulChannels.length > 0;
}

"use server";

import { createClient } from "@supabase/supabase-js";

import {
  buildTradeSummary,
  type TradeSummaryOptionLegInput,
} from "@/lib/signals/buildTradeSummary";

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
type SignalCloseAlertRow = {
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
   *
   * scalp
   * swing
   * leap
   */
  trade_style: string | null;

  /**
   * Options strategy:
   *
   * long_call
   * long_put
   * iron_condor
   * bull_call_debit
   * bear_call_credit
   * etc.
   */
  strategy_type: string | null;

  outcome:
    | "WIN"
    | "LOSS"
    | "BREAKEVEN"
    | null;

  return_pct: number | string | null;
  closed_at: string | null;
  discord_channel_id: string | null;
  discord_message_id: string | null;
  discord_close_sent_at: string | null;
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

type SignalExecutionRow = {
  id: string;
  signal_id: string;
  status: string;
  contracts: number | string;
  entry_price: number | string;
  exit_price: number | string | null;
  entry_cost: number | string | null;
  exit_value: number | string | null;
  pnl: number | string | null;
  pnl_pct: number | string | null;
  opened_at: string;
  closed_at: string | null;
};

type ExecutionFillRow = {
  id: string;
  execution_id: string;
  signal_option_leg_id: string | null;
  side: string;
  contracts: number | string | null;
  price: number | string | null;
  created_at: string;
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

type ClosedLegSummary = {
  id: string;
  legOrder: number;
  action: string;
  closeAction: string;
  optionType: string;
  strikePrice: number | null;
  expirationDate: string | null;
  openedContracts: number;
  closedContracts: number;
  averageEntryPrice: number | null;
  averageExitPrice: number | null;
  realizedPnl: number | null;
};

type AuthoritativeCloseSummary = {
  executionId: string | null;
  executionStatus: string | null;
  totalContracts: number | null;
  entryPrice: number | null;
  exitPrice: number | null;
  entryCost: number | null;
  exitValue: number | null;
  pnl: number | null;
  pnlPct: number | null;
  openedAt: string | null;
  closedAt: string | null;
};

type DiscordField = {
  name: string;
  value: string;
  inline: boolean;
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
function toNumber(
  value:
    | number
    | string
    | null
    | undefined,
  fallback = 0,
) {
  const parsed =
    Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
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

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function roundMoney(
  value: number,
) {
  return Number(
    value.toFixed(2),
  );
}

function roundPrice(
  value: number,
) {
  return Number(
    value.toFixed(4),
  );
}

function calculateWeightedAveragePrice({
  fills,
  side,
}: {
  fills: ExecutionFillRow[];
  side: "OPEN" | "CLOSE";
}) {
  const matchingFills =
    fills.filter(
      (fill) =>
        String(
          fill.side ?? "",
        ).toUpperCase() ===
        side,
    );

  const totalContracts =
    matchingFills.reduce(
      (sum, fill) =>
        sum +
        toNumber(
          fill.contracts,
        ),
      0,
    );

  if (totalContracts <= 0) {
    return null;
  }

  const totalValue =
    matchingFills.reduce(
      (sum, fill) =>
        sum +
        toNumber(
          fill.contracts,
        ) *
          toNumber(
            fill.price,
          ),
      0,
    );

  return roundPrice(
    totalValue /
      totalContracts,
  );
}

/* -------------------------------------------------
   FORMAT HELPERS
------------------------------------------------- */
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

function formatPercent(
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
    amount > 0
      ? "+"
      : "";

  return `${prefix}${amount.toFixed(
    2,
  )}%`;
}

function formatStrike(
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

  return Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(2);
}

function formatDateTime(
  value?: string | null,
) {
  if (!value) {
    return "—";
  }

  return new Date(
    value,
  ).toLocaleString();
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

function getEntryLabel(
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
   SIGNAL HELPERS
------------------------------------------------- */
function getTicker(
  signal: SignalCloseAlertRow,
) {
  return (
    signal.asset?.trim() ||
    signal.underlying ||
    ""
  ).toUpperCase();
}

function getCloseColor(
  outcome:
    SignalCloseAlertRow["outcome"],
) {
  if (outcome === "WIN") {
    return 0x00c781;
  }

  if (outcome === "LOSS") {
    return 0xef4444;
  }

  return 0xf59e0b;
}

function getOutcomeEmoji(
  outcome:
    SignalCloseAlertRow["outcome"],
) {
  if (outcome === "WIN") {
    return "✅";
  }

  if (outcome === "LOSS") {
    return "❌";
  }

  return "➖";
}

function normalizeAction(
  value?: string | null,
) {
  return String(
    value ?? "",
  )
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

function getCloseAction(
  value?: string | null,
) {
  if (
    isLongOpeningAction(value)
  ) {
    return "STC";
  }

  if (
    isShortOpeningAction(value)
  ) {
    return "BTC";
  }

  return "CLOSE";
}

function getOutcomeFromPnl(
  pnl: number | null,
) {
  if (pnl === null) {
    return "BREAKEVEN" as const;
  }

  if (pnl > 0) {
    return "WIN" as const;
  }

  if (pnl < 0) {
    return "LOSS" as const;
  }

  return "BREAKEVEN" as const;
}

/* -------------------------------------------------
   ORGANIZATION + CHANNELS
------------------------------------------------- */
async function getDiscordOrganization(
  organizationId:
    | string
    | null,
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
      "Discord close alert organization lookup failed",
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
      "Discord close alert channel lookup failed",
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

function getCloseAlertChannels(
  discordChannels:
    DiscordChannelRow[],
) {
  const channelIds =
    discordChannels
      .filter(
        (channel) =>
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
   DATABASE LOADERS
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
      "Unable to load signal option legs for close alert",
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

async function getSignalExecution(
  signalId: string,
) {
  const supabase =
    createSupabaseAdmin();

  const {
    data,
    error,
  } = await supabase
    .from("signal_executions")
    .select(
      `
      id,
      signal_id,
      status,
      contracts,
      entry_price,
      exit_price,
      entry_cost,
      exit_value,
      pnl,
      pnl_pct,
      opened_at,
      closed_at
    `,
    )
    .eq(
      "signal_id",
      signalId,
    )
    .order(
      "opened_at",
      {
        ascending: false,
      },
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to load signal execution for close alert",
      {
        signalId,
        error,
      },
    );

    return null;
  }

  return data as
    | SignalExecutionRow
    | null;
}

async function getExecutionFills(
  executionId:
    | string
    | null,
) {
  if (!executionId) {
    return [];
  }

  const supabase =
    createSupabaseAdmin();

  const {
    data,
    error,
  } = await supabase
    .from("execution_fills")
    .select(
      `
      id,
      execution_id,
      signal_option_leg_id,
      side,
      contracts,
      price,
      created_at
    `,
    )
    .eq(
      "execution_id",
      executionId,
    )
    .order(
      "created_at",
      {
        ascending: true,
      },
    );

  if (error) {
    console.error(
      "Unable to load execution fills for close alert",
      {
        executionId,
        error,
      },
    );

    return [];
  }

  return (
    data ?? []
  ) as ExecutionFillRow[];
}

/* -------------------------------------------------
   AUTHORITATIVE CLOSE SUMMARY
------------------------------------------------- */
function buildAuthoritativeCloseSummary({
  signal,
  execution,
}: {
  signal:
    SignalCloseAlertRow;
  execution:
    SignalExecutionRow | null;
}): AuthoritativeCloseSummary {
  return {
    executionId:
      execution?.id ??
      null,

    executionStatus:
      execution?.status ??
      signal.status ??
      null,

    totalContracts:
      toNullableNumber(
        execution?.contracts ??
          signal.contracts ??
          signal.quantity,
      ),

    entryPrice:
      toNullableNumber(
        execution?.entry_price ??
          signal.entry_price,
      ),

    exitPrice:
      toNullableNumber(
        execution?.exit_price ??
          signal.exit_price,
      ),

    entryCost:
      toNullableNumber(
        execution?.entry_cost,
      ),

    exitValue:
      toNullableNumber(
        execution?.exit_value,
      ),

    pnl:
      toNullableNumber(
        execution?.pnl,
      ),

    pnlPct:
      toNullableNumber(
        execution?.pnl_pct ??
          signal.return_pct,
      ),

    openedAt:
      execution?.opened_at ??
      null,

    closedAt:
      execution?.closed_at ??
      signal.closed_at ??
      null,
  };
}

/* -------------------------------------------------
   CLOSED LEG SUMMARIES
------------------------------------------------- */
function buildClosedLegSummaries({
  optionLegs,
  fills,
}: {
  optionLegs:
    SignalOptionLegRow[];
  fills:
    ExecutionFillRow[];
}): ClosedLegSummary[] {
  return [...optionLegs]
    .sort(
      (
        firstLeg,
        secondLeg,
      ) =>
        firstLeg.leg_order -
        secondLeg.leg_order,
    )
    .map((leg) => {
      const legFills =
        fills.filter(
          (fill) =>
            fill.signal_option_leg_id ===
            leg.id,
        );

      const openedContracts =
        legFills
          .filter(
            (fill) =>
              String(
                fill.side ?? "",
              ).toUpperCase() ===
              "OPEN",
          )
          .reduce(
            (sum, fill) =>
              sum +
              toNumber(
                fill.contracts,
              ),
            0,
          ) ||
        Math.max(
          toNumber(
            leg.contracts,
            1,
          ),
          1,
        );

      const closedContracts =
        legFills
          .filter(
            (fill) =>
              String(
                fill.side ?? "",
              ).toUpperCase() ===
              "CLOSE",
          )
          .reduce(
            (sum, fill) =>
              sum +
              toNumber(
                fill.contracts,
              ),
            0,
          );

      const averageEntryPrice =
        calculateWeightedAveragePrice({
          fills:
            legFills,
          side:
            "OPEN",
        }) ??
        toNullableNumber(
          leg.entry_price,
        );

      const averageExitPrice =
        calculateWeightedAveragePrice({
          fills:
            legFills,
          side:
            "CLOSE",
        }) ??
        toNullableNumber(
          leg.exit_price,
        );

      let realizedPnl:
        | number
        | null =
        null;

      if (
        closedContracts > 0 &&
        averageEntryPrice !==
          null &&
        averageExitPrice !==
          null
      ) {
        if (
          isLongOpeningAction(
            leg.action,
          )
        ) {
          realizedPnl =
            roundMoney(
              (
                averageExitPrice -
                averageEntryPrice
              ) *
                closedContracts *
                100,
            );
        } else if (
          isShortOpeningAction(
            leg.action,
          )
        ) {
          realizedPnl =
            roundMoney(
              (
                averageEntryPrice -
                averageExitPrice
              ) *
                closedContracts *
                100,
            );
        }
      }

      return {
        id:
          leg.id,

        legOrder:
          leg.leg_order,

        action:
          leg.action,

        closeAction:
          getCloseAction(
            leg.action,
          ),

        optionType:
          String(
            leg.option_type ??
              "",
          ).toUpperCase(),

        strikePrice:
          toNullableNumber(
            leg.strike_price,
          ),

        expirationDate:
          leg.expiration_date,

        openedContracts,

        closedContracts,

        averageEntryPrice,

        averageExitPrice,

        realizedPnl,
      };
    });
}

/* -------------------------------------------------
   CENTRALIZED TRADE SUMMARY
------------------------------------------------- */
function getTradeSummary({
  signal,
  optionLegs,
}: {
  signal:
    SignalCloseAlertRow;
  optionLegs:
    SignalOptionLegRow[];
}) {
  return buildTradeSummary({
    symbol:
      signal.asset,

    underlying:
      signal.underlying,

    instrument_type:
      signal.instrument_type,

    /**
     * strategy_type is authoritative.
     *
     * Legacy signals fall back to detection from
     * signal_option_legs or the original signal columns.
     */
    trade_style:
      signal.strategy_type ??
      signal.trade_style,

    /**
     * trade_style now means execution style.
     */
    execution_style:
      signal.trade_style,

    action:
      signal.action,

    open_action:
      signal.open_action,

    entry_price:
      signal.entry_price,

    exit_price:
      signal.exit_price,

    contracts:
      signal.contracts,

    quantity:
      signal.quantity,

    shares:
      signal.shares,

    option_type:
      signal.option_type,

    strike_price:
      signal.strike_price,

    expiration_date:
      signal.expiration_date,

    option_legs:
      optionLegs as TradeSummaryOptionLegInput[],
  });
}

/* -------------------------------------------------
   TITLE
------------------------------------------------- */
function buildSignalTitle({
  signal,
  optionLegs,
}: {
  signal:
    SignalCloseAlertRow;
  optionLegs:
    SignalOptionLegRow[];
}) {
  const tradeSummary =
    getTradeSummary({
      signal,
      optionLegs,
    });

  if (
    tradeSummary.title &&
    tradeSummary.title !==
      "UNKNOWN Unknown"
  ) {
    return tradeSummary.title;
  }

  const ticker =
    getTicker(signal);

  if (
    signal.instrument_type ===
    "OPTION"
  ) {
    return `${signal.action ?? "SIGNAL"} ${ticker} ${
      signal.strike_price ?? ""
    } ${
      signal.option_type ?? ""
    }`.trim();
  }

  return `${signal.action ?? "SIGNAL"} ${ticker}`.trim();
}

/* -------------------------------------------------
   DISCORD POST
------------------------------------------------- */
async function postDiscordReply({
  channelId,
  originalMessageId,
  token,
  body,
}: {
  channelId: string;
  originalMessageId:
    | string
    | null;
  token: string;
  body:
    Record<
      string,
      unknown
    >;
}) {
  const replyBody =
    originalMessageId &&
    originalMessageId
      .trim()
      .length > 0
      ? {
          ...body,

          message_reference: {
            message_id:
              originalMessageId,

            channel_id:
              channelId,

            fail_if_not_exists:
              false,
          },
        }
      : body;

  console.log(
    "Sending Discord final-close reply",
    {
      channel_id:
        channelId,

      original_message_id:
        originalMessageId,

      has_reference:
        Boolean(
          originalMessageId,
        ),
    },
  );

  const response =
    await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bot ${token}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            replyBody,
          ),
      },
    );

  const text =
    await response.text();

  if (!response.ok) {
    console.error(
      "Discord close alert failed",
      {
        channel_id:
          channelId,

        original_message_id:
          originalMessageId,

        status:
          response.status,

        response:
          text,
      },
    );

    return false;
  }

  console.log(
    "Discord close alert sent successfully",
    {
      channel_id:
        channelId,

      original_message_id:
        originalMessageId,
    },
  );

  return true;
}

/* -------------------------------------------------
   DUPLICATE-SEND GUARD
------------------------------------------------- */
async function claimCloseAlert(
  signalId: string,
) {
  const supabase =
    createSupabaseAdmin();

  const claimedAt =
    new Date().toISOString();

  const {
    data,
    error,
  } = await supabase
    .from("signals")
    .update({
      discord_close_sent_at:
        claimedAt,
    })
    .eq(
      "id",
      signalId,
    )
    .is(
      "discord_close_sent_at",
      null,
    )
    .select(
      "id, discord_close_sent_at",
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to claim Discord close alert",
      {
        signalId,
        error,
      },
    );

    return null;
  }

  return data
    ? claimedAt
    : null;
}

async function releaseCloseAlertClaim({
  signalId,
  claimedAt,
}: {
  signalId: string;
  claimedAt: string;
}) {
  const supabase =
    createSupabaseAdmin();

  const {
    error,
  } = await supabase
    .from("signals")
    .update({
      discord_close_sent_at:
        null,
    })
    .eq(
      "id",
      signalId,
    )
    .eq(
      "discord_close_sent_at",
      claimedAt,
    );

  if (error) {
    console.error(
      "Unable to release Discord close alert claim",
      {
        signalId,
        claimedAt,
        error,
      },
    );
  }
}

/* -------------------------------------------------
   CLOSED SIGNAL ALERT
------------------------------------------------- */
export async function sendClosedSignalAlert(
  signalId: string,
) {
  const token =
    process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    console.warn(
      "Discord bot token missing. Skipping close alert.",
    );

    return false;
  }

  if (!signalId) {
    console.warn(
      "Missing signal ID. Skipping close alert.",
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
      outcome,
      return_pct,
      closed_at,
      discord_channel_id,
      discord_message_id,
      discord_close_sent_at
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
      "Unable to load signal for Discord close alert",
      {
        signalId,
        error,
      },
    );

    return false;
  }

  const closeSignal =
    signal as SignalCloseAlertRow;

  if (
    closeSignal.discord_close_sent_at
  ) {
    console.warn(
      "Discord close alert already sent. Skipping duplicate.",
      {
        signalId,

        discord_close_sent_at:
          closeSignal.discord_close_sent_at,
      },
    );

    return false;
  }

  const claimedAt =
    await claimCloseAlert(
      closeSignal.id,
    );

  if (!claimedAt) {
    console.warn(
      "Discord close alert was already claimed by another request.",
      {
        signalId,
      },
    );

    return false;
  }

  try {
    const organization =
      await getDiscordOrganization(
        closeSignal.organization_id,
      );

    const optionLegs =
      await getSignalOptionLegs(
        closeSignal.id,
      );

    const execution =
      await getSignalExecution(
        closeSignal.id,
      );

    const fills =
      await getExecutionFills(
        execution?.id ??
          null,
      );

    const closeSummary =
      buildAuthoritativeCloseSummary({
        signal:
          closeSignal,

        execution,
      });

    const closedLegs =
      buildClosedLegSummaries({
        optionLegs,
        fills,
      });

    const tradeSummary =
      getTradeSummary({
        signal:
          closeSignal,

        optionLegs,
      });

    const channels =
      closeSignal.discord_channel_id
        ? [
            closeSignal.discord_channel_id,
          ]
        : getCloseAlertChannels(
            await getOrganizationDiscordChannels(
              organization.id,
            ),
          );

    if (
      channels.length === 0
    ) {
      console.warn(
        "No Discord channels configured for close alert.",
        {
          organization_id:
            organization.id,

          signalId,
        },
      );

      await releaseCloseAlertClaim({
        signalId:
          closeSignal.id,

        claimedAt,
      });

      return false;
    }

    const title =
      buildSignalTitle({
        signal:
          closeSignal,

        optionLegs,
      });

    /**
     * signal_executions.pnl is authoritative and is expected
     * to be stored in dollars.
     *
     * buildTradeSummary.netPnlDollars is the compatible
     * fallback. Do not fall back to netPnl because netPnl
     * is expressed in premium points.
     */
    const authoritativePnl =
      closeSummary.pnl ??
      tradeSummary.netPnlDollars;

    const authoritativeReturn =
      closeSummary.pnlPct ??
      tradeSummary.returnPct ??
      toNullableNumber(
        closeSignal.return_pct,
      );

    const outcome =
      closeSignal.outcome ??
      getOutcomeFromPnl(
        authoritativePnl,
      );

    const outcomeEmoji =
      getOutcomeEmoji(
        outcome,
      );

    const ticker =
      tradeSummary.symbol ||
      getTicker(
        closeSignal,
      );

    const strategyLabel =
      tradeSummary.tradeStyleLabel;

    const executionStyleLabel =
      formatDisplayText(
        closeSignal.trade_style,
      );

    const entryLabel =
      getEntryLabel(
        tradeSummary.debitCredit,
      );

    const entryValue =
      tradeSummary.netEntryAmount ??
      closeSummary.entryPrice ??
      toNullableNumber(
        closeSignal.entry_price,
      );

    const exitValue =
      tradeSummary.netExitAmount ??
      closeSummary.exitPrice ??
      toNullableNumber(
        closeSignal.exit_price,
      );

    const closedLegContentLines =
      closedLegs.length > 0
        ? [
            "",
            "🧩 **Closed Legs:**",

            ...closedLegs.map(
              (leg) => {
                const contracts =
                  leg.closedContracts ||
                  leg.openedContracts;

                const pnlText =
                  leg.realizedPnl !==
                  null
                    ? ` • P/L ${formatMoney(
                        leg.realizedPnl,
                      )}`
                    : "";

                return (
                  `• ${leg.closeAction} ` +
                  `${contracts} ` +
                  `${ticker} ` +
                  `${formatStrike(
                    leg.strikePrice,
                  )} ` +
                  `${leg.optionType} ` +
                  `@ ${formatMoney(
                    leg.averageExitPrice,
                  )}` +
                  pnlText
                );
              },
            ),
          ]
        : [];

    const strategyEntryLines =
      closeSignal.instrument_type ===
      "OPTION"
        ? [
            `🏷️ **Entry Type:** ${formatDebitCredit(
              tradeSummary.debitCredit,
            )}`,

            `💵 **${entryLabel}:** ${formatMoney(
              entryValue,
            )}`,

            `💳 **Premium Paid:** ${formatMoney(
              tradeSummary.totalPaid,
            )}`,

            `💰 **Premium Received:** ${formatMoney(
              tradeSummary.totalReceived,
            )}`,
          ]
        : [
            `💵 **Entry:** ${formatMoney(
              entryValue,
            )}`,
          ];

    const content = [
      `${outcomeEmoji} **SIGNAL CLOSED**`,
      "",

      `📣 **${title}**`,

      `🧠 **Strategy:** ${strategyLabel}`,

      `⚙️ **Execution Style:** ${executionStyleLabel}`,

      `📊 **Outcome:** ${outcome}`,

      `📈 **Final Return:** ${formatPercent(
        authoritativeReturn,
      )}`,

      `💰 **Final P/L:** ${formatMoney(
        authoritativePnl,
      )}`,

      ...strategyEntryLines,

      `🏁 **Final Exit:** ${formatMoney(
        exitValue,
      )}`,

      closeSummary.exitValue !==
      null
        ? `💵 **Execution Exit Value:** ${formatMoney(
            closeSummary.exitValue,
          )}`
        : "",

      closeSummary.entryCost !==
      null
        ? `💳 **Execution Entry Cost:** ${formatMoney(
            closeSummary.entryCost,
          )}`
        : "",

      closeSummary.totalContracts !==
      null
        ? `📦 **Strategy Contracts:** ${closeSummary.totalContracts}`
        : "",

      `🧩 **Leg Count:** ${tradeSummary.legCount}`,

      ...closedLegContentLines,

      "",

      `#${organization.name.replace(
        /\s+/g,
        "",
      )} #SignalClosed`,
    ]
      .filter(Boolean)
      .join("\n");

    const fields:
      DiscordField[] = [
      {
        name:
          "Ticker",

        value:
          ticker ||
          "—",

        inline:
          true,
      },
      {
        name:
          "Outcome",

        value:
          `${outcomeEmoji} ${outcome}`,

        inline:
          true,
      },
      {
        name:
          "Final Return",

        value:
          formatPercent(
            authoritativeReturn,
          ),

        inline:
          true,
      },
      {
        name:
          "Strategy",

        value:
          strategyLabel,

        inline:
          true,
      },
      {
        name:
          "Execution Style",

        value:
          executionStyleLabel,

        inline:
          true,
      },
      {
        name:
          "Entry Type",

        value:
          formatDebitCredit(
            tradeSummary.debitCredit,
          ),

        inline:
          true,
      },
      {
        name:
          entryLabel,

        value:
          formatMoney(
            entryValue,
          ),

        inline:
          true,
      },
      {
        name:
          "Premium Paid",

        value:
          closeSignal.instrument_type ===
          "OPTION"
            ? formatMoney(
                tradeSummary.totalPaid,
              )
            : "—",

        inline:
          true,
      },
      {
        name:
          "Premium Received",

        value:
          closeSignal.instrument_type ===
          "OPTION"
            ? formatMoney(
                tradeSummary.totalReceived,
              )
            : "—",

        inline:
          true,
      },
      {
        name:
          "Final Exit",

        value:
          formatMoney(
            exitValue,
          ),

        inline:
          true,
      },
      {
        name:
          "Final P/L",

        value:
          formatMoney(
            authoritativePnl,
          ),

        inline:
          true,
      },
      {
        name:
          "Execution Exit Value",

        value:
          formatMoney(
            closeSummary.exitValue,
          ),

        inline:
          true,
      },
      {
        name:
          "Strategy Contracts",

        value:
          closeSummary.totalContracts !==
          null
            ? String(
                closeSummary.totalContracts,
              )
            : String(
                tradeSummary.strategyContracts,
              ),

        inline:
          true,
      },
      {
        name:
          "Leg Count",

        value:
          String(
            tradeSummary.legCount,
          ),

        inline:
          true,
      },
      {
        name:
          "Total Leg Contracts",

        value:
          String(
            tradeSummary.totalContracts,
          ),

        inline:
          true,
      },
      {
        name:
          "Confidence",

        value:
          closeSignal.confidence ===
            null ||
          closeSignal.confidence ===
            undefined
            ? "—"
            : `${closeSignal.confidence}%`,

        inline:
          true,
      },
      {
        name:
          "Opened At",

        value:
          formatDateTime(
            closeSummary.openedAt,
          ),

        inline:
          true,
      },
      {
        name:
          "Closed At",

        value:
          formatDateTime(
            closeSummary.closedAt,
          ),

        inline:
          true,
      },
    ];

    if (
      closedLegs.length > 0
    ) {
      fields.push({
        name:
          `Closed Option Legs (${closedLegs.length})`,

        value:
          closedLegs
            .map(
              (leg) => {
                const contracts =
                  leg.closedContracts ||
                  leg.openedContracts;

                const entryText =
                  leg.averageEntryPrice !==
                  null
                    ? ` • Entry ${formatMoney(
                        leg.averageEntryPrice,
                      )}`
                    : "";

                const pnlText =
                  leg.realizedPnl !==
                  null
                    ? ` • P/L ${formatMoney(
                        leg.realizedPnl,
                      )}`
                    : "";

                return (
                  `${leg.closeAction} ` +
                  `${contracts} ` +
                  `${ticker} ` +
                  `${formatStrike(
                    leg.strikePrice,
                  )} ` +
                  `${leg.optionType} ` +
                  `@ ${formatMoney(
                    leg.averageExitPrice,
                  )}` +
                  entryText +
                  pnlText
                );
              },
            )
            .join("\n"),

        inline:
          false,
      });
    }

    const embed = {
      title:
        `${outcomeEmoji} ${organization.name} • ${strategyLabel} Closed`,

      description:
        `**${title}**`,

      color:
        getCloseColor(
          outcome,
        ),

      fields,

      footer: {
        text:
          `${organization.name} • Signal ID: ${closeSignal.id}`,
      },

      timestamp:
        new Date().toISOString(),
    };

    const results =
      await Promise.all(
        channels.map(
          (channelId) =>
            postDiscordReply({
              channelId,

              originalMessageId:
                closeSignal.discord_message_id,

              token,

              body: {
                content,

                embeds: [
                  embed,
                ],

                allowed_mentions: {
                  parse: [],
                },
              },
            }),
        ),
      );

    const sent =
      results.some(Boolean);

    if (!sent) {
      await releaseCloseAlertClaim({
        signalId:
          closeSignal.id,

        claimedAt,
      });
    }

    return sent;
  } catch (error) {
    console.error(
      "Discord final-close alert failed",
      {
        signalId,
        error,
      },
    );

    await releaseCloseAlertClaim({
      signalId:
        closeSignal.id,

      claimedAt,
    });

    return false;
  }
}
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  Edit3,
  Gauge,
  Hash,
  LineChart,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/getProfile";
import TradingViewChart from "@/components/tradingview/TradingViewChart";
import SignalSummaryCard from "@/components/signals/SignalSummaryCard";
import RiskPanel from "@/components/signals/RiskPanel";
import ExecutionRulesTable from "@/components/signals/ExecutionRulesTable";
import ExecutionRuleTemplateButtons from "@/components/signals/ExecutionRuleTemplateButtons";
import ExecutionPanel from "@/components/signals/ExecutionPanel";
import { getSignalDisplayStatus } from "@/lib/signals/displayState";
import {
  buildTradeSummary,
  type TradeSummaryOptionLegInput,
} from "@/lib/signals/buildTradeSummary";

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata: Metadata = {
  title: "Signal Details | CASE Trades",
  description:
    "View detailed information for a trading signal, including trade setup, execution history, performance metrics, lifecycle status, notes, and related analytics within CASE Trades.",
};

export const dynamic = "force-dynamic";

/* -------------------------------------------------
   SUPABASE ADMIN CLIENT
------------------------------------------------- */
function createSupabaseAdminClient() {
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

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/* -------------------------------------------------
   DOMAIN TYPES
------------------------------------------------- */
type RuleType =
  | "STOP_LOSS"
  | "TAKE_PROFIT";

type ExecutionStatus =
  | "OPEN"
  | "PARTIAL"
  | "CLOSED";

type ExecutionFillSide =
  | "OPEN"
  | "CLOSE";

type ExecutionRule = {
  id: string;
  rule_type: RuleType | string;
  value_pct: number | null;
  quantity_pct: number | null;
  is_active: boolean;
};

type PriceLevel = {
  type: RuleType;
  price: number;
};

type SignalOptionLegRow = {
  id: string;
  signal_id: string;
  leg_order: number;
  action: string;
  option_type:
    | "CALL"
    | "PUT"
    | string;
  strike_price:
    | number
    | string
    | null;
  expiration_date: string | null;
  contracts:
    | number
    | string
    | null;
  entry_price:
    | number
    | string
    | null;
  exit_price:
    | number
    | string
    | null;
  created_at: string;
  updated_at: string;
};

type ExecutionFillOptionLegRow = {
  id: string;
  signal_id: string;
  leg_order: number;
  action: string;
  option_type: string;
  strike_price:
    | number
    | string
    | null;
  expiration_date: string | null;
  contracts:
    | number
    | string
    | null;
  entry_price:
    | number
    | string
    | null;
  exit_price:
    | number
    | string
    | null;
  created_at: string;
  updated_at: string;
};

type ExecutionFillRow = {
  id: string;
  execution_id: string;
  signal_option_leg_id:
    | string
    | null;
  side:
    | ExecutionFillSide
    | string;
  contracts:
    | number
    | string
    | null;
  price:
    | number
    | string
    | null;
  created_at: string;
  signal_option_legs:
    | ExecutionFillOptionLegRow
    | ExecutionFillOptionLegRow[]
    | null;
};

type ExecutionRow = {
  id: string;
  signal_id: string;
  status:
    | ExecutionStatus
    | string;
  contracts:
    | number
    | string;
  entry_price:
    | number
    | string;
  exit_price:
    | number
    | string
    | null;
  entry_cost:
    | number
    | string
    | null;
  exit_value:
    | number
    | string
    | null;
  pnl:
    | number
    | string
    | null;
  pnl_pct:
    | number
    | string
    | null;
  opened_at: string;
  closed_at: string | null;
  execution_fills:
    | ExecutionFillRow[]
    | null;
};

type NormalizedExecutionFill = {
  id: string;
  execution_id: string;
  signal_option_leg_id:
    | string
    | null;
  side: ExecutionFillSide;
  contracts: number;
  price: number;
  created_at: string;
};

type NormalizedExecutionLeg = {
  id: string;
  signal_id: string;
  leg_order: number;
  action: string;
  option_type: string;
  strike_price: number | null;
  expiration_date: string | null;
  contracts: number;
  entry_price: number | null;
  exit_price: number | null;
  opened_contracts: number;
  closed_contracts: number;
  remaining_contracts: number;
  average_open_price:
    | number
    | null;
  average_close_price:
    | number
    | null;
  fills: NormalizedExecutionFill[];
};

type NormalizedExecution = {
  id: string;
  signal_id: string;
  status: ExecutionStatus;
  contracts: number;
  entry_price: number;
  exit_price: number | null;
  entry_cost: number | null;
  exit_value: number | null;
  pnl: number | null;
  pnl_pct: number | null;
  opened_at: string;
  closed_at: string | null;
  remaining_contracts: number;
  opened_contracts: number;
  closed_contracts: number;
  option_legs: NormalizedExecutionLeg[];
  fills: NormalizedExecutionFill[];
};

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
): number {
  const parsed = Number(value);

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
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function roundMoney(
  value: number,
) {
  return Number(
    value.toFixed(2),
  );
}

function calculateWeightedAveragePrice(
  fills: NormalizedExecutionFill[],
  side: ExecutionFillSide,
) {
  const matchingFills =
    fills.filter(
      (fill) =>
        fill.side === side,
    );

  const totalContracts =
    matchingFills.reduce(
      (sum, fill) =>
        sum + fill.contracts,
      0,
    );

  if (totalContracts <= 0) {
    return null;
  }

  const totalValue =
    matchingFills.reduce(
      (sum, fill) =>
        sum +
        fill.contracts *
          fill.price,
      0,
    );

  return roundMoney(
    totalValue /
      totalContracts,
  );
}

/* -------------------------------------------------
   TIMEFRAME MAP
------------------------------------------------- */
function tradeStyleToInterval(
  style:
    | string
    | null
    | undefined,
) {
  switch (
    String(style ?? "")
      .trim()
      .toLowerCase()
  ) {
    case "scalp":
      return "5";

    case "swing":
      return "60";

    case "leap":
      return "D";

    default:
      return "60";
  }
}

/* -------------------------------------------------
   FORMAT HELPERS
------------------------------------------------- */
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

function formatCurrency(
  value?:
    | number
    | string
    | null,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const numericValue =
    Number(value);

  if (
    Number.isNaN(
      numericValue,
    )
  ) {
    return String(value);
  }

  const prefix =
    numericValue < 0
      ? "-"
      : "";

  return `${prefix}$${Math.abs(
    numericValue,
  ).toFixed(2)}`;
}

function formatPercent(
  value?:
    | number
    | string
    | null,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const numericValue =
    Number(value);

  if (
    Number.isNaN(
      numericValue,
    )
  ) {
    return String(value);
  }

  const prefix =
    numericValue > 0
      ? "+"
      : "";

  return `${prefix}${numericValue.toFixed(
    2,
  )}%`;
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

function formatStyleLabel(
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
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function formatSignalTitle(
  signal: any,
  tradeTitle?: string,
) {
  if (
    tradeTitle &&
    tradeTitle !==
      "UNKNOWN Unknown"
  ) {
    return tradeTitle;
  }

  const action =
    signal.action ?? "BUY";

  const underlying =
    signal.underlying ??
    signal.asset ??
    "—";

  const strike =
    signal.strike_price
      ? `${signal.strike_price}`
      : "";

  const optionType =
    signal.option_type ?? "";

  return `${action} ${underlying} ${strike} ${optionType}`.trim();
}

function withOrgQuery(
  href: string,
  organizationSlug?:
    | string
    | null,
) {
  if (!organizationSlug) {
    return href;
  }

  const separator =
    href.includes("?")
      ? "&"
      : "?";

  return `${href}${separator}org=${encodeURIComponent(
    organizationSlug,
  )}`;
}

/* -------------------------------------------------
   EXECUTION NORMALIZATION
------------------------------------------------- */
function normalizeExecutionFill(
  fill: ExecutionFillRow,
): NormalizedExecutionFill | null {
  const side =
    String(
      fill.side ?? "",
    ).toUpperCase();

  if (
    side !== "OPEN" &&
    side !== "CLOSE"
  ) {
    return null;
  }

  const contracts =
    toNumber(
      fill.contracts,
    );

  const price =
    toNumber(
      fill.price,
    );

  if (
    contracts <= 0 ||
    price < 0
  ) {
    return null;
  }

  return {
    id: fill.id,
    execution_id:
      fill.execution_id,
    signal_option_leg_id:
      fill.signal_option_leg_id,
    side,
    contracts,
    price,
    created_at:
      fill.created_at,
  };
}

function buildExecutionLegs({
  optionLegs,
  fills,
  strategyContracts,
}: {
  optionLegs:
    SignalOptionLegRow[];
  fills:
    NormalizedExecutionFill[];
  strategyContracts: number;
}): NormalizedExecutionLeg[] {
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

      const openFills =
        legFills.filter(
          (fill) =>
            fill.side ===
            "OPEN",
        );

      const closeFills =
        legFills.filter(
          (fill) =>
            fill.side ===
            "CLOSE",
        );

      const openedContracts =
        openFills.reduce(
          (sum, fill) =>
            sum +
            fill.contracts,
          0,
        );

      const closedContracts =
        closeFills.reduce(
          (sum, fill) =>
            sum +
            fill.contracts,
          0,
        );

      const savedLegContracts =
        Math.max(
          toNumber(
            leg.contracts,
            1,
          ),
          1,
        );

      const expectedOpenedContracts =
        openedContracts > 0
          ? openedContracts
          : Math.max(
              savedLegContracts,
              strategyContracts > 0
                ? savedLegContracts
                : 1,
            );

      const remainingContracts =
        Math.max(
          expectedOpenedContracts -
            closedContracts,
          0,
        );

      return {
        id: leg.id,
        signal_id:
          leg.signal_id,
        leg_order:
          leg.leg_order,
        action:
          leg.action,
        option_type:
          leg.option_type,
        strike_price:
          toNullableNumber(
            leg.strike_price,
          ),
        expiration_date:
          leg.expiration_date,
        contracts:
          savedLegContracts,
        entry_price:
          toNullableNumber(
            leg.entry_price,
          ),
        exit_price:
          toNullableNumber(
            leg.exit_price,
          ),
        opened_contracts:
          expectedOpenedContracts,
        closed_contracts:
          closedContracts,
        remaining_contracts:
          remainingContracts,
        average_open_price:
          calculateWeightedAveragePrice(
            legFills,
            "OPEN",
          ) ??
          toNullableNumber(
            leg.entry_price,
          ),
        average_close_price:
          calculateWeightedAveragePrice(
            legFills,
            "CLOSE",
          ) ??
          toNullableNumber(
            leg.exit_price,
          ),
        fills: legFills,
      };
    });
}

function calculateRemainingStrategyContracts({
  executionContracts,
  executionLegs,
  unlinkedFills,
}: {
  executionContracts: number;
  executionLegs:
    NormalizedExecutionLeg[];
  unlinkedFills:
    NormalizedExecutionFill[];
}) {
  if (
    executionLegs.length > 0
  ) {
    const remainingStrategyUnits =
      executionLegs.map(
        (leg) => {
          const legRatio =
            executionContracts > 0
              ? Math.max(
                  leg.opened_contracts /
                    executionContracts,
                  1,
                )
              : 1;

          return Math.floor(
            leg.remaining_contracts /
              legRatio,
          );
        },
      );

    if (
      remainingStrategyUnits.length >
      0
    ) {
      return Math.max(
        Math.min(
          ...remainingStrategyUnits,
        ),
        0,
      );
    }
  }

  const openedContracts =
    unlinkedFills
      .filter(
        (fill) =>
          fill.side === "OPEN",
      )
      .reduce(
        (sum, fill) =>
          sum +
          fill.contracts,
        0,
      );

  const closedContracts =
    unlinkedFills
      .filter(
        (fill) =>
          fill.side ===
          "CLOSE",
      )
      .reduce(
        (sum, fill) =>
          sum +
          fill.contracts,
        0,
      );

  const totalContracts =
    executionContracts > 0
      ? executionContracts
      : openedContracts;

  return Math.max(
    totalContracts -
      closedContracts,
    0,
  );
}

function normalizeExecution({
  executionRow,
  optionLegs,
}: {
  executionRow:
    ExecutionRow;
  optionLegs:
    SignalOptionLegRow[];
}): NormalizedExecution {
  const executionContracts =
    Math.max(
      toNumber(
        executionRow.contracts,
      ),
      0,
    );

  const normalizedFills =
    (
      executionRow.execution_fills ??
      []
    )
      .map(
        normalizeExecutionFill,
      )
      .filter(
        (
          fill,
        ): fill is NormalizedExecutionFill =>
          fill !== null,
      );

  const executionLegs =
    buildExecutionLegs({
      optionLegs,
      fills:
        normalizedFills,
      strategyContracts:
        executionContracts,
    });

  const linkedFillIds =
    new Set(
      executionLegs.flatMap(
        (leg) =>
          leg.fills.map(
            (fill) =>
              fill.id,
          ),
      ),
    );

  const unlinkedFills =
    normalizedFills.filter(
      (fill) =>
        !fill.signal_option_leg_id ||
        !linkedFillIds.has(
          fill.id,
        ),
    );

  const remainingContracts =
    calculateRemainingStrategyContracts(
      {
        executionContracts,
        executionLegs,
        unlinkedFills,
      },
    );

  const legacyOpenedContracts =
    unlinkedFills
      .filter(
        (fill) =>
          fill.side === "OPEN",
      )
      .reduce(
        (sum, fill) =>
          sum +
          fill.contracts,
        0,
      );

  const legacyClosedContracts =
    unlinkedFills
      .filter(
        (fill) =>
          fill.side ===
          "CLOSE",
      )
      .reduce(
        (sum, fill) =>
          sum +
          fill.contracts,
        0,
      );

  const openedContracts =
    executionLegs.length > 0
      ? executionContracts
      : executionContracts > 0
        ? executionContracts
        : legacyOpenedContracts;

  const closedContracts =
    Math.max(
      openedContracts -
        remainingContracts,
      0,
    );

  const derivedStatus:
    ExecutionStatus =
    remainingContracts <= 0
      ? "CLOSED"
      : closedContracts > 0
        ? "PARTIAL"
        : "OPEN";

  return {
    id: executionRow.id,
    signal_id:
      executionRow.signal_id,
    status:
      derivedStatus,
    contracts:
      openedContracts,
    entry_price:
      toNumber(
        executionRow.entry_price,
      ),
    exit_price:
      toNullableNumber(
        executionRow.exit_price,
      ),
    entry_cost:
      toNullableNumber(
        executionRow.entry_cost,
      ),
    exit_value:
      toNullableNumber(
        executionRow.exit_value,
      ),
    pnl:
      toNullableNumber(
        executionRow.pnl,
      ),
    pnl_pct:
      toNullableNumber(
        executionRow.pnl_pct,
      ),
    opened_at:
      executionRow.opened_at,
    closed_at:
      executionRow.closed_at,
    remaining_contracts:
      remainingContracts,
    opened_contracts:
      openedContracts,
    closed_contracts:
      executionLegs.length > 0
        ? closedContracts
        : legacyClosedContracts,
    option_legs:
      executionLegs,
    fills:
      normalizedFills,
  };
}

/* -------------------------------------------------
   DERIVE PRICE LEVELS
------------------------------------------------- */
function derivePriceLevels({
  entry,
  action,
  rules,
}: {
  entry: number;
  action: "BUY" | "SELL";
  rules: ExecutionRule[];
}): PriceLevel[] {
  const isBuy =
    action === "BUY";

  return rules
    .filter(
      (rule) =>
        (
          rule.rule_type ===
            "STOP_LOSS" ||
          rule.rule_type ===
            "TAKE_PROFIT"
        ) &&
        typeof rule.value_pct ===
          "number",
    )
    .map((rule) => {
      const magnitude =
        Math.abs(
          rule.value_pct!,
        ) / 100;

      const price =
        rule.rule_type ===
        "STOP_LOSS"
          ? isBuy
            ? entry *
              (1 - magnitude)
            : entry *
              (1 + magnitude)
          : isBuy
            ? entry *
              (1 + magnitude)
            : entry *
              (1 - magnitude);

      return {
        type:
          rule.rule_type as RuleType,
        price:
          Number(
            price.toFixed(2),
          ),
      };
    });
}

/* -------------------------------------------------
   PAGE: SIGNAL DETAIL
------------------------------------------------- */
export default async function SignalDetailPage({
  params,
  searchParams,
}: {
  params: {
    signalId: string;
  };
  searchParams?: {
    created?: string;
    saved?: string;
    org?: string;
  };
}) {
  const supabase =
    await createSupabaseServerClient();

  const profile =
    await getProfile({
      organizationSlug:
        searchParams?.org,
    });

  const currentOrganization =
    profile.current_organization;

  if (!currentOrganization) {
    redirect(
      "/dashboard/billing?reason=no_organization",
    );
  }

  const organizationSlug =
    currentOrganization.organization_slug;

  const isMasterAdmin =
    currentOrganization.is_master_admin ===
      true ||
    profile.roles?.[0]?.name ===
      "master_admin" ||
    profile.roles?.[0]?.rank ===
      4 ||
    String(
      profile.email ?? "",
    ).toLowerCase() ===
      "csthilaire@xilairetechnologies.com";

  const hasSignalAccess =
    isMasterAdmin ||
    (
      currentOrganization.active ===
        true &&
      currentOrganization.has_active_subscription ===
        true &&
      currentOrganization.has_discord_access ===
        true
    );

  if (!hasSignalAccess) {
    redirect(
      withOrgQuery(
        "/dashboard/billing?reason=signals_locked",
        organizationSlug,
      ),
    );
  }

  /* -------------------------------------------------
     LOAD SIGNAL
  ------------------------------------------------- */
  const {
    data: signal,
    error: signalError,
  } = await supabase
    .from("signals")
    .select(
      `
      id,
      organization_id,
      asset,
      underlying,
      instrument_type,
      action,
      open_action,
      quantity,
      contracts,
      shares,
      option_type,
      strike_price,
      expiration_date,
      entry_price,
      open_price,
      underlying_entry_price,
      trade_style,
      strategy_type,
      confidence,
      status,
      watching,
      watched,
      rationale,
      stop_loss_pct,
      take_profit_pct,
      outcome,
      return_pct,
      exit_price,
      closed_at,
      created_at,
      updated_at
    `,
    )
    .eq(
      "id",
      params.signalId,
    )
    .eq(
      "organization_id",
      currentOrganization.organization_id,
    )
    .single();

  if (
    signalError ||
    !signal
  ) {
    notFound();
  }

  /* -------------------------------------------------
     LOAD MULTI-LEG OPTION STRUCTURE

     The parent signal was already authorized above by
     both signal ID and organization ID. The service-role
     client is used only for this scoped child-table lookup
     because the current signal_option_legs SELECT RLS policy
     returns an empty array through the authenticated client.
  ------------------------------------------------- */
  const supabaseAdmin =
    createSupabaseAdminClient();

  const {
    data:
      signalOptionLegRows,
    error:
      signalOptionLegsError,
  } = await supabaseAdmin
    .from(
      "signal_option_legs",
    )
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
      exit_price,
      created_at,
      updated_at
    `,
    )
    .eq(
      "signal_id",
      signal.id,
    )
    .order(
      "leg_order",
      {
        ascending: true,
      },
    );

  if (
    signalOptionLegsError
  ) {
    console.error(
      "SignalDetailPage: failed to load signal option legs",
      {
        signalId:
          signal.id,
        organizationId:
          signal.organization_id,
        error:
          signalOptionLegsError,
      },
    );

    throw new Error(
      "Failed to load signal option legs",
    );
  }

  const optionLegs =
    (
      signalOptionLegRows ??
      []
    )
      .filter(
        (leg) =>
          leg.signal_id ===
          signal.id,
      )
      .sort(
        (
          firstLeg,
          secondLeg,
        ) =>
          firstLeg.leg_order -
          secondLeg.leg_order,
      ) as SignalOptionLegRow[];

  console.log(
    "Signal detail option-leg load",
    {
      signal_id:
        signal.id,
      organization_id:
        signal.organization_id,
      returned_leg_count:
        optionLegs.length,
      legs:
        optionLegs.map(
          (leg) => ({
            id: leg.id,
            leg_order:
              leg.leg_order,
            action:
              leg.action,
            option_type:
              leg.option_type,
            strike_price:
              leg.strike_price,
            expiration_date:
              leg.expiration_date,
            contracts:
              leg.contracts,
            entry_price:
              leg.entry_price,
            exit_price:
              leg.exit_price,
          }),
        ),
    },
  );

  /* -------------------------------------------------
     CENTRALIZED TRADE SUMMARY
  ------------------------------------------------- */
  const tradeSummary =
    buildTradeSummary({
      symbol:
        signal.asset,
      underlying:
        signal.underlying,
      instrument_type:
        signal.instrument_type,

      trade_style:
        signal.strategy_type ??
        signal.trade_style,

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

      option_type:
        signal.option_type,
      strike_price:
        signal.strike_price,
      expiration_date:
        signal.expiration_date,

      contracts:
        signal.contracts,
      quantity:
        signal.quantity,
      shares:
        signal.shares,

      option_legs:
        optionLegs as TradeSummaryOptionLegInput[],
    });

  const resolvedStrategyLabel =
    signal.strategy_type
      ? formatStyleLabel(
          signal.strategy_type,
        )
      : tradeSummary.tradeStyleLabel;

  const executionStyleLabel =
    formatStyleLabel(
      signal.trade_style,
    );

  const strategyEntryLabel =
    tradeSummary.debitCredit ===
    "DEBIT"
      ? "Net Debit"
      : tradeSummary.debitCredit ===
          "CREDIT"
        ? "Net Credit"
        : tradeSummary.debitCredit ===
            "EVEN"
          ? "Net Entry"
          : "Entry";

  const displayStatus =
    getSignalDisplayStatus({
      status:
        signal.status,
      watching:
        signal.watching,
      watched:
        signal.watched,
      closed_at:
        signal.closed_at,
      outcome:
        signal.outcome,
      return_pct:
        signal.return_pct,
    });

  const hasUnderlyingEntry =
    signal.underlying_entry_price !==
      null &&
    signal.underlying_entry_price !==
      undefined &&
    !Number.isNaN(
      Number(
        signal.underlying_entry_price,
      ),
    );

  /* -------------------------------------------------
     LOAD EXECUTION RULES
  ------------------------------------------------- */
  const {
    data: rules,
    error: rulesError,
  } = await supabase
    .from(
      "signal_execution_rules",
    )
    .select(
      `
      id,
      rule_type,
      value_pct,
      quantity_pct,
      is_active
    `,
    )
    .eq(
      "signal_id",
      signal.id,
    )
    .eq(
      "is_active",
      true,
    );

  if (rulesError) {
    console.error(
      "SignalDetailPage: failed to load execution rules",
      rulesError,
    );

    throw new Error(
      "Failed to load execution rules",
    );
  }

  const typedRules:
    ExecutionRule[] =
    rules ?? [];

  /* -------------------------------------------------
     LOAD EXECUTION + LEG-LINKED FILLS
  ------------------------------------------------- */
  const {
    data:
      executionData,
    error:
      executionError,
  } = await supabase
    .from(
      "signal_executions",
    )
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
      closed_at,
      execution_fills (
        id,
        execution_id,
        signal_option_leg_id,
        side,
        contracts,
        price,
        created_at,
        signal_option_legs (
          id,
          signal_id,
          leg_order,
          action,
          option_type,
          strike_price,
          expiration_date,
          contracts,
          entry_price,
          exit_price,
          created_at,
          updated_at
        )
      )
    `,
    )
    .eq(
      "signal_id",
      signal.id,
    )
    .maybeSingle();

  if (executionError) {
    console.error(
      "SignalDetailPage: failed to load execution and fills",
      executionError,
    );

    throw new Error(
      "Failed to load signal execution",
    );
  }

  const execution =
    executionData
      ? normalizeExecution({
          executionRow:
            executionData as ExecutionRow,
          optionLegs,
        })
      : null;

  /* -------------------------------------------------
     PRICE LEVELS
  ------------------------------------------------- */
  const priceLevels:
    PriceLevel[] =
    hasUnderlyingEntry
      ? derivePriceLevels({
          entry:
            Number(
              signal.underlying_entry_price,
            ),
          action:
            signal.action,
          rules:
            typedRules,
        })
      : [];

  const interval =
    tradeStyleToInterval(
      signal.trade_style,
    );

  const showCreatedBanner =
    searchParams?.created ===
    "1";

  const showSavedBanner =
    searchParams?.saved ===
    "1";

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-300">
            {
              currentOrganization.organization_name
            }{" "}
            · Signal Detail
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-100">
            {formatSignalTitle(
              signal,
              tradeSummary.title &&
                tradeSummary.title !==
                  "UNKNOWN Unknown"
                ? tradeSummary.title
                : resolvedStrategyLabel,
            )}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Review strategy, option legs, strike, expiration, entry, risk
            levels, execution rules, and fill tracking for this signal.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={withOrgQuery(
              "/dashboard/signals",
              organizationSlug,
            )}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Signals
          </Link>

          {isMasterAdmin && (
            <Link
              href={withOrgQuery(
                `/dashboard/signals/edit/${signal.id}`,
                organizationSlug,
              )}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              <Edit3 className="h-4 w-4" />
              Edit Signal
            </Link>
          )}
        </div>
      </div>

      {showCreatedBanner && (
        <Notice
          icon={
            <CheckCircle2 />
          }
          title="Signal Created"
          body="Signal created successfully. Review details below."
          tone="emerald"
        />
      )}

      {showSavedBanner && (
        <Notice
          icon={
            <CheckCircle2 />
          }
          title="Signal Updated"
          body="Signal changes were saved successfully."
          tone="emerald"
        />
      )}

      {!hasUnderlyingEntry && (
        <Notice
          icon={
            <AlertTriangle />
          }
          title="Chart Levels Unavailable"
          body="Underlying entry price was not captured. Chart levels cannot be rendered until the signal has an underlying entry price."
          tone="red"
        />
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={
            <Sparkles />
          }
          label="Strategy"
          value={
            resolvedStrategyLabel
          }
        />

        <MetricCard
          icon={
            <Activity />
          }
          label="Execution Style"
          value={
            executionStyleLabel
          }
        />

        <MetricCard
          icon={
            <CircleDollarSign />
          }
          label={
            signal.instrument_type ===
            "OPTION"
              ? strategyEntryLabel
              : "Entry"
          }
          value={
            signal.instrument_type ===
              "OPTION" &&
            tradeSummary.netEntryAmount !==
              null
              ? formatCurrency(
                  tradeSummary.netEntryAmount,
                )
              : formatCurrency(
                  signal.entry_price,
                )
          }
        />

        <MetricCard
          icon={
            <Hash />
          }
          label={
            signal.instrument_type ===
            "OPTION"
              ? "Legs"
              : "Instrument"
          }
          value={
            signal.instrument_type ===
            "OPTION"
              ? tradeSummary.legCount
              : signal.instrument_type ??
                "—"
          }
        />

        <MetricCard
          icon={
            <Gauge />
          }
          label="Confidence"
          value={
            signal.confidence !==
              null &&
            signal.confidence !==
              undefined
              ? `${signal.confidence}%`
              : "—"
          }
        />
      </section>

      {signal.instrument_type ===
        "OPTION" && (
        <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-100">
                Option Strategy Structure
              </h2>

              <p className="text-sm text-slate-400">
                CASE identifies this as{" "}
                {resolvedStrategyLabel}. All saved option legs are shown
                below.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {tradeSummary.legs.length >
              0 ? (
                tradeSummary.legs.map(
                  (leg) => (
                    <div
                      key={`${leg.legOrder}-${leg.displayLine}`}
                      className="rounded-xl border border-white/10 bg-slate-950 px-4 py-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Leg{" "}
                            {
                              leg.legOrder
                            }
                          </p>

                          <p className="mt-1 font-semibold text-slate-100">
                            {
                              leg.displayLine
                            }
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300">
                            {
                              leg.actionLabel
                            }
                          </span>

                          <span className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300">
                            {
                              leg.direction
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  ),
                )
              ) : (
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-4 text-sm text-yellow-200">
                  No option-leg structure could be resolved for this signal.
                  CASE will continue showing the saved legacy signal fields
                  where available.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950 p-5">
              <h3 className="font-semibold text-slate-100">
                Strategy Summary
              </h3>

              <div className="mt-4 grid gap-3">
                <MiniRow
                  label="Strategy"
                  value={
                    resolvedStrategyLabel
                  }
                />

                <MiniRow
                  label="Execution Style"
                  value={
                    executionStyleLabel
                  }
                />

                <MiniRow
                  label="Entry Type"
                  value={formatDebitCredit(
                    tradeSummary.debitCredit,
                  )}
                />

                <MiniRow
                  label={
                    strategyEntryLabel
                  }
                  value={
                    tradeSummary.netEntryAmount !==
                    null
                      ? formatCurrency(
                          tradeSummary.netEntryAmount,
                        )
                      : "—"
                  }
                />

                <MiniRow
                  label="Premium Paid"
                  value={formatCurrency(
                    tradeSummary.totalPaid,
                  )}
                />

                <MiniRow
                  label="Premium Received"
                  value={formatCurrency(
                    tradeSummary.totalReceived,
                  )}
                />

                <MiniRow
                  label="Net Exit"
                  value={
                    tradeSummary.netExitAmount !==
                    null
                      ? formatCurrency(
                          tradeSummary.netExitAmount,
                        )
                      : "—"
                  }
                />

                <MiniRow
                  label="Net P/L"
                  value={
                    tradeSummary.netPnlDollars !==
                    null
                      ? formatCurrency(
                          tradeSummary.netPnlDollars,
                        )
                      : execution?.pnl !==
                          null &&
                        execution?.pnl !==
                          undefined
                        ? formatCurrency(
                            execution.pnl,
                          )
                        : "—"
                  }
                />

                <MiniRow
                  label="Return"
                  value={
                    tradeSummary.returnPct !==
                    null
                      ? formatPercent(
                          tradeSummary.returnPct,
                        )
                      : execution?.pnl_pct !==
                          null &&
                        execution?.pnl_pct !==
                          undefined
                        ? formatPercent(
                            execution.pnl_pct,
                          )
                        : formatPercent(
                            signal.return_pct,
                          )
                  }
                />

                <MiniRow
                  label="Primary Expiration"
                  value={formatDate(
                    tradeSummary.primaryExpirationDate,
                  )}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                <Activity className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-100">
                  Signal Summary
                </h2>

                <p className="text-sm text-slate-400">
                  Core details shown to subscribers.
                </p>
              </div>
            </div>

            <SignalSummaryCard
              signal={{
                ...signal,
                strategy_type:
                  signal.strategy_type ??
                  tradeSummary.tradeStyleLabel,
                execution_style:
                  signal.trade_style,
              }}
              tradeStyleLabel={
                resolvedStrategyLabel
              }
              legCount={
                tradeSummary.legCount
              }
              strategyEntryType={
                tradeSummary.debitCredit
              }
              strategyNetEntry={
                tradeSummary.netEntryAmount
              }
              totalPaid={
                tradeSummary.totalPaid
              }
              totalReceived={
                tradeSummary.totalReceived
              }
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-sky-500/10 p-3 text-sky-300">
                <Target className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-100">
                  Risk Snapshot
                </h2>

                <p className="text-sm text-slate-400">
                  Saved risk targets from the signal record.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              <MiniRow
                label="Stop Loss"
                value={formatPercent(
                  signal.stop_loss_pct,
                )}
              />

              <MiniRow
                label="Take Profit"
                value={formatPercent(
                  signal.take_profit_pct,
                )}
              />

              <MiniRow
                label="Strategy"
                value={
                  resolvedStrategyLabel
                }
              />

              <MiniRow
                label="Execution Style"
                value={
                  executionStyleLabel
                }
              />

              <MiniRow
                label="Status"
                value={
                  displayStatus
                }
              />

              <MiniRow
                label="Outcome"
                value={
                  signal.outcome ??
                  "—"
                }
              />

              <MiniRow
                label="Return"
                value={
                  tradeSummary.returnPct !==
                  null
                    ? formatPercent(
                        tradeSummary.returnPct,
                      )
                    : formatPercent(
                        signal.return_pct,
                      )
                }
              />

              <MiniRow
                label="Exit"
                value={
                  tradeSummary.netExitAmount !==
                  null
                    ? formatCurrency(
                        tradeSummary.netExitAmount,
                      )
                    : formatCurrency(
                        signal.exit_price,
                      )
                }
              />
            </div>
          </div>
        </div>

        {hasUnderlyingEntry && (
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                  <LineChart className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-100">
                    Price Chart —{" "}
                    {
                      signal.underlying
                    }
                  </h2>

                  <p className="text-sm text-slate-400">
                    Execution Style:{" "}
                    {
                      executionStyleLabel
                    }{" "}
                    · Interval:{" "}
                    {interval} · Entry:{" "}
                    {formatCurrency(
                      signal.underlying_entry_price,
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4">
              <TradingViewChart
                symbol={
                  signal.underlying
                }
                interval={
                  interval
                }
                entryPrice={Number(
                  signal.underlying_entry_price,
                )}
                levels={
                  priceLevels
                }
                optionLegs={
                  optionLegs
                }
                strategyLabel={
                  resolvedStrategyLabel
                }
                netEntry={
                  tradeSummary.netEntryAmount
                }
                debitCredit={
                  tradeSummary.debitCredit
                }
              />
            </div>
          </section>
        )}
      </section>

      {signal.rationale && (
        <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-slate-100">
            Rationale
          </h2>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
            {
              signal.rationale
            }
          </p>
        </section>
      )}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RiskPanel
          key={JSON.stringify(
            typedRules.map(
              (rule) =>
                `${rule.rule_type}:${rule.value_pct}:${rule.quantity_pct}`,
            ),
          )}
          signal={
            signal
          }
          rules={
            typedRules
          }
        />

        <ExecutionRulesTable
          rules={
            typedRules
          }
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-100">
              Execution Tracking
            </h2>

            <p className="text-sm text-slate-400">
              Track strategy contracts, individual option legs, partial
              closes, and remaining position status.
            </p>
          </div>
        </div>

        <ExecutionPanel
          signalId={
            signal.id
          }
          execution={
            execution
          }
        />
      </section>

      {isMasterAdmin && (
        <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
          <h2 className="font-semibold text-slate-100">
            Execution Rule Templates
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Quickly apply standard stop-loss and take-profit rules.
          </p>

          <div className="mt-5">
            <ExecutionRuleTemplateButtons
              signalId={
                signal.id
              }
            />
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
        <h2 className="text-lg font-semibold text-slate-100">
          Audit Information
        </h2>

        <dl className="mt-5 grid gap-4 text-sm md:grid-cols-3">
          <AuditRow
            label="Signal ID"
            value={
              signal.id
            }
            mono
          />

          <AuditRow
            label="Organization"
            value={
              currentOrganization.organization_name
            }
          />

          <AuditRow
            label="Organization ID"
            value={
              signal.organization_id ??
              "—"
            }
            mono
          />

          <AuditRow
            label="Created At"
            value={formatDateTime(
              signal.created_at,
            )}
          />

          <AuditRow
            label="Updated At"
            value={formatDateTime(
              signal.updated_at,
            )}
          />

          <AuditRow
            label="Closed At"
            value={formatDateTime(
              signal.closed_at,
            )}
          />

          <AuditRow
            label="Instrument"
            value={
              signal.instrument_type ??
              "—"
            }
          />

          <AuditRow
            label="Option Type"
            value={
              signal.option_type ??
              "—"
            }
          />

          <AuditRow
            label="Strategy Type"
            value={
              resolvedStrategyLabel
            }
          />

          <AuditRow
            label="Execution Style"
            value={
              executionStyleLabel
            }
          />

          <AuditRow
            label="Entry Type"
            value={formatDebitCredit(
              tradeSummary.debitCredit,
            )}
          />

          <AuditRow
            label={
              strategyEntryLabel
            }
            value={
              tradeSummary.netEntryAmount !==
              null
                ? formatCurrency(
                    tradeSummary.netEntryAmount,
                  )
                : "—"
            }
          />

          <AuditRow
            label="Premium Paid"
            value={formatCurrency(
              tradeSummary.totalPaid,
            )}
          />

          <AuditRow
            label="Premium Received"
            value={formatCurrency(
              tradeSummary.totalReceived,
            )}
          />

          <AuditRow
            label="Net Exit"
            value={
              tradeSummary.netExitAmount !==
              null
                ? formatCurrency(
                    tradeSummary.netExitAmount,
                  )
                : "—"
            }
          />

          <AuditRow
            label="Net P/L"
            value={
              tradeSummary.netPnlDollars !==
              null
                ? formatCurrency(
                    tradeSummary.netPnlDollars,
                  )
                : execution?.pnl !==
                    null &&
                  execution?.pnl !==
                    undefined
                  ? formatCurrency(
                      execution.pnl,
                    )
                  : "—"
            }
          />

          <AuditRow
            label="Leg Count"
            value={
              tradeSummary.legCount
            }
          />

          <AuditRow
            label="Strategy Contracts"
            value={
              tradeSummary.strategyContracts
            }
          />

          <AuditRow
            label="Total Leg Contracts"
            value={
              tradeSummary.totalContracts
            }
          />

          <AuditRow
            label="Outcome"
            value={
              signal.outcome ??
              "—"
            }
          />

          <AuditRow
            label="Return"
            value={
              tradeSummary.returnPct !==
              null
                ? formatPercent(
                    tradeSummary.returnPct,
                  )
                : execution?.pnl_pct !==
                    null &&
                  execution?.pnl_pct !==
                    undefined
                  ? formatPercent(
                      execution.pnl_pct,
                    )
                  : formatPercent(
                      signal.return_pct,
                    )
            }
          />

          <AuditRow
            label="Exit Price"
            value={
              tradeSummary.netExitAmount !==
              null
                ? formatCurrency(
                    tradeSummary.netExitAmount,
                  )
                : formatCurrency(
                    signal.exit_price,
                  )
            }
          />

          <AuditRow
            label="Execution Status"
            value={
              execution?.status ??
              "Not Opened"
            }
          />

          <AuditRow
            label="Execution Remaining"
            value={
              execution
                ? `${execution.remaining_contracts} / ${execution.contracts}`
                : "—"
            }
          />
        </dl>
      </section>
    </div>
  );
}

/* -------------------------------------------------
   NOTICE
------------------------------------------------- */
function Notice({
  icon,
  title,
  body,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone:
    | "emerald"
    | "red";
}) {
  const classes =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <div
      className={`rounded-2xl border px-5 py-4 ${classes}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </div>

        <div>
          <h2 className="font-semibold">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-300">
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------
   METRIC CARD
------------------------------------------------- */
function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
      <div className="mb-4 text-emerald-400 [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>

      <p className="text-sm text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-100">
        {value}
      </p>
    </div>
  );
}

/* -------------------------------------------------
   MINI ROW
------------------------------------------------- */
function MiniRow({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-950 px-4 py-3">
      <span className="text-sm text-slate-400">
        {label}
      </span>

      <span className="text-right font-semibold text-slate-100">
        {value}
      </span>
    </div>
  );
}

/* -------------------------------------------------
   AUDIT ROW
------------------------------------------------- */
function AuditRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value:
    | string
    | number;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </dt>

      <dd
        className={
          "mt-1 break-all text-slate-200 " +
          (
            mono
              ? "font-mono text-xs"
              : ""
          )
        }
      >
        {value}
      </dd>
    </div>
  );
}
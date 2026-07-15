import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  PlusCircle,
  TrendingUp,
  BarChart3,
  Trophy,
  Target,
  Lock,
  CheckCircle2,
  Activity,
  FileText,
  Upload,
  Download,
  ChevronLeft,
  ChevronRight,
  Bot,
  ExternalLink,
  BrainCircuit,
  ListChecks,
  NotebookPen,
  RefreshCw,
  ScanLine,
  Settings2,
  Sparkles,
  CalendarDays,
} from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserEntitlements } from "@/lib/auth/getUserEntitlements";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { getSignalDisplayStatus } from "@/lib/signals/displayState";
import {
  buildTradeSummary,
  type TradeSummaryOptionLegInput,
} from "@/lib/signals/buildTradeSummary";
import DashboardStats from "@/components/journal/dashboard/DashboardStats";
import RecentActivity, {
  type JournalRecentActivity,
} from "@/components/journal/dashboard/RecentActivity";

import type { Metadata } from "next";

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata: Metadata = {
  title: "Journal | CASE Trades",
  description:
    "Manage your trading journal with manual and imported broker trades, execution tracking, screenshots, notes, analytics, performance insights, and AI-powered trade reviews in CASE Trades.",
};

export const dynamic = "force-dynamic";

type JournalPageProps = {
  searchParams?: {
    limit?: string;
    page?: string;
    heatmapWeek?: string;
  };
};

type TradeLogLimit = 10 | 20 | 50 | 100 | 250 | "all";

const TRADE_LOG_LIMIT_OPTIONS: Array<{
  label: string;
  value: TradeLogLimit;
}> = [
  { label: "10", value: 10 },
  { label: "20", value: 20 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
  { label: "250", value: 250 },
  { label: "All", value: "all" },
];

type SignalFillRow = {
  side: string | null;
  contracts: number | null;
  price: number | null;
  created_at: string | null;
};

type SignalOptionLegRow = {
  id: string;
  signal_id: string;
  leg_order: number;
  action: string | null;
  option_type: string | null;
  strike_price: number | null;
  expiration_date: string | null;
  contracts: number | null;
  entry_price: number | null;
  exit_price: number | null;
};

type SignalExecutionRow = {
  id: string;
  status: string | null;
  contracts: number | null;
  entry_price: number | null;
  exit_price: number | null;
  pnl: number | null;
  pnl_pct: number | null;
  opened_at: string | null;
  closed_at: string | null;
  execution_fills: SignalFillRow[] | null;
};

type SignalRow = {
  id: string;
  organization_id: string | null;
  asset: string | null;
  underlying: string | null;
  action: string | null;
  open_action: string | null;
  instrument_type: string | null;
  option_type: string | null;
  strike_price: number | null;
  expiration_date: string | null;
  entry_price: number | null;
  price: number | null;
  exit_price: number | null;
  quantity: number | null;
  contracts: number | null;
  shares: number | null;

  /**
   * Execution style:
   * scalp, swing, leap
   */
  trade_style: string | null;

  /**
   * Strategy structure:
   * LONG_CALL, IRON_CONDOR, BEAR_CALL_CREDIT, etc.
   */
  strategy_type: string | null;

  confidence: number | null;
  status: string | null;
  watching: boolean | null;
  watched: boolean | null;
  outcome: string | null;
  return_pct: number | null;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string | null;
  signal_option_legs: SignalOptionLegRow[] | null;
  signal_executions: SignalExecutionRow[] | null;
};

type ImportedOptionLegRow = {
  leg_order?: number | string | null;
  action?: string | null;
  option_type?: string | null;
  strike_price?: number | string | null;
  expiration_date?: string | null;
  contracts?: number | string | null;
  entry_price?: number | string | null;
  exit_price?: number | string | null;
};

type ImportedJournalTradeRow = {
  id: string;
  user_id: string;
  symbol: string | null;
  instrument_type: string | null;
  side: string | null;
  open_action: string | null;
  strategy_type: string | null;
  trade_style: string | null;
  option_type: string | null;
  strike_price: number | string | null;
  expiration_date: string | null;
  entry_date: string | null;
  exit_date: string | null;
  entry_price: number | string | null;
  exit_price: number | string | null;
  quantity: number | string | null;
  profit_loss: number | string | null;
  profit_loss_pct: number | string | null;
  strategy_entry_type: string | null;
  signed_strategy_entry: number | string | null;
  strategy_entry_price: number | string | null;
  total_debit: number | string | null;
  total_credit: number | string | null;
  signed_strategy_exit: number | string | null;
  strategy_exit_price: number | string | null;
  total_exit_debit: number | string | null;
  total_exit_credit: number | string | null;
  strategy_contracts: number | string | null;
  total_contracts: number | string | null;
  leg_count: number | string | null;
  option_legs: ImportedOptionLegRow[] | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type JournalExecutionNoteActivityRow = {
  id: string;
  execution_id: string;
  signal_id: string;
  notes: string | null;
  setup: string | null;
  mistakes: string | null;
  updated_at: string | null;
  created_at?: string | null;
};

type JournalTradeReviewActivityRow = {
  id: string;
  execution_id: string;
  signal_id: string;
  grade: string | null;
  execution_score: number | string | null;
  created_at: string | null;
  updated_at: string | null;
};

type JournalScreenshotActivityRow = {
  id: string;
  execution_id: string;
  signal_id: string;
  screenshot_type: string | null;
  caption: string | null;
  created_at: string | null;
};

type JournalTradingGoal = {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: "currency" | "percent" | "number";
  status: "ON_TRACK" | "NEEDS_ATTENTION" | "OFF_TRACK";
  description: string;
};

type JournalTradingGoalSummary = {
  goals: JournalTradingGoal[];
  completedGoals: number;
  onTrackGoals: number;
  needsAttentionGoals: number;
  offTrackGoals: number;
  overallProgress: number;
  nextMilestone: string;
};

type JournalRiskExposureItem = {
  label: string;
  positions: number;
  estimatedCapital: number;
  percentage: number;
};

type JournalRiskDashboard = {
  totalEstimatedCapital: number;
  largestPosition: JournalOpenPosition | null;
  averagePositionCapital: number | null;
  concentrationPct: number | null;
  openPositionCount: number;
  optionPositionCount: number;
  stockPositionCount: number;
  debitExposure: number;
  creditExposure: number;
  longExposure: number;
  shortExposure: number;
  bySymbol: JournalRiskExposureItem[];
  byStrategy: JournalRiskExposureItem[];
};

type JournalOpenPosition = {
  trade: JournalTrade;
  daysOpen: number | null;
  estimatedCapital: number;
  currentReturnPct: number | null;
};

type JournalOpenPositionSummary = {
  positions: JournalOpenPosition[];
  totalPositions: number;
  totalEstimatedCapital: number;
  openWinners: number;
  openLosers: number;
  averageDaysOpen: number | null;
  averageReturnPct: number | null;
};

type JournalRankedTrade = {
  trade: JournalTrade;
  rank: number;
};

type JournalHeatmapWeekSelection =
  | "all"
  | `week-${number}`;

type JournalPerformanceHeatmapDay = {
  dateKey: string;
  label: string;
  pnl: number;
  trades: number;
  winners: number;
  losers: number;
  breakevens: number;
  intensity: 0 | 1 | 2 | 3 | 4;
};

type JournalPerformancePeriod = {
  label: string;
  pnl: number;
  trades: number;
  winners: number;
  losers: number;
  breakevens: number;
  winRate: number | null;
};

type JournalMonthlyPerformance = {
  monthKey: string;
  label: string;
  pnl: number;
  trades: number;
  winners: number;
  losers: number;
  breakevens: number;
  winRate: number | null;
};

type JournalStrategyDistributionItem = {
  strategy: string;
  trades: number;
  percentage: number;
  netPnl: number;
  winners: number;
  losers: number;
  breakevens: number;
  winRate: number;
};

type JournalAiRecommendation = {
  id: string;
  category:
    | "STRENGTH"
    | "RISK"
    | "JOURNAL"
    | "REVIEW"
    | "PERFORMANCE";
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  tone: "positive" | "negative" | "info" | "neutral";
};

type JournalAiCoachInsight = {
  id: string;
  label: string;
  value: string;
  description: string;
  tone: "positive" | "negative" | "neutral" | "info";
  href?: string | null;
};

type JournalPortfolioSnapshot = {
  openTrades: number;
  closedTrades: number;
  longPositions: number;
  shortPositions: number;
  stockTrades: number;
  optionTrades: number;
  singleLegStrategies: number;
  multiLegStrategies: number;
  debitStrategies: number;
  creditStrategies: number;
  capitalDeployed: number;
  averagePositionSize: number | null;
  averageContracts: number | null;
  averageReturnPct: number | null;
};


type JournalTrade = {
  id: string;
  signal_id: string;
  symbol: string;
  instrument: string;
  contractLabel: string;
  side: string;
  strategy: string;
  executionStyle: string;
  entryType: string;
  netEntry: number | null;
  premiumPaid: number;
  premiumReceived: number;
  legCount: number;
  strategyContracts: number;
  totalContracts: number;
  quantity: number;
  entryPrice: number | null;
  exitPrice: number | null;
  entryDate: string | null;
  exitDate: string | null;
  duration: string;
  pnl: number | null;
  pnlPct: number | null;
  status: string;
  outcome: string;
  confidence: number | null;
  source: "CASE" | "IMPORT";
};

function isMasterAdmin(
  role: Awaited<ReturnType<typeof resolveCurrentUserRole>>,
) {
  return (
    role?.role_name === "master_admin" ||
    role?.role_rank === 4 ||
    String(role?.email ?? "").toLowerCase() ===
      "csthilaire@xilairetechnologies.com"
  );
}

function normalizeTradeLogLimit(value: string | null | undefined): TradeLogLimit {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "all") {
    return "all";
  }

  const parsed = Number(normalized);

  if (
    parsed === 10 ||
    parsed === 20 ||
    parsed === 50 ||
    parsed === 100 ||
    parsed === 250
  ) {
    return parsed;
  }

  return 10;
}

function normalizeTradeLogPage(value: string | null | undefined) {
  const parsed = Number(String(value ?? "").trim());

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function buildJournalUrl({
  limit,
  page,
}: {
  limit: TradeLogLimit;
  page?: number;
}) {
  const params = new URLSearchParams();

  params.set("limit", String(limit));

  if (page && page > 1) {
    params.set("page", String(page));
  }

  return `/dashboard/journal?${params.toString()}`;
}

function buildJournalLimitUrl(limit: TradeLogLimit) {
  return buildJournalUrl({
    limit,
    page: 1,
  });
}

function formatTier(tier: string) {
  if (tier === "master_admin") {
    return "MASTER ADMIN";
  }

  return tier.replace("journal_", "").replace("_", " ").toUpperCase();
}

function formatDisplayText(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return "—";
  }

  if (normalized.toLowerCase() === "leap") {
    return "LEAP";
  }

  return normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toFiniteNumber(
  value: number | string | null | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function formatEntryType(
  value: string | null | undefined,
) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  if (normalized === "DEBIT") {
    return "Net Debit";
  }

  if (normalized === "CREDIT") {
    return "Net Credit";
  }

  if (normalized === "EVEN") {
    return "Net Entry";
  }

  return "Entry";
}

function formatCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(2)}%`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(start: string | null, end: string | null) {
  if (!start) {
    return "—";
  }

  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return "—";
  }

  const totalMinutes = Math.max(Math.floor((endTime - startTime) / 60000), 0);

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours < 24) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function averageWeightedPrice(fills: SignalFillRow[]) {
  const totalQuantity = fills.reduce(
    (sum, fill) => sum + Number(fill.contracts ?? 0),
    0,
  );

  if (totalQuantity <= 0) {
    return null;
  }

  const totalValue = fills.reduce((sum, fill) => {
    return sum + Number(fill.contracts ?? 0) * Number(fill.price ?? 0);
  }, 0);

  return Number((totalValue / totalQuantity).toFixed(4));
}

function getSignalTradeSummary(signal: SignalRow) {
  return buildTradeSummary({
    symbol:
      signal.asset,

    underlying:
      signal.underlying,

    instrument_type:
      signal.instrument_type,

    /*
     * strategy_type is authoritative.
     * Legacy records fall back to leg detection or trade_style.
     */
    trade_style:
      signal.strategy_type ??
      signal.trade_style,

    /*
     * trade_style now represents execution style.
     */
    execution_style:
      signal.trade_style,

    action:
      signal.action,

    open_action:
      signal.open_action,

    entry_price:
      signal.entry_price ??
      signal.price,

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
      (signal.signal_option_legs ??
        []) as TradeSummaryOptionLegInput[],
  });
}

function getContractLabel(signal: SignalRow) {
  if (signal.instrument_type === "OPTION") {
    const tradeSummary =
      getSignalTradeSummary(signal);

    if (tradeSummary.legs.length > 1) {
      return tradeSummary.legs
        .map((leg) => {
          const strike =
            leg.strikePrice !== null
              ? String(leg.strikePrice)
              : "—";

          return `${leg.action} ${strike} ${leg.optionType}`;
        })
        .join(" | ");
    }

    const primaryLeg =
      tradeSummary.legs[0];

    if (primaryLeg) {
      const parts = [
        primaryLeg.strikePrice !== null
          ? String(primaryLeg.strikePrice)
          : null,
        primaryLeg.optionType,
        primaryLeg.expirationDate,
      ].filter(Boolean);

      return parts.length > 0
        ? parts.join(" ")
        : "OPTION";
    }

    const parts = [
      signal.strike_price
        ? String(signal.strike_price)
        : null,
      signal.option_type,
      signal.expiration_date,
    ].filter(Boolean);

    return parts.length > 0
      ? parts.join(" ")
      : "OPTION";
  }

  return "STOCK";
}

function getMultiplier(signal: SignalRow) {
  return signal.instrument_type === "OPTION" ? 100 : 1;
}

function isCreditOpeningAction(value: string | null | undefined) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  return (
    normalized === "SELL_TO_OPEN" ||
    normalized === "STO" ||
    normalized === "SELL" ||
    normalized === "SHORT"
  );
}

function calculateDirectionalPnl({
  signal,
  entryPrice,
  exitPrice,
  closedQuantity,
}: {
  signal: SignalRow;
  entryPrice: number | null;
  exitPrice: number | null;
  closedQuantity: number;
}) {
  if (
    entryPrice === null ||
    exitPrice === null ||
    closedQuantity <= 0
  ) {
    return null;
  }

  const directionMultiplier =
    isCreditOpeningAction(
      signal.open_action ??
      signal.action,
    )
      ? -1
      : 1;

  return Number(
    (
      (exitPrice - entryPrice) *
      directionMultiplier *
      closedQuantity *
      getMultiplier(signal)
    ).toFixed(2),
  );
}

function calculateDirectionalReturnPct({
  signal,
  entryPrice,
  exitPrice,
}: {
  signal: SignalRow;
  entryPrice: number | null;
  exitPrice: number | null;
}) {
  if (
    entryPrice === null ||
    exitPrice === null ||
    entryPrice === 0
  ) {
    return null;
  }

  const directionMultiplier =
    isCreditOpeningAction(
      signal.open_action ??
      signal.action,
    )
      ? -1
      : 1;

  return Number(
    (
      (
        (exitPrice - entryPrice) /
        Math.abs(entryPrice)
      ) *
      directionMultiplier *
      100
    ).toFixed(2),
  );
}

function normalizeOutcome(value: string | null) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  if (
    normalized === "WIN" ||
    normalized === "LOSS" ||
    normalized === "BREAKEVEN"
  ) {
    return normalized;
  }

  return "—";
}

function getImportedTradeSummary(
  trade: ImportedJournalTradeRow,
) {
  const optionLegs =
    Array.isArray(trade.option_legs)
      ? trade.option_legs
      : [];

  return buildTradeSummary({
    symbol:
      trade.symbol,

    instrument_type:
      trade.instrument_type,

    strategy_type:
      trade.strategy_type,

    trade_style:
      trade.trade_style,

    execution_style:
      trade.trade_style,

    action:
      trade.side,

    open_action:
      trade.open_action,

    entry_price:
      trade.strategy_entry_price ??
      trade.entry_price,

    exit_price:
      trade.strategy_exit_price ??
      trade.exit_price,

    quantity:
      trade.quantity,

    contracts:
      trade.strategy_contracts ??
      trade.quantity,

    option_type:
      trade.option_type,

    strike_price:
      trade.strike_price,

    expiration_date:
      trade.expiration_date,

    option_legs:
      optionLegs as TradeSummaryOptionLegInput[],
  });
}

function getImportedContractLabel(
  trade: ImportedJournalTradeRow,
) {
  const tradeSummary =
    getImportedTradeSummary(
      trade,
    );

  if (
    trade.instrument_type ===
      "OPTION"
  ) {
    if (
      tradeSummary.legs.length >
      1
    ) {
      return tradeSummary.legs
        .map((leg) => {
          const strike =
            leg.strikePrice !== null
              ? String(leg.strikePrice)
              : "—";

          return `${leg.action} ${strike} ${leg.optionType}`;
        })
        .join(" | ");
    }

    const primaryLeg =
      tradeSummary.legs[0];

    if (primaryLeg) {
      return primaryLeg.displayLine;
    }

    const parts = [
      trade.strike_price !==
        null
        ? String(
            trade.strike_price,
          )
        : null,
      trade.option_type,
      trade.expiration_date,
    ].filter(Boolean);

    return parts.length > 0
      ? parts.join(" ")
      : "Imported Option";
  }

  return "STOCK";
}

function inferImportedOutcome(pnl: number | null) {
  if (pnl === null) return "—";
  if (pnl > 0) return "WIN";
  if (pnl < 0) return "LOSS";
  return "BREAKEVEN";
}

function buildImportedJournalTrades(
  importedTrades: ImportedJournalTradeRow[],
) {
  return importedTrades.map(
    (
      trade,
    ): JournalTrade => {
      const tradeSummary =
        getImportedTradeSummary(
          trade,
        );

      const strategyLabel =
        tradeSummary.tradeStyleLabel !==
        "Unknown"
          ? tradeSummary.tradeStyleLabel
          : formatDisplayText(
              trade.strategy_type,
            );

      const executionStyle =
        tradeSummary.executionStyle ??
        formatDisplayText(
          trade.trade_style,
        );

      const entryPrice =
        toFiniteNumber(
          trade.strategy_entry_price,
        ) ??
        tradeSummary.netEntryAmount ??
        toFiniteNumber(
          trade.entry_price,
        );

      const exitPrice =
        toFiniteNumber(
          trade.strategy_exit_price,
        ) ??
        tradeSummary.netExitAmount ??
        toFiniteNumber(
          trade.exit_price,
        );

      const pnl =
        toFiniteNumber(
          trade.profit_loss,
        ) ??
        tradeSummary.netPnlDollars;

      const pnlPct =
        toFiniteNumber(
          trade.profit_loss_pct,
        ) ??
        tradeSummary.returnPct;

      const strategyContracts =
        toFiniteNumber(
          trade.strategy_contracts,
        ) ??
        tradeSummary.strategyContracts;

      const totalContracts =
        toFiniteNumber(
          trade.total_contracts,
        ) ??
        tradeSummary.totalContracts;

      const legCount =
        toFiniteNumber(
          trade.leg_count,
        ) ??
        tradeSummary.legCount;

      const isClosed =
        Boolean(
          trade.exit_date ||
          exitPrice !== null,
        );

      return {
        id:
          trade.id,

        signal_id:
          trade.id,

        symbol:
          trade.symbol ??
          "—",

        instrument:
          trade.instrument_type ??
          "—",

        contractLabel:
          getImportedContractLabel(
            trade,
          ),

        side:
          trade.open_action ??
          trade.side ??
          "—",

        strategy:
          strategyLabel,

        executionStyle:
          executionStyle === "—"
            ? "Imported"
            : executionStyle,

        entryType:
          formatEntryType(
            trade.strategy_entry_type ??
            tradeSummary.debitCredit,
          ),

        netEntry:
          entryPrice,

        premiumPaid:
          toFiniteNumber(
            trade.total_debit,
          ) ??
          tradeSummary.totalPaid,

        premiumReceived:
          toFiniteNumber(
            trade.total_credit,
          ) ??
          tradeSummary.totalReceived,

        legCount:
          Math.max(
            Number(
              legCount ??
              0,
            ),
            0,
          ),

        strategyContracts:
          Math.max(
            Number(
              strategyContracts ??
              trade.quantity ??
              0,
            ),
            0,
          ),

        totalContracts:
          Math.max(
            Number(
              totalContracts ??
              trade.quantity ??
              0,
            ),
            0,
          ),

        quantity:
          Number(
            trade.quantity ??
            strategyContracts ??
            0,
          ),

        entryPrice,

        exitPrice,

        entryDate:
          trade.entry_date,

        exitDate:
          trade.exit_date,

        duration:
          formatDuration(
            trade.entry_date,
            trade.exit_date,
          ),

        pnl,

        pnlPct,

        status:
          isClosed
            ? "Closed"
            : "Open",

        outcome:
          inferImportedOutcome(
            pnl,
          ),

        confidence:
          null,

        source:
          "IMPORT",
      };
    },
  );
}

function buildJournalTrades(signals: SignalRow[]) {
  return signals.flatMap((signal): JournalTrade[] => {
    const executions = signal.signal_executions ?? [];
    const tradeSummary =
      getSignalTradeSummary(signal);

    const strategyLabel =
      tradeSummary.tradeStyleLabel !==
      "Unknown"
        ? tradeSummary.tradeStyleLabel
        : formatDisplayText(
            signal.strategy_type,
          );

    const executionStyleLabel =
      formatDisplayText(
        signal.trade_style,
      );

    if (executions.length === 0) {
      const displayStatus = getSignalDisplayStatus({
        status: signal.status,
        watching: signal.watching,
        watched: signal.watched,
        closed_at: signal.closed_at,
        outcome:
          signal.outcome === "WIN" ||
          signal.outcome === "LOSS" ||
          signal.outcome === "BREAKEVEN"
            ? signal.outcome
            : null,
        return_pct: signal.return_pct,
      });

      return [
        {
          id: signal.id,
          signal_id: signal.id,
          symbol: signal.asset ?? signal.underlying ?? "—",
          instrument: signal.instrument_type ?? "—",
          contractLabel: getContractLabel(signal),
          side: signal.open_action ?? signal.action ?? "—",
          strategy: strategyLabel,
          executionStyle: executionStyleLabel,
          entryType: formatEntryType(tradeSummary.debitCredit),
          netEntry: tradeSummary.netEntryAmount,
          premiumPaid: tradeSummary.totalPaid,
          premiumReceived: tradeSummary.totalReceived,
          legCount: tradeSummary.legCount,
          strategyContracts: tradeSummary.strategyContracts,
          totalContracts: tradeSummary.totalContracts,
          quantity: Number(
            signal.quantity ?? signal.contracts ?? signal.shares ?? 0,
          ),
          entryPrice: signal.entry_price ?? signal.price ?? null,
          exitPrice: signal.exit_price ?? null,
          entryDate: signal.opened_at ?? signal.created_at,
          exitDate: signal.closed_at,
          duration: formatDuration(
            signal.opened_at ?? signal.created_at,
            signal.closed_at,
          ),
          pnl: null,
          pnlPct: signal.return_pct ?? null,
          status: displayStatus,
          outcome: normalizeOutcome(signal.outcome),
          confidence: signal.confidence,
          source: "CASE",
        },
      ];
    }

    return executions.map((execution) => {
      const fills = execution.execution_fills ?? [];
      const openFills = fills.filter(
        (fill) => String(fill.side ?? "").toUpperCase() === "OPEN",
      );
      const closeFills = fills.filter(
        (fill) => String(fill.side ?? "").toUpperCase() === "CLOSE",
      );

      const openedQuantity = openFills.reduce(
        (sum, fill) => sum + Number(fill.contracts ?? 0),
        0,
      );

      const closedQuantity = closeFills.reduce(
        (sum, fill) => sum + Number(fill.contracts ?? 0),
        0,
      );

      const quantity =
        openedQuantity ||
        Number(
          execution.contracts ??
            signal.quantity ??
            signal.contracts ??
            signal.shares ??
            0,
        );

      const averageEntry =
        averageWeightedPrice(openFills) ??
        execution.entry_price ??
        signal.entry_price ??
        signal.price ??
        null;

      const averageExit =
        averageWeightedPrice(closeFills) ??
        execution.exit_price ??
        signal.exit_price ??
        null;

      const calculatedPnl =
        calculateDirectionalPnl({
          signal,
          entryPrice:
            averageEntry,
          exitPrice:
            averageExit,
          closedQuantity,
        });

      const calculatedPnlPct =
        calculateDirectionalReturnPct({
          signal,
          entryPrice:
            averageEntry,
          exitPrice:
            averageExit,
        });

      const displayStatus = getSignalDisplayStatus({
        status: signal.status,
        watching: signal.watching,
        watched: signal.watched,
        closed_at: signal.closed_at ?? execution.closed_at,
        outcome:
          signal.outcome === "WIN" ||
          signal.outcome === "LOSS" ||
          signal.outcome === "BREAKEVEN"
            ? signal.outcome
            : null,
        return_pct: signal.return_pct ?? calculatedPnlPct,
      });

      return {
        id: execution.id,
        signal_id: signal.id,
        symbol: signal.asset ?? signal.underlying ?? "—",
        instrument: signal.instrument_type ?? "—",
        contractLabel: getContractLabel(signal),
        side: signal.open_action ?? signal.action ?? "—",
        strategy: strategyLabel,
        executionStyle: executionStyleLabel,
        entryType: formatEntryType(tradeSummary.debitCredit),
        netEntry: tradeSummary.netEntryAmount,
        premiumPaid: tradeSummary.totalPaid,
        premiumReceived: tradeSummary.totalReceived,
        legCount: tradeSummary.legCount,
        strategyContracts: tradeSummary.strategyContracts,
        totalContracts: tradeSummary.totalContracts,
        quantity,
        entryPrice: averageEntry,
        exitPrice: averageExit,
        entryDate: execution.opened_at ?? signal.opened_at ?? signal.created_at,
        exitDate: execution.closed_at ?? signal.closed_at,
        duration: formatDuration(
          execution.opened_at ?? signal.opened_at ?? signal.created_at,
          execution.closed_at ?? signal.closed_at,
        ),
        pnl: execution.pnl ?? calculatedPnl,
        pnlPct: execution.pnl_pct ?? signal.return_pct ?? calculatedPnlPct,
        status:
          execution.status === "CLOSED" || displayStatus === "Closed"
            ? "Closed"
            : execution.status === "OPEN"
              ? "Open"
              : displayStatus,
        outcome: normalizeOutcome(signal.outcome),
        confidence: signal.confidence,
        source: "CASE",
      };
    });
  });
}

function getPnlClass(value: number | null) {
  if (value === null) {
    return "text-slate-300";
  }

  if (value > 0) {
    return "text-emerald-400";
  }

  if (value < 0) {
    return "text-red-400";
  }

  return "text-slate-300";
}

function escapeCsvValue(value: string | number | null | undefined) {
  const normalized = String(value ?? "");
  const escaped = normalized.replace(/"/g, '""');

  return `"${escaped}"`;
}

function escapeHtmlValue(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildTradeExportRows(trades: JournalTrade[]) {
  return trades.map((trade) => ({
    symbol: trade.symbol,
    source: trade.source,
    instrument: trade.instrument,
    contract: trade.contractLabel,
    side: trade.side,
    strategy: trade.strategy,
    execution_style:
      trade.executionStyle,
    entry_type:
      trade.entryType,
    net_entry:
      trade.netEntry,
    premium_paid:
      trade.premiumPaid,
    premium_received:
      trade.premiumReceived,
    leg_count:
      trade.legCount,
    strategy_contracts:
      trade.strategyContracts,
    total_contracts:
      trade.totalContracts,
    quantity: trade.quantity,
    entry_price: trade.entryPrice,
    exit_price: trade.exitPrice,
    entry_date: trade.entryDate,
    exit_date: trade.exitDate,
    duration: trade.duration,
    pnl: trade.pnl,
    pnl_pct: trade.pnlPct,
    status: trade.status,
    outcome: trade.outcome,
    confidence: trade.confidence,
  }));
}

function buildTradesCsv(trades: JournalTrade[]) {
  const headers = [
    "Symbol",
    "Source",
    "Instrument",
    "Contract",
    "Side",
    "Strategy",
    "Execution Style",
    "Entry Type",
    "Net Entry",
    "Premium Paid",
    "Premium Received",
    "Leg Count",
    "Strategy Contracts",
    "Total Contracts",
    "Quantity",
    "Entry Price",
    "Exit Price",
    "Entry Date",
    "Exit Date",
    "Duration",
    "P/L",
    "P/L %",
    "Status",
    "Outcome",
    "Confidence",
  ];

  const rows = buildTradeExportRows(trades).map((trade) => [
    trade.symbol,
    trade.source,
    trade.instrument,
    trade.contract,
    trade.side,
    trade.strategy,
    trade.execution_style,
    trade.entry_type,
    trade.net_entry,
    trade.premium_paid,
    trade.premium_received,
    trade.leg_count,
    trade.strategy_contracts,
    trade.total_contracts,
    trade.quantity,
    trade.entry_price,
    trade.exit_price,
    trade.entry_date,
    trade.exit_date,
    trade.duration,
    trade.pnl,
    trade.pnl_pct,
    trade.status,
    trade.outcome,
    trade.confidence,
  ]);

  return [headers, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n");
}

function buildTradesJson(trades: JournalTrade[]) {
  return JSON.stringify(buildTradeExportRows(trades), null, 2);
}

function buildTradesExcelHtml(trades: JournalTrade[]) {
  const headers = [
    "Symbol",
    "Source",
    "Instrument",
    "Contract",
    "Side",
    "Strategy",
    "Execution Style",
    "Entry Type",
    "Net Entry",
    "Premium Paid",
    "Premium Received",
    "Leg Count",
    "Strategy Contracts",
    "Total Contracts",
    "Quantity",
    "Entry Price",
    "Exit Price",
    "Entry Date",
    "Exit Date",
    "Duration",
    "P/L",
    "P/L %",
    "Status",
    "Outcome",
    "Confidence",
  ];

  const rows = buildTradeExportRows(trades).map((trade) => [
    trade.symbol,
    trade.source,
    trade.instrument,
    trade.contract,
    trade.side,
    trade.strategy,
    trade.execution_style,
    trade.entry_type,
    trade.net_entry,
    trade.premium_paid,
    trade.premium_received,
    trade.leg_count,
    trade.strategy_contracts,
    trade.total_contracts,
    trade.quantity,
    trade.entry_price,
    trade.exit_price,
    trade.entry_date,
    trade.exit_date,
    trade.duration,
    trade.pnl,
    trade.pnl_pct,
    trade.status,
    trade.outcome,
    trade.confidence,
  ]);

  const headerHtml = headers
    .map((header) => `<th>${escapeHtmlValue(header)}</th>`)
    .join("");

  const rowHtml = rows
    .map((row) => {
      const cells = row
        .map((value) => `<td>${escapeHtmlValue(value)}</td>`)
        .join("");

      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `
<html>
  <head>
    <meta charset="utf-8" />
    <title>CASE Trades Journal Export</title>
  </head>
  <body>
    <table>
      <thead>
        <tr>${headerHtml}</tr>
      </thead>
      <tbody>
        ${rowHtml}
      </tbody>
    </table>
  </body>
</html>
`.trim();
}

function buildDownloadHref(content: string, mimeType: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
}

function isMissingColumnError(
  message: string | null | undefined,
) {
  const normalized =
    String(message ?? "")
      .trim()
      .toLowerCase();

  return (
    normalized.includes("column") &&
    (
      normalized.includes("does not exist") ||
      normalized.includes("schema cache") ||
      normalized.includes("could not find")
    )
  );
}

function getPaginationPages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>();

  pages.add(1);
  pages.add(totalPages);
  pages.add(currentPage);

  if (currentPage - 1 > 1) {
    pages.add(currentPage - 1);
  }

  if (currentPage + 1 < totalPages) {
    pages.add(currentPage + 1);
  }

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

function isDateWithinDays(
  value: string | null,
  days: number,
) {
  if (!value) {
    return false;
  }

  const timestamp =
    new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const cutoff =
    Date.now() -
    days *
      24 *
      60 *
      60 *
      1000;

  return timestamp >= cutoff;
}

function isSameLocalDay(
  value: string | null,
  target: Date,
) {
  if (!value) {
    return false;
  }

  const date =
    new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return false;
  }

  return (
    date.getFullYear() ===
      target.getFullYear() &&
    date.getMonth() ===
      target.getMonth() &&
    date.getDate() ===
      target.getDate()
  );
}

function getTradePerformanceStats(
  trades: JournalTrade[],
) {
  const closedTrades =
    trades.filter(
      (trade) =>
        trade.status ===
        "Closed",
    );

  const winningTrades =
    closedTrades.filter(
      (trade) =>
        trade.outcome ===
          "WIN" ||
        (
          trade.pnl !==
            null &&
          trade.pnl >
            0
        ),
    );

  const losingTrades =
    closedTrades.filter(
      (trade) =>
        trade.outcome ===
          "LOSS" ||
        (
          trade.pnl !==
            null &&
          trade.pnl <
            0
        ),
    );

  const totalProfit =
    winningTrades.reduce(
      (
        sum,
        trade,
      ) =>
        sum +
        Number(
          trade.pnl ??
          0,
        ),
      0,
    );

  const totalLoss =
    losingTrades.reduce(
      (
        sum,
        trade,
      ) =>
        sum +
        Math.abs(
          Number(
            trade.pnl ??
            0,
          ),
        ),
      0,
    );

  const winRate =
    winningTrades.length +
      losingTrades.length >
    0
      ? (
          winningTrades.length /
          (
            winningTrades.length +
            losingTrades.length
          )
        ) *
        100
      : null;

  const averageWinner =
    winningTrades.length >
    0
      ? totalProfit /
        winningTrades.length
      : null;

  const averageLoser =
    losingTrades.length >
    0
      ? totalLoss /
        losingTrades.length
      : null;

  const profitFactor =
    totalLoss >
    0
      ? totalProfit /
        totalLoss
      : totalProfit >
          0
        ? totalProfit
        : null;

  return {
    closedTrades,
    winningTrades,
    losingTrades,
    totalProfit,
    totalLoss,
    winRate,
    averageWinner,
    averageLoser,
    profitFactor,
  };
}

function getActivityTimestamp(
  activity: JournalRecentActivity,
) {
  if (!activity.occurredAt) {
    return 0;
  }

  const timestamp =
    new Date(
      activity.occurredAt,
    ).getTime();

  return Number.isFinite(
    timestamp,
  )
    ? timestamp
    : 0;
}

function buildTradeActivity(
  trades: JournalTrade[],
) {
  return trades.flatMap(
    (
      trade,
    ): JournalRecentActivity[] => {
      const activities: JournalRecentActivity[] =
        [];

      if (
        trade.source ===
        "IMPORT"
      ) {
        activities.push({
          id:
            `import-${trade.id}`,

          type:
            "BROKER_IMPORT",

          title:
            "Broker trade imported",

          description:
            `${trade.strategy} added to the journal from a broker CSV.`,

          symbol:
            trade.symbol,

          occurredAt:
            trade.entryDate,

          href:
            `/dashboard/journal/${trade.id}`,
        });

        return activities;
      }

      if (trade.entryDate) {
        activities.push({
          id:
            `opened-${trade.id}`,

          type:
            "TRADE_OPENED",

          title:
            "Trade opened",

          description:
            `${trade.strategy} execution opened with ${trade.quantity} ${
              trade.instrument ===
              "OPTION"
                ? "contract"
                : "share"
            }${
              trade.quantity ===
              1
                ? ""
                : "s"
            }.`,

          symbol:
            trade.symbol,

          occurredAt:
            trade.entryDate,

          href:
            `/dashboard/journal/${trade.id}`,
        });
      }

      if (
        trade.status ===
          "Closed" &&
        trade.exitDate
      ) {
        activities.push({
          id:
            `closed-${trade.id}`,

          type:
            "TRADE_CLOSED",

          title:
            "Trade closed",

          description:
            `${trade.strategy} closed ${
              trade.pnl !==
              null
                ? `for ${formatCurrency(
                    trade.pnl,
                  )}`
                : "without a recorded P/L"
            }.`,

          symbol:
            trade.symbol,

          occurredAt:
            trade.exitDate,

          href:
            `/dashboard/journal/${trade.id}`,
        });
      }

      return activities;
    },
  );
}

function buildSupplementalActivity({
  notes,
  reviews,
  screenshots,
  tradeByExecutionId,
}: {
  notes: JournalExecutionNoteActivityRow[];
  reviews: JournalTradeReviewActivityRow[];
  screenshots: JournalScreenshotActivityRow[];
  tradeByExecutionId: Map<string, JournalTrade>;
}) {
  const noteActivity =
    notes.map(
      (
        note,
      ): JournalRecentActivity => {
        const trade =
          tradeByExecutionId.get(
            note.execution_id,
          );

        return {
          id:
            `note-${note.id}`,

          type:
            "JOURNAL_NOTE",

          title:
            "Journal note updated",

          description:
            note.setup
              ? `Setup documented: ${note.setup}`
              : note.notes
                ? "Trade notes were added or updated."
                : note.mistakes
                  ? "Trade mistakes were documented."
                  : "Journal details were updated.",

          symbol:
            trade?.symbol ??
            null,

          occurredAt:
            note.updated_at ??
            note.created_at ??
            null,

          href:
            trade
              ? `/dashboard/journal/${trade.id}`
              : null,
        };
      },
    );

  const reviewActivity =
    reviews.map(
      (
        review,
      ): JournalRecentActivity => {
        const trade =
          tradeByExecutionId.get(
            review.execution_id,
          );

        const score =
          toFiniteNumber(
            review.execution_score,
          );

        return {
          id:
            `review-${review.id}`,

          type:
            "AI_REVIEW",

          title:
            "AI trade review generated",

          description:
            review.grade
              ? `CASE AI assigned grade ${review.grade}${
                  score !==
                  null
                    ? ` with a ${score.toFixed(
                        0,
                      )}/100 execution score`
                    : ""
                }.`
              : "CASE AI generated a new coaching review.",

          symbol:
            trade?.symbol ??
            null,

          occurredAt:
            review.updated_at ??
            review.created_at,

          href:
            trade
              ? `/dashboard/journal/${trade.id}`
              : null,
        };
      },
    );

  const screenshotActivity =
    screenshots.map(
      (
        screenshot,
      ): JournalRecentActivity => {
        const trade =
          tradeByExecutionId.get(
            screenshot.execution_id,
          );

        return {
          id:
            `screenshot-${screenshot.id}`,

          type:
            "SCREENSHOT",

          title:
            "Trade screenshot uploaded",

          description:
            screenshot.caption ??
            (
              screenshot.screenshot_type
                ? `${formatDisplayText(
                    screenshot.screenshot_type,
                  )} screenshot added.`
                : "A new trade screenshot was added."
            ),

          symbol:
            trade?.symbol ??
            null,

          occurredAt:
            screenshot.created_at,

          href:
            trade
              ? `/dashboard/journal/${trade.id}`
              : null,
        };
      },
    );

  return [
    ...noteActivity,
    ...reviewActivity,
    ...screenshotActivity,
  ];
}

function isShortTrade(
  trade: JournalTrade,
) {
  const normalized = String(
    trade.side ??
    "",
  )
    .trim()
    .toUpperCase();

  return (
    normalized.includes(
      "SELL_TO_OPEN",
    ) ||
    normalized.includes(
      "SELL TO OPEN",
    ) ||
    normalized ===
      "SELL" ||
    normalized ===
      "SHORT"
  );
}

function getEstimatedPositionCapital(
  trade: JournalTrade,
) {
  const entry =
    trade.netEntry ??
    trade.entryPrice;

  if (
    entry ===
      null ||
    !Number.isFinite(
      entry,
    )
  ) {
    return 0;
  }

  const quantity =
    trade.strategyContracts >
    0
      ? trade.strategyContracts
      : trade.quantity;

  const multiplier =
    trade.instrument ===
    "OPTION"
      ? 100
      : 1;

  return Math.abs(
    entry *
    quantity *
    multiplier,
  );
}

function getPortfolioSnapshot(
  trades: JournalTrade[],
): JournalPortfolioSnapshot {
  const openTrades =
    trades.filter(
      (trade) =>
        trade.status !==
        "Closed",
    );

  const closedTrades =
    trades.filter(
      (trade) =>
        trade.status ===
        "Closed",
    );

  const longPositions =
    openTrades.filter(
      (trade) =>
        !isShortTrade(
          trade,
        ),
    ).length;

  const shortPositions =
    openTrades.filter(
      (
        trade,
      ) =>
        isShortTrade(
          trade,
        ),
    ).length;

  const stockTrades =
    openTrades.filter(
      (trade) =>
        trade.instrument ===
        "STOCK",
    ).length;

  const optionTrades =
    openTrades.filter(
      (trade) =>
        trade.instrument ===
        "OPTION",
    ).length;

  const singleLegStrategies =
    trades.filter(
      (trade) =>
        trade.legCount ===
        1,
    ).length;

  const multiLegStrategies =
    trades.filter(
      (trade) =>
        trade.legCount >
        1,
    ).length;

  const debitStrategies =
    trades.filter(
      (trade) =>
        trade.entryType ===
        "Net Debit",
    ).length;

  const creditStrategies =
    trades.filter(
      (trade) =>
        trade.entryType ===
        "Net Credit",
    ).length;

  const capitalDeployed =
    openTrades.reduce(
      (
        sum,
        trade,
      ) =>
        sum +
        getEstimatedPositionCapital(
          trade,
        ),
      0,
    );

  const sizedTrades =
    openTrades.filter(
      (trade) =>
        getEstimatedPositionCapital(
          trade,
        ) >
        0,
    );

  const averagePositionSize =
    sizedTrades.length >
    0
      ? capitalDeployed /
        sizedTrades.length
      : null;

  const contractTrades =
    trades.filter(
      (trade) =>
        trade.strategyContracts >
        0,
    );

  const averageContracts =
    contractTrades.length >
    0
      ? contractTrades.reduce(
          (
            sum,
            trade,
          ) =>
            sum +
            trade.strategyContracts,
          0,
        ) /
        contractTrades.length
      : null;

  const returnTrades =
    closedTrades.filter(
      (trade) =>
        trade.pnlPct !==
        null,
    );

  const averageReturnPct =
    returnTrades.length >
    0
      ? returnTrades.reduce(
          (
            sum,
            trade,
          ) =>
            sum +
            Number(
              trade.pnlPct ??
              0,
            ),
          0,
        ) /
        returnTrades.length
      : null;

  return {
    openTrades:
      openTrades.length,
    closedTrades:
      closedTrades.length,
    longPositions,
    shortPositions,
    stockTrades,
    optionTrades,
    singleLegStrategies,
    multiLegStrategies,
    debitStrategies,
    creditStrategies,
    capitalDeployed,
    averagePositionSize,
    averageContracts,
    averageReturnPct,
  };
}

function getStrategyPerformance(
  trades: JournalTrade[],
) {
  const groups =
    new Map<
      string,
      {
        trades: number;
        pnl: number;
      }
    >();

  trades
    .filter(
      (trade) =>
        trade.status ===
          "Closed" &&
        trade.pnl !==
          null,
    )
    .forEach(
      (trade) => {
        const strategy =
          trade.strategy ||
          "Unknown";

        const current =
          groups.get(
            strategy,
          ) ?? {
            trades:
              0,
            pnl:
              0,
          };

        current.trades +=
          1;

        current.pnl +=
          Number(
            trade.pnl ??
            0,
          );

        groups.set(
          strategy,
          current,
        );
      },
    );

  return Array.from(
    groups.entries(),
  )
    .map(
      ([
        strategy,
        value,
      ]) => ({
        strategy,
        trades:
          value.trades,
        pnl:
          value.pnl,
      }),
    )
    .sort(
      (
        left,
        right,
      ) =>
        right.pnl -
        left.pnl,
    );
}

function getExecutionStylePerformance(
  trades: JournalTrade[],
) {
  const groups =
    new Map<
      string,
      {
        trades: number;
        pnl: number;
      }
    >();

  trades
    .filter(
      (trade) =>
        trade.status ===
          "Closed" &&
        trade.pnl !==
          null,
    )
    .forEach(
      (trade) => {
        const style =
          trade.executionStyle ||
          "Unknown";

        const current =
          groups.get(
            style,
          ) ?? {
            trades:
              0,
            pnl:
              0,
          };

        current.trades +=
          1;

        current.pnl +=
          Number(
            trade.pnl ??
            0,
          );

        groups.set(
          style,
          current,
        );
      },
    );

  return Array.from(
    groups.entries(),
  )
    .map(
      ([
        style,
        value,
      ]) => ({
        style,
        trades:
          value.trades,
        pnl:
          value.pnl,
      }),
    )
    .sort(
      (
        left,
        right,
      ) =>
        right.pnl -
        left.pnl,
    );
}

function buildJournalAiCoachInsights({
  trades,
  notes,
  reviews,
  screenshots,
}: {
  trades: JournalTrade[];
  notes: JournalExecutionNoteActivityRow[];
  reviews: JournalTradeReviewActivityRow[];
  screenshots: JournalScreenshotActivityRow[];
}) {
  const insights: JournalAiCoachInsight[] =
    [];

  const strategyPerformance =
    getStrategyPerformance(
      trades,
    );

  const executionStylePerformance =
    getExecutionStylePerformance(
      trades,
    );

  const bestStrategy =
    strategyPerformance[0] ??
    null;

  const worstStrategy =
    strategyPerformance.length >
    1
      ? strategyPerformance[
          strategyPerformance.length -
            1
        ]
      : null;

  const bestExecutionStyle =
    executionStylePerformance[0] ??
    null;

  const nativeExecutions =
    trades.filter(
      (trade) =>
        trade.source ===
        "CASE",
    );

  const notedExecutionIds =
    new Set(
      notes.map(
        (note) =>
          note.execution_id,
      ),
    );

  const reviewedExecutionIds =
    new Set(
      reviews.map(
        (review) =>
          review.execution_id,
      ),
    );

  const screenshotExecutionIds =
    new Set(
      screenshots.map(
        (screenshot) =>
          screenshot.execution_id,
      ),
    );

  const missingNotes =
    nativeExecutions.filter(
      (trade) =>
        !notedExecutionIds.has(
          trade.id,
        ),
    );

  const missingReviews =
    nativeExecutions.filter(
      (trade) =>
        trade.status ===
          "Closed" &&
        !reviewedExecutionIds.has(
          trade.id,
        ),
    );

  const missingScreenshots =
    nativeExecutions.filter(
      (trade) =>
        !screenshotExecutionIds.has(
          trade.id,
        ),
    );

  if (bestStrategy) {
    insights.push({
      id:
        "best-strategy",

      label:
        "Best Strategy",

      value:
        bestStrategy.strategy,

      description:
        `${bestStrategy.trades} closed trade${
          bestStrategy.trades ===
          1
            ? ""
            : "s"
        } produced ${formatCurrency(
          bestStrategy.pnl,
        )}.`,

      tone:
        bestStrategy.pnl >
        0
          ? "positive"
          : "neutral",

      href:
        "/dashboard/journal/reports",
    });
  }

  if (
    worstStrategy &&
    worstStrategy.pnl <
      0
  ) {
    insights.push({
      id:
        "weakest-strategy",

      label:
        "Needs Attention",

      value:
        worstStrategy.strategy,

      description:
        `${worstStrategy.trades} closed trade${
          worstStrategy.trades ===
          1
            ? ""
            : "s"
        } produced ${formatCurrency(
          worstStrategy.pnl,
        )}. Review entries, exits, and sizing.`,

      tone:
        "negative",

      href:
        "/dashboard/journal/reports",
    });
  }

  if (bestExecutionStyle) {
    insights.push({
      id:
        "best-execution-style",

      label:
        "Best Execution Style",

      value:
        bestExecutionStyle.style,

      description:
        `${bestExecutionStyle.trades} closed trade${
          bestExecutionStyle.trades ===
          1
            ? ""
            : "s"
        } generated ${formatCurrency(
          bestExecutionStyle.pnl,
        )}.`,

      tone:
        bestExecutionStyle.pnl >
        0
          ? "positive"
          : "neutral",

      href:
        "/dashboard/journal/reports",
    });
  }

  insights.push({
    id:
      "missing-notes",

    label:
      "Notes Coverage",

    value:
      `${Math.max(
        nativeExecutions.length -
          missingNotes.length,
        0,
      )}/${nativeExecutions.length}`,

    description:
      missingNotes.length >
      0
        ? `${missingNotes.length} CASE execution${
            missingNotes.length ===
            1
              ? ""
              : "s"
          } still need journal notes.`
        : "Every CASE execution currently has journal notes.",

    tone:
      missingNotes.length >
      0
        ? "info"
        : "positive",

    href:
      missingNotes[0]
        ? `/dashboard/journal/${missingNotes[0].id}`
        : "/dashboard/journal",
  });

  insights.push({
    id:
      "missing-screenshots",

    label:
      "Screenshot Coverage",

    value:
      `${Math.max(
        nativeExecutions.length -
          missingScreenshots.length,
        0,
      )}/${nativeExecutions.length}`,

    description:
      missingScreenshots.length >
      0
        ? `${missingScreenshots.length} CASE execution${
            missingScreenshots.length ===
            1
              ? ""
              : "s"
          } still need a chart or execution screenshot.`
        : "Every CASE execution currently has a screenshot.",

    tone:
      missingScreenshots.length >
      0
        ? "info"
        : "positive",

    href:
      missingScreenshots[0]
        ? `/dashboard/journal/${missingScreenshots[0].id}`
        : "/dashboard/journal",
  });

  insights.push({
    id:
      "missing-reviews",

    label:
      "AI Review Queue",

    value:
      String(
        missingReviews.length,
      ),

    description:
      missingReviews.length >
      0
        ? `${missingReviews.length} closed CASE trade${
            missingReviews.length ===
            1
              ? ""
              : "s"
          } are ready for CASE AI review.`
        : "All closed CASE executions have an AI trade review.",

    tone:
      missingReviews.length >
      0
        ? "info"
        : "positive",

    href:
      missingReviews[0]
        ? `/dashboard/journal/${missingReviews[0].id}`
        : "/dashboard/journal",
  });

  return insights.slice(
    0,
    6,
  );
}

function buildStrategyDistribution(
  trades: JournalTrade[],
): JournalStrategyDistributionItem[] {
  const groups =
    new Map<
      string,
      {
        trades: number;
        netPnl: number;
        winners: number;
        losers: number;
        breakevens: number;
      }
    >();

  trades.forEach(
    (
      trade,
    ) => {
      const strategy =
        trade.strategy &&
        trade.strategy !==
          "—"
          ? trade.strategy
          : "Unknown";

      const current =
        groups.get(
          strategy,
        ) ?? {
          trades:
            0,
          netPnl:
            0,
          winners:
            0,
          losers:
            0,
          breakevens:
            0,
        };

      const pnl =
        Number(
          trade.pnl ??
          0,
        );

      current.trades +=
        1;

      current.netPnl +=
        pnl;

      if (
        trade.outcome ===
          "WIN" ||
        pnl >
          0
      ) {
        current.winners +=
          1;
      } else if (
        trade.outcome ===
          "LOSS" ||
        pnl <
          0
      ) {
        current.losers +=
          1;
      } else {
        current.breakevens +=
          1;
      }

      groups.set(
        strategy,
        current,
      );
    },
  );

  const totalTrades =
    trades.length;

  return Array.from(
    groups.entries(),
  )
    .map(
      ([
        strategy,
        value,
      ]) => {
        const graded =
          value.winners +
          value.losers;

        return {
          strategy,
          trades:
            value.trades,
          percentage:
            totalTrades >
            0
              ? (
                  value.trades /
                  totalTrades
                ) *
                100
              : 0,
          netPnl:
            Number(
              value.netPnl.toFixed(
                2,
              ),
            ),
          winners:
            value.winners,
          losers:
            value.losers,
          breakevens:
            value.breakevens,
          winRate:
            graded >
            0
              ? (
                  value.winners /
                  graded
                ) *
                100
              : 0,
        };
      },
    )
    .sort(
      (
        left,
        right,
      ) =>
        right.trades -
        left.trades,
    );
}

function getStrategyDistributionMaxTrades(
  items: JournalStrategyDistributionItem[],
) {
  return items.reduce(
    (
      maximum,
      item,
    ) =>
      Math.max(
        maximum,
        item.trades,
      ),
    0,
  );
}

function getTradeCloseTimestamp(
  trade: JournalTrade,
) {
  return (
    trade.exitDate ??
    trade.entryDate
  );
}

function isTradeInPeriod(
  trade: JournalTrade,
  start: Date,
  end: Date,
) {
  const timestamp =
    getTradeCloseTimestamp(
      trade,
    );

  if (!timestamp) {
    return false;
  }

  const value =
    new Date(
      timestamp,
    ).getTime();

  if (!Number.isFinite(value)) {
    return false;
  }

  return (
    value >=
      start.getTime() &&
    value <=
      end.getTime()
  );
}

function buildPerformancePeriod(
  label: string,
  trades: JournalTrade[],
): JournalPerformancePeriod {
  const closedTrades =
    trades.filter(
      (trade) =>
        trade.status ===
        "Closed",
    );

  const winners =
    closedTrades.filter(
      (trade) =>
        trade.outcome ===
          "WIN" ||
        Number(
          trade.pnl ??
          0,
        ) >
          0,
    );

  const losers =
    closedTrades.filter(
      (trade) =>
        trade.outcome ===
          "LOSS" ||
        Number(
          trade.pnl ??
          0,
        ) <
          0,
    );

  const breakevens =
    closedTrades.filter(
      (trade) =>
        trade.outcome ===
          "BREAKEVEN" ||
        (
          trade.pnl !==
            null &&
          Number(
            trade.pnl,
          ) ===
            0
        ),
    );

  const pnl =
    closedTrades.reduce(
      (
        sum,
        trade,
      ) =>
        sum +
        Number(
          trade.pnl ??
          0,
        ),
      0,
    );

  const gradedTrades =
    winners.length +
    losers.length;

  return {
    label,
    pnl:
      Number(
        pnl.toFixed(
          2,
        ),
      ),
    trades:
      closedTrades.length,
    winners:
      winners.length,
    losers:
      losers.length,
    breakevens:
      breakevens.length,
    winRate:
      gradedTrades >
      0
        ? (
            winners.length /
            gradedTrades
          ) *
          100
        : null,
  };
}

function buildDashboardPerformancePeriods(
  trades: JournalTrade[],
) {
  const now =
    new Date();

  const startOfToday =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

  const endOfToday =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

  const startOfWeek =
    new Date(
      startOfToday,
    );

  startOfWeek.setDate(
    startOfWeek.getDate() -
      startOfWeek.getDay(),
  );

  const startOfMonth =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );

  const startOfYear =
    new Date(
      now.getFullYear(),
      0,
      1,
    );

  const todayTrades =
    trades.filter(
      (trade) =>
        isTradeInPeriod(
          trade,
          startOfToday,
          endOfToday,
        ),
    );

  const weekTrades =
    trades.filter(
      (trade) =>
        isTradeInPeriod(
          trade,
          startOfWeek,
          endOfToday,
        ),
    );

  const monthTrades =
    trades.filter(
      (trade) =>
        isTradeInPeriod(
          trade,
          startOfMonth,
          endOfToday,
        ),
    );

  const yearTrades =
    trades.filter(
      (trade) =>
        isTradeInPeriod(
          trade,
          startOfYear,
          endOfToday,
        ),
    );

  return [
    buildPerformancePeriod(
      "Today",
      todayTrades,
    ),
    buildPerformancePeriod(
      "This Week",
      weekTrades,
    ),
    buildPerformancePeriod(
      "This Month",
      monthTrades,
    ),
    buildPerformancePeriod(
      "Year to Date",
      yearTrades,
    ),
  ];
}

function buildMonthlyPerformanceTimeline(
  trades: JournalTrade[],
) {
  const groups =
    new Map<
      string,
      JournalTrade[]
    >();

  trades
    .filter(
      (trade) =>
        trade.status ===
        "Closed",
    )
    .forEach(
      (trade) => {
        const timestamp =
          getTradeCloseTimestamp(
            trade,
          );

        if (!timestamp) {
          return;
        }

        const date =
          new Date(
            timestamp,
          );

        if (
          !Number.isFinite(
            date.getTime(),
          )
        ) {
          return;
        }

        const monthKey =
          `${date.getFullYear()}-${String(
            date.getMonth() +
              1,
          ).padStart(
            2,
            "0",
          )}`;

        const existing =
          groups.get(
            monthKey,
          ) ?? [];

        existing.push(
          trade,
        );

        groups.set(
          monthKey,
          existing,
        );
      },
    );

  return Array.from(
    groups.entries(),
  )
    .map(
      ([
        monthKey,
        monthTrades,
      ]): JournalMonthlyPerformance => {
        const date =
          new Date(
            `${monthKey}-01T00:00:00`,
          );

        const period =
          buildPerformancePeriod(
            date.toLocaleDateString(
              "en-US",
              {
                month:
                  "long",
                year:
                  "numeric",
              },
            ),
            monthTrades,
          );

        return {
          monthKey,
          label:
            period.label,
          pnl:
            period.pnl,
          trades:
            period.trades,
          winners:
            period.winners,
          losers:
            period.losers,
          breakevens:
            period.breakevens,
          winRate:
            period.winRate,
        };
      },
    )
    .sort(
      (
        left,
        right,
      ) =>
        right.monthKey.localeCompare(
          left.monthKey,
        ),
    )
    .slice(
      0,
      12,
    );
}

function getMonthlyPerformanceMaxAbsPnl(
  months: JournalMonthlyPerformance[],
) {
  return months.reduce(
    (
      maximum,
      month,
    ) =>
      Math.max(
        maximum,
        Math.abs(
          month.pnl,
        ),
      ),
    0,
  );
}

function formatLocalDateKey(
  date: Date,
) {
  return [
    date.getFullYear(),
    String(
      date.getMonth() +
        1,
    ).padStart(
      2,
      "0",
    ),
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    ),
  ].join(
    "-",
  );
}

function normalizeHeatmapWeek(
  value: string | null | undefined,
): JournalHeatmapWeekSelection {
  const normalized =
    String(value ?? "")
      .trim()
      .toLowerCase();

  if (
    normalized === "all" ||
    normalized === ""
  ) {
    return "all";
  }

  const match =
    normalized.match(
      /^week-(\d{1,2})$/,
    );

  if (!match) {
    return "all";
  }

  const weekNumber =
    Number(match[1]);

  if (
    !Number.isInteger(
      weekNumber,
    ) ||
    weekNumber <
      1 ||
    weekNumber >
      13
  ) {
    return "all";
  }

  return `week-${weekNumber}`;
}

function getHeatmapWeekOptions(
  days: JournalPerformanceHeatmapDay[],
) {
  const options: Array<{
    value: JournalHeatmapWeekSelection;
    label: string;
    shortLabel: string;
    days: JournalPerformanceHeatmapDay[];
  }> = [
    {
      value:
        "all",
      label:
        "Last 13 Weeks",
      shortLabel:
        "Last 13 Weeks",
      days,
    },
  ];

  for (
    let weekIndex =
      0;
    weekIndex <
    13;
    weekIndex +=
      1
  ) {
    const weekDays =
      days.slice(
        weekIndex *
          7,
        weekIndex *
          7 +
          7,
      );

    if (
      weekDays.length ===
      0
    ) {
      continue;
    }

    const firstDay =
      weekDays[0];

    const lastDay =
      weekDays[
        weekDays.length -
          1
      ];

    const firstDate =
      new Date(
        `${firstDay.dateKey}T00:00:00`,
      );

    const lastDate =
      new Date(
        `${lastDay.dateKey}T00:00:00`,
      );

    const dateRange =
      `${firstDate.toLocaleDateString(
        "en-US",
        {
          month:
            "short",
          day:
            "numeric",
        },
      )} – ${lastDate.toLocaleDateString(
        "en-US",
        {
          month:
            "short",
          day:
            "numeric",
        },
      )}`;

    options.push({
      value:
        `week-${
          weekIndex +
          1
        }`,
      label:
        `W${
          weekIndex +
          1
        } · ${dateRange}`,
      shortLabel:
        `W${
          weekIndex +
          1
        }`,
      days:
        weekDays,
    });
  }

  return options;
}

function getSelectedHeatmapDays({
  options,
  selection,
}: {
  options: ReturnType<typeof getHeatmapWeekOptions>;
  selection: JournalHeatmapWeekSelection;
}) {
  return (
    options.find(
      (option) =>
        option.value ===
        selection,
    ) ??
    options[0]
  );
}

function buildPerformanceHeatmap(
  trades: JournalTrade[],
  daysToShow = 91,
) {
  const now =
    new Date();

  const startDate =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

  startDate.setDate(
    startDate.getDate() -
      (
        daysToShow -
        1
      ),
  );

  const dailyGroups =
    new Map<
      string,
      {
        pnl: number;
        trades: number;
        winners: number;
        losers: number;
        breakevens: number;
      }
    >();

  trades
    .filter(
      (trade) =>
        trade.status ===
        "Closed",
    )
    .forEach(
      (trade) => {
        const timestamp =
          getTradeCloseTimestamp(
            trade,
          );

        if (!timestamp) {
          return;
        }

        const date =
          new Date(
            timestamp,
          );

        if (
          !Number.isFinite(
            date.getTime(),
          )
        ) {
          return;
        }

        const dateKey =
          formatLocalDateKey(
            date,
          );

        const current =
          dailyGroups.get(
            dateKey,
          ) ?? {
            pnl:
              0,
            trades:
              0,
            winners:
              0,
            losers:
              0,
            breakevens:
              0,
          };

        const pnl =
          Number(
            trade.pnl ??
            0,
          );

        current.pnl +=
          pnl;

        current.trades +=
          1;

        if (
          trade.outcome ===
            "WIN" ||
          pnl >
            0
        ) {
          current.winners +=
            1;
        } else if (
          trade.outcome ===
            "LOSS" ||
          pnl <
            0
        ) {
          current.losers +=
            1;
        } else {
          current.breakevens +=
            1;
        }

        dailyGroups.set(
          dateKey,
          current,
        );
      },
    );

  const values =
    Array.from(
      dailyGroups.values(),
    )
      .map(
        (value) =>
          Math.abs(
            value.pnl,
          ),
      )
      .filter(
        (value) =>
          value >
          0,
      );

  const maxAbsPnl =
    values.length >
    0
      ? Math.max(
          ...values,
        )
      : 0;

  const days: JournalPerformanceHeatmapDay[] =
    [];

  for (
    let index = 0;
    index <
    daysToShow;
    index +=
    1
  ) {
    const date =
      new Date(
        startDate,
      );

    date.setDate(
      startDate.getDate() +
        index,
    );

    const dateKey =
      formatLocalDateKey(
        date,
      );

    const activity =
      dailyGroups.get(
        dateKey,
      ) ?? {
        pnl:
          0,
        trades:
          0,
        winners:
          0,
        losers:
          0,
        breakevens:
          0,
      };

    const ratio =
      maxAbsPnl >
      0
        ? Math.abs(
            activity.pnl,
          ) /
          maxAbsPnl
        : 0;

    const intensity: JournalPerformanceHeatmapDay["intensity"] =
      activity.trades ===
      0
        ? 0
        : ratio >=
            0.75
          ? 4
          : ratio >=
              0.5
            ? 3
            : ratio >=
                0.25
              ? 2
              : 1;

    days.push({
      dateKey,
      label:
        date.toLocaleDateString(
          "en-US",
          {
            month:
              "short",
            day:
              "numeric",
            year:
              "numeric",
          },
        ),
      pnl:
        Number(
          activity.pnl.toFixed(
            2,
          ),
        ),
      trades:
        activity.trades,
      winners:
        activity.winners,
      losers:
        activity.losers,
      breakevens:
        activity.breakevens,
      intensity,
    });
  }

  return days;
}

function getHeatmapSummary(
  days: JournalPerformanceHeatmapDay[],
) {
  const activeDays =
    days.filter(
      (day) =>
        day.trades >
        0,
    );

  const profitableDays =
    activeDays.filter(
      (day) =>
        day.pnl >
        0,
    );

  const losingDays =
    activeDays.filter(
      (day) =>
        day.pnl <
        0,
    );

  const totalPnl =
    activeDays.reduce(
      (
        sum,
        day,
      ) =>
        sum +
        day.pnl,
      0,
    );

  const bestDay =
    activeDays.reduce<JournalPerformanceHeatmapDay | null>(
      (
        best,
        day,
      ) => {
        if (!best) {
          return day;
        }

        return day.pnl >
        best.pnl
          ? day
          : best;
      },
      null,
    );

  const worstDay =
    activeDays.reduce<JournalPerformanceHeatmapDay | null>(
      (
        worst,
        day,
      ) => {
        if (!worst) {
          return day;
        }

        return day.pnl <
        worst.pnl
          ? day
          : worst;
      },
      null,
    );

  return {
    activeDays:
      activeDays.length,
    profitableDays:
      profitableDays.length,
    losingDays:
      losingDays.length,
    totalPnl:
      Number(
        totalPnl.toFixed(
          2,
        ),
      ),
    bestDay,
    worstDay,
  };
}

function getBiggestWinners(
  trades: JournalTrade[],
  limit = 5,
): JournalRankedTrade[] {
  return trades
    .filter(
      (trade) =>
        trade.status ===
          "Closed" &&
        trade.pnl !==
          null &&
        trade.pnl >
          0,
    )
    .sort(
      (
        left,
        right,
      ) =>
        Number(
          right.pnl ??
          0,
        ) -
        Number(
          left.pnl ??
          0,
        ),
    )
    .slice(
      0,
      limit,
    )
    .map(
      (
        trade,
        index,
      ) => ({
        trade,
        rank:
          index +
          1,
      }),
    );
}

function getBiggestLosers(
  trades: JournalTrade[],
  limit = 5,
): JournalRankedTrade[] {
  return trades
    .filter(
      (trade) =>
        trade.status ===
          "Closed" &&
        trade.pnl !==
          null &&
        trade.pnl <
          0,
    )
    .sort(
      (
        left,
        right,
      ) =>
        Number(
          left.pnl ??
          0,
        ) -
        Number(
          right.pnl ??
          0,
        ),
    )
    .slice(
      0,
      limit,
    )
    .map(
      (
        trade,
        index,
      ) => ({
        trade,
        rank:
          index +
          1,
      }),
    );
}

function getDaysOpen(
  trade: JournalTrade,
) {
  if (!trade.entryDate) {
    return null;
  }

  const openedAt =
    new Date(
      trade.entryDate,
    ).getTime();

  if (!Number.isFinite(openedAt)) {
    return null;
  }

  const now =
    Date.now();

  return Math.max(
    Math.floor(
      (
        now -
        openedAt
      ) /
      (
        1000 *
        60 *
        60 *
        24
      ),
    ),
    0,
  );
}

function getOpenPositionSummary(
  trades: JournalTrade[],
): JournalOpenPositionSummary {
  const positions =
    trades
      .filter(
        (trade) =>
          trade.status !==
          "Closed",
      )
      .map(
        (
          trade,
        ): JournalOpenPosition => ({
          trade,
          daysOpen:
            getDaysOpen(
              trade,
            ),
          estimatedCapital:
            getEstimatedPositionCapital(
              trade,
            ),
          currentReturnPct:
            trade.pnlPct,
        }),
      )
      .sort(
        (
          left,
          right,
        ) => {
          const leftDate =
            new Date(
              left.trade.entryDate ??
              0,
            ).getTime();

          const rightDate =
            new Date(
              right.trade.entryDate ??
              0,
            ).getTime();

          return (
            rightDate -
            leftDate
          );
        },
      );

  const totalEstimatedCapital =
    positions.reduce(
      (
        sum,
        position,
      ) =>
        sum +
        position.estimatedCapital,
      0,
    );

  const openWinners =
    positions.filter(
      (position) =>
        position.currentReturnPct !==
          null &&
        position.currentReturnPct >
          0,
    ).length;

  const openLosers =
    positions.filter(
      (position) =>
        position.currentReturnPct !==
          null &&
        position.currentReturnPct <
          0,
    ).length;

  const positionsWithDuration =
    positions.filter(
      (position) =>
        position.daysOpen !==
        null,
    );

  const averageDaysOpen =
    positionsWithDuration.length >
    0
      ? positionsWithDuration.reduce(
          (
            sum,
            position,
          ) =>
            sum +
            Number(
              position.daysOpen ??
              0,
            ),
          0,
        ) /
        positionsWithDuration.length
      : null;

  const positionsWithReturn =
    positions.filter(
      (position) =>
        position.currentReturnPct !==
        null,
    );

  const averageReturnPct =
    positionsWithReturn.length >
    0
      ? positionsWithReturn.reduce(
          (
            sum,
            position,
          ) =>
            sum +
            Number(
              position.currentReturnPct ??
              0,
            ),
          0,
        ) /
        positionsWithReturn.length
      : null;

  return {
    positions,
    totalPositions:
      positions.length,
    totalEstimatedCapital:
      Number(
        totalEstimatedCapital.toFixed(
          2,
        ),
      ),
    openWinners,
    openLosers,
    averageDaysOpen,
    averageReturnPct,
  };
}

function calculateCoveragePercent(
  completed: number,
  total: number,
) {
  if (total <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      (
        completed /
        total
      ) *
        100,
    ),
  );
}

function buildJournalAiRecommendations({
  trades,
  notes,
  reviews,
  screenshots,
}: {
  trades: JournalTrade[];
  notes: JournalExecutionNoteActivityRow[];
  reviews: JournalTradeReviewActivityRow[];
  screenshots: JournalScreenshotActivityRow[];
}) {
  const recommendations: JournalAiRecommendation[] =
    [];

  const nativeTrades =
    trades.filter(
      (trade) =>
        trade.source ===
        "CASE",
    );

  const closedNativeTrades =
    nativeTrades.filter(
      (trade) =>
        trade.status ===
        "Closed",
    );

  const noteIds =
    new Set(
      notes.map(
        (note) =>
          note.execution_id,
      ),
    );

  const reviewIds =
    new Set(
      reviews.map(
        (review) =>
          review.execution_id,
      ),
    );

  const screenshotIds =
    new Set(
      screenshots.map(
        (screenshot) =>
          screenshot.execution_id,
      ),
    );

  const tradesMissingNotes =
    nativeTrades.filter(
      (trade) =>
        !noteIds.has(
          trade.id,
        ),
    );

  const tradesMissingScreenshots =
    nativeTrades.filter(
      (trade) =>
        !screenshotIds.has(
          trade.id,
        ),
    );

  const tradesMissingReviews =
    closedNativeTrades.filter(
      (trade) =>
        !reviewIds.has(
          trade.id,
        ),
    );

  const strategyPerformance =
    getStrategyPerformance(
      trades,
    );

  const bestStrategy =
    strategyPerformance[0] ??
    null;

  const weakestStrategy =
    strategyPerformance.length >
    1
      ? strategyPerformance[
          strategyPerformance.length -
            1
        ]
      : null;

  const largestLoser =
    getBiggestLosers(
      trades,
      1,
    )[0]?.trade ??
    null;

  const openLosers =
    trades.filter(
      (trade) =>
        trade.status !==
          "Closed" &&
        trade.pnlPct !==
          null &&
        trade.pnlPct <
          0,
    );

  if (
    bestStrategy &&
    bestStrategy.pnl >
      0
  ) {
    recommendations.push({
      id:
        "lean-into-strength",

      category:
        "STRENGTH",

      title:
        `Lean into ${bestStrategy.strategy}`,

      description:
        `${bestStrategy.strategy} is currently your strongest strategy with ${formatCurrency(
          bestStrategy.pnl,
        )} in realized P/L across ${bestStrategy.trades} closed trade${
          bestStrategy.trades ===
          1
            ? ""
            : "s"
        }.`,

      actionLabel:
        "Review Strategy Performance",

      href:
        "/dashboard/journal/reports",

      tone:
        "positive",
    });
  }

  if (
    weakestStrategy &&
    weakestStrategy.pnl <
      0
  ) {
    recommendations.push({
      id:
        "review-weakest-strategy",

      category:
        "PERFORMANCE",

      title:
        `Review ${weakestStrategy.strategy}`,

      description:
        `${weakestStrategy.strategy} has produced ${formatCurrency(
          weakestStrategy.pnl,
        )} across ${weakestStrategy.trades} closed trade${
          weakestStrategy.trades ===
          1
            ? ""
            : "s"
        }. Review setup quality, entry timing, and position sizing.`,

      actionLabel:
        "Open Strategy Analytics",

      href:
        "/dashboard/journal/reports",

      tone:
        "negative",
    });
  }

  if (
    largestLoser
  ) {
    recommendations.push({
      id:
        "review-largest-loser",

      category:
        "RISK",

      title:
        `Review ${largestLoser.symbol} loss`,

      description:
        `${largestLoser.symbol} ${largestLoser.strategy} is your largest recorded loss at ${formatCurrency(
          largestLoser.pnl,
        )}. Confirm whether the original risk plan and exit rules were followed.`,

      actionLabel:
        "Open Trade Review",

      href:
        `/dashboard/journal/${largestLoser.id}`,

      tone:
        "negative",
    });
  }

  if (
    openLosers.length >
    0
  ) {
    const worstOpenTrade =
      [...openLosers].sort(
        (
          left,
          right,
        ) =>
          Number(
            left.pnlPct ??
            0,
          ) -
          Number(
            right.pnlPct ??
            0,
          ),
      )[0];

    recommendations.push({
      id:
        "monitor-open-risk",

      category:
        "RISK",

      title:
        `Monitor ${worstOpenTrade.symbol}`,

      description:
        `${worstOpenTrade.symbol} is currently the weakest open position at ${formatPercent(
          worstOpenTrade.pnlPct,
        )}. Recheck the stop, invalidation level, and remaining position size.`,

      actionLabel:
        "Review Open Position",

      href:
        `/dashboard/journal/${worstOpenTrade.id}`,

      tone:
        "info",
    });
  }

  if (
    tradesMissingNotes.length >
    0
  ) {
    recommendations.push({
      id:
        "complete-notes",

      category:
        "JOURNAL",

      title:
        "Complete journal notes",

      description:
        `${tradesMissingNotes.length} CASE execution${
          tradesMissingNotes.length ===
          1
            ? ""
            : "s"
        } still need setup, psychology, or execution notes.`,

      actionLabel:
        "Add Trade Notes",

      href:
        `/dashboard/journal/${tradesMissingNotes[0].id}`,

      tone:
        "info",
    });
  }

  if (
    tradesMissingScreenshots.length >
    0
  ) {
    recommendations.push({
      id:
        "add-screenshots",

      category:
        "JOURNAL",

      title:
        "Add missing screenshots",

      description:
        `${tradesMissingScreenshots.length} CASE execution${
          tradesMissingScreenshots.length ===
          1
            ? ""
            : "s"
        } still need a setup, entry, management, or exit screenshot.`,

      actionLabel:
        "Upload Screenshot",

      href:
        `/dashboard/journal/${tradesMissingScreenshots[0].id}`,

      tone:
        "info",
    });
  }

  if (
    tradesMissingReviews.length >
    0
  ) {
    recommendations.push({
      id:
        "generate-ai-reviews",

      category:
        "REVIEW",

      title:
        "Clear the AI review queue",

      description:
        `${tradesMissingReviews.length} closed CASE trade${
          tradesMissingReviews.length ===
          1
            ? ""
            : "s"
        } are ready for an AI execution grade and coaching review.`,

      actionLabel:
        "Generate AI Review",

      href:
        `/dashboard/journal/${tradesMissingReviews[0].id}`,

      tone:
        "info",
    });
  }

  return recommendations.slice(
    0,
    8,
  );
}

function buildRiskExposureGroups({
  positions,
  getLabel,
}: {
  positions: JournalOpenPosition[];
  getLabel: (position: JournalOpenPosition) => string;
}) {
  const groups =
    new Map<
      string,
      {
        positions: number;
        estimatedCapital: number;
      }
    >();

  positions.forEach(
    (
      position,
    ) => {
      const label =
        getLabel(
          position,
        ) ||
        "Unknown";

      const current =
        groups.get(
          label,
        ) ?? {
          positions:
            0,
          estimatedCapital:
            0,
        };

      current.positions +=
        1;

      current.estimatedCapital +=
        position.estimatedCapital;

      groups.set(
        label,
        current,
      );
    },
  );

  const totalCapital =
    positions.reduce(
      (
        sum,
        position,
      ) =>
        sum +
        position.estimatedCapital,
      0,
    );

  return Array.from(
    groups.entries(),
  )
    .map(
      ([
        label,
        value,
      ]): JournalRiskExposureItem => ({
        label,
        positions:
          value.positions,
        estimatedCapital:
          Number(
            value.estimatedCapital.toFixed(
              2,
            ),
          ),
        percentage:
          totalCapital >
          0
            ? (
                value.estimatedCapital /
                totalCapital
              ) *
              100
            : 0,
      }),
    )
    .sort(
      (
        left,
        right,
      ) =>
        right.estimatedCapital -
        left.estimatedCapital,
    );
}

function buildJournalRiskDashboard(
  openPositionSummary: JournalOpenPositionSummary,
): JournalRiskDashboard {
  const positions =
    openPositionSummary.positions;

  const largestPosition =
    positions.reduce<JournalOpenPosition | null>(
      (
        largest,
        position,
      ) => {
        if (!largest) {
          return position;
        }

        return position.estimatedCapital >
        largest.estimatedCapital
          ? position
          : largest;
      },
      null,
    );

  const averagePositionCapital =
    positions.length >
    0
      ? openPositionSummary.totalEstimatedCapital /
        positions.length
      : null;

  const concentrationPct =
    largestPosition &&
    openPositionSummary.totalEstimatedCapital >
      0
      ? (
          largestPosition.estimatedCapital /
          openPositionSummary.totalEstimatedCapital
        ) *
        100
      : null;

  const debitExposure =
    positions
      .filter(
        (
          position,
        ) =>
          position.trade.entryType ===
          "Net Debit",
      )
      .reduce(
        (
          sum,
          position,
        ) =>
          sum +
          position.estimatedCapital,
        0,
      );

  const creditExposure =
    positions
      .filter(
        (
          position,
        ) =>
          position.trade.entryType ===
          "Net Credit",
      )
      .reduce(
        (
          sum,
          position,
        ) =>
          sum +
          position.estimatedCapital,
        0,
      );

  const longExposure =
    positions
      .filter(
        (
          position,
        ) =>
          !isShortTrade(
            position.trade,
          ),
      )
      .reduce(
        (
          sum,
          position,
        ) =>
          sum +
          position.estimatedCapital,
        0,
      );

  const shortExposure =
    positions
      .filter(
        (
          position,
        ) =>
          isShortTrade(
            position.trade,
          ),
      )
      .reduce(
        (
          sum,
          position,
        ) =>
          sum +
          position.estimatedCapital,
        0,
      );

  return {
    totalEstimatedCapital:
      openPositionSummary.totalEstimatedCapital,
    largestPosition,
    averagePositionCapital,
    concentrationPct,
    openPositionCount:
      positions.length,
    optionPositionCount:
      positions.filter(
        (
          position,
        ) =>
          position.trade.instrument ===
          "OPTION",
      ).length,
    stockPositionCount:
      positions.filter(
        (
          position,
        ) =>
          position.trade.instrument ===
          "STOCK",
      ).length,
    debitExposure:
      Number(
        debitExposure.toFixed(
          2,
        ),
      ),
    creditExposure:
      Number(
        creditExposure.toFixed(
          2,
        ),
      ),
    longExposure:
      Number(
        longExposure.toFixed(
          2,
        ),
      ),
    shortExposure:
      Number(
        shortExposure.toFixed(
          2,
        ),
      ),
    bySymbol:
      buildRiskExposureGroups({
        positions,
        getLabel:
          (
            position,
          ) =>
            position.trade.symbol,
      }),
    byStrategy:
      buildRiskExposureGroups({
        positions,
        getLabel:
          (
            position,
          ) =>
            position.trade.strategy,
      }),
  };
}

function getGoalProgress(
  current: number,
  target: number,
) {
  if (target <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      (current / target) * 100,
    ),
  );
}

function getGoalStatus({
  current,
  target,
  inverse = false,
}: {
  current: number;
  target: number;
  inverse?: boolean;
}): JournalTradingGoal["status"] {
  if (target <= 0) {
    return "NEEDS_ATTENTION";
  }

  const progress = inverse
    ? current <= target
      ? 100
      : (target / current) * 100
    : (current / target) * 100;

  if (progress >= 100) {
    return "ON_TRACK";
  }

  if (progress >= 70) {
    return "NEEDS_ATTENTION";
  }

  return "OFF_TRACK";
}

function buildTradingGoals({
  monthPnl,
  yearPnl,
  winRate,
  profitFactor,
  noteCoverage,
  screenshotCoverage,
  reviewCoverage,
  concentrationPct,
}: {
  monthPnl: number;
  yearPnl: number;
  winRate: number | null;
  profitFactor: number | null;
  noteCoverage: number;
  screenshotCoverage: number;
  reviewCoverage: number;
  concentrationPct: number | null;
}): JournalTradingGoalSummary {
  const monthlyProfitTarget = 5000;
  const yearlyProfitTarget = 50000;
  const winRateTarget = 60;
  const profitFactorTarget = 1.5;
  const noteCoverageTarget = 90;
  const screenshotCoverageTarget = 80;
  const reviewCoverageTarget = 75;
  const maxConcentrationTarget = 35;

  const goals: JournalTradingGoal[] = [
    {
      id: "monthly-profit",
      label: "Monthly Profit",
      current: monthPnl,
      target: monthlyProfitTarget,
      unit: "currency",
      status: getGoalStatus({
        current: Math.max(monthPnl, 0),
        target: monthlyProfitTarget,
      }),
      description:
        "Progress toward the current monthly realized P/L goal.",
    },
    {
      id: "yearly-profit",
      label: "Yearly Profit",
      current: yearPnl,
      target: yearlyProfitTarget,
      unit: "currency",
      status: getGoalStatus({
        current: Math.max(yearPnl, 0),
        target: yearlyProfitTarget,
      }),
      description:
        "Progress toward the annual realized P/L target.",
    },
    {
      id: "win-rate",
      label: "Win Rate",
      current: winRate ?? 0,
      target: winRateTarget,
      unit: "percent",
      status: getGoalStatus({
        current: winRate ?? 0,
        target: winRateTarget,
      }),
      description:
        "Target percentage of graded closed trades that are winners.",
    },
    {
      id: "profit-factor",
      label: "Profit Factor",
      current: profitFactor ?? 0,
      target: profitFactorTarget,
      unit: "number",
      status: getGoalStatus({
        current: profitFactor ?? 0,
        target: profitFactorTarget,
      }),
      description:
        "Gross profits divided by gross losses.",
    },
    {
      id: "journal-notes",
      label: "Journal Notes",
      current: noteCoverage,
      target: noteCoverageTarget,
      unit: "percent",
      status: getGoalStatus({
        current: noteCoverage,
        target: noteCoverageTarget,
      }),
      description:
        "CASE executions with setup, psychology, or execution notes.",
    },
    {
      id: "screenshots",
      label: "Screenshot Coverage",
      current: screenshotCoverage,
      target: screenshotCoverageTarget,
      unit: "percent",
      status: getGoalStatus({
        current: screenshotCoverage,
        target: screenshotCoverageTarget,
      }),
      description:
        "CASE executions with at least one chart or execution screenshot.",
    },
    {
      id: "ai-reviews",
      label: "AI Review Coverage",
      current: reviewCoverage,
      target: reviewCoverageTarget,
      unit: "percent",
      status: getGoalStatus({
        current: reviewCoverage,
        target: reviewCoverageTarget,
      }),
      description:
        "Closed CASE executions with an AI-generated coaching review.",
    },
    {
      id: "position-concentration",
      label: "Max Position Concentration",
      current: concentrationPct ?? 0,
      target: maxConcentrationTarget,
      unit: "percent",
      status: getGoalStatus({
        current: concentrationPct ?? 0,
        target: maxConcentrationTarget,
        inverse: true,
      }),
      description:
        "Largest open position as a percentage of estimated open capital.",
    },
  ];

  const completedGoals = goals.filter(
    (goal) => goal.status === "ON_TRACK",
  ).length;

  const onTrackGoals = completedGoals;

  const needsAttentionGoals = goals.filter(
    (goal) => goal.status === "NEEDS_ATTENTION",
  ).length;

  const offTrackGoals = goals.filter(
    (goal) => goal.status === "OFF_TRACK",
  ).length;

  const overallProgress =
    goals.length > 0
      ? goals.reduce((sum, goal) => {
          if (goal.id === "position-concentration") {
            return (
              sum +
              (goal.current <= goal.target
                ? 100
                : Math.max(0, (goal.target / goal.current) * 100))
            );
          }

          return (
            sum +
            getGoalProgress(
              Math.max(goal.current, 0),
              goal.target,
            )
          );
        }, 0) / goals.length
      : 0;

  const nextGoal =
    [...goals]
      .filter((goal) => goal.status !== "ON_TRACK")
      .sort((left, right) => {
        const leftProgress =
          left.id === "position-concentration"
            ? left.current <= left.target
              ? 100
              : (left.target / left.current) * 100
            : getGoalProgress(
                Math.max(left.current, 0),
                left.target,
              );

        const rightProgress =
          right.id === "position-concentration"
            ? right.current <= right.target
              ? 100
              : (right.target / right.current) * 100
            : getGoalProgress(
                Math.max(right.current, 0),
                right.target,
              );

        return rightProgress - leftProgress;
      })[0] ?? null;

  const nextMilestone = nextGoal
    ? `${nextGoal.label} is your closest unfinished goal. Current progress is ${
        nextGoal.id === "position-concentration"
          ? nextGoal.current <= nextGoal.target
            ? "100"
            : Math.max(
                0,
                (nextGoal.target / nextGoal.current) * 100,
              ).toFixed(0)
          : getGoalProgress(
              Math.max(nextGoal.current, 0),
              nextGoal.target,
            ).toFixed(0)
      }%.`
    : "All current trading goals are on track.";

  return {
    goals,
    completedGoals,
    onTrackGoals,
    needsAttentionGoals,
    offTrackGoals,
    overallProgress: Number(overallProgress.toFixed(1)),
    nextMilestone,
  };
}

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const supabase = await createSupabaseServerClient();

  const tradeLogLimit = normalizeTradeLogLimit(searchParams?.limit);
  const requestedPage = normalizeTradeLogPage(searchParams?.page);
  const heatmapWeek =
    normalizeHeatmapWeek(
      searchParams?.heatmapWeek,
    );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const role = await resolveCurrentUserRole();
  const masterAdmin = isMasterAdmin(role);

  const entitlements = await getUserEntitlements(user.id);
  const hasJournalAccess = masterAdmin || entitlements.journal.active;

  if (!hasJournalAccess) {
    return <JournalUpgradeScreen />;
  }

  const journalTier = masterAdmin
    ? "master_admin"
    : (entitlements.journal.tier ?? "journal_starter");

  const canJournalOptions = masterAdmin || entitlements.journal.options;
  const canUseAiReview = masterAdmin || entitlements.journal.ai_review;
  const analyticsLevel = masterAdmin
    ? "master"
    : entitlements.journal.analytics;

  let signalsQuery = supabase
    .from("signals")
    .select(
      `
      id,
      organization_id,
      asset,
      underlying,
      action,
      open_action,
      instrument_type,
      option_type,
      strike_price,
      expiration_date,
      entry_price,
      price,
      exit_price,
      quantity,
      contracts,
      shares,
      trade_style,
      strategy_type,
      confidence,
      status,
      watching,
      watched,
      outcome,
      return_pct,
      opened_at,
      closed_at,
      created_at,
      signal_option_legs!left (
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
      ),
      signal_executions!left (
        id,
        status,
        contracts,
        entry_price,
        exit_price,
        pnl,
        pnl_pct,
        opened_at,
        closed_at,
        execution_fills!left (
          side,
          contracts,
          price,
          created_at
        )
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (!masterAdmin) {
    signalsQuery = signalsQuery.eq("created_by", user.id);
  }

  const { data: signalsData, error: signalsError } = await signalsQuery;

  if (signalsError) {
    console.error("Failed to load signal journal trades", signalsError);
    throw new Error("Failed to load signal journal trades");
  }

  let importedQuery = supabase
    .from("journal_trades")
    .select(
      `
      id,
      user_id,
      symbol,
      instrument_type,
      side,
      open_action,
      strategy_type,
      trade_style,
      option_type,
      strike_price,
      expiration_date,
      entry_date,
      exit_date,
      entry_price,
      exit_price,
      quantity,
      profit_loss,
      profit_loss_pct,
      strategy_entry_type,
      signed_strategy_entry,
      strategy_entry_price,
      total_debit,
      total_credit,
      signed_strategy_exit,
      strategy_exit_price,
      total_exit_debit,
      total_exit_credit,
      strategy_contracts,
      total_contracts,
      leg_count,
      option_legs,
      notes,
      created_at,
      updated_at
      `,
    )
    .order("created_at", { ascending: false });

  if (!masterAdmin) {
    importedQuery =
      importedQuery.eq(
        "user_id",
        user.id,
      );
  }

  let {
    data: importedData,
    error: importedError,
  } =
    await importedQuery;

  if (
    importedError &&
    isMissingColumnError(
      importedError.message,
    )
  ) {
    let legacyImportedQuery =
      supabase
        .from("journal_trades")
        .select(
          `
          id,
          user_id,
          symbol,
          instrument_type,
          side,
          entry_date,
          exit_date,
          entry_price,
          exit_price,
          quantity,
          profit_loss,
          profit_loss_pct,
          notes,
          created_at,
          updated_at
          `,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        );

    if (!masterAdmin) {
      legacyImportedQuery =
        legacyImportedQuery.eq(
          "user_id",
          user.id,
        );
    }

    const legacyResult =
      await legacyImportedQuery;

    importedData =
      (legacyResult.data ??
        []).map(
        (
          trade,
        ) => ({
          ...trade,
          open_action:
            null,
          strategy_type:
            null,
          trade_style:
            null,
          option_type:
            null,
          strike_price:
            null,
          expiration_date:
            null,
          strategy_entry_type:
            null,
          signed_strategy_entry:
            null,
          strategy_entry_price:
            null,
          total_debit:
            null,
          total_credit:
            null,
          signed_strategy_exit:
            null,
          strategy_exit_price:
            null,
          total_exit_debit:
            null,
          total_exit_credit:
            null,
          strategy_contracts:
            null,
          total_contracts:
            null,
          leg_count:
            null,
          option_legs:
            null,
        }),
      );

    importedError =
      legacyResult.error;
  }

  if (importedError) {
    console.error(
      "Failed to load imported journal trades",
      importedError,
    );

    throw new Error(
      "Failed to load imported journal trades",
    );
  }

  const [
    notesActivityResult,
    reviewsActivityResult,
    screenshotsActivityResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "journal_execution_notes",
        )
        .select(
          `
          id,
          execution_id,
          signal_id,
          notes,
          setup,
          mistakes,
          updated_at,
          created_at
          `,
        )
        .order(
          "updated_at",
          {
            ascending:
              false,
          },
        )
        .limit(
          20,
        ),

      supabase
        .from(
          "journal_trade_reviews",
        )
        .select(
          `
          id,
          execution_id,
          signal_id,
          grade,
          execution_score,
          created_at,
          updated_at
          `,
        )
        .order(
          "updated_at",
          {
            ascending:
              false,
          },
        )
        .limit(
          20,
        ),

      supabase
        .from(
          "journal_execution_screenshots",
        )
        .select(
          `
          id,
          execution_id,
          signal_id,
          screenshot_type,
          caption,
          created_at
          `,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        )
        .limit(
          20,
        ),
    ]);

  if (
    notesActivityResult.error
  ) {
    console.error(
      "Failed to load recent journal note activity",
      notesActivityResult.error,
    );
  }

  if (
    reviewsActivityResult.error
  ) {
    console.error(
      "Failed to load recent AI review activity",
      reviewsActivityResult.error,
    );
  }

  if (
    screenshotsActivityResult.error
  ) {
    console.error(
      "Failed to load recent screenshot activity",
      screenshotsActivityResult.error,
    );
  }

  const signals = (signalsData ?? []) as SignalRow[];
  const signalTrades = buildJournalTrades(signals);
  const importedTrades = buildImportedJournalTrades(
    (importedData ?? []) as ImportedJournalTradeRow[],
  );

  const trades = [...signalTrades, ...importedTrades].sort((a, b) => {
    const aDate = new Date(a.entryDate ?? a.exitDate ?? 0).getTime();
    const bDate = new Date(b.entryDate ?? b.exitDate ?? 0).getTime();

    return bDate - aDate;
  });

  const pageSize = tradeLogLimit === "all" ? trades.length || 1 : tradeLogLimit;
  const totalPages =
    tradeLogLimit === "all" ? 1 : Math.max(Math.ceil(trades.length / pageSize), 1);
  const currentPage =
    tradeLogLimit === "all" ? 1 : Math.min(requestedPage, totalPages);
  const startIndex = tradeLogLimit === "all" ? 0 : (currentPage - 1) * pageSize;
  const endIndex =
    tradeLogLimit === "all" ? trades.length : startIndex + pageSize;
  const visibleTrades = trades.slice(startIndex, endIndex);
  const visibleStart = trades.length === 0 ? 0 : startIndex + 1;
  const visibleEnd = Math.min(endIndex, trades.length);
  const hiddenTradeCount = Math.max(trades.length - visibleTrades.length, 0);
  const paginationPages = getPaginationPages(currentPage, totalPages);

  const csvDownloadHref = buildDownloadHref(
    buildTradesCsv(trades),
    "text/csv",
  );

  const jsonDownloadHref = buildDownloadHref(
    buildTradesJson(trades),
    "application/json",
  );

  const excelDownloadHref = buildDownloadHref(
    buildTradesExcelHtml(trades),
    "application/vnd.ms-excel",
  );

  const {
    closedTrades,
    winningTrades,
    losingTrades,
    winRate,
    averageWinner,
    averageLoser,
    profitFactor,
  } =
    getTradePerformanceStats(
      trades,
    );

  const totalPnl =
    trades.reduce(
      (
        sum,
        trade,
      ) =>
        sum +
        (
          trade.pnl ??
          0
        ),
      0,
    );

  const today =
    new Date();

  const todayPnl =
    closedTrades
      .filter(
        (trade) =>
          isSameLocalDay(
            trade.exitDate ??
              trade.entryDate,
            today,
          ),
      )
      .reduce(
        (
          sum,
          trade,
        ) =>
          sum +
          Number(
            trade.pnl ??
            0,
          ),
        0,
      );

  const sevenDayPnl =
    closedTrades
      .filter(
        (trade) =>
          isDateWithinDays(
            trade.exitDate ??
              trade.entryDate,
            7,
          ),
      )
      .reduce(
        (
          sum,
          trade,
        ) =>
          sum +
          Number(
            trade.pnl ??
            0,
          ),
        0,
      );

  const thirtyDayPnl =
    closedTrades
      .filter(
        (trade) =>
          isDateWithinDays(
            trade.exitDate ??
              trade.entryDate,
            30,
          ),
      )
      .reduce(
        (
          sum,
          trade,
        ) =>
          sum +
          Number(
            trade.pnl ??
            0,
          ),
        0,
      );

  const openTradeCount =
    trades.filter(
      (trade) =>
        trade.status !==
        "Closed",
    ).length;

  const bestTrade = trades.reduce<JournalTrade | null>((best, trade) => {
    if (trade.pnl === null) return best;
    if (!best || best.pnl === null) return trade;

    return trade.pnl > best.pnl ? trade : best;
  }, null);

  const tradeByExecutionId =
    new Map(
      signalTrades.map(
        (
          trade,
        ) => [
          trade.id,
          trade,
        ],
      ),
    );

  const recentNotes =
    (
      notesActivityResult.data ??
      []
    ) as JournalExecutionNoteActivityRow[];

  const recentReviews =
    (
      reviewsActivityResult.data ??
      []
    ) as JournalTradeReviewActivityRow[];

  const recentScreenshots =
    (
      screenshotsActivityResult.data ??
      []
    ) as JournalScreenshotActivityRow[];

  const portfolioSnapshot =
    getPortfolioSnapshot(
      trades,
    );

  const performancePeriods =
    buildDashboardPerformancePeriods(
      trades,
    );

  const performanceHeatmap =
    buildPerformanceHeatmap(
      trades,
    );

  const heatmapWeekOptions =
    getHeatmapWeekOptions(
      performanceHeatmap,
    );

  const selectedHeatmapWeek =
    getSelectedHeatmapDays({
      options:
        heatmapWeekOptions,
      selection:
        heatmapWeek,
    });

  const visiblePerformanceHeatmap =
    selectedHeatmapWeek.days;

  const performanceHeatmapSummary =
    getHeatmapSummary(
      visiblePerformanceHeatmap,
    );

  const monthlyPerformanceTimeline =
    buildMonthlyPerformanceTimeline(
      trades,
    );

  const monthlyPerformanceMaxAbsPnl =
    getMonthlyPerformanceMaxAbsPnl(
      monthlyPerformanceTimeline,
    );

  const openPositionSummary =
    getOpenPositionSummary(
      trades,
    );

  const riskDashboard =
    buildJournalRiskDashboard(
      openPositionSummary,
    );

  const biggestWinners =
    getBiggestWinners(
      trades,
    );

  const biggestLosers =
    getBiggestLosers(
      trades,
    );

  const strategyDistribution =
    buildStrategyDistribution(
      trades,
    );

  const strategyDistributionMaxTrades =
    getStrategyDistributionMaxTrades(
      strategyDistribution,
    );

  const aiCoachInsights =
    buildJournalAiCoachInsights({
      trades,
      notes:
        recentNotes,
      reviews:
        recentReviews,
      screenshots:
        recentScreenshots,
    });

  const aiRecommendations =
    buildJournalAiRecommendations({
      trades,
      notes:
        recentNotes,
      reviews:
        recentReviews,
      screenshots:
        recentScreenshots,
    });

  const nativeCaseTrades =
    trades.filter(
      (trade) =>
        trade.source ===
        "CASE",
    );

  const closedNativeCaseTrades =
    nativeCaseTrades.filter(
      (trade) =>
        trade.status ===
        "Closed",
    );

  const noteCoverage =
    calculateCoveragePercent(
      nativeCaseTrades.filter(
        (trade) =>
          recentNotes.some(
            (note) =>
              note.execution_id ===
              trade.id,
          ),
      ).length,
      nativeCaseTrades.length,
    );

  const screenshotCoverage =
    calculateCoveragePercent(
      nativeCaseTrades.filter(
        (trade) =>
          recentScreenshots.some(
            (screenshot) =>
              screenshot.execution_id ===
              trade.id,
          ),
      ).length,
      nativeCaseTrades.length,
    );

  const reviewCoverage =
    calculateCoveragePercent(
      closedNativeCaseTrades.filter(
        (trade) =>
          recentReviews.some(
            (review) =>
              review.execution_id ===
              trade.id,
          ),
      ).length,
      closedNativeCaseTrades.length,
    );

  const currentMonthPerformance =
    performancePeriods.find(
      (period) => period.label === "This Month",
    );

  const currentYearPerformance =
    performancePeriods.find(
      (period) => period.label === "Year to Date",
    );

  const tradingGoals =
    buildTradingGoals({
      monthPnl:
        currentMonthPerformance?.pnl ??
        0,
      yearPnl:
        currentYearPerformance?.pnl ??
        0,
      winRate,
      profitFactor,
      noteCoverage,
      screenshotCoverage,
      reviewCoverage,
      concentrationPct:
        riskDashboard.concentrationPct,
    });

  const recentActivity =
    [
      ...buildTradeActivity(
        trades,
      ),

      ...buildSupplementalActivity({
        notes:
          recentNotes,

        reviews:
          recentReviews,

        screenshots:
          recentScreenshots,

        tradeByExecutionId,
      }),
    ]
      .sort(
        (
          left,
          right,
        ) =>
          getActivityTimestamp(
            right,
          ) -
          getActivityTimestamp(
            left,
          ),
      )
      .slice(
        0,
        12,
      );

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">
            CASE Journal
          </h1>

          <p className="text-sm text-slate-400">
            Execution-powered trade journal with separate strategy and
            execution-style tracking, multi-leg option structures, fills, and
            imported broker trades.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/dashboard/journal/import"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/10"
          >
            <Upload className="h-4 w-4" />
            Import Trades
          </Link>

          <Link
            href="/dashboard/admin/signals/create"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            <PlusCircle className="h-4 w-4" />
            New Trade Signal
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-medium text-emerald-300">
              {masterAdmin
                ? "Master Admin Journal Access"
                : "Active Journal Plan"}
            </p>

            <p className="text-xs text-slate-400">
              Tier: {formatTier(journalTier)} • Analytics:{" "}
              {String(analyticsLevel).toUpperCase()} • Imported Trades:{" "}
              {importedTrades.length}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <FeaturePill enabled label="Stock Journal" />
            <FeaturePill enabled={canJournalOptions} label="Options Journal" />
            <FeaturePill enabled={canUseAiReview} label="AI Review" />
          </div>
        </div>
      </div>

      <DashboardStats
        todayPnl={todayPnl}
        sevenDayPnl={sevenDayPnl}
        thirtyDayPnl={thirtyDayPnl}
        openTradeCount={openTradeCount}
        winRate={winRate}
        profitFactor={profitFactor}
        averageWinner={averageWinner}
        averageLoser={averageLoser}
        totalTrades={trades.length}
        totalPnl={totalPnl}
        bestTradePnl={bestTrade?.pnl ?? null}
      />

      <RecentActivity activities={recentActivity} />

      <section className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-slate-900/80 to-slate-900/80 p-5 md:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-500/10 p-3 text-purple-300">
                <BrainCircuit className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  CASE AI Coach
                </h2>

                <p className="text-sm text-slate-400">
                  Data-driven coaching insights from your strategies, execution styles, notes, screenshots, and AI review coverage.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/journal/reports"
            className="inline-flex items-center gap-2 text-sm font-medium text-purple-300 transition hover:text-purple-200"
          >
            Explore Analytics
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        {aiCoachInsights.length === 0 ? (
          <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/70 p-5 text-sm text-slate-500">
            More completed trades are needed before CASE can generate coaching insights.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {aiCoachInsights.map(
              (
                insight,
              ) => (
                <AiCoachInsightCard
                  key={
                    insight.id
                  }
                  insight={
                    insight
                  }
                />
              ),
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900/80 to-slate-900/80 p-5 md:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-300">
                <Target className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Trading Goals
                </h2>

                <p className="text-sm text-slate-400">
                  Track progress toward performance, discipline, review, and concentration targets.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/journal/reports"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-300 transition hover:text-emerald-200"
          >
            Review Goal Analytics
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <TradingGoalSummaryCard
            label="Overall Progress"
            value={`${tradingGoals.overallProgress.toFixed(0)}%`}
            tone={
              tradingGoals.overallProgress >= 80
                ? "positive"
                : tradingGoals.overallProgress >= 60
                  ? "warning"
                  : "negative"
            }
          />

          <TradingGoalSummaryCard
            label="Goals On Track"
            value={String(tradingGoals.onTrackGoals)}
            tone="positive"
          />

          <TradingGoalSummaryCard
            label="Needs Attention"
            value={String(tradingGoals.needsAttentionGoals)}
            tone={
              tradingGoals.needsAttentionGoals > 0
                ? "warning"
                : "neutral"
            }
          />

          <TradingGoalSummaryCard
            label="Off Track"
            value={String(tradingGoals.offTrackGoals)}
            tone={
              tradingGoals.offTrackGoals > 0
                ? "negative"
                : "neutral"
            }
          />

          <TradingGoalSummaryCard
            label="Completed"
            value={`${tradingGoals.completedGoals}/${tradingGoals.goals.length}`}
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tradingGoals.goals.map(
            (
              goal,
            ) => (
              <TradingGoalCard
                key={
                  goal.id
                }
                goal={
                  goal
                }
              />
            ),
          )}
        </div>

        <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
            Suggested Next Milestone
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-300">
            {tradingGoals.nextMilestone}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/10 via-slate-900/80 to-slate-900/80 p-5 md:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-500/10 p-3 text-red-300">
                <Target className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Risk Dashboard
                </h2>

                <p className="text-sm text-slate-400">
                  Review estimated capital concentration, directional exposure, and open-position risk.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/journal/reports"
            className="inline-flex items-center gap-2 text-sm font-medium text-red-300 transition hover:text-red-200"
          >
            Review Risk Analytics
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <RiskSummaryCard
            label="Capital at Risk"
            value={formatCurrency(riskDashboard.totalEstimatedCapital)}
            tone={
              riskDashboard.totalEstimatedCapital > 0
                ? "negative"
                : "neutral"
            }
          />

          <RiskSummaryCard
            label="Open Positions"
            value={String(riskDashboard.openPositionCount)}
          />

          <RiskSummaryCard
            label="Largest Position"
            value={
              riskDashboard.largestPosition
                ? formatCurrency(riskDashboard.largestPosition.estimatedCapital)
                : "—"
            }
            detail={
              riskDashboard.largestPosition?.trade.symbol ??
              "No open positions"
            }
            tone={
              riskDashboard.largestPosition
                ? "negative"
                : "neutral"
            }
          />

          <RiskSummaryCard
            label="Concentration"
            value={
              riskDashboard.concentrationPct !== null
                ? `${riskDashboard.concentrationPct.toFixed(1)}%`
                : "—"
            }
            detail="Largest position share"
            tone={
              riskDashboard.concentrationPct !== null &&
              riskDashboard.concentrationPct >= 35
                ? "negative"
                : riskDashboard.concentrationPct !== null &&
                    riskDashboard.concentrationPct >= 20
                  ? "warning"
                  : "neutral"
            }
          />

          <RiskSummaryCard
            label="Avg Position"
            value={formatCurrency(riskDashboard.averagePositionCapital)}
          />

          <RiskSummaryCard
            label="Options / Stocks"
            value={`${riskDashboard.optionPositionCount} / ${riskDashboard.stockPositionCount}`}
          />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
            <h3 className="text-sm font-semibold text-slate-100">
              Exposure Mix
            </h3>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <RiskExposureMetric
                label="Long Exposure"
                value={riskDashboard.longExposure}
                total={riskDashboard.totalEstimatedCapital}
                tone="positive"
              />

              <RiskExposureMetric
                label="Short Exposure"
                value={riskDashboard.shortExposure}
                total={riskDashboard.totalEstimatedCapital}
                tone="negative"
              />

              <RiskExposureMetric
                label="Debit Exposure"
                value={riskDashboard.debitExposure}
                total={riskDashboard.totalEstimatedCapital}
                tone="info"
              />

              <RiskExposureMetric
                label="Credit Exposure"
                value={riskDashboard.creditExposure}
                total={riskDashboard.totalEstimatedCapital}
                tone="warning"
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
            <h3 className="text-sm font-semibold text-slate-100">
              Largest Symbol Exposure
            </h3>

            {riskDashboard.bySymbol.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No open-position exposure is available.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {riskDashboard.bySymbol
                  .slice(
                    0,
                    5,
                  )
                  .map(
                    (
                      item,
                    ) => (
                      <RiskExposureBar
                        key={
                          item.label
                        }
                        item={
                          item
                        }
                      />
                    ),
                  )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-slate-950 p-4">
          <h3 className="text-sm font-semibold text-slate-100">
            Strategy Exposure
          </h3>

          {riskDashboard.byStrategy.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Strategy exposure will appear when positions are open.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {riskDashboard.byStrategy
                .slice(
                  0,
                  6,
                )
                .map(
                  (
                    item,
                  ) => (
                    <RiskStrategyCard
                      key={
                        item.label
                      }
                      item={
                        item
                      }
                    />
                  ),
                )}
            </div>
          )}
        </div>

        {riskDashboard.concentrationPct !== null &&
        riskDashboard.concentrationPct >= 35 ? (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-300">
              Concentration Alert
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              {riskDashboard.largestPosition?.trade.symbol ?? "Your largest position"} represents{" "}
              <span className="font-semibold text-red-300">
                {riskDashboard.concentrationPct.toFixed(1)}%
              </span>{" "}
              of estimated open capital. Review whether this exposure matches your risk plan.
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-5 md:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/10 p-3 text-blue-300">
                <Activity className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Open Positions
                </h2>

                <p className="text-sm text-slate-400">
                  Monitor active trades, estimated capital, days open, and current return.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/signals"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-300 transition hover:text-blue-200"
          >
            View All Signals
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <OpenPositionSummaryCard
            label="Open Positions"
            value={String(openPositionSummary.totalPositions)}
          />

          <OpenPositionSummaryCard
            label="Capital Deployed"
            value={formatCurrency(openPositionSummary.totalEstimatedCapital)}
          />

          <OpenPositionSummaryCard
            label="Open Winners"
            value={String(openPositionSummary.openWinners)}
            tone="positive"
          />

          <OpenPositionSummaryCard
            label="Open Losers"
            value={String(openPositionSummary.openLosers)}
            tone={
              openPositionSummary.openLosers > 0
                ? "negative"
                : "neutral"
            }
          />

          <OpenPositionSummaryCard
            label="Avg Days Open"
            value={
              openPositionSummary.averageDaysOpen !== null
                ? openPositionSummary.averageDaysOpen.toFixed(1)
                : "—"
            }
          />

          <OpenPositionSummaryCard
            label="Avg Return"
            value={
              openPositionSummary.averageReturnPct !== null
                ? `${openPositionSummary.averageReturnPct.toFixed(2)}%`
                : "—"
            }
            tone={
              openPositionSummary.averageReturnPct !== null &&
              openPositionSummary.averageReturnPct > 0
                ? "positive"
                : openPositionSummary.averageReturnPct !== null &&
                    openPositionSummary.averageReturnPct < 0
                  ? "negative"
                  : "neutral"
            }
          />
        </div>

        {openPositionSummary.positions.length === 0 ? (
          <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/70 p-5 text-sm text-slate-500">
            No open positions are currently available.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {openPositionSummary.positions
              .slice(
                0,
                8,
              )
              .map(
                (
                  position,
                ) => (
                  <OpenPositionCard
                    key={
                      position.trade.id
                    }
                    position={
                      position
                    }
                  />
                ),
              )}
          </div>
        )}

        {openPositionSummary.positions.length > 8 ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-center text-xs text-slate-500">
            Showing 8 of {openPositionSummary.positions.length} open positions.
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-5 md:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-500/10 p-3 text-amber-300">
                <Trophy className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Biggest Winners & Losers
                </h2>

                <p className="text-sm text-slate-400">
                  Identify the closed trades contributing the most to gains and drawdowns.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/journal/reports"
            className="inline-flex items-center gap-2 text-sm font-medium text-amber-300 transition hover:text-amber-200"
          >
            View All Closed Trades
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <RankedTradeSummaryCard
            label="Largest Winner"
            trade={
              biggestWinners[0]?.trade ??
              null
            }
            tone="positive"
          />

          <RankedTradeSummaryCard
            label="Largest Loser"
            trade={
              biggestLosers[0]?.trade ??
              null
            }
            tone="negative"
          />

          <RankedMetricSummaryCard
            label="Average Winner"
            value={
              averageWinner !== null
                ? formatCurrency(
                    averageWinner,
                  )
                : "—"
            }
            tone="positive"
          />

          <RankedMetricSummaryCard
            label="Average Loser"
            value={
              averageLoser !== null
                ? formatCurrency(
                    -averageLoser,
                  )
                : "—"
            }
            tone={
              averageLoser !== null
                ? "negative"
                : "neutral"
            }
          />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <RankedTradeList
            title="Biggest Winners"
            description="Top closed trades ranked by realized P/L."
            trades={biggestWinners}
            tone="positive"
            emptyMessage="No profitable closed trades are available yet."
          />

          <RankedTradeList
            title="Biggest Losers"
            description="Largest losing trades to prioritize for review."
            trades={biggestLosers}
            tone="negative"
            emptyMessage="No losing closed trades are available."
          />
        </div>
      </section>

      <section className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-slate-900/80 to-slate-900/80 p-5 md:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-300">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  CASE AI Recommendations
                </h2>

                <p className="text-sm text-slate-400">
                  Prioritized next actions based on journal completeness, strategy performance, open risk, and completed trade reviews.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/journal/reports"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-300 transition hover:text-indigo-200"
          >
            Open Full Analytics
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            {aiRecommendations.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-slate-950/70 p-5 text-sm text-slate-500">
                More completed trades and journal activity are needed before CASE can generate recommendations.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {aiRecommendations.map(
                  (
                    recommendation,
                  ) => (
                    <AiRecommendationCard
                      key={
                        recommendation.id
                      }
                      recommendation={
                        recommendation
                      }
                    />
                  ),
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
            <h3 className="text-sm font-semibold text-slate-100">
              Journal Completion
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Complete records improve reporting accuracy and AI coaching quality.
            </p>

            <div className="mt-5 space-y-5">
              <JournalCoverageBar
                label="Journal Notes"
                value={noteCoverage}
              />

              <JournalCoverageBar
                label="Screenshots"
                value={screenshotCoverage}
              />

              <JournalCoverageBar
                label="AI Reviews"
                value={reviewCoverage}
              />
            </div>

            <div className="mt-5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
                Suggested Priority
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                {aiRecommendations[0]?.title ??
                  "Continue documenting each execution and reviewing completed trades."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-5 md:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-300">
                <TrendingUp className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Performance Timeline
                </h2>

                <p className="text-sm text-slate-400">
                  Track closed-trade performance across daily, weekly, monthly, and yearly periods.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/journal/reports"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-300 transition hover:text-emerald-200"
          >
            Open Detailed Reports
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {performancePeriods.map(
            (
              period,
            ) => (
              <PerformancePeriodCard
                key={
                  period.label
                }
                period={
                  period
                }
              />
            ),
          )}
        </div>

        {monthlyPerformanceTimeline.length === 0 ? (
          <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/70 p-5 text-sm text-slate-500">
            Monthly performance will appear after closed trades are available.
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-white/10 bg-slate-950 p-4">
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Monthly Performance
                </h3>

                <p className="text-xs text-slate-500">
                  Latest 12 months of closed-trade P/L and win rate.
                </p>
              </div>

              <span className="text-xs text-slate-600">
                {monthlyPerformanceTimeline.length} month
                {monthlyPerformanceTimeline.length === 1 ? "" : "s"} shown
              </span>
            </div>

            <div className="space-y-4">
              {monthlyPerformanceTimeline.map(
                (
                  month,
                ) => (
                  <MonthlyPerformanceRow
                    key={
                      month.monthKey
                    }
                    month={
                      month
                    }
                    maxAbsPnl={
                      monthlyPerformanceMaxAbsPnl
                    }
                  />
                ),
              )}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-5 md:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-500/10 p-3 text-sky-300">
                <CalendarDays className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Performance Heatmap
                </h2>

                <p className="text-sm text-slate-400">
                  A 13-week calendar view of daily closed-trade activity and P/L intensity.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <form
              action="/dashboard/journal"
              className="flex items-center"
            >
              <input
                type="hidden"
                name="limit"
                value={String(
                  tradeLogLimit,
                )}
              />

              {currentPage > 1 ? (
                <input
                  type="hidden"
                  name="page"
                  value={String(
                    currentPage,
                  )}
                />
              ) : null}

              <label
                htmlFor="heatmap-week"
                className="sr-only"
              >
                Select heatmap week
              </label>

              <select
                id="heatmap-week"
                name="heatmapWeek"
                defaultValue={
                  selectedHeatmapWeek.value
                }
                className="rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-200 outline-none transition hover:bg-sky-500/15 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
              >
                {heatmapWeekOptions.map(
                  (
                    option,
                  ) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                      className="bg-slate-950 text-slate-200"
                    >
                      {option.label}
                    </option>
                  ),
                )}
              </select>

              <button
                type="submit"
                className="ml-2 rounded-full border border-white/10 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-900"
              >
                Apply
              </button>
            </form>

            <Link
              href="/dashboard/journal/reports"
              className="inline-flex items-center gap-2 text-sm font-medium text-sky-300 transition hover:text-sky-200"
            >
              View Daily Reports
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <PerformanceHeatmapSummaryCard
            label="Active Days"
            value={String(performanceHeatmapSummary.activeDays)}
          />

          <PerformanceHeatmapSummaryCard
            label="Profitable Days"
            value={String(performanceHeatmapSummary.profitableDays)}
            tone="positive"
          />

          <PerformanceHeatmapSummaryCard
            label="Losing Days"
            value={String(performanceHeatmapSummary.losingDays)}
            tone={
              performanceHeatmapSummary.losingDays > 0
                ? "negative"
                : "neutral"
            }
          />

          <PerformanceHeatmapSummaryCard
            label={
              selectedHeatmapWeek.value === "all"
                ? "13-Week P/L"
                : `${selectedHeatmapWeek.shortLabel} P/L`
            }
            value={formatCurrency(performanceHeatmapSummary.totalPnl)}
            tone={
              performanceHeatmapSummary.totalPnl > 0
                ? "positive"
                : performanceHeatmapSummary.totalPnl < 0
                  ? "negative"
                  : "neutral"
            }
          />

          <PerformanceHeatmapSummaryCard
            label="Best Day"
            value={
              performanceHeatmapSummary.bestDay
                ? formatCurrency(performanceHeatmapSummary.bestDay.pnl)
                : "—"
            }
            detail={
              performanceHeatmapSummary.bestDay?.label ??
              "No closed trades"
            }
            tone={
              performanceHeatmapSummary.bestDay?.pnl &&
              performanceHeatmapSummary.bestDay.pnl > 0
                ? "positive"
                : "neutral"
            }
          />
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-white/10 bg-slate-950 p-4">
          <div className="min-w-[760px]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200">
                {selectedHeatmapWeek.label}
              </span>

              <span className="text-xs text-slate-600">
                {visiblePerformanceHeatmap.length} day
                {visiblePerformanceHeatmap.length === 1 ? "" : "s"} displayed
              </span>
            </div>

            <div
              className={
                selectedHeatmapWeek.value === "all"
                  ? "grid grid-flow-col grid-rows-7 gap-2"
                  : "grid grid-cols-7 gap-2"
              }
            >
              {visiblePerformanceHeatmap.map(
                (
                  day,
                ) => (
                  <PerformanceHeatmapCell
                    key={day.dateKey}
                    day={day}
                  />
                ),
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Loss</span>
                <span className="h-3 w-3 rounded-sm bg-red-500/30" />
                <span className="h-3 w-3 rounded-sm bg-red-500/55" />
                <span className="h-3 w-3 rounded-sm bg-red-500/80" />
              </div>

              <div className="flex items-center gap-2">
                <span>No trades</span>
                <span className="h-3 w-3 rounded-sm border border-white/10 bg-slate-900" />
              </div>

              <div className="flex items-center gap-2">
                <span>Profit</span>
                <span className="h-3 w-3 rounded-sm bg-emerald-500/30" />
                <span className="h-3 w-3 rounded-sm bg-emerald-500/55" />
                <span className="h-3 w-3 rounded-sm bg-emerald-500/80" />
              </div>
            </div>
          </div>
        </div>

        {performanceHeatmapSummary.worstDay &&
        performanceHeatmapSummary.worstDay.pnl < 0 ? (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-300">
              Day to Review
            </p>

            <p className="mt-2 text-sm text-slate-300">
              {performanceHeatmapSummary.worstDay.label} produced{" "}
              <span className="font-semibold text-red-300">
                {formatCurrency(performanceHeatmapSummary.worstDay.pnl)}
              </span>{" "}
              across {performanceHeatmapSummary.worstDay.trades} closed trade
              {performanceHeatmapSummary.worstDay.trades === 1 ? "" : "s"}.
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-5 md:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-500/10 p-3 text-amber-300">
                <BarChart3 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Strategy Distribution
                </h2>

                <p className="text-sm text-slate-400">
                  See which strategies you trade most often and how each one performs.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/journal/reports"
            className="inline-flex items-center gap-2 text-sm font-medium text-amber-300 transition hover:text-amber-200"
          >
            Open Strategy Reports
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        {strategyDistribution.length === 0 ? (
          <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/70 p-5 text-sm text-slate-500">
            Strategy distribution will appear after trades are added to the journal.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
            <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
              <div className="space-y-4">
                {strategyDistribution
                  .slice(
                    0,
                    10,
                  )
                  .map(
                    (
                      item,
                    ) => (
                      <StrategyDistributionBar
                        key={
                          item.strategy
                        }
                        item={
                          item
                        }
                        maxTrades={
                          strategyDistributionMaxTrades
                        }
                      />
                    ),
                  )}
              </div>

              {strategyDistribution.length > 10 ? (
                <p className="mt-4 text-xs text-slate-600">
                  Showing the 10 most frequently traded strategies.
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <StrategyDistributionSummaryCard
                label="Most Traded"
                value={
                  strategyDistribution[0]?.strategy ??
                  "—"
                }
                detail={
                  strategyDistribution[0]
                    ? `${strategyDistribution[0].trades} trade${
                        strategyDistribution[0].trades === 1
                          ? ""
                          : "s"
                      } • ${strategyDistribution[0].percentage.toFixed(1)}% of journal`
                    : "No strategy data"
                }
                tone="neutral"
              />

              <StrategyDistributionSummaryCard
                label="Most Profitable"
                value={
                  [...strategyDistribution].sort(
                    (
                      left,
                      right,
                    ) =>
                      right.netPnl -
                      left.netPnl,
                  )[0]?.strategy ??
                  "—"
                }
                detail={
                  (() => {
                    const item =
                      [...strategyDistribution].sort(
                        (
                          left,
                          right,
                        ) =>
                          right.netPnl -
                          left.netPnl,
                      )[0];

                    return item
                      ? `${formatCurrency(item.netPnl)} net P/L`
                      : "No strategy data";
                  })()
                }
                tone="positive"
              />

              <StrategyDistributionSummaryCard
                label="Highest Win Rate"
                value={
                  [...strategyDistribution]
                    .filter(
                      (
                        item,
                      ) =>
                        item.winners +
                          item.losers >
                        0,
                    )
                    .sort(
                      (
                        left,
                        right,
                      ) =>
                        right.winRate -
                        left.winRate,
                    )[0]?.strategy ??
                  "—"
                }
                detail={
                  (() => {
                    const item =
                      [...strategyDistribution]
                        .filter(
                          (
                            entry,
                          ) =>
                            entry.winners +
                              entry.losers >
                            0,
                        )
                        .sort(
                          (
                            left,
                            right,
                          ) =>
                            right.winRate -
                            left.winRate,
                        )[0];

                    return item
                      ? `${item.winRate.toFixed(1)}% win rate`
                      : "No graded strategy data";
                  })()
                }
                tone="positive"
              />

              <StrategyDistributionSummaryCard
                label="Needs Review"
                value={
                  [...strategyDistribution].sort(
                    (
                      left,
                      right,
                    ) =>
                      left.netPnl -
                      right.netPnl,
                  )[0]?.strategy ??
                  "—"
                }
                detail={
                  (() => {
                    const item =
                      [...strategyDistribution].sort(
                        (
                          left,
                          right,
                        ) =>
                          left.netPnl -
                          right.netPnl,
                      )[0];

                    return item
                      ? `${formatCurrency(item.netPnl)} net P/L`
                      : "No strategy data";
                  })()
                }
                tone={
                  [...strategyDistribution].sort(
                    (
                      left,
                      right,
                    ) =>
                      left.netPnl -
                      right.netPnl,
                  )[0]?.netPnl < 0
                    ? "negative"
                    : "neutral"
                }
              />
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-5 md:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-300">
                <Activity className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Portfolio Snapshot
                </h2>

                <p className="text-sm text-slate-400">
                  Current exposure, capital deployment, strategy mix, and execution averages.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/journal/reports"
            className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
          >
            View Full Analytics
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PortfolioSnapshotCard
            title="Market Exposure"
            items={[
              {
                label: "Open Trades",
                value: String(portfolioSnapshot.openTrades),
              },
              {
                label: "Closed Trades",
                value: String(portfolioSnapshot.closedTrades),
              },
              {
                label: "Long Positions",
                value: String(portfolioSnapshot.longPositions),
              },
              {
                label: "Short Positions",
                value: String(portfolioSnapshot.shortPositions),
              },
            ]}
          />

          <PortfolioSnapshotCard
            title="Capital"
            items={[
              {
                label: "Capital Deployed",
                value: formatCurrency(portfolioSnapshot.capitalDeployed),
              },
              {
                label: "Average Position",
                value: formatCurrency(portfolioSnapshot.averagePositionSize),
              },
              {
                label: "Option Positions",
                value: String(portfolioSnapshot.optionTrades),
              },
              {
                label: "Stock Positions",
                value: String(portfolioSnapshot.stockTrades),
              },
            ]}
          />

          <PortfolioSnapshotCard
            title="Strategy Mix"
            items={[
              {
                label: "Single-Leg",
                value: String(portfolioSnapshot.singleLegStrategies),
              },
              {
                label: "Multi-Leg",
                value: String(portfolioSnapshot.multiLegStrategies),
              },
              {
                label: "Debit Strategies",
                value: String(portfolioSnapshot.debitStrategies),
              },
              {
                label: "Credit Strategies",
                value: String(portfolioSnapshot.creditStrategies),
              },
            ]}
          />

          <PortfolioSnapshotCard
            title="Execution Summary"
            items={[
              {
                label: "Average Contracts",
                value:
                  portfolioSnapshot.averageContracts !== null
                    ? portfolioSnapshot.averageContracts.toFixed(2)
                    : "—",
              },
              {
                label: "Average Return",
                value:
                  portfolioSnapshot.averageReturnPct !== null
                    ? `${portfolioSnapshot.averageReturnPct.toFixed(2)}%`
                    : "—",
                tone:
                  portfolioSnapshot.averageReturnPct !== null &&
                  portfolioSnapshot.averageReturnPct > 0
                    ? "positive"
                    : portfolioSnapshot.averageReturnPct !== null &&
                        portfolioSnapshot.averageReturnPct < 0
                      ? "negative"
                      : "neutral",
              },
              {
                label: "Win Rate",
                value:
                  winRate !== null
                    ? `${winRate.toFixed(1)}%`
                    : "—",
                tone:
                  winRate !== null && winRate >= 50
                    ? "positive"
                    : winRate !== null
                      ? "negative"
                      : "neutral",
              },
              {
                label: "Profit Factor",
                value:
                  profitFactor !== null
                    ? profitFactor.toFixed(2)
                    : "—",
                tone:
                  profitFactor !== null && profitFactor >= 1
                    ? "positive"
                    : profitFactor !== null
                      ? "negative"
                      : "neutral",
              },
            ]}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4 md:p-6 lg:col-span-3">
          <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Trade Log
              </h2>

              <p className="text-sm text-slate-400">
                Showing{" "}
                <span className="font-medium text-slate-200">
                  {visibleStart}
                </span>
                –
                <span className="font-medium text-slate-200">
                  {visibleEnd}
                </span>{" "}
                of{" "}
                <span className="font-medium text-slate-200">
                  {trades.length}
                </span>{" "}
                real trades from the CASE execution ledger and broker imports.
              </p>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex flex-wrap gap-2 text-xs">
                <FilterPill label="All Trades" active />
                <FilterPill label="Open" />
                <FilterPill label="Closed" />
                <FilterPill label="Options" />
                <FilterPill label="Stocks" />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <form
                  action="/dashboard/journal"
                  className="flex items-center gap-2"
                >
                  <label htmlFor="trade-log-limit" className="sr-only">
                    Trade log row limit
                  </label>

                  <select
                    id="trade-log-limit"
                    name="limit"
                    defaultValue={String(tradeLogLimit)}
                    className="rounded-full border border-white/10 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 outline-none transition hover:bg-slate-900 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10"
                  >
                    {TRADE_LOG_LIMIT_OPTIONS.map((option) => (
                      <option
                        key={String(option.value)}
                        value={String(option.value)}
                      >
                        Show {option.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    className="rounded-full border border-white/10 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
                  >
                    Apply
                  </button>
                </form>

                <div className="flex flex-wrap gap-2">
                  {TRADE_LOG_LIMIT_OPTIONS.map((option) => (
                    <Link
                      key={String(option.value)}
                      href={buildJournalLimitUrl(option.value)}
                      className={
                        "rounded-full px-3 py-1.5 text-xs font-medium transition " +
                        (tradeLogLimit === option.value
                          ? "bg-emerald-600 text-white"
                          : "border border-white/10 bg-slate-950 text-slate-400 hover:bg-slate-800")
                      }
                    >
                      {option.label}
                    </Link>
                  ))}
                </div>

                <a
                  href={csvDownloadHref}
                  download="case-trades-journal.csv"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </a>

                <a
                  href={excelDownloadHref}
                  download="case-trades-journal.xls"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  Excel
                </a>

                <a
                  href={jsonDownloadHref}
                  download="case-trades-journal.json"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  JSON
                </a>
              </div>
            </div>
          </div>

          {trades.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-slate-950 px-4 py-10 text-center text-sm text-slate-500">
              No trades found yet. Create a signal, open an execution, or import
              a broker CSV to populate the journal.
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-lg border border-white/10 md:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1150px] text-left text-sm">
                    <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Symbol</th>
                        <th className="px-4 py-3">Source</th>
                        <th className="px-4 py-3">Contract</th>
                        <th className="px-4 py-3">Side</th>
                        <th className="px-4 py-3">Qty</th>
                        <th className="px-4 py-3">Entry</th>
                        <th className="px-4 py-3">Exit</th>
                        <th className="px-4 py-3">Opened</th>
                        <th className="px-4 py-3">Closed</th>
                        <th className="px-4 py-3">Duration</th>
                        <th className="px-4 py-3">P/L</th>
                        <th className="px-4 py-3">P/L %</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">View</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/10">
                      {visibleTrades.map((trade) => (
                        <tr key={trade.id} className="text-slate-300">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-100">
                              {trade.symbol}
                            </div>
                            <div className="text-xs text-slate-500">
                              {trade.instrument} • {trade.strategy} •{" "}
                              {trade.executionStyle}
                              {trade.legCount > 0
                                ? ` • ${trade.legCount} leg${
                                    trade.legCount === 1 ? "" : "s"
                                  }`
                                : ""}
                            </div>

                            <div className="mt-1 text-xs text-slate-600">
                              {trade.entryType}
                              {trade.netEntry !== null
                                ? ` • ${formatCurrency(trade.netEntry)}`
                                : ""}
                              {trade.strategyContracts > 0
                                ? ` • ${trade.strategyContracts} strategy contract${
                                    trade.strategyContracts === 1 ? "" : "s"
                                  }`
                                : ""}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <SourceBadge source={trade.source} />
                          </td>
                          <td className="px-4 py-3">
                            <div>{trade.contractLabel}</div>

                            {trade.legCount > 0 ? (
                              <div className="mt-1 text-xs text-slate-500">
                                Paid {formatCurrency(trade.premiumPaid)} •
                                Received {formatCurrency(trade.premiumReceived)}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">{trade.side}</td>
                          <td className="px-4 py-3">{trade.quantity}</td>
                          <td className="px-4 py-3">
                            {formatCurrency(trade.entryPrice)}
                          </td>
                          <td className="px-4 py-3">
                            {formatCurrency(trade.exitPrice)}
                          </td>
                          <td className="px-4 py-3">
                            {formatDateTime(trade.entryDate)}
                          </td>
                          <td className="px-4 py-3">
                            {formatDateTime(trade.exitDate)}
                          </td>
                          <td className="px-4 py-3">{trade.duration}</td>

                          <td
                            className={`px-4 py-3 font-medium ${getPnlClass(
                              trade.pnl,
                            )}`}
                          >
                            {formatCurrency(trade.pnl)}
                          </td>

                          <td
                            className={`px-4 py-3 font-medium ${getPnlClass(
                              trade.pnlPct,
                            )}`}
                          >
                            {formatPercent(trade.pnlPct)}
                          </td>

                          <td className="px-4 py-3">
                            <StatusBadge status={trade.status} />
                          </td>

                          <td className="px-4 py-3">
                            <Link
                              href={`/dashboard/journal/${trade.id}`}
                              className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
                            >
                              Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3 md:hidden">
                {visibleTrades.map((trade) => (
                  <MobileJournalTradeCard key={trade.id} trade={trade} />
                ))}
              </div>

              {tradeLogLimit !== "all" && totalPages > 1 && (
                <TradeLogPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  limit={tradeLogLimit}
                  pages={paginationPages}
                  visibleStart={visibleStart}
                  visibleEnd={visibleEnd}
                  totalTrades={trades.length}
                />
              )}

              {hiddenTradeCount > 0 && tradeLogLimit === "all" && (
                <div className="mt-4 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-center text-xs text-slate-500">
                  {hiddenTradeCount} more trade
                  {hiddenTradeCount === 1 ? "" : "s"} hidden.
                </div>
              )}
            </>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Quick Actions
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Jump directly into the most common CASE Journal workflows.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <QuickActionCard
                href="/dashboard/admin/signals/create"
                title="New Trade Signal"
                description="Create a new CASE trade idea and execution plan."
                icon={<PlusCircle />}
                tone="emerald"
              />

              <QuickActionCard
                href="/dashboard/journal/import"
                title="Import Broker Trades"
                description="Upload and preview a broker CSV before importing."
                icon={<Upload />}
                tone="blue"
              />

              <QuickActionCard
                href="/dashboard/journal/reports"
                title="Journal Reports"
                description="Review performance, expectancy, drawdown, and strategy results."
                icon={<BarChart3 />}
                tone="purple"
              />

              <QuickActionCard
                href="/dashboard/performance"
                title="Performance Analytics"
                description="Open the broader CASE performance analytics workspace."
                icon={<TrendingUp />}
                tone="cyan"
              />
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-purple-500/10 p-3 text-purple-300">
                <BrainCircuit className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Journal Tools
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Continue documenting and reviewing your active trade workflow.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <QuickActionCard
                href="/dashboard/journal"
                title="Open Trade Log"
                description="Review all native and imported journal trades."
                icon={<ListChecks />}
                tone="slate"
              />

              <QuickActionCard
                href="/dashboard/journal/reports"
                title="Strategy Analytics"
                description="Compare strategy, execution style, DTE, and instrument performance."
                icon={<ScanLine />}
                tone="cyan"
              />

              <QuickActionCard
                href="/dashboard/journal"
                title="Trade Notes"
                description="Open a trade detail record to add notes, setup, and mistakes."
                icon={<NotebookPen />}
                tone="amber"
              />

              <QuickActionCard
                href="/dashboard/journal"
                title="CASE AI Reviews"
                description="Open a completed execution and generate an AI coaching review."
                icon={<Bot />}
                tone="purple"
              />
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-sky-500/10 p-3 text-sky-300">
                <Settings2 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Export & Refresh
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Download your complete journal dataset or refresh the dashboard.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <QuickDownloadCard
                href={csvDownloadHref}
                filename="case-trades-journal.csv"
                title="Export CSV"
                description="Download all journal trades as a CSV file."
              />

              <QuickDownloadCard
                href={excelDownloadHref}
                filename="case-trades-journal.xls"
                title="Export Excel"
                description="Download all journal trades in Excel format."
              />

              <QuickDownloadCard
                href={jsonDownloadHref}
                filename="case-trades-journal.json"
                title="Export JSON"
                description="Download the normalized journal dataset as JSON."
              />

              <QuickActionCard
                href="/dashboard/journal"
                title="Refresh Journal"
                description="Reload the latest executions, imports, and activity."
                icon={<RefreshCw />}
                tone="slate"
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function formatTradingGoalValue(
  value: number,
  unit: JournalTradingGoal["unit"],
) {
  if (unit === "currency") {
    return formatCurrency(value);
  }

  if (unit === "percent") {
    return `${value.toFixed(1)}%`;
  }

  return value.toFixed(2);
}

function getTradingGoalProgress(
  goal: JournalTradingGoal,
) {
  if (goal.id === "position-concentration") {
    if (goal.current <= goal.target) {
      return 100;
    }

    return Math.max(
      0,
      Math.min(
        100,
        (goal.target / goal.current) * 100,
      ),
    );
  }

  return getGoalProgress(
    Math.max(goal.current, 0),
    goal.target,
  );
}

function TradingGoalSummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "warning" | "negative" | "neutral";
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "warning"
        ? "text-amber-300"
        : tone === "negative"
          ? "text-red-300"
          : "text-slate-100";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className={`mt-2 text-xl font-semibold ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function TradingGoalCard({
  goal,
}: {
  goal: JournalTradingGoal;
}) {
  const progress =
    getTradingGoalProgress(goal);

  const statusLabel =
    goal.status === "ON_TRACK"
      ? "On Track"
      : goal.status === "NEEDS_ATTENTION"
        ? "Needs Attention"
        : "Off Track";

  const statusClasses =
    goal.status === "ON_TRACK"
      ? {
          badge:
            "bg-emerald-500/10 text-emerald-300",
          bar:
            "bg-emerald-500",
        }
      : goal.status === "NEEDS_ATTENTION"
        ? {
            badge:
              "bg-amber-500/10 text-amber-300",
            bar:
              "bg-amber-500",
          }
        : {
            badge:
              "bg-red-500/10 text-red-300",
            bar:
              "bg-red-500",
          };

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-100">
          {goal.label}
        </p>

        <span
          className={
            "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide " +
            statusClasses.badge
          }
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xl font-semibold text-slate-100">
            {formatTradingGoalValue(
              goal.current,
              goal.unit,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-600">
            Target:{" "}
            {formatTradingGoalValue(
              goal.target,
              goal.unit,
            )}
          </p>
        </div>

        <span className="text-xs font-semibold text-slate-400">
          {progress.toFixed(0)}%
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-900">
        <div
          className={
            "h-full rounded-full transition-all " +
            statusClasses.bar
          }
          style={{
            width:
              `${progress}%`,
          }}
        />
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {goal.description}
      </p>
    </div>
  );
}

function RiskSummaryCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "negative" | "warning" | "neutral";
}) {
  const valueClass =
    tone === "negative"
      ? "text-red-300"
      : tone === "warning"
        ? "text-amber-300"
        : "text-slate-100";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className={`mt-2 text-xl font-semibold ${valueClass}`}>
        {value}
      </p>

      {detail ? (
        <p className="mt-1 text-xs text-slate-600">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function RiskExposureMetric({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "positive" | "negative" | "info" | "warning";
}) {
  const percentage =
    total > 0
      ? (
          value /
          total
        ) *
        100
      : 0;

  const barClass =
    tone === "positive"
      ? "bg-emerald-500"
      : tone === "negative"
        ? "bg-red-500"
        : tone === "warning"
          ? "bg-amber-500"
          : "bg-sky-500";

  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          {label}
        </span>

        <span className="text-xs font-semibold text-slate-200">
          {percentage.toFixed(1)}%
        </span>
      </div>

      <p className="mt-2 text-sm font-semibold text-slate-100">
        {formatCurrency(
          value,
        )}
      </p>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950">
        <div
          className={
            "h-full rounded-full " +
            barClass
          }
          style={{
            width:
              `${Math.min(
                percentage,
                100,
              )}%`,
          }}
        />
      </div>
    </div>
  );
}

function RiskExposureBar({
  item,
}: {
  item: JournalRiskExposureItem;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">
            {item.label}
          </p>

          <p className="text-xs text-slate-600">
            {item.positions} position
            {item.positions === 1 ? "" : "s"}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm font-semibold text-red-300">
            {formatCurrency(
              item.estimatedCapital,
            )}
          </p>

          <p className="text-xs text-slate-600">
            {item.percentage.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-900">
        <div
          className="h-full rounded-full bg-red-500/70"
          style={{
            width:
              `${Math.min(
                item.percentage,
                100,
              )}%`,
          }}
        />
      </div>
    </div>
  );
}

function RiskStrategyCard({
  item,
}: {
  item: JournalRiskExposureItem;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/70 p-3">
      <p className="text-sm font-semibold text-slate-100">
        {item.label}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {item.positions} open position
        {item.positions === 1 ? "" : "s"}
      </p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="text-sm font-semibold text-red-300">
          {formatCurrency(
            item.estimatedCapital,
          )}
        </span>

        <span className="text-xs text-slate-600">
          {item.percentage.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function getAiRecommendationToneClasses(
  tone: JournalAiRecommendation["tone"],
) {
  if (tone === "positive") {
    return {
      border:
        "border-emerald-500/20",
      icon:
        "bg-emerald-500/10 text-emerald-300",
      label:
        "text-emerald-300",
    };
  }

  if (tone === "negative") {
    return {
      border:
        "border-red-500/20",
      icon:
        "bg-red-500/10 text-red-300",
      label:
        "text-red-300",
    };
  }

  if (tone === "info") {
    return {
      border:
        "border-sky-500/20",
      icon:
        "bg-sky-500/10 text-sky-300",
      label:
        "text-sky-300",
    };
  }

  return {
    border:
      "border-white/10",
    icon:
      "bg-slate-800 text-slate-300",
    label:
      "text-slate-300",
  };
}

function getAiRecommendationIcon(
  category: JournalAiRecommendation["category"],
) {
  if (category === "STRENGTH") {
    return <Trophy />;
  }

  if (category === "RISK") {
    return <Target />;
  }

  if (category === "JOURNAL") {
    return <NotebookPen />;
  }

  if (category === "REVIEW") {
    return <Bot />;
  }

  return <BarChart3 />;
}

function AiRecommendationCard({
  recommendation,
}: {
  recommendation: JournalAiRecommendation;
}) {
  const tone =
    getAiRecommendationToneClasses(
      recommendation.tone,
    );

  return (
    <Link
      href={recommendation.href}
      className={
        "group rounded-xl border bg-slate-950/80 p-4 transition hover:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 " +
        tone.border
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            "shrink-0 rounded-lg p-2 [&>svg]:h-4 [&>svg]:w-4 " +
            tone.icon
          }
        >
          {getAiRecommendationIcon(
            recommendation.category,
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={
              "text-xs font-semibold uppercase tracking-wide " +
              tone.label
            }
          >
            {recommendation.category}
          </p>

          <h3 className="mt-2 text-sm font-semibold text-slate-100">
            {recommendation.title}
          </h3>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            {recommendation.description}
          </p>

          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-300">
            {recommendation.actionLabel}
            <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function JournalCoverageBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const normalizedValue =
    Math.max(
      0,
      Math.min(
        100,
        value,
      ),
    );

  const barClass =
    normalizedValue >= 80
      ? "bg-emerald-500"
      : normalizedValue >= 50
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-400">
          {label}
        </span>

        <span className="text-xs font-semibold text-slate-200">
          {normalizedValue.toFixed(0)}%
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-900">
        <div
          className={
            "h-full rounded-full transition-all " +
            barClass
          }
          style={{
            width:
              `${normalizedValue}%`,
          }}
        />
      </div>
    </div>
  );
}

function OpenPositionSummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "negative"
        ? "text-red-300"
        : "text-slate-100";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className={`mt-2 text-xl font-semibold ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function OpenPositionCard({
  position,
}: {
  position: JournalOpenPosition;
}) {
  const trade =
    position.trade;

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-slate-100">
              {trade.symbol}
            </p>

            <SourceBadge
              source={
                trade.source
              }
            />

            <StatusBadge
              status={
                trade.status
              }
            />
          </div>

          <p className="mt-1 text-xs text-slate-500">
            {trade.instrument} • {trade.strategy} •{" "}
            {trade.executionStyle}
            {trade.legCount > 0
              ? ` • ${trade.legCount} leg${
                  trade.legCount === 1
                    ? ""
                    : "s"
                }`
              : ""}
          </p>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <p className={`text-sm font-semibold ${getPnlClass(trade.pnlPct)}`}>
            {formatPercent(
              trade.pnlPct,
            )}
          </p>

          <p className="text-xs text-slate-500">
            Current return
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-slate-900/70 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Contract
        </p>

        <p className="mt-1 break-words text-sm text-slate-200">
          {trade.contractLabel}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <OpenPositionMetric
          label="Days Open"
          value={
            position.daysOpen !== null
              ? String(position.daysOpen)
              : "—"
          }
        />

        <OpenPositionMetric
          label="Entry"
          value={formatCurrency(trade.entryPrice)}
        />

        <OpenPositionMetric
          label="Net Entry"
          value={formatCurrency(trade.netEntry)}
        />

        <OpenPositionMetric
          label="Capital"
          value={formatCurrency(position.estimatedCapital)}
        />

        <OpenPositionMetric
          label="Qty"
          value={String(trade.quantity)}
        />

        <OpenPositionMetric
          label="Contracts"
          value={String(trade.strategyContracts)}
        />

        <OpenPositionMetric
          label="Opened"
          value={formatDateTime(trade.entryDate)}
        />

        <OpenPositionMetric
          label="Entry Type"
          value={trade.entryType}
        />
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href={`/dashboard/journal/${trade.id}`}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-500/30 px-4 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-500/10"
        >
          View Trade
          <ChevronRight className="h-4 w-4" />
        </Link>

        {trade.source === "CASE" ? (
          <Link
            href={`/dashboard/signals/${trade.signal_id}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-900"
          >
            View Signal
            <ExternalLink className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function OpenPositionMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/60 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-medium text-slate-300">
        {value}
      </p>
    </div>
  );
}

function RankedMetricSummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone:
    | "positive"
    | "negative"
    | "neutral";
}) {
  const valueClass =
    tone ===
    "positive"
      ? "text-emerald-300"
      : tone ===
          "negative"
        ? "text-red-300"
        : "text-slate-100";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className={`mt-2 text-2xl font-semibold ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function RankedTradeSummaryCard({
  label,
  trade,
  tone,
}: {
  label: string;
  trade: JournalTrade | null;
  tone:
    | "positive"
    | "negative";
}) {
  const valueClass =
    tone ===
    "positive"
      ? "text-emerald-300"
      : "text-red-300";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className={`mt-2 text-2xl font-semibold ${trade ? valueClass : "text-slate-100"}`}>
        {trade
          ? formatCurrency(
              trade.pnl,
            )
          : "—"}
      </p>

      {trade ? (
        <div className="mt-3">
          <p className="text-sm font-semibold text-slate-200">
            {trade.symbol}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {trade.strategy} • {trade.executionStyle}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function RankedTradeList({
  title,
  description,
  trades,
  tone,
  emptyMessage,
}: {
  title: string;
  description: string;
  trades: JournalRankedTrade[];
  tone:
    | "positive"
    | "negative";
  emptyMessage: string;
}) {
  const titleClass =
    tone ===
    "positive"
      ? "text-emerald-300"
      : "text-red-300";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
      <div>
        <h3 className={`text-sm font-semibold ${titleClass}`}>
          {title}
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      </div>

      {trades.length === 0 ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-slate-900/70 px-4 py-6 text-center text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {trades.map(
            (
              rankedTrade,
            ) => (
              <RankedTradeRow
                key={
                  rankedTrade.trade.id
                }
                rankedTrade={
                  rankedTrade
                }
                tone={
                  tone
                }
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function RankedTradeRow({
  rankedTrade,
  tone,
}: {
  rankedTrade: JournalRankedTrade;
  tone:
    | "positive"
    | "negative";
}) {
  const trade =
    rankedTrade.trade;

  const rankClass =
    tone ===
    "positive"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : "border-red-500/20 bg-red-500/10 text-red-300";

  return (
    <Link
      href={`/dashboard/journal/${trade.id}`}
      className="group block rounded-xl border border-white/10 bg-slate-900/70 p-4 transition hover:border-white/20 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
    >
      <div className="flex items-start gap-3">
        <span
          className={
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold " +
            rankClass
          }
        >
          {rankedTrade.rank}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-100">
                  {trade.symbol}
                </p>

                <SourceBadge
                  source={
                    trade.source
                  }
                />
              </div>

              <p className="mt-1 text-xs text-slate-500">
                {trade.instrument} • {trade.strategy} •{" "}
                {trade.executionStyle}
              </p>
            </div>

            <div className="shrink-0 text-left sm:text-right">
              <p className={`text-sm font-semibold ${getPnlClass(trade.pnl)}`}>
                {formatCurrency(
                  trade.pnl,
                )}
              </p>

              <p className={`text-xs font-medium ${getPnlClass(trade.pnlPct)}`}>
                {formatPercent(
                  trade.pnlPct,
                )}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <RankedTradeMiniMetric
              label="Entry"
              value={formatDateTime(
                trade.entryDate,
              )}
            />

            <RankedTradeMiniMetric
              label="Exit"
              value={formatDateTime(
                trade.exitDate,
              )}
            />

            <RankedTradeMiniMetric
              label="Duration"
              value={
                trade.duration
              }
            />

            <RankedTradeMiniMetric
              label="Outcome"
              value={
                trade.outcome
              }
            />
          </div>
        </div>

        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-700 transition group-hover:translate-x-0.5 group-hover:text-slate-400" />
      </div>
    </Link>
  );
}

function RankedTradeMiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950 p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-medium text-slate-300">
        {value}
      </p>
    </div>
  );
}

function getHeatmapCellClass(
  day: JournalPerformanceHeatmapDay,
) {
  if (day.trades === 0) {
    return "border-white/10 bg-slate-900 text-slate-700";
  }

  if (day.pnl > 0) {
    if (day.intensity === 4) {
      return "border-emerald-400/40 bg-emerald-500/80 text-white";
    }

    if (day.intensity === 3) {
      return "border-emerald-500/30 bg-emerald-500/60 text-emerald-50";
    }

    if (day.intensity === 2) {
      return "border-emerald-500/20 bg-emerald-500/40 text-emerald-100";
    }

    return "border-emerald-500/20 bg-emerald-500/20 text-emerald-200";
  }

  if (day.pnl < 0) {
    if (day.intensity === 4) {
      return "border-red-400/40 bg-red-500/80 text-white";
    }

    if (day.intensity === 3) {
      return "border-red-500/30 bg-red-500/60 text-red-50";
    }

    if (day.intensity === 2) {
      return "border-red-500/20 bg-red-500/40 text-red-100";
    }

    return "border-red-500/20 bg-red-500/20 text-red-200";
  }

  return "border-amber-500/20 bg-amber-500/20 text-amber-200";
}

function PerformanceHeatmapCell({
  day,
}: {
  day: JournalPerformanceHeatmapDay;
}) {
  const title = [
    day.label,
    `${day.trades} trade${day.trades === 1 ? "" : "s"}`,
    `P/L: ${formatCurrency(day.pnl)}`,
    `${day.winners}W / ${day.losers}L / ${day.breakevens}BE`,
  ].join(" • ");

  return (
    <div
      title={title}
      aria-label={title}
      className={
        "flex h-8 w-full min-w-8 items-center justify-center rounded-md border text-[10px] font-semibold transition hover:scale-110 " +
        getHeatmapCellClass(day)
      }
    >
      {day.trades > 0
        ? day.trades
        : ""}
    </div>
  );
}

function PerformanceHeatmapSummaryCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "negative"
        ? "text-red-300"
        : "text-slate-100";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className={`mt-2 text-xl font-semibold ${valueClass}`}>
        {value}
      </p>

      {detail ? (
        <p className="mt-1 text-xs text-slate-600">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function PerformancePeriodCard({
  period,
}: {
  period: JournalPerformancePeriod;
}) {
  const tone =
    period.pnl >
    0
      ? "positive"
      : period.pnl <
          0
        ? "negative"
        : "neutral";

  const valueClass =
    tone ===
    "positive"
      ? "text-emerald-300"
      : tone ===
          "negative"
        ? "text-red-300"
        : "text-slate-100";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {period.label}
      </p>

      <p className={`mt-2 text-2xl font-semibold ${valueClass}`}>
        {formatCurrency(
          period.pnl,
        )}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-white/10 bg-slate-900/70 p-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-600">
            Trades
          </p>

          <p className="mt-1 font-semibold text-slate-200">
            {period.trades}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-slate-900/70 p-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-600">
            Win Rate
          </p>

          <p className="mt-1 font-semibold text-slate-200">
            {period.winRate !== null
              ? `${period.winRate.toFixed(1)}%`
              : "—"}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-600">
        {period.winners}W / {period.losers}L / {period.breakevens}BE
      </p>
    </div>
  );
}

function MonthlyPerformanceRow({
  month,
  maxAbsPnl,
}: {
  month: JournalMonthlyPerformance;
  maxAbsPnl: number;
}) {
  const width =
    maxAbsPnl >
    0
      ? Math.max(
          (
            Math.abs(
              month.pnl,
            ) /
            maxAbsPnl
          ) *
            100,
          3,
        )
      : 0;

  const barClass =
    month.pnl >
    0
      ? "bg-emerald-500/70"
      : month.pnl <
          0
        ? "bg-red-500/70"
        : "bg-slate-600";

  return (
    <div>
      <div className="mb-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-slate-100">
            {month.label}
          </p>

          <p className="text-xs text-slate-500">
            {month.trades} trade
            {month.trades === 1 ? "" : "s"} •{" "}
            {month.winners}W / {month.losers}L / {month.breakevens}BE
          </p>
        </div>

        <div className="text-left sm:text-right">
          <p className={`text-sm font-semibold ${getPnlClass(month.pnl)}`}>
            {formatCurrency(month.pnl)}
          </p>

          <p className="text-xs text-slate-500">
            {month.winRate !== null
              ? `${month.winRate.toFixed(1)}% win rate`
              : "No graded trades"}
          </p>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-900">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{
            width:
              `${width}%`,
          }}
        />
      </div>
    </div>
  );
}

function StrategyDistributionBar({
  item,
  maxTrades,
}: {
  item: JournalStrategyDistributionItem;
  maxTrades: number;
}) {
  const width =
    maxTrades >
    0
      ? Math.max(
          (
            item.trades /
            maxTrades
          ) *
            100,
          4,
        )
      : 0;

  return (
    <div>
      <div className="mb-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">
            {item.strategy}
          </p>

          <p className="text-xs text-slate-500">
            {item.trades} trade
            {item.trades === 1 ? "" : "s"} •{" "}
            {item.percentage.toFixed(1)}% of journal •{" "}
            {item.winners}W / {item.losers}L / {item.breakevens}BE
          </p>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <p className={`text-sm font-semibold ${getPnlClass(item.netPnl)}`}>
            {formatCurrency(item.netPnl)}
          </p>

          <p className="text-xs text-slate-500">
            {item.winRate.toFixed(1)}% win rate
          </p>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-900">
        <div
          className="h-full rounded-full bg-emerald-500/70"
          style={{
            width:
              `${width}%`,
          }}
        />
      </div>
    </div>
  );
}

function StrategyDistributionSummaryCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone:
    | "positive"
    | "negative"
    | "neutral";
}) {
  const valueClass =
    tone ===
    "positive"
      ? "text-emerald-300"
      : tone ===
          "negative"
        ? "text-red-300"
        : "text-slate-100";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className={`mt-2 break-words text-lg font-semibold ${valueClass}`}>
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {detail}
      </p>
    </div>
  );
}

function getAiCoachToneClasses(
  tone: JournalAiCoachInsight["tone"],
) {
  if (
    tone ===
    "positive"
  ) {
    return {
      border:
        "border-emerald-500/20",
      value:
        "text-emerald-300",
      badge:
        "bg-emerald-500/10 text-emerald-300",
    };
  }

  if (
    tone ===
    "negative"
  ) {
    return {
      border:
        "border-red-500/20",
      value:
        "text-red-300",
      badge:
        "bg-red-500/10 text-red-300",
    };
  }

  if (
    tone ===
    "info"
  ) {
    return {
      border:
        "border-sky-500/20",
      value:
        "text-sky-300",
      badge:
        "bg-sky-500/10 text-sky-300",
    };
  }

  return {
    border:
      "border-white/10",
    value:
      "text-slate-100",
    badge:
      "bg-slate-800 text-slate-300",
  };
}

function AiCoachInsightCard({
  insight,
}: {
  insight: JournalAiCoachInsight;
}) {
  const tone =
    getAiCoachToneClasses(
      insight.tone,
    );

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={
            "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide " +
            tone.badge
          }
        >
          {insight.label}
        </span>

        {insight.href ? (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-700 transition group-hover:translate-x-0.5 group-hover:text-slate-400" />
        ) : null}
      </div>

      <p
        className={
          "mt-4 break-words text-xl font-semibold " +
          tone.value
        }
      >
        {insight.value}
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        {insight.description}
      </p>
    </>
  );

  if (
    insight.href
  ) {
    return (
      <Link
        href={
          insight.href
        }
        className={
          "group rounded-xl border bg-slate-950/80 p-4 transition hover:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-purple-500/30 " +
          tone.border
        }
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={
        "rounded-xl border bg-slate-950/80 p-4 " +
        tone.border
      }
    >
      {content}
    </div>
  );
}

function PortfolioSnapshotCard({
  title,
  items,
}: {
  title: string;
  items: Array<{
    label: string;
    value: string;
    tone?: "positive" | "negative" | "neutral";
  }>;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
      <h3 className="text-sm font-semibold text-slate-100">
        {title}
      </h3>

      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const valueClass =
            item.tone === "positive"
              ? "text-emerald-400"
              : item.tone === "negative"
                ? "text-red-400"
                : "text-slate-200";

          return (
            <div
              key={`${title}-${item.label}`}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-xs text-slate-500">
                {item.label}
              </span>

              <span className={`text-sm font-semibold ${valueClass}`}>
                {item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function TradeLogPagination({
  currentPage,
  totalPages,
  limit,
  pages,
  visibleStart,
  visibleEnd,
  totalTrades,
}: {
  currentPage: number;
  totalPages: number;
  limit: TradeLogLimit;
  pages: number[];
  visibleStart: number;
  visibleEnd: number;
  totalTrades: number;
}) {
  return (
    <div className="mt-5 flex flex-col gap-4 rounded-xl border border-white/10 bg-slate-950 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="text-xs text-slate-500">
        Showing{" "}
        <span className="font-semibold text-slate-300">{visibleStart}</span>
        –
        <span className="font-semibold text-slate-300">{visibleEnd}</span> of{" "}
        <span className="font-semibold text-slate-300">{totalTrades}</span>{" "}
        trades • Page{" "}
        <span className="font-semibold text-slate-300">{currentPage}</span> of{" "}
        <span className="font-semibold text-slate-300">{totalPages}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={
            currentPage > 1
              ? buildJournalUrl({ limit, page: currentPage - 1 })
              : buildJournalUrl({ limit, page: 1 })
          }
          aria-disabled={currentPage <= 1}
          className={
            "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition " +
            (currentPage <= 1
              ? "pointer-events-none border-white/5 bg-slate-900 text-slate-700"
              : "border-white/10 bg-slate-900 text-slate-300 hover:bg-slate-800")
          }
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </Link>

        <div className="flex flex-wrap items-center gap-1">
          {pages.map((page, index) => {
            const previousPage = pages[index - 1];
            const showEllipsis =
              previousPage !== undefined && page - previousPage > 1;

            return (
              <div key={page} className="flex items-center gap-1">
                {showEllipsis && (
                  <span className="px-2 text-xs text-slate-600">…</span>
                )}

                <Link
                  href={buildJournalUrl({ limit, page })}
                  className={
                    "inline-flex h-8 min-w-8 items-center justify-center rounded-full px-3 text-xs font-semibold transition " +
                    (page === currentPage
                      ? "bg-emerald-600 text-white"
                      : "border border-white/10 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200")
                  }
                >
                  {page}
                </Link>
              </div>
            );
          })}
        </div>

        <Link
          href={
            currentPage < totalPages
              ? buildJournalUrl({ limit, page: currentPage + 1 })
              : buildJournalUrl({ limit, page: totalPages })
          }
          aria-disabled={currentPage >= totalPages}
          className={
            "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition " +
            (currentPage >= totalPages
              ? "pointer-events-none border-white/5 bg-slate-900 text-slate-700"
              : "border-white/10 bg-slate-900 text-slate-300 hover:bg-slate-800")
          }
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function MobileJournalTradeCard({ trade }: { trade: JournalTrade }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-100">
              {trade.symbol}
            </h3>

            <StatusBadge status={trade.status} />
          </div>

          <p className="mt-1 text-xs text-slate-500">
            {trade.instrument} • {trade.strategy} •{" "}
            {trade.executionStyle}
            {trade.legCount > 0
              ? ` • ${trade.legCount} leg${
                  trade.legCount === 1 ? "" : "s"
                }`
              : ""}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className={`text-sm font-semibold ${getPnlClass(trade.pnl)}`}>
            {formatCurrency(trade.pnl)}
          </p>
          <p className={`text-xs font-medium ${getPnlClass(trade.pnlPct)}`}>
            {formatPercent(trade.pnlPct)}
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/70 p-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Contract
          </p>
          <p className="mt-1 break-words text-sm text-slate-200">
            {trade.contractLabel}
          </p>
        </div>

        <SourceBadge source={trade.source} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <MobileTradeField label="Side" value={trade.side} />
        <MobileTradeField
          label="Strategy"
          value={trade.strategy}
        />
        <MobileTradeField
          label="Execution Style"
          value={trade.executionStyle}
        />
        <MobileTradeField
          label="Entry Type"
          value={trade.entryType}
        />
        <MobileTradeField
          label="Net Entry"
          value={formatCurrency(trade.netEntry)}
        />
        <MobileTradeField
          label="Legs"
          value={String(trade.legCount)}
        />
        <MobileTradeField
          label="Strategy Contracts"
          value={String(trade.strategyContracts)}
        />
        <MobileTradeField
          label="Total Contracts"
          value={String(trade.totalContracts)}
        />
        <MobileTradeField
          label="Premium Paid"
          value={formatCurrency(trade.premiumPaid)}
        />
        <MobileTradeField
          label="Premium Received"
          value={formatCurrency(trade.premiumReceived)}
        />
        <MobileTradeField label="Qty" value={String(trade.quantity)} />
        <MobileTradeField
          label="Entry"
          value={formatCurrency(trade.entryPrice)}
        />
        <MobileTradeField
          label="Exit"
          value={formatCurrency(trade.exitPrice)}
        />
        <MobileTradeField
          label="Opened"
          value={formatDateTime(trade.entryDate)}
        />
        <MobileTradeField
          label="Closed"
          value={formatDateTime(trade.exitDate)}
        />
        <MobileTradeField label="Duration" value={trade.duration} />
        <MobileTradeField label="Outcome" value={trade.outcome} />
      </div>

      <Link
        href={`/dashboard/journal/${trade.id}`}
        className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-emerald-500/30 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/10"
      >
        View Trade Details
      </Link>
    </div>
  );
}

function MobileTradeField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/60 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-slate-200">
        {value}
      </p>
    </div>
  );
}

function JournalUpgradeScreen() {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-8">
        <div className="mb-5 inline-flex rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
          <Lock className="h-6 w-6" />
        </div>

        <h1 className="text-2xl font-semibold text-slate-100">
          Unlock CASE Journal
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          CASE Journal is a subscription-based trading journal for tracking
          trades, notes, screenshots, performance, and future AI trade reviews.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/billing"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            View Journal Plans
          </Link>

          <Link
            href="/"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Learn More
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PlanCard
          title="Starter"
          price="$14.99/mo"
          items={["Stock journaling", "Basic notes", "Basic reports"]}
        />
        <PlanCard
          title="Pro"
          price="$29.99/mo"
          featured
          items={[
            "Stock journaling",
            "Options journaling",
            "Advanced analytics",
          ]}
        />
        <PlanCard
          title="Elite"
          price="$49.99/mo"
          items={["Everything in Pro", "AI trade reviews", "Trade grading"]}
        />
      </div>
    </div>
  );
}

function PlanCard({
  title,
  price,
  items,
  featured = false,
}: {
  title: string;
  price: string;
  items: string[];
  featured?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl border p-6 " +
        (featured
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-white/10 bg-slate-900/80")
      }
    >
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      <p className="mt-2 text-2xl font-bold text-emerald-400">{price}</p>

      <div className="mt-5 space-y-3 text-sm text-slate-300">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturePill({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span
      className={
        "rounded-full px-3 py-1 " +
        (enabled
          ? "bg-emerald-500/10 text-emerald-300"
          : "bg-slate-800 text-slate-500")
      }
    >
      {label}
    </span>
  );
}

function FilterPill({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <span
      className={
        "rounded-full px-3 py-1 " +
        (active
          ? "bg-emerald-600 text-white"
          : "border border-white/10 bg-slate-950 text-slate-400")
      }
    >
      {label}
    </span>
  );
}

function SourceBadge({ source }: { source: JournalTrade["source"] }) {
  const className =
    source === "IMPORT"
      ? "bg-blue-500/10 text-blue-300"
      : "bg-emerald-500/10 text-emerald-300";

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${className}`}>
      {source === "IMPORT" ? "Import" : "CASE"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  const className =
    normalized === "closed"
      ? "bg-sky-500/10 text-sky-300"
      : normalized === "open" || normalized === "active"
        ? "bg-emerald-500/10 text-emerald-300"
        : normalized === "watching"
          ? "bg-blue-500/10 text-blue-300"
          : normalized === "expired"
            ? "bg-red-500/10 text-red-300"
            : "bg-slate-500/10 text-slate-300";

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${className}`}>
      {status}
    </span>
  );
}


type QuickActionTone =
  | "emerald"
  | "blue"
  | "purple"
  | "cyan"
  | "amber"
  | "slate";

function getQuickActionToneClasses(
  tone: QuickActionTone,
) {
  if (tone === "blue") {
    return {
      icon: "border-blue-500/20 bg-blue-500/10 text-blue-300",
      hover: "hover:border-blue-500/30 hover:bg-blue-500/5",
    };
  }

  if (tone === "purple") {
    return {
      icon: "border-purple-500/20 bg-purple-500/10 text-purple-300",
      hover: "hover:border-purple-500/30 hover:bg-purple-500/5",
    };
  }

  if (tone === "cyan") {
    return {
      icon: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
      hover: "hover:border-cyan-500/30 hover:bg-cyan-500/5",
    };
  }

  if (tone === "amber") {
    return {
      icon: "border-amber-500/20 bg-amber-500/10 text-amber-300",
      hover: "hover:border-amber-500/30 hover:bg-amber-500/5",
    };
  }

  if (tone === "slate") {
    return {
      icon: "border-white/10 bg-slate-900 text-slate-300",
      hover: "hover:border-white/20 hover:bg-slate-900",
    };
  }

  return {
    icon: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    hover: "hover:border-emerald-500/30 hover:bg-emerald-500/5",
  };
}

function QuickActionCard({
  href,
  title,
  description,
  icon,
  tone,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  tone: QuickActionTone;
}) {
  const toneClasses =
    getQuickActionToneClasses(
      tone,
    );

  return (
    <Link
      href={href}
      className={
        "group rounded-xl border border-white/10 bg-slate-950 p-4 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/30 " +
        toneClasses.hover
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            "shrink-0 rounded-lg border p-2 transition group-hover:scale-105 [&>svg]:h-4 [&>svg]:w-4 " +
            toneClasses.icon
          }
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <ChevronRight className="ml-auto mt-1 h-4 w-4 shrink-0 text-slate-700 transition group-hover:translate-x-0.5 group-hover:text-slate-400" />
      </div>
    </Link>
  );
}

function QuickDownloadCard({
  href,
  filename,
  title,
  description,
}: {
  href: string;
  filename: string;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      download={filename}
      className="group rounded-xl border border-white/10 bg-slate-950 p-4 transition hover:border-sky-500/30 hover:bg-sky-500/5 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-lg border border-sky-500/20 bg-sky-500/10 p-2 text-sky-300 transition group-hover:scale-105 [&>svg]:h-4 [&>svg]:w-4">
          <Download />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <Download className="ml-auto mt-1 h-4 w-4 shrink-0 text-slate-700 transition group-hover:text-sky-300" />
      </div>
    </a>
  );
}

function JournalSideCard({
  title,
  icon,
  body,
  items,
}: {
  title: string;
  icon: ReactNode;
  body: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <div className="mb-4 text-emerald-400 [&>svg]:h-6 [&>svg]:w-6">
        {icon}
      </div>

      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>

      <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>

      <div className="mt-5 space-y-3 text-sm text-slate-300">
        {items.map((item) => (
          <ChecklistItem key={item} text={item} />
        ))}
      </div>
    </div>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-emerald-400" />
      <span>{text}</span>
    </div>
  );
}
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserEntitlements } from "@/lib/auth/getUserEntitlements";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import ClosedTradesTable from "@/components/journal/ClosedTradesTable";
import SymbolPerformanceTable from "@/components/journal/SymbolPerformanceTable";
import ReportFilters from "@/components/journal/ReportFilters";
import BestWorstTradeCard from "@/components/journal/BestWorstTradeCard";
import DailyPnlSection from "@/components/journal/DailyPnlSection";
import EquityMonthlySection from "@/components/journal/EquityMonthlySection";
import ReportKpiGrid from "@/components/journal/ReportKpiGrid";
import PerformanceAnalyticsSwitcher from "@/components/journal/PerformanceAnalyticsSwitcher";
import type { InstrumentPerformance } from "@/components/journal/InstrumentPerformanceTable";
import type { ConfidencePerformance } from "@/components/journal/ConfidencePerformanceTable";
import type { OptionTypePerformance } from "@/components/journal/OptionTypePerformanceTable";
import type { ExpirationPerformance } from "@/components/journal/ExpirationPerformanceTable";
import type { DtePerformance } from "@/components/journal/DtePerformanceTable";




export const dynamic = "force-dynamic";

type JournalReportsPageProps = {
  searchParams?: {
    range?: string;
    status?: string;
    instrument?: string;
    symbol?: string;
  };
};

type ReportRange = "7d" | "30d" | "3m" | "6m" | "1y" | "all";
type ReportStatus =
  "all" | "open" | "closed" | "winners" | "losers" | "breakeven";
type ReportInstrument = "all" | "options" | "stocks";

type FillRow = {
  side: string | null;
  contracts: number | null;
  price: number | null;
  created_at: string | null;
};

type ExecutionRow = {
  id: string;
  signal_id: string;
  status: string | null;
  contracts: number | null;
  entry_price: number | null;
  exit_price: number | null;
  pnl: number | null;
  pnl_pct: number | null;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string | null;
  execution_fills: FillRow[] | null;
  signals: {
    id: string;
    asset: string | null;
    underlying: string | null;
    action: string | null;
    open_action: string | null;
    instrument_type: string | null;
    option_type: string | null;
    expiration_date: string | null;
    entry_date: string | null;
    strike_price: number | null;
    trade_style: string | null;
    confidence: number | null;
    status: string | null;
    outcome: string | null;
    return_pct: number | null;
    created_by: string | null;
  } | null;
};

type ReportTrade = {
  id: string;
  signal_id: string;
  symbol: string;
  instrument_type: string;
  option_type: string | null;
  expiration_date: string | null;
  entry_date: string | null;
  trade_style: string;
  confidence: number | null;
  side: string;
  quantity: number;
  entry_price: number | null;
  exit_price: number | null;
  opened_at: string | null;
  closed_at: string | null;
  duration_minutes: number | null;
  profit_loss: number | null;
  profit_loss_pct: number | null;
  status: string;
  outcome: "WIN" | "LOSS" | "BREAKEVEN" | null;
};

type SymbolPerformance = {
  symbol: string;
  trades: number;
  winners: number;
  losers: number;
  netPnl: number;
  winRate: number;
};

type EquityCurvePoint = {
  label: string;
  date: string;
  pnl: number;
  cumulativePnl: number;
};

type MonthlyPnlPoint = {
  label: string;
  monthKey: string;
  trades: number;
  winners: number;
  losers: number;
  netPnl: number;
};

type DailyPnlPoint = {
  dateKey: string;
  label: string;
  trades: number;
  winners: number;
  losers: number;
  breakevens: number;
  netPnl: number;
};

type StreakStats = {
  currentType: "WIN" | "LOSS" | "BREAKEVEN" | null;
  currentCount: number;
  longestWinStreak: number;
  longestLossStreak: number;
};

type DrawdownStats = {
  maxDrawdown: number;
  maxDrawdownPct: number;
  peakPnl: number;
  troughPnl: number;
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

function normalizeNumber(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeOutcome(value: string | null | undefined) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  if (
    normalized === "WIN" ||
    normalized === "LOSS" ||
    normalized === "BREAKEVEN"
  ) {
    return normalized as "WIN" | "LOSS" | "BREAKEVEN";
  }

  return null;
}

function normalizeRange(value: string | null | undefined): ReportRange {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    normalized === "7d" ||
    normalized === "30d" ||
    normalized === "3m" ||
    normalized === "6m" ||
    normalized === "1y" ||
    normalized === "all"
  ) {
    return normalized;
  }

  return "30d";
}

function normalizeStatus(value: string | null | undefined): ReportStatus {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    normalized === "all" ||
    normalized === "open" ||
    normalized === "closed" ||
    normalized === "winners" ||
    normalized === "losers" ||
    normalized === "breakeven"
  ) {
    return normalized;
  }

  return "all";
}

function normalizeInstrument(
  value: string | null | undefined,
): ReportInstrument {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    normalized === "all" ||
    normalized === "options" ||
    normalized === "stocks"
  ) {
    return normalized;
  }

  return "all";
}

function normalizeSymbolFilter(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function averageWeightedPrice(fills: FillRow[]) {
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

function getOpenFills(fills: FillRow[]) {
  return fills.filter(
    (fill) => String(fill.side ?? "").toUpperCase() === "OPEN",
  );
}

function getCloseFills(fills: FillRow[]) {
  return fills.filter(
    (fill) => String(fill.side ?? "").toUpperCase() === "CLOSE",
  );
}

function getDurationMinutes(start: string | null, end: string | null) {
  if (!start || !end) {
    return null;
  }

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return null;
  }

  return Math.max(Math.floor((endTime - startTime) / 60000), 0);
}


function getMultiplier(execution: ExecutionRow) {
  return execution.signals?.instrument_type === "OPTION" ? 100 : 1;
}

function getSymbol(execution: ExecutionRow) {
  return execution.signals?.asset ?? execution.signals?.underlying ?? "—";
}

function getSide(execution: ExecutionRow) {
  const action = String(
    execution.signals?.open_action ?? execution.signals?.action ?? "",
  )
    .trim()
    .toUpperCase();

  if (action === "BUY_TO_OPEN") return "Buy to Open";
  if (action === "SELL_TO_OPEN") return "Sell to Open";
  if (action === "BUY") return "Buy";
  if (action === "SELL") return "Sell";

  return action || "—";
}

function getTradeTimestamp(trade: ReportTrade) {
  return trade.opened_at ?? trade.closed_at ?? null;
}

function getRangeCutoff(range: ReportRange) {
  if (range === "all") {
    return null;
  }

  const cutoff = new Date();

  if (range === "7d") {
    cutoff.setDate(cutoff.getDate() - 7);
  }

  if (range === "30d") {
    cutoff.setDate(cutoff.getDate() - 30);
  }

  if (range === "3m") {
    cutoff.setMonth(cutoff.getMonth() - 3);
  }

  if (range === "6m") {
    cutoff.setMonth(cutoff.getMonth() - 6);
  }

  if (range === "1y") {
    cutoff.setFullYear(cutoff.getFullYear() - 1);
  }

  return cutoff;
}

function tradeIsInRange(trade: ReportTrade, range: ReportRange) {
  const cutoff = getRangeCutoff(range);

  if (!cutoff) {
    return true;
  }

  const timestamp = getTradeTimestamp(trade);

  if (!timestamp) {
    return false;
  }

  return new Date(timestamp).getTime() >= cutoff.getTime();
}

function tradeMatchesStatus(trade: ReportTrade, status: ReportStatus) {
  if (status === "all") {
    return true;
  }

  if (status === "open") {
    return trade.status !== "Closed";
  }

  if (status === "closed") {
    return trade.status === "Closed";
  }

  if (status === "winners") {
    return trade.outcome === "WIN" || Number(trade.profit_loss ?? 0) > 0;
  }

  if (status === "losers") {
    return trade.outcome === "LOSS" || Number(trade.profit_loss ?? 0) < 0;
  }

  if (status === "breakeven") {
    return (
      trade.outcome === "BREAKEVEN" ||
      (trade.profit_loss !== null && Number(trade.profit_loss) === 0)
    );
  }

  return true;
}

function tradeMatchesInstrument(
  trade: ReportTrade,
  instrument: ReportInstrument,
) {
  if (instrument === "all") {
    return true;
  }

  if (instrument === "options") {
    return trade.instrument_type.toUpperCase() === "OPTION";
  }

  if (instrument === "stocks") {
    return trade.instrument_type.toUpperCase() === "STOCK";
  }

  return true;
}

function tradeMatchesSymbol(trade: ReportTrade, symbolFilter: string) {
  if (!symbolFilter) {
    return true;
  }

  return trade.symbol.toUpperCase().includes(symbolFilter);
}

function filterTrades({
  trades,
  range,
  status,
  instrument,
  symbolFilter,
}: {
  trades: ReportTrade[];
  range: ReportRange;
  status: ReportStatus;
  instrument: ReportInstrument;
  symbolFilter: string;
}) {
  return trades.filter((trade) => {
    return (
      tradeIsInRange(trade, range) &&
      tradeMatchesStatus(trade, status) &&
      tradeMatchesInstrument(trade, instrument) &&
      tradeMatchesSymbol(trade, symbolFilter)
    );
  });
}


function getReportTrades(executions: ExecutionRow[]) {
  return executions.map((execution): ReportTrade => {
    const fills = execution.execution_fills ?? [];
    const openFills = getOpenFills(fills);
    const closeFills = getCloseFills(fills);

    const openedQuantity = openFills.reduce(
      (sum, fill) => sum + Number(fill.contracts ?? 0),
      0,
    );

    const closedQuantity = closeFills.reduce(
      (sum, fill) => sum + Number(fill.contracts ?? 0),
      0,
    );

    const quantity =
      openedQuantity || Number(execution.contracts ?? closedQuantity ?? 0);

    const averageEntry =
      averageWeightedPrice(openFills) ?? normalizeNumber(execution.entry_price);

    const averageExit =
      averageWeightedPrice(closeFills) ?? normalizeNumber(execution.exit_price);

    const calculatedPnl =
      averageEntry !== null && averageExit !== null && closedQuantity > 0
        ? Number(
            (
              (averageExit - averageEntry) *
              closedQuantity *
              getMultiplier(execution)
            ).toFixed(2),
          )
        : null;

    const calculatedPnlPct =
      averageEntry !== null && averageExit !== null && averageEntry !== 0
        ? Number(
            (((averageExit - averageEntry) / averageEntry) * 100).toFixed(2),
          )
        : null;

    const pnl = normalizeNumber(execution.pnl) ?? calculatedPnl;
    const pnlPct =
      normalizeNumber(execution.pnl_pct) ??
      normalizeNumber(execution.signals?.return_pct) ??
      calculatedPnlPct;

    const rawOutcome = normalizeOutcome(execution.signals?.outcome);

    const outcome =
      rawOutcome ??
      (pnl !== null
        ? pnl > 0
          ? "WIN"
          : pnl < 0
            ? "LOSS"
            : "BREAKEVEN"
        : null);

    const openedAt =
      execution.opened_at ??
      openFills[0]?.created_at ??
      execution.created_at ??
      null;

    const closedAt =
      execution.closed_at ??
      closeFills[closeFills.length - 1]?.created_at ??
      null;

    const status =
      String(execution.status ?? "").toUpperCase() === "CLOSED" || closedAt
        ? "Closed"
        : "Open";

return {
  id: execution.id,
  signal_id: execution.signal_id,
  symbol: getSymbol(execution),

  instrument_type: execution.signals?.instrument_type ?? "—",
  option_type: execution.signals?.option_type ?? null,
  expiration_date: execution.signals?.expiration_date ?? null,
  entry_date: openedAt,

  side: getSide(execution),

  trade_style: execution.signals?.trade_style?.toUpperCase() ?? "—",

  confidence: normalizeNumber(execution.signals?.confidence),

  quantity,

  entry_price: averageEntry,
  exit_price: averageExit,

  opened_at: openedAt,
  closed_at: closedAt,

  duration_minutes: getDurationMinutes(openedAt, closedAt),

  profit_loss: pnl,
  profit_loss_pct: pnlPct,

  status,
  outcome,
};
  });
}

function groupBySymbol(trades: ReportTrade[]) {
  const groups = new Map<string, SymbolPerformance>();

  trades.forEach((trade) => {
    const current =
      groups.get(trade.symbol) ??
      ({
        symbol: trade.symbol,
        trades: 0,
        winners: 0,
        losers: 0,
        netPnl: 0,
        winRate: 0,
      } satisfies SymbolPerformance);

    current.trades += 1;
    current.netPnl += Number(trade.profit_loss ?? 0);

    if (trade.outcome === "WIN" || Number(trade.profit_loss ?? 0) > 0) {
      current.winners += 1;
    }

    if (trade.outcome === "LOSS" || Number(trade.profit_loss ?? 0) < 0) {
      current.losers += 1;
    }

    const graded = current.winners + current.losers;
    current.winRate = graded > 0 ? (current.winners / graded) * 100 : 0;

    groups.set(trade.symbol, current);
  });

  return Array.from(groups.values()).sort((a, b) => b.netPnl - a.netPnl);
}

function groupByInstrument(trades: ReportTrade[]): InstrumentPerformance[] {
  const groups = new Map<
    string,
    {
      instrument: string;
      trades: number;
      winners: number;
      losers: number;
      breakevens: number;
      totalProfit: number;
      totalLoss: number;
      netPnl: number;
    }
  >();

  trades.forEach((trade) => {
    const instrument = trade.instrument_type || "UNKNOWN";
    const pnl = Number(trade.profit_loss ?? 0);

    const current =
      groups.get(instrument) ??
      {
        instrument,
        trades: 0,
        winners: 0,
        losers: 0,
        breakevens: 0,
        totalProfit: 0,
        totalLoss: 0,
        netPnl: 0,
      };

    current.trades += 1;
    current.netPnl += pnl;

    if (pnl > 0) {
      current.winners += 1;
      current.totalProfit += pnl;
    } else if (pnl < 0) {
      current.losers += 1;
      current.totalLoss += Math.abs(pnl);
    } else {
      current.breakevens += 1;
    }

    groups.set(instrument, current);
  });

  return Array.from(groups.values())
    .map((group) => {
      const gradedTrades = group.winners + group.losers;

      return {
        instrument: group.instrument,
        trades: group.trades,
        winners: group.winners,
        losers: group.losers,
        breakevens: group.breakevens,
        winRate: gradedTrades > 0 ? (group.winners / gradedTrades) * 100 : 0,
        averageWinner:
          group.winners > 0 ? group.totalProfit / group.winners : 0,
        averageLoser: group.losers > 0 ? group.totalLoss / group.losers : 0,
        profitFactor:
          group.totalLoss > 0
            ? group.totalProfit / group.totalLoss
            : group.totalProfit > 0
              ? group.totalProfit
              : 0,
        netPnl: group.netPnl,
      };
    })
    .sort((a, b) => b.netPnl - a.netPnl);
}


function groupByConfidence(trades: ReportTrade[]): ConfidencePerformance[] {
  const buckets = [
    { bucket: "Low Confidence", minConfidence: 0, maxConfidence: 59 },
    { bucket: "Medium Confidence", minConfidence: 60, maxConfidence: 74 },
    { bucket: "High Confidence", minConfidence: 75, maxConfidence: 89 },
    { bucket: "Elite Confidence", minConfidence: 90, maxConfidence: 100 },
  ];

  return buckets
    .map((bucket) => {
      const bucketTrades = trades.filter((trade) => {
        const confidence = Number(trade.confidence ?? -1);

        return (
          confidence >= bucket.minConfidence &&
          confidence <= bucket.maxConfidence
        );
      });

      const winners = bucketTrades.filter(
        (trade) => Number(trade.profit_loss ?? 0) > 0
      );

      const losers = bucketTrades.filter(
        (trade) => Number(trade.profit_loss ?? 0) < 0
      );

      const breakevens = bucketTrades.filter(
        (trade) => Number(trade.profit_loss ?? 0) === 0
      );

      const totalProfit = winners.reduce(
        (sum, trade) => sum + Number(trade.profit_loss ?? 0),
        0
      );

      const totalLoss = losers.reduce(
        (sum, trade) => sum + Math.abs(Number(trade.profit_loss ?? 0)),
        0
      );

      const netPnl = bucketTrades.reduce(
        (sum, trade) => sum + Number(trade.profit_loss ?? 0),
        0
      );

      const gradedTrades = winners.length + losers.length;

      return {
        bucket: bucket.bucket,
        minConfidence: bucket.minConfidence,
        maxConfidence: bucket.maxConfidence,
        trades: bucketTrades.length,
        winners: winners.length,
        losers: losers.length,
        breakevens: breakevens.length,
        winRate: gradedTrades > 0 ? (winners.length / gradedTrades) * 100 : 0,
        averageWinner:
          winners.length > 0 ? totalProfit / winners.length : 0,
        averageLoser: losers.length > 0 ? totalLoss / losers.length : 0,
        profitFactor:
          totalLoss > 0
            ? totalProfit / totalLoss
            : totalProfit > 0
              ? totalProfit
              : 0,
        netPnl,
      };
    })
    .filter((bucket) => bucket.trades > 0);
}

function groupByStrategy(trades: ReportTrade[]) {
  const groups = new Map<
    string,
    {
      strategy: string;
      trades: number;
      winners: number;
      losers: number;
      breakevens: number;
      totalProfit: number;
      totalLoss: number;
      netPnl: number;
    }
  >();

  trades.forEach((trade) => {
    const strategy = trade.trade_style || "UNKNOWN";

    const current =
      groups.get(strategy) ??
      {
        strategy,
        trades: 0,
        winners: 0,
        losers: 0,
        breakevens: 0,
        totalProfit: 0,
        totalLoss: 0,
        netPnl: 0,
      };

    const pnl = Number(trade.profit_loss ?? 0);

    current.trades += 1;
    current.netPnl += pnl;

    if (pnl > 0) {
      current.winners += 1;
      current.totalProfit += pnl;
    } else if (pnl < 0) {
      current.losers += 1;
      current.totalLoss += Math.abs(pnl);
    } else {
      current.breakevens += 1;
    }

    groups.set(strategy, current);
  });

  return Array.from(groups.values())
    .map((group) => {
      const gradedTrades = group.winners + group.losers;

      return {
        strategy: group.strategy,
        trades: group.trades,
        winners: group.winners,
        losers: group.losers,
        breakevens: group.breakevens,
        winRate: gradedTrades > 0 ? (group.winners / gradedTrades) * 100 : 0,
        averageWinner:
          group.winners > 0 ? group.totalProfit / group.winners : 0,
        averageLoser: group.losers > 0 ? group.totalLoss / group.losers : 0,
        profitFactor:
          group.totalLoss > 0
            ? group.totalProfit / group.totalLoss
            : group.totalProfit > 0
              ? group.totalProfit
              : 0,
        netPnl: group.netPnl,
      };
    })
    .sort((a, b) => b.netPnl - a.netPnl);
}

function groupByDayOfWeek(trades: ReportTrade[]) {
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const groups = new Map<
    number,
    {
      day: string;
      dayIndex: number;
      trades: number;
      winners: number;
      losers: number;
      breakevens: number;
      netPnl: number;
    }
  >();

  trades.forEach((trade) => {
    const closedDate = getClosedTradeDate(trade);

    if (!closedDate) {
      return;
    }

    const dayIndex = closedDate.getDay();

    const current =
      groups.get(dayIndex) ??
      {
        day: dayNames[dayIndex],
        dayIndex,
        trades: 0,
        winners: 0,
        losers: 0,
        breakevens: 0,
        netPnl: 0,
      };

    const pnl = Number(trade.profit_loss ?? 0);

    current.trades += 1;
    current.netPnl += pnl;

    if (pnl > 0) {
      current.winners += 1;
    } else if (pnl < 0) {
      current.losers += 1;
    } else {
      current.breakevens += 1;
    }

    groups.set(dayIndex, current);
  });

  return Array.from(groups.values())
    .map((group) => {
      const gradedTrades = group.winners + group.losers;

      return {
        day: group.day,
        dayIndex: group.dayIndex,
        trades: group.trades,
        winners: group.winners,
        losers: group.losers,
        breakevens: group.breakevens,
        winRate: gradedTrades > 0 ? (group.winners / gradedTrades) * 100 : 0,
        averagePnl: group.trades > 0 ? group.netPnl / group.trades : 0,
        netPnl: group.netPnl,
      };
    })
    .sort((a, b) => a.dayIndex - b.dayIndex);
}

function formatHourLabel(hour: number) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: true,
  });
}

function groupByHourOfDay(trades: ReportTrade[]) {
  const groups = new Map<
    number,
    {
      hour: number;
      label: string;
      trades: number;
      winners: number;
      losers: number;
      breakevens: number;
      netPnl: number;
    }
  >();

  trades.forEach((trade) => {
    const closedDate = getClosedTradeDate(trade);

    if (!closedDate) {
      return;
    }

    const hour = closedDate.getHours();

    const current =
      groups.get(hour) ??
      {
        hour,
        label: formatHourLabel(hour),
        trades: 0,
        winners: 0,
        losers: 0,
        breakevens: 0,
        netPnl: 0,
      };

    const pnl = Number(trade.profit_loss ?? 0);

    current.trades += 1;
    current.netPnl += pnl;

    if (pnl > 0) {
      current.winners += 1;
    } else if (pnl < 0) {
      current.losers += 1;
    } else {
      current.breakevens += 1;
    }

    groups.set(hour, current);
  });

  return Array.from(groups.values())
    .map((group) => {
      const gradedTrades = group.winners + group.losers;

      return {
        hour: group.hour,
        label: group.label,
        trades: group.trades,
        winners: group.winners,
        losers: group.losers,
        breakevens: group.breakevens,
        winRate: gradedTrades > 0 ? (group.winners / gradedTrades) * 100 : 0,
        averagePnl: group.trades > 0 ? group.netPnl / group.trades : 0,
        netPnl: group.netPnl,
      };
    })
    .sort((a, b) => a.hour - b.hour);
}

function groupByOptionType(trades: ReportTrade[]): OptionTypePerformance[] {
  const groups = new Map<
    string,
    {
      optionType: string;
      trades: number;
      winners: number;
      losers: number;
      breakevens: number;
      totalProfit: number;
      totalLoss: number;
      netPnl: number;
    }
  >();

  trades
    .filter((trade) => trade.instrument_type?.toUpperCase() === "OPTION")
    .forEach((trade) => {
      const optionType = trade.option_type || "UNKNOWN";
      const pnl = Number(trade.profit_loss ?? 0);

      const current =
        groups.get(optionType) ??
        {
          optionType,
          trades: 0,
          winners: 0,
          losers: 0,
          breakevens: 0,
          totalProfit: 0,
          totalLoss: 0,
          netPnl: 0,
        };

      current.trades += 1;
      current.netPnl += pnl;

      if (pnl > 0) {
        current.winners += 1;
        current.totalProfit += pnl;
      } else if (pnl < 0) {
        current.losers += 1;
        current.totalLoss += Math.abs(pnl);
      } else {
        current.breakevens += 1;
      }

      groups.set(optionType, current);
    });

  return Array.from(groups.values())
    .map((group) => {
      const gradedTrades = group.winners + group.losers;

      return {
        optionType: group.optionType,
        trades: group.trades,
        winners: group.winners,
        losers: group.losers,
        breakevens: group.breakevens,
        winRate: gradedTrades > 0 ? (group.winners / gradedTrades) * 100 : 0,
        averageWinner:
          group.winners > 0 ? group.totalProfit / group.winners : 0,
        averageLoser: group.losers > 0 ? group.totalLoss / group.losers : 0,
        profitFactor:
          group.totalLoss > 0
            ? group.totalProfit / group.totalLoss
            : group.totalProfit > 0
              ? group.totalProfit
              : 0,
        netPnl: group.netPnl,
      };
    })
    .sort((a, b) => b.netPnl - a.netPnl);
}

function groupByDte(trades: ReportTrade[]): DtePerformance[] {
  const buckets = [
    { bucket: "0 DTE", minDte: 0, maxDte: 0 },
    { bucket: "1–7 DTE", minDte: 1, maxDte: 7 },
    { bucket: "8–30 DTE", minDte: 8, maxDte: 30 },
    { bucket: "31–60 DTE", minDte: 31, maxDte: 60 },
    { bucket: "61–180 DTE", minDte: 61, maxDte: 180 },
    { bucket: "181+ DTE", minDte: 181, maxDte: null },
  ];

  return buckets
    .map((bucket) => {
      const bucketTrades = trades.filter((trade) => {
        if (!trade.expiration_date || !trade.entry_date) {
          return false;
        }

        const expiration = new Date(trade.expiration_date);
        const entry = new Date(trade.entry_date);

        if (
          !Number.isFinite(expiration.getTime()) ||
          !Number.isFinite(entry.getTime())
        ) {
          return false;
        }

        const dte = Math.floor(
          (expiration.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (bucket.maxDte === null) {
          return dte >= bucket.minDte;
        }

        return dte >= bucket.minDte && dte <= bucket.maxDte;
      });

      const winners = bucketTrades.filter(
        (trade) => Number(trade.profit_loss ?? 0) > 0,
      );

      const losers = bucketTrades.filter(
        (trade) => Number(trade.profit_loss ?? 0) < 0,
      );

      const breakevens = bucketTrades.filter(
        (trade) => Number(trade.profit_loss ?? 0) === 0,
      );

      const totalProfit = winners.reduce(
        (sum, trade) => sum + Number(trade.profit_loss ?? 0),
        0,
      );

      const totalLoss = losers.reduce(
        (sum, trade) => sum + Math.abs(Number(trade.profit_loss ?? 0)),
        0,
      );

      const netPnl = bucketTrades.reduce(
        (sum, trade) => sum + Number(trade.profit_loss ?? 0),
        0,
      );

      const gradedTrades = winners.length + losers.length;

      return {
        bucket: bucket.bucket,
        minDte: bucket.minDte,
        maxDte: bucket.maxDte,
        trades: bucketTrades.length,
        winners: winners.length,
        losers: losers.length,
        breakevens: breakevens.length,
        winRate: gradedTrades > 0 ? (winners.length / gradedTrades) * 100 : 0,
        averageWinner: winners.length > 0 ? totalProfit / winners.length : 0,
        averageLoser: losers.length > 0 ? totalLoss / losers.length : 0,
        profitFactor:
          totalLoss > 0
            ? totalProfit / totalLoss
            : totalProfit > 0
              ? totalProfit
              : 0,
        netPnl,
      };
    })
    .filter((bucket) => bucket.trades > 0);
}

function groupByExpiration(
  trades: ReportTrade[],
): ExpirationPerformance[] {
  const buckets = [
    { bucket: "This Week", minDays: 0, maxDays: 7 },
    { bucket: "Next Week", minDays: 8, maxDays: 14 },
    { bucket: "This Month", minDays: 15, maxDays: 30 },
    { bucket: "Next Month", minDays: 31, maxDays: 60 },
    { bucket: "60+ Days", minDays: 61, maxDays: null },
  ];

  return buckets
    .map((bucket) => {
      const bucketTrades = trades.filter((trade) => {
        if (!trade.expiration_date || !trade.entry_date) return false;

        const expiration = new Date(trade.expiration_date);
        const entry = new Date(trade.entry_date);

        if (
          !Number.isFinite(expiration.getTime()) ||
          !Number.isFinite(entry.getTime())
        ) {
          return false;
        }

        const days = Math.floor(
          (expiration.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (bucket.maxDays === null) return days >= bucket.minDays;

        return days >= bucket.minDays && days <= bucket.maxDays;
      });

      const winners = bucketTrades.filter(
        (trade) => Number(trade.profit_loss ?? 0) > 0,
      );

      const losers = bucketTrades.filter(
        (trade) => Number(trade.profit_loss ?? 0) < 0,
      );

      const breakevens = bucketTrades.filter(
        (trade) => Number(trade.profit_loss ?? 0) === 0,
      );

      const totalProfit = winners.reduce(
        (sum, trade) => sum + Number(trade.profit_loss ?? 0),
        0,
      );

      const totalLoss = losers.reduce(
        (sum, trade) => sum + Math.abs(Number(trade.profit_loss ?? 0)),
        0,
      );

      const netPnl = bucketTrades.reduce(
        (sum, trade) => sum + Number(trade.profit_loss ?? 0),
        0,
      );

      const gradedTrades = winners.length + losers.length;

      return {
        bucket: bucket.bucket,
        minDays: bucket.minDays,
        maxDays: bucket.maxDays,
        trades: bucketTrades.length,
        winners: winners.length,
        losers: losers.length,
        breakevens: breakevens.length,
        winRate: gradedTrades > 0 ? (winners.length / gradedTrades) * 100 : 0,
        averageWinner: winners.length > 0 ? totalProfit / winners.length : 0,
        averageLoser: losers.length > 0 ? totalLoss / losers.length : 0,
        profitFactor:
          totalLoss > 0
            ? totalProfit / totalLoss
            : totalProfit > 0
              ? totalProfit
              : 0,
        netPnl,
      };
    })
    .filter((bucket) => bucket.trades > 0);
}

function getClosedTradeDate(trade: ReportTrade) {
  const timestamp = trade.closed_at ?? trade.opened_at;

  if (!timestamp) {
    return null;
  }

  const date = new Date(timestamp);

  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return date;
}

function sortClosedTradesByDate(trades: ReportTrade[]) {
  return [...trades].sort((a, b) => {
    const aTime = getClosedTradeDate(a)?.getTime() ?? 0;
    const bTime = getClosedTradeDate(b)?.getTime() ?? 0;

    return aTime - bTime;
  });
}

function buildEquityCurve(trades: ReportTrade[]) {
  let cumulativePnl = 0;

  return sortClosedTradesByDate(trades).map((trade, index) => {
    const closedDate = getClosedTradeDate(trade);
    cumulativePnl += Number(trade.profit_loss ?? 0);

    return {
      label: closedDate
        ? closedDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : `Trade ${index + 1}`,
      date: closedDate ? closedDate.toISOString() : "",
      pnl: Number(trade.profit_loss ?? 0),
      cumulativePnl: Number(cumulativePnl.toFixed(2)),
    } satisfies EquityCurvePoint;
  });
}

function buildMonthlyPnl(trades: ReportTrade[]) {
  const groups = new Map<string, MonthlyPnlPoint>();

  sortClosedTradesByDate(trades).forEach((trade) => {
    const closedDate = getClosedTradeDate(trade);

    if (!closedDate) {
      return;
    }

    const monthKey = `${closedDate.getFullYear()}-${String(
      closedDate.getMonth() + 1,
    ).padStart(2, "0")}`;

    const label = closedDate.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    const current =
      groups.get(monthKey) ??
      ({
        label,
        monthKey,
        trades: 0,
        winners: 0,
        losers: 0,
        netPnl: 0,
      } satisfies MonthlyPnlPoint);

    current.trades += 1;
    current.netPnl += Number(trade.profit_loss ?? 0);

    if (trade.outcome === "WIN" || Number(trade.profit_loss ?? 0) > 0) {
      current.winners += 1;
    }

    if (trade.outcome === "LOSS" || Number(trade.profit_loss ?? 0) < 0) {
      current.losers += 1;
    }

    groups.set(monthKey, current);
  });

  return Array.from(groups.values()).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey),
  );
}

function buildDailyPnl(trades: ReportTrade[]) {
  const groups = new Map<string, DailyPnlPoint>();

  sortClosedTradesByDate(trades).forEach((trade) => {
    const closedDate = getClosedTradeDate(trade);

    if (!closedDate) {
      return;
    }

    const dateKey = closedDate.toISOString().slice(0, 10);
    const label = closedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const current =
      groups.get(dateKey) ??
      ({
        dateKey,
        label,
        trades: 0,
        winners: 0,
        losers: 0,
        breakevens: 0,
        netPnl: 0,
      } satisfies DailyPnlPoint);

    current.trades += 1;
    current.netPnl += Number(trade.profit_loss ?? 0);

    if (trade.outcome === "WIN" || Number(trade.profit_loss ?? 0) > 0) {
      current.winners += 1;
    } else if (trade.outcome === "LOSS" || Number(trade.profit_loss ?? 0) < 0) {
      current.losers += 1;
    } else {
      current.breakevens += 1;
    }

    groups.set(dateKey, current);
  });

  return Array.from(groups.values())
    .map((day) => ({
      ...day,
      netPnl: Number(day.netPnl.toFixed(2)),
    }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function getBestDailyPnl(days: DailyPnlPoint[]) {
  return days.reduce<DailyPnlPoint | null>((best, day) => {
    if (!best) return day;

    return day.netPnl > best.netPnl ? day : best;
  }, null);
}

function getWorstDailyPnl(days: DailyPnlPoint[]) {
  return days.reduce<DailyPnlPoint | null>((worst, day) => {
    if (!worst) return day;

    return day.netPnl < worst.netPnl ? day : worst;
  }, null);
}

function getStreakStats(trades: ReportTrade[]) {
  const sortedTrades = sortClosedTradesByDate(trades);
  let currentType: StreakStats["currentType"] = null;
  let currentCount = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;

  sortedTrades.forEach((trade) => {
    const type =
      trade.outcome ??
      (Number(trade.profit_loss ?? 0) > 0
        ? "WIN"
        : Number(trade.profit_loss ?? 0) < 0
          ? "LOSS"
          : "BREAKEVEN");

    if (type === currentType) {
      currentCount += 1;
    } else {
      currentType = type;
      currentCount = 1;
    }

    if (type === "WIN") {
      longestWinStreak = Math.max(longestWinStreak, currentCount);
    }

    if (type === "LOSS") {
      longestLossStreak = Math.max(longestLossStreak, currentCount);
    }
  });

  return {
    currentType,
    currentCount,
    longestWinStreak,
    longestLossStreak,
  } satisfies StreakStats;
}

function getDrawdownStats(equityCurve: EquityCurvePoint[]) {
  let peakPnl = 0;
  let troughPnl = 0;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;

  equityCurve.forEach((point) => {
    if (point.cumulativePnl > peakPnl) {
      peakPnl = point.cumulativePnl;
      troughPnl = point.cumulativePnl;
    }

    if (point.cumulativePnl < troughPnl) {
      troughPnl = point.cumulativePnl;
    }

    const drawdown = peakPnl - point.cumulativePnl;

    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPct = peakPnl > 0 ? (drawdown / peakPnl) * 100 : 0;
    }
  });

  return {
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
    peakPnl: Number(peakPnl.toFixed(2)),
    troughPnl: Number(troughPnl.toFixed(2)),
  } satisfies DrawdownStats;
}

export default async function JournalReportsPage({
  searchParams,
}: JournalReportsPageProps) {
  const supabase = createSupabaseServerClient();

  const range = normalizeRange(searchParams?.range);
  const statusFilter = normalizeStatus(searchParams?.status);
  const instrumentFilter = normalizeInstrument(searchParams?.instrument);
  const symbolFilter = normalizeSymbolFilter(searchParams?.symbol);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const role = await resolveCurrentUserRole();
  const masterAdmin = isMasterAdmin(role);

  const entitlements = await getUserEntitlements(user.id);

  if (!masterAdmin && !entitlements.journal.active) {
    redirect("/dashboard/journal");
  }

  let query = supabase
    .from("signal_executions")
    .select(
      `
      id,
      signal_id,
      status,
      contracts,
      entry_price,
      exit_price,
      pnl,
      pnl_pct,
      opened_at,
      closed_at,
      created_at,
      execution_fills!left (
        side,
        contracts,
        price,
        created_at
      ),
      signals!inner (
        id,
        asset,
        underlying,
        action,
        open_action,
        instrument_type,
        option_type,
        strike_price,
        expiration_date,
        trade_style,
        confidence,
        status,
        outcome,
        return_pct,
        created_by
      )
      `,
    )
    .order("created_at", { ascending: false });

  if (!masterAdmin) {
    query = query.eq("signals.created_by", user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load journal reports", error);
    throw new Error("Failed to load journal reports.");
  }

  const executions = (data ?? []) as unknown as ExecutionRow[];
  const allTrades = getReportTrades(executions);

  const trades = filterTrades({
    trades: allTrades,
    range,
    status: statusFilter,
    instrument: instrumentFilter,
    symbolFilter,
  });

  const closedTrades = trades.filter(
    (trade) => trade.status === "Closed" && trade.profit_loss !== null,
  );

  const openTrades = trades.filter((trade) => trade.status !== "Closed");

  const winners = closedTrades.filter(
    (trade) => trade.outcome === "WIN" || Number(trade.profit_loss ?? 0) > 0,
  );

  const losers = closedTrades.filter(
    (trade) => trade.outcome === "LOSS" || Number(trade.profit_loss ?? 0) < 0,
  );

  const breakevens = closedTrades.filter(
    (trade) =>
      trade.outcome === "BREAKEVEN" || Number(trade.profit_loss ?? 0) === 0,
  );

  const totalProfit = winners.reduce(
    (sum, trade) => sum + Number(trade.profit_loss ?? 0),
    0,
  );

  const totalLoss = losers.reduce(
    (sum, trade) => sum + Math.abs(Number(trade.profit_loss ?? 0)),
    0,
  );

  const netPnl = closedTrades.reduce(
    (sum, trade) => sum + Number(trade.profit_loss ?? 0),
    0,
  );

  const winRate =
    winners.length + losers.length > 0
      ? (winners.length / (winners.length + losers.length)) * 100
      : 0;

  const profitFactor =
    totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? totalProfit : 0;

  const averageWinner = winners.length > 0 ? totalProfit / winners.length : 0;

  const averageLoser = losers.length > 0 ? totalLoss / losers.length : 0;

  const expectancy = closedTrades.length > 0 ? netPnl / closedTrades.length : 0;

  const averageHoldMinutes =
    closedTrades.length > 0
      ? closedTrades.reduce(
          (sum, trade) => sum + Number(trade.duration_minutes ?? 0),
          0,
        ) / closedTrades.length
      : null;

  const bestTrade = closedTrades.reduce<ReportTrade | null>((best, trade) => {
    if (!best) return trade;

    return Number(trade.profit_loss ?? 0) > Number(best.profit_loss ?? 0)
      ? trade
      : best;
  }, null);

  const worstTrade = closedTrades.reduce<ReportTrade | null>((worst, trade) => {
    if (!worst) return trade;

    return Number(trade.profit_loss ?? 0) < Number(worst.profit_loss ?? 0)
      ? trade
      : worst;
  }, null);

  const symbolPerformance = groupBySymbol(closedTrades);
  const strategyPerformance = groupByStrategy(closedTrades);
  const dayOfWeekPerformance = groupByDayOfWeek(closedTrades);
  const hourOfDayPerformance = groupByHourOfDay(closedTrades);
  const instrumentPerformance = groupByInstrument(closedTrades);
  const optionTypePerformance = groupByOptionType(closedTrades);
  const dtePerformance = groupByDte(closedTrades);
  const expirationPerformance = groupByExpiration(closedTrades);
  const confidencePerformance = groupByConfidence(closedTrades);
  const equityCurve = buildEquityCurve(closedTrades);
  const monthlyPnl = buildMonthlyPnl(closedTrades);
  const dailyPnl = buildDailyPnl(closedTrades);
  const streakStats = getStreakStats(closedTrades);
  const drawdownStats = getDrawdownStats(equityCurve);
  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">
            Journal Reports
          </h1>

          <p className="text-sm text-slate-400">
            Real execution analytics powered by signals, executions, and fills.
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm text-slate-400">
          Showing{" "}
          <span className="font-semibold text-slate-100">{trades.length}</span>{" "}
          of{" "}
          <span className="font-semibold text-slate-100">
            {allTrades.length}
          </span>{" "}
          trades
        </div>
      </div>

      <ReportFilters
        range={range}
        status={statusFilter}
        instrument={instrumentFilter}
        symbol={symbolFilter}
      />

      <ReportKpiGrid
        winRate={winRate}
        profitFactor={profitFactor}
        averageWinner={averageWinner}
        averageLoser={averageLoser}
        expectancy={expectancy}
        totalTrades={trades.length}
        closedTrades={closedTrades.length}
        openTrades={openTrades.length}
        breakevenTrades={breakevens.length}
        netPnl={netPnl}
        totalProfit={totalProfit}
        totalLoss={totalLoss}
        averageHoldMinutes={averageHoldMinutes}
        maxDrawdown={drawdownStats.maxDrawdown}
        maxDrawdownPct={drawdownStats.maxDrawdownPct}
        longestWinStreak={streakStats.longestWinStreak}
        longestLossStreak={streakStats.longestLossStreak}
      />

      <EquityMonthlySection
        equityCurve={equityCurve}
        monthlyPnl={monthlyPnl}
      />

      <DailyPnlSection
        days={dailyPnl}
        bestDay={getBestDailyPnl(dailyPnl)}
        worstDay={getWorstDailyPnl(dailyPnl)}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <BestWorstTradeCard
          title="Best Trade"
          trade={bestTrade}
          type="best"
        />

        <BestWorstTradeCard
          title="Worst Trade"
          trade={worstTrade}
          type="worst"
        />
      </div>

      <SymbolPerformanceTable symbols={symbolPerformance} />

       <PerformanceAnalyticsSwitcher
  strategies={strategyPerformance}
  days={dayOfWeekPerformance}
  hours={hourOfDayPerformance}
  instruments={instrumentPerformance}
  confidenceBuckets={confidencePerformance}
  optionTypes={optionTypePerformance}
  dteBuckets={dtePerformance}
/>

      <ClosedTradesTable trades={closedTrades} />

      <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <h2 className="text-lg font-semibold text-slate-100">
          Next Report Modules
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          Equity curve, monthly P/L, daily P/L heatmap, drawdown tracking,
          streak analytics, and closed trades reporting are now active. Setup
          performance, tag analytics, mistake analytics, psychology analytics,
          and AI grade reports are coming next.
        </p>
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  BookOpen,
  PlusCircle,
  TrendingUp,
  BarChart3,
  Trophy,
  Target,
  Lock,
  CheckCircle2,
  CircleDollarSign,
  Activity,
  FileText,
  Upload,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserEntitlements } from "@/lib/auth/getUserEntitlements";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { getSignalDisplayStatus } from "@/lib/signals/displayState";
import {
  buildTradeSummary,
  type TradeSummaryOptionLegInput,
} from "@/lib/signals/buildTradeSummary";

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

type ImportedJournalTradeRow = {
  id: string;
  user_id: string;
  symbol: string | null;
  instrument_type: string | null;
  side: string | null;
  entry_date: string | null;
  exit_date: string | null;
  entry_price: number | null;
  exit_price: number | null;
  quantity: number | null;
  profit_loss: number | null;
  profit_loss_pct: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
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
  legCount: number;
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

function inferImportedOutcome(pnl: number | null) {
  if (pnl === null) return "—";
  if (pnl > 0) return "WIN";
  if (pnl < 0) return "LOSS";
  return "BREAKEVEN";
}

function buildImportedJournalTrades(importedTrades: ImportedJournalTradeRow[]) {
  return importedTrades.map((trade): JournalTrade => {
    const isClosed = Boolean(trade.exit_date || trade.exit_price !== null);

    return {
      id: trade.id,
      signal_id: trade.id,
      symbol: trade.symbol ?? "—",
      instrument: trade.instrument_type ?? "—",
      contractLabel: trade.instrument_type ?? "Imported Trade",
      side: trade.side ?? "—",
      strategy: "Broker Import",
      executionStyle: "—",
      legCount: trade.instrument_type === "OPTION" ? 1 : 0,
      quantity: Number(trade.quantity ?? 0),
      entryPrice: trade.entry_price ?? null,
      exitPrice: trade.exit_price ?? null,
      entryDate: trade.entry_date,
      exitDate: trade.exit_date,
      duration: formatDuration(trade.entry_date, trade.exit_date),
      pnl: trade.profit_loss ?? null,
      pnlPct: trade.profit_loss_pct ?? null,
      status: isClosed ? "Closed" : "Open",
      outcome: inferImportedOutcome(trade.profit_loss ?? null),
      confidence: null,
      source: "IMPORT",
    };
  });
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
          legCount: tradeSummary.legCount,
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
        legCount: tradeSummary.legCount,
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
    leg_count:
      trade.legCount,
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
    "Leg Count",
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
    trade.leg_count,
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
    "Leg Count",
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
    trade.leg_count,
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

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const supabase = await createSupabaseServerClient();

  const tradeLogLimit = normalizeTradeLogLimit(searchParams?.limit);
  const requestedPage = normalizeTradeLogPage(searchParams?.page);

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
    .order("created_at", { ascending: false });

  if (!masterAdmin) {
    importedQuery = importedQuery.eq("user_id", user.id);
  }

  const { data: importedData, error: importedError } = await importedQuery;

  if (importedError) {
    console.error("Failed to load imported journal trades", importedError);
    throw new Error("Failed to load imported journal trades");
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

  const closedTrades = trades.filter((trade) => trade.status === "Closed");
  const winningTrades = closedTrades.filter((trade) => {
    if (trade.outcome === "WIN") return true;
    return trade.pnl !== null && trade.pnl > 0;
  });

  const losingTrades = closedTrades.filter((trade) => {
    if (trade.outcome === "LOSS") return true;
    return trade.pnl !== null && trade.pnl < 0;
  });

  const totalPnl = trades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);

  const winRate =
    winningTrades.length + losingTrades.length > 0
      ? Math.round(
          (winningTrades.length /
            (winningTrades.length + losingTrades.length)) *
            100,
        )
      : null;

  const bestTrade = trades.reduce<JournalTrade | null>((best, trade) => {
    if (trade.pnl === null) return best;
    if (!best || best.pnl === null) return trade;

    return trade.pnl > best.pnl ? trade : best;
  }, null);

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

      <div className="grid gap-4 md:grid-cols-4">
        <JournalStat
          title="Total Trades"
          value={String(trades.length)}
          icon={<BookOpen />}
        />

        <JournalStat
          title="Win Rate"
          value={winRate !== null ? `${winRate}%` : "—"}
          icon={<Trophy />}
        />

        <JournalStat
          title="Net P/L"
          value={formatCurrency(totalPnl)}
          icon={<TrendingUp />}
          tone={
            totalPnl > 0 ? "positive" : totalPnl < 0 ? "negative" : "neutral"
          }
        />

        <JournalStat
          title="Best Trade"
          value={
            bestTrade?.pnl !== null && bestTrade
              ? formatCurrency(bestTrade.pnl)
              : "—"
          }
          icon={<Target />}
          tone={
            bestTrade?.pnl && bestTrade.pnl > 0
              ? "positive"
              : bestTrade?.pnl && bestTrade.pnl < 0
                ? "negative"
                : "neutral"
          }
        />
      </div>

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
                          </td>

                          <td className="px-4 py-3">
                            <SourceBadge source={trade.source} />
                          </td>
                          <td className="px-4 py-3">{trade.contractLabel}</td>
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

        <div className="space-y-6">
          <JournalSideCard
            title="Broker Imports"
            icon={<Upload />}
            body="Import historical trades from Charles Schwab, Robinhood, Fidelity, Webull, IBKR, Tastytrade, E*TRADE, TradeStation, ThinkOrSwim, and generic CSV exports."
            items={[
              "CSV preview before saving",
              "Duplicate detection",
              "Broker format detection",
              "Journal-ready trade rows",
            ]}
          />

          <JournalSideCard
            title="Execution Ledger"
            icon={<Activity />}
            body="The journal now reads from signals, signal executions, execution fills, and imported broker trades. Demo data has been removed."
            items={[
              "Signals are the trade idea.",
              "Executions are the trade container.",
              "Fills are the source of truth.",
            ]}
          />

          <JournalSideCard
            title="Next Journal Phase"
            icon={<FileText />}
            body="Multi-leg strategy separation is now integrated. Next we will add notes, setups, mistakes, screenshots, and AI review to each executed trade."
            items={[
              "Strategy-aware trade notes",
              "Setup tags",
              "Mistake tracking",
              "AI trade grade",
            ]}
          />

          <JournalSideCard
            title="Reports Ready"
            icon={<BarChart3 />}
            body="Because this journal is ledger-powered, reports can now be built from real execution data and imported broker trades."
            items={[
              "Win rate",
              "Expectancy",
              "Profit factor",
              "Average hold time",
            ]}
          />
        </div>
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
          label="Legs"
          value={String(trade.legCount)}
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

function JournalStat({
  title,
  value,
  icon,
  tone = "neutral",
}: {
  title: string;
  value: string;
  icon: ReactNode;
  tone?: "positive" | "negative" | "neutral";
}) {
  const iconClass =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
        ? "text-red-400"
        : "text-emerald-400";

  const valueClass =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
        ? "text-red-400"
        : "text-slate-100";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
      <div className={`mb-3 [&>svg]:h-5 [&>svg]:w-5 ${iconClass}`}>{icon}</div>

      <p className="text-sm text-slate-400">{title}</p>
      <p className={`mt-1 text-2xl font-semibold ${valueClass}`}>{value}</p>
    </div>
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
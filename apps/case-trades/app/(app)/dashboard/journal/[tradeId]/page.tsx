import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import type { Metadata } from "next";

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata: Metadata = {
  title: "Trade Details | CASE Trades",
  description:
    "View complete trade details, execution history, broker import information, screenshots, notes, AI trade reviews, performance metrics, and journal analytics for an individual trade in CASE Trades.",
};

import JournalNotesForm from "@/components/journal/JournalNotesForm";
import TradeScreenshotManager, {
  type TradeScreenshot,
} from "@/components/journal/TradeScreenshotManager";
import TradeTimeline from "@/components/journal/TradeTimeline";
import TradeReviewPanel from "@/components/journal/TradeReviewPanel";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock,
  Download,
  LineChart,
  Lock,
  StickyNote,
  Target,
  TrendingDown,
  TrendingUp,
  Upload,
} from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserEntitlements } from "@/lib/auth/getUserEntitlements";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { getSignalDisplayStatus } from "@/lib/signals/displayState";
import {
  buildTradeSummary,
  type TradeSummaryOptionLegInput,
} from "@/lib/signals/buildTradeSummary";

const JournalNotesFormComponent = JournalNotesForm as ComponentType<any>;
const TradeTimelineComponent = TradeTimeline as ComponentType<any>;
const TradeScreenshotManagerComponent =
  TradeScreenshotManager as ComponentType<any>;
const TradeReviewPanelComponent = TradeReviewPanel as ComponentType<any>;

export const dynamic = "force-dynamic";

type TradeDetailPageProps = {
  params: {
    tradeId: string;
  };
};

type FillRow = {
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

type JournalNotesRow = {
  notes: string | null;
  setup: string | null;
  mistakes: string | null;
  tags: string[] | null;
  emotion: string | null;
  discipline_score: number | string | null;
  updated_at: string | null;
};

type TradeReviewRow = {
  id: string;
  execution_id: string;
  signal_id: string;
  grade: string;
  execution_score: number;
  discipline_score: number | null;
  summary: string;
  what_went_well: string[] | null;
  mistakes: string[] | null;
  improvement_plan: string[] | null;
  psychology_review: string;
  created_at: string | null;
  updated_at: string | null;
};

type ExecutionRow = {
  id: string;
  signal_id: string;
  status: string | null;
  contracts: number | null;
  entry_price: number | null;
  exit_price: number | null;
  entry_cost: number | null;
  exit_value: number | null;
  pnl: number | null;
  pnl_pct: number | null;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string | null;
  execution_fills: FillRow[] | null;
  signals: {
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
     * LONG_CALL, IRON_CONDOR, BULL_PUT_CREDIT, etc.
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
  };
};

type ImportedJournalTradeRow = {
  id: string;
  user_id: string;
  symbol: string | null;
  instrument_type: string | null;
  side: string | null;
  entry_date: string | null;
  exit_date: string | null;
  entry_price: number | string | null;
  exit_price: number | string | null;
  quantity: number | string | null;
  profit_loss: number | string | null;
  profit_loss_pct: number | string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function isMasterAdmin(role: Awaited<ReturnType<typeof resolveCurrentUserRole>>) {
  return (
    role?.role_name === "master_admin" ||
    role?.role_rank === 4 ||
    String(role?.email ?? "").toLowerCase() ===
      "csthilaire@xilairetechnologies.com"
  );
}

function toFiniteNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
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

function formatMoney(value: number | string | null | undefined) {
  const amount = toFiniteNumber(value);

  if (amount === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatMoneyWithSign(value: number | string | null | undefined) {
  const amount = toFiniteNumber(value);

  if (amount === null) {
    return "—";
  }

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(amount));

  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted}`;

  return formatted;
}

function formatPercentWithSign(value: number | string | null | undefined) {
  const amount = toFiniteNumber(value);

  if (amount === null) {
    return "—";
  }

  const prefix = amount > 0 ? "+" : "";

  return `${prefix}${amount.toFixed(2)}%`;
}

function formatNumber(value: number | string | null | undefined) {
  const amount = toFiniteNumber(value);

  if (amount === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(amount);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(start: string | null | undefined, end: string | null | undefined) {
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

function getMultiplier(signal: ExecutionRow["signals"]) {
  return signal.instrument_type === "OPTION" ? 100 : 1;
}

function getTradeSummary(signal: ExecutionRow["signals"]) {
  return buildTradeSummary({
    symbol:
      signal.asset,

    underlying:
      signal.underlying,

    instrument_type:
      signal.instrument_type,

    /*
     * strategy_type is authoritative.
     * Legacy signals fall back to leg detection or trade_style.
     */
    trade_style:
      signal.strategy_type ??
      signal.trade_style,

    /*
     * trade_style is the execution style.
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

function getContractLabel(signal: ExecutionRow["signals"]) {
  if (signal.instrument_type === "OPTION") {
    const tradeSummary =
      getTradeSummary(signal);

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
  signal: ExecutionRow["signals"];
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
  signal: ExecutionRow["signals"];
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

function normalizeOutcome(value: string | null | undefined) {
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

function inferImportedOutcome(value: number | string | null | undefined) {
  const pnl = toFiniteNumber(value);

  if (pnl === null) {
    return "—";
  }

  if (pnl > 0) {
    return "WIN";
  }

  if (pnl < 0) {
    return "LOSS";
  }

  return "BREAKEVEN";
}

function getPnlTone(value: number | string | null | undefined) {
  const amount = toFiniteNumber(value);

  if (amount === null) {
    return "neutral";
  }

  if (amount > 0) {
    return "positive";
  }

  if (amount < 0) {
    return "negative";
  }

  return "neutral";
}

function formatBrokerAction(value: string | null | undefined) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  if (normalized === "BUY_TO_OPEN") return "Buy to Open";
  if (normalized === "SELL_TO_OPEN") return "Sell to Open";
  if (normalized === "BUY_TO_CLOSE") return "Buy to Close";
  if (normalized === "SELL_TO_CLOSE") return "Sell to Close";
  if (normalized === "BUY") return "Buy";
  if (normalized === "SELL") return "Sell";

  return normalized || "—";
}

function getImportedContractLabel(trade: ImportedJournalTradeRow) {
  const instrument = String(trade.instrument_type ?? "")
    .trim()
    .toUpperCase();

  if (instrument === "OPTION") {
    return "Imported Option";
  }

  if (instrument === "STOCK") {
    return "Imported Stock";
  }

  return trade.instrument_type ?? "Imported Trade";
}

function hasJournalNotes(notes: JournalNotesRow | null) {
  if (!notes) {
    return false;
  }

  return Boolean(
    notes.notes ||
      notes.setup ||
      notes.mistakes ||
      notes.emotion ||
      notes.discipline_score ||
      (Array.isArray(notes.tags) && notes.tags.length > 0)
  );
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

function buildDetailCsv(rows: Array<[string, string | number | null | undefined]>) {
  const headers = ["Field", "Value"];

  return [headers, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n");
}

function buildDetailJson(rows: Array<[string, string | number | null | undefined]>) {
  return JSON.stringify(
    rows.reduce<Record<string, string | number | null | undefined>>(
      (acc, [label, value]) => {
        acc[label] = value;
        return acc;
      },
      {},
    ),
    null,
    2,
  );
}

function buildDetailExcelHtml(
  title: string,
  rows: Array<[string, string | number | null | undefined]>,
) {
  const rowHtml = rows
    .map(([label, value]) => {
      return `<tr><th>${escapeHtmlValue(label)}</th><td>${escapeHtmlValue(
        value,
      )}</td></tr>`;
    })
    .join("");

  return `
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtmlValue(title)}</title>
  </head>
  <body>
    <table>
      <thead>
        <tr>
          <th>Field</th>
          <th>Value</th>
        </tr>
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

function buildCaseTradeExportRows({
  tradeExecution,
  signal,
  symbol,
  tradeType,
  status,
  outcome,
  totalQuantity,
  remainingQuantity,
  openedQuantity,
  closedQuantity,
  averageEntry,
  averageExit,
  pnl,
  pnlPct,
  duration,
  fills,
  strategyLabel,
  executionStyleLabel,
  entryType,
  netEntry,
  premiumPaid,
  premiumReceived,
  legCount,
}: {
  tradeExecution: ExecutionRow;
  signal: NonNullable<ExecutionRow["signals"]>;
  symbol: string;
  tradeType: string;
  status: string;
  outcome: string;
  totalQuantity: number;
  remainingQuantity: number;
  openedQuantity: number;
  closedQuantity: number;
  averageEntry: number | null;
  averageExit: number | null;
  pnl: number | null;
  pnlPct: number | null;
  duration: string;
  fills: FillRow[];
  strategyLabel: string;
  executionStyleLabel: string;
  entryType: string;
  netEntry: number | null;
  premiumPaid: number;
  premiumReceived: number;
  legCount: number;
}) {
  return [
    ["Export Type", "CASE Execution Trade"],
    ["Execution ID", tradeExecution.id],
    ["Signal ID", tradeExecution.signal_id],
    ["Symbol", symbol],
    ["Trade Type", tradeType],
    ["Instrument", signal.instrument_type],
    ["Contract", getContractLabel(signal)],
    ["Action", formatBrokerAction(signal.open_action ?? signal.action)],
    ["Strategy", strategyLabel],
    ["Execution Style", executionStyleLabel],
    ["Entry Type", entryType],
    ["Net Entry", netEntry],
    ["Premium Paid", premiumPaid],
    ["Premium Received", premiumReceived],
    ["Option Leg Count", legCount],
    ["Status", status],
    ["Outcome", outcome],
    ["Total Quantity", totalQuantity],
    ["Remaining Quantity", remainingQuantity],
    ["Opened Quantity", openedQuantity],
    ["Closed Quantity", closedQuantity],
    ["Average Entry", averageEntry],
    ["Average Exit", averageExit],
    ["P/L", pnl],
    ["P/L %", pnlPct],
    ["Duration", duration],
    ["Confidence", signal.confidence],
    ["Signal Created At", signal.created_at],
    ["Execution Opened At", tradeExecution.opened_at ?? signal.opened_at],
    ["Execution Closed At", tradeExecution.closed_at ?? signal.closed_at],
    ["Fill Count", fills.length],
  ] satisfies Array<[string, string | number | null | undefined]>;
}

function buildImportedTradeExportRows({
  trade,
  status,
  outcome,
  duration,
}: {
  trade: ImportedJournalTradeRow;
  status: string;
  outcome: string;
  duration: string;
}) {
  return [
    ["Export Type", "Imported Broker Trade"],
    ["Journal Trade ID", trade.id],
    ["Symbol", trade.symbol],
    ["Instrument", trade.instrument_type],
    ["Contract / Notes", getImportedContractLabel(trade)],
    ["Side", formatBrokerAction(trade.side)],
    ["Status", status],
    ["Outcome", outcome],
    ["Quantity", trade.quantity],
    ["Entry Price", trade.entry_price],
    ["Exit Price", trade.exit_price],
    ["Entry Date", trade.entry_date],
    ["Exit Date", trade.exit_date],
    ["Duration", duration],
    ["P/L", trade.profit_loss],
    ["P/L %", trade.profit_loss_pct],
    ["Notes", trade.notes],
    ["Created At", trade.created_at],
    ["Updated At", trade.updated_at],
  ] satisfies Array<[string, string | number | null | undefined]>;
}

export default async function JournalTradeDetailPage({
  params,
}: TradeDetailPageProps) {
  const supabase = await createSupabaseServerClient();

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
    return <JournalUpgradeRequired />;
  }

  const { data: execution, error } = await supabase
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
        )
      )
    `
    )
    .eq("id", params.tradeId)
    .maybeSingle<ExecutionRow>();

  if (error) {
    console.error("Failed to load execution journal trade detail", error);
  }

  if (!execution || !execution.signals) {
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
        `
      )
      .eq("id", params.tradeId);

    if (!masterAdmin) {
      importedQuery = importedQuery.eq("user_id", user.id);
    }

    const { data: importedTrade, error: importedError } =
      await importedQuery.maybeSingle<ImportedJournalTradeRow>();

    if (importedError) {
      console.error("Failed to load imported journal trade detail", importedError);
    }

    if (!importedTrade) {
      notFound();
    }

    return <ImportedBrokerTradeDetail trade={importedTrade} />;
  }

  const tradeExecution = execution;
  const signal = tradeExecution.signals;

  const tradeSummary =
    getTradeSummary(signal);

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

  const { data: journalNotes } = await supabase
    .from("journal_execution_notes")
    .select(
      `
      notes,
      setup,
      mistakes,
      tags,
      emotion,
      discipline_score,
      updated_at
      `
    )
    .eq("execution_id", tradeExecution.id)
    .maybeSingle<JournalNotesRow>();

  const { data: screenshots } = await supabase
    .from("journal_execution_screenshots")
    .select(
      `
      id,
      execution_id,
      signal_id,
      screenshot_type,
      file_url,
      file_path,
      caption,
      created_at
      `
    )
    .eq("execution_id", tradeExecution.id)
    .order("created_at", { ascending: false });

  const { data: tradeReview } = await supabase
    .from("journal_trade_reviews")
    .select(
      `
      id,
      execution_id,
      signal_id,
      grade,
      execution_score,
      discipline_score,
      summary,
      what_went_well,
      mistakes,
      improvement_plan,
      psychology_review,
      created_at,
      updated_at
      `
    )
    .eq("execution_id", tradeExecution.id)
    .maybeSingle<TradeReviewRow>();

  const fills = tradeExecution.execution_fills ?? [];

  const openFills = fills.filter(
    (fill) => String(fill.side ?? "").toUpperCase() === "OPEN"
  );

  const closeFills = fills.filter(
    (fill) => String(fill.side ?? "").toUpperCase() === "CLOSE"
  );

  const openedQuantity = openFills.reduce(
    (sum, fill) => sum + Number(fill.contracts ?? 0),
    0
  );

  const closedQuantity = closeFills.reduce(
    (sum, fill) => sum + Number(fill.contracts ?? 0),
    0
  );

  const totalQuantity =
    openedQuantity ||
    Number(
      tradeExecution.contracts ??
        signal.quantity ??
        signal.contracts ??
        signal.shares ??
        0
    );

  const remainingQuantity = Math.max(totalQuantity - closedQuantity, 0);

  const averageEntry =
    averageWeightedPrice(openFills) ??
    tradeExecution.entry_price ??
    signal.entry_price ??
    signal.price ??
    null;

  const averageExit =
    averageWeightedPrice(closeFills) ??
    tradeExecution.exit_price ??
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

  const pnl = tradeExecution.pnl ?? calculatedPnl;
  const pnlPct = tradeExecution.pnl_pct ?? signal.return_pct ?? calculatedPnlPct;

  const displayStatus = getSignalDisplayStatus({
    status: signal.status,
    watching: signal.watching,
    watched: signal.watched,
    closed_at: signal.closed_at ?? tradeExecution.closed_at,
    outcome:
      signal.outcome === "WIN" ||
      signal.outcome === "LOSS" ||
      signal.outcome === "BREAKEVEN"
        ? signal.outcome
        : null,
    return_pct: signal.return_pct ?? pnlPct,
  });

  const status =
    tradeExecution.status === "CLOSED" || displayStatus === "Closed"
      ? "Closed"
      : tradeExecution.status === "OPEN"
        ? "Open"
        : displayStatus;

  const symbol = signal.asset ?? signal.underlying ?? "—";
  const tradeType = `${signal.instrument_type ?? "—"} ${getContractLabel(
    signal
  )}`;
  const duration = formatDuration(
    tradeExecution.opened_at ?? signal.opened_at ?? signal.created_at,
    tradeExecution.closed_at ?? signal.closed_at
  );
  const outcome = normalizeOutcome(signal.outcome);

  const caseExportRows = buildCaseTradeExportRows({
    tradeExecution,
    signal,
    symbol,
    tradeType,
    status,
    outcome,
    totalQuantity,
    remainingQuantity,
    openedQuantity,
    closedQuantity,
    averageEntry,
    averageExit,
    pnl,
    pnlPct,
    duration,
    fills,
    strategyLabel,
    executionStyleLabel,
    entryType:
      tradeSummary.debitCredit,
    netEntry:
      tradeSummary.netEntryAmount,
    premiumPaid:
      tradeSummary.totalPaid,
    premiumReceived:
      tradeSummary.totalReceived,
    legCount:
      tradeSummary.legCount,
  });

  const caseCsvDownloadHref = buildDownloadHref(
    buildDetailCsv(caseExportRows),
    "text/csv",
  );

  const caseJsonDownloadHref = buildDownloadHref(
    buildDetailJson(caseExportRows),
    "application/json",
  );

  const caseExcelDownloadHref = buildDownloadHref(
    buildDetailExcelHtml(`${symbol} CASE Trade Export`, caseExportRows),
    "application/vnd.ms-excel",
  );

  return (
    <div className="max-w-7xl space-y-8">
      <div>
        <Link
          href="/dashboard/journal"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Journal
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-semibold text-emerald-300">
              CASE Journal Trade Workspace
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-100">
              {symbol} · {strategyLabel}
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Execution ID: {tradeExecution.id}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <OutcomeBadge outcome={outcome} />
            <ExportLink
              href={caseCsvDownloadHref}
              filename={`case-trades-${symbol}-${tradeExecution.id}.csv`}
              label="CSV"
            />
            <ExportLink
              href={caseExcelDownloadHref}
              filename={`case-trades-${symbol}-${tradeExecution.id}.xls`}
              label="Excel"
            />
            <ExportLink
              href={caseJsonDownloadHref}
              filename={`case-trades-${symbol}-${tradeExecution.id}.json`}
              label="JSON"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric
          title="P/L"
          value={formatMoneyWithSign(pnl)}
          icon={<BarChart3 />}
          tone={getPnlTone(pnl)}
        />

        <Metric
          title="P/L %"
          value={formatPercentWithSign(pnlPct)}
          icon={<TrendingUp />}
          tone={getPnlTone(pnlPct)}
        />

        <Metric
          title="Quantity"
          value={`${remainingQuantity} / ${totalQuantity}`}
          icon={<Target />}
        />

        <Metric title="Duration" value={duration} icon={<Clock />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6 xl:col-span-2">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <BookOpen className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Trade Summary
              </h2>

              <p className="text-sm text-slate-400">
                Brokerage-style summary from the execution ledger.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Info label="Symbol" value={symbol} />
            <Info label="Instrument" value={signal.instrument_type ?? "—"} />
            <Info label="Contract" value={getContractLabel(signal)} />
            <Info
              label="Side"
              value={formatBrokerAction(signal.open_action ?? signal.action)}
            />
            <Info
              label="Strategy"
              value={strategyLabel}
            />
            <Info
              label="Execution Style"
              value={executionStyleLabel}
            />
            <Info
              label="Entry Type"
              value={formatDisplayText(
                tradeSummary.debitCredit,
              )}
            />
            <Info
              label={strategyEntryLabel}
              value={formatMoney(
                tradeSummary.netEntryAmount,
              )}
            />
            <Info
              label="Premium Paid"
              value={formatMoney(
                tradeSummary.totalPaid,
              )}
            />
            <Info
              label="Premium Received"
              value={formatMoney(
                tradeSummary.totalReceived,
              )}
            />
            <Info
              label="Option Legs"
              value={String(
                tradeSummary.legCount,
              )}
            />
            <Info label="Confidence" value={`${signal.confidence ?? "—"}%`} />
            <Info label="Average Entry" value={formatMoney(averageEntry)} />
            <Info
              label="Average Exit"
              value={formatMoney(averageExit)}
              tone={getPnlTone(pnl)}
            />
            <Info label="Opened" value={formatDateTime(tradeExecution.opened_at ?? signal.opened_at)} />
            <Info label="Closed" value={formatDateTime(tradeExecution.closed_at ?? signal.closed_at)} />
            <Info label="Opened Quantity" value={formatNumber(openedQuantity)} />
            <Info label="Closed Quantity" value={formatNumber(closedQuantity)} />
            <Info
              label="Profit / Loss"
              value={formatMoneyWithSign(pnl)}
              tone={getPnlTone(pnl)}
            />
            <Info
              label="Return"
              value={formatPercentWithSign(pnlPct)}
              tone={getPnlTone(pnlPct)}
            />
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <Activity className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Import Health
              </h2>

              <p className="text-sm text-slate-400">
                Data quality and execution completeness.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <HealthCheck
              label="Entry Price"
              value={formatMoney(averageEntry)}
              complete={averageEntry !== null}
            />
            <HealthCheck
              label="Exit Price"
              value={formatMoney(averageExit)}
              complete={status !== "Closed" || averageExit !== null}
            />
            <HealthCheck
              label="Closed Quantity"
              value={`${closedQuantity} / ${totalQuantity}`}
              complete={status !== "Closed" || closedQuantity > 0}
            />
            <HealthCheck
              label="Outcome"
              value={outcome}
              complete={status !== "Closed" || outcome !== "—"}
            />
          </div>
        </section>
      </div>

      {signal.instrument_type === "OPTION" && (
        <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-purple-500/10 p-3 text-purple-300">
              <Target className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Option Strategy Structure
              </h2>

              <p className="text-sm text-slate-400">
                Every option leg used to build the {strategyLabel} strategy.
              </p>
            </div>
          </div>

          {tradeSummary.legs.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {tradeSummary.legs.map((leg) => (
                <div
                  key={`${leg.legOrder}-${leg.displayLine}`}
                  className="min-w-0 rounded-lg border border-white/10 bg-slate-950 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Leg {leg.legOrder}
                  </p>

                  <p className="mt-2 break-words text-sm font-semibold text-slate-100">
                    {leg.displayLine}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-500">
                        Action
                      </p>
                      <p className="mt-1 text-slate-300">
                        {leg.actionLabel}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">
                        Contracts
                      </p>
                      <p className="mt-1 text-slate-300">
                        {leg.contracts}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">
                        Entry Premium
                      </p>
                      <p className="mt-1 text-slate-300">
                        {formatMoney(leg.entryPrice)}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">
                        Exit Premium
                      </p>
                      <p className="mt-1 text-slate-300">
                        {formatMoney(leg.exitPrice)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-200">
              No option-leg rows were found. CASE is displaying the saved
              legacy option fields for this trade.
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
            <LineChart className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Execution Fills
            </h2>

            <p className="text-sm text-slate-400">
              Every open and close fill used to calculate P/L.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Side</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {fills.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No fills found for this execution.
                  </td>
                </tr>
              )}

              {fills.map((fill, index) => (
                <tr key={`${fill.side}-${fill.created_at}-${index}`}>
                  <td className="px-4 py-3">
                    <FillBadge side={fill.side} />
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatNumber(fill.contracts)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatMoney(fill.price)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatDateTime(fill.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <TradeTimelineComponent
        signalCreatedAt={signal.created_at}
        openedAt={tradeExecution.opened_at ?? signal.opened_at}
        closedAt={tradeExecution.closed_at ?? signal.closed_at}
        fills={fills}
        notes={journalNotes}
        status={status}
      />

      {hasJournalNotes(journalNotes) && (
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <StickyNote className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Journal Notes
              </h2>

              <p className="text-sm text-slate-400">
                Your saved notes, tags, mistakes, and discipline review.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextBlock title="Notes" value={journalNotes?.notes} />
            <TextBlock title="Setup" value={journalNotes?.setup} />
            <TextBlock title="Mistakes" value={journalNotes?.mistakes} />
            <TextBlock title="Emotion" value={journalNotes?.emotion} />
            <TextBlock
              title="Discipline Score"
              value={
                journalNotes?.discipline_score !== null &&
                journalNotes?.discipline_score !== undefined
                  ? `${journalNotes.discipline_score}/10`
                  : null
              }
            />
            <TextBlock
              title="Tags"
              value={
                Array.isArray(journalNotes?.tags) && journalNotes.tags.length > 0
                  ? journalNotes.tags.join(", ")
                  : null
              }
            />
          </div>
        </section>
      )}

      <JournalNotesFormComponent
        tradeId={tradeExecution.id}
        initialNotes={{
          notes: journalNotes?.notes ?? "",
          setup: journalNotes?.setup ?? "",
          mistakes: journalNotes?.mistakes ?? "",
          tags: journalNotes?.tags ?? [],
          emotion: journalNotes?.emotion ?? "",
          discipline_score:
            journalNotes?.discipline_score !== null &&
            journalNotes?.discipline_score !== undefined
              ? String(
                  journalNotes.discipline_score,
                )
              : "",
        }}
      />

      <TradeScreenshotManagerComponent
        tradeId={tradeExecution.id}
        signalId={tradeExecution.signal_id}
        initialScreenshots={
          (screenshots ?? []) as TradeScreenshot[]
        }
      />

      <TradeReviewPanelComponent
        executionId={tradeExecution.id}
        signalId={tradeExecution.signal_id}
        initialReview={tradeReview}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <WorkspaceCard
          title="Trade Notes"
          icon={<StickyNote />}
          body="Capture your setup, emotions, mistakes, and trade discipline for this execution."
        />

        <WorkspaceCard
          title="Screenshots"
          icon={<Upload />}
          body="Upload entry, exit, and chart screenshots to document the trade visually."
        />

        <WorkspaceCard
          title="AI Review"
          icon={<Bot />}
          body="Generate a coaching-style review with execution grade, mistakes, and improvement plan."
        />
      </div>
    </div>
  );
}

function ImportedBrokerTradeDetail({
  trade,
}: {
  trade: ImportedJournalTradeRow;
}) {
  const pnl = toFiniteNumber(trade.profit_loss);
  const pnlPct = toFiniteNumber(trade.profit_loss_pct);
  const status = trade.exit_date ? "Closed" : "Open";
  const outcome = inferImportedOutcome(trade.profit_loss);
  const duration = formatDuration(trade.entry_date, trade.exit_date);

  const importedExportRows = buildImportedTradeExportRows({
    trade,
    status,
    outcome,
    duration,
  });

  const importedCsvDownloadHref = buildDownloadHref(
    buildDetailCsv(importedExportRows),
    "text/csv",
  );

  const importedJsonDownloadHref = buildDownloadHref(
    buildDetailJson(importedExportRows),
    "application/json",
  );

  const importedExcelDownloadHref = buildDownloadHref(
    buildDetailExcelHtml(
      `${trade.symbol ?? "Imported"} Broker Trade Export`,
      importedExportRows,
    ),
    "application/vnd.ms-excel",
  );

  return (
    <div className="max-w-7xl space-y-8">
      <div>
        <Link
          href="/dashboard/journal"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Journal
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-semibold text-emerald-300">
              Imported Broker Trade
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-100">
              {trade.symbol ?? "—"} · {getImportedContractLabel(trade)}
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Journal Trade ID: {trade.id}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <OutcomeBadge outcome={outcome} />
            <SourceBadge />
            <ExportLink
              href={importedCsvDownloadHref}
              filename={`case-trades-import-${trade.symbol ?? "trade"}-${trade.id}.csv`}
              label="CSV"
            />
            <ExportLink
              href={importedExcelDownloadHref}
              filename={`case-trades-import-${trade.symbol ?? "trade"}-${trade.id}.xls`}
              label="Excel"
            />
            <ExportLink
              href={importedJsonDownloadHref}
              filename={`case-trades-import-${trade.symbol ?? "trade"}-${trade.id}.json`}
              label="JSON"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric
          title="P/L"
          value={formatMoneyWithSign(pnl)}
          icon={<BarChart3 />}
          tone={getPnlTone(pnl)}
        />

        <Metric
          title="P/L %"
          value={formatPercentWithSign(pnlPct)}
          icon={<TrendingUp />}
          tone={getPnlTone(pnlPct)}
        />

        <Metric
          title="Quantity"
          value={formatNumber(trade.quantity)}
          icon={<Target />}
        />

        <Metric title="Duration" value={duration} icon={<Clock />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6 xl:col-span-2">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <BookOpen className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Imported Trade Summary
              </h2>

              <p className="text-sm text-slate-400">
                Broker-imported trade details from the journal ledger.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Info label="Symbol" value={trade.symbol ?? "—"} />
            <Info label="Instrument" value={trade.instrument_type ?? "—"} />
            <Info
              label="Contract / Notes"
              value={getImportedContractLabel(trade)}
            />
            <Info label="Side" value={formatBrokerAction(trade.side)} />
            <Info label="Entry Price" value={formatMoney(trade.entry_price)} />
            <Info
              label="Exit Price"
              value={formatMoney(trade.exit_price)}
              tone={getPnlTone(pnl)}
            />
            <Info label="Entry Date" value={formatDateTime(trade.entry_date)} />
            <Info label="Exit Date" value={formatDateTime(trade.exit_date)} />
            <Info label="Quantity" value={formatNumber(trade.quantity)} />
            <Info
              label="Profit / Loss"
              value={formatMoneyWithSign(trade.profit_loss)}
              tone={getPnlTone(trade.profit_loss)}
            />
            <Info
              label="Return"
              value={formatPercentWithSign(trade.profit_loss_pct)}
              tone={getPnlTone(trade.profit_loss_pct)}
            />
            <Info label="Created" value={formatDateTime(trade.created_at)} />
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <Activity className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Import Health
              </h2>

              <p className="text-sm text-slate-400">
                Imported row completeness.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <HealthCheck
              label="Entry Price"
              value={formatMoney(trade.entry_price)}
              complete={toFiniteNumber(trade.entry_price) !== null}
            />
            <HealthCheck
              label="Exit Price"
              value={formatMoney(trade.exit_price)}
              complete={status !== "Closed" || toFiniteNumber(trade.exit_price) !== null}
            />
            <HealthCheck
              label="Quantity"
              value={formatNumber(trade.quantity)}
              complete={toFiniteNumber(trade.quantity) !== null}
            />
            <HealthCheck
              label="P/L"
              value={formatMoneyWithSign(trade.profit_loss)}
              complete={status !== "Closed" || toFiniteNumber(trade.profit_loss) !== null}
            />
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
            <LineChart className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Imported Ledger
            </h2>

            <p className="text-sm text-slate-400">
              Normalized imported trade values saved to journal_trades.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Side</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Entry</th>
                <th className="px-4 py-3">Exit</th>
                <th className="px-4 py-3">P/L</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td className="px-4 py-3">
                  <FillBadge side={trade.side} />
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatNumber(trade.quantity)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  <div>{formatMoney(trade.entry_price)}</div>
                  <div className="text-xs text-slate-500">
                    {formatDateTime(trade.entry_date)}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  <div>{formatMoney(trade.exit_price)}</div>
                  <div className="text-xs text-slate-500">
                    {formatDateTime(trade.exit_date)}
                  </div>
                </td>
                <td
                  className={`px-4 py-3 font-medium ${
                    getPnlTone(trade.profit_loss) === "positive"
                      ? "text-emerald-400"
                      : getPnlTone(trade.profit_loss) === "negative"
                        ? "text-red-400"
                        : "text-slate-300"
                  }`}
                >
                  <div>{formatMoneyWithSign(trade.profit_loss)}</div>
                  <div className="text-xs">
                    {formatPercentWithSign(trade.profit_loss_pct)}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {trade.notes ? (
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <StickyNote className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Broker Notes
              </h2>

              <p className="text-sm text-slate-400">
                Imported description from the broker CSV.
              </p>
            </div>
          </div>

          <TextBlock title="Imported Notes" value={trade.notes} />
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <WorkspaceCard
          title="Broker Import"
          icon={<Upload />}
          body="This trade was imported from a broker CSV and is stored in the journal_trades table."
        />

        <WorkspaceCard
          title="Future Enhancements"
          icon={<Bot />}
          body="Next, imported trades can be connected to journal notes, screenshots, AI review, and matching CASE signals."
        />
      </div>
    </div>
  );
}

function ExportLink({
  href,
  filename,
  label,
}: {
  href: string;
  filename: string;
  label: string;
}) {
  return (
    <a
      href={href}
      download={filename}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

function JournalUpgradeRequired() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link
          href="/dashboard/journal"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Journal
        </Link>
      </div>

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
    </div>
  );
}

function Metric({
  title,
  value,
  icon,
  tone = "neutral",
}: {
  title: string;
  value: string;
  icon: ReactNode;
  tone?: string;
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
        ? "text-red-400"
        : "text-slate-100";

  return (
    <section className="min-w-0 rounded-xl border border-white/10 bg-slate-900/80 p-5">
      <div className="mb-3 text-emerald-400 [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>

      <p className="text-sm text-slate-400">{title}</p>

      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </section>
  );
}

function Info({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
        ? "text-red-400"
        : "text-slate-200";

  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-slate-950 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className={`mt-2 break-words text-sm font-medium ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

function TextBlock({
  title,
  value,
}: {
  title: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
        {value || "—"}
      </p>
    </div>
  );
}

function HealthCheck({
  label,
  value,
  complete,
}: {
  label: string;
  value: string;
  complete: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-slate-950 p-3">
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="text-xs text-slate-500">{value}</p>
      </div>

      <CheckCircle2
        className={
          complete ? "h-5 w-5 text-emerald-400" : "h-5 w-5 text-slate-600"
        }
      />
    </div>
  );
}

function SourceBadge() {
  return (
    <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-300">
      Import
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

function OutcomeBadge({ outcome }: { outcome: string }) {
  const normalized = outcome.toUpperCase();

  const className =
    normalized === "WIN"
      ? "bg-emerald-500/10 text-emerald-300"
      : normalized === "LOSS"
        ? "bg-red-500/10 text-red-300"
        : normalized === "BREAKEVEN"
          ? "bg-amber-500/10 text-amber-300"
          : "bg-slate-500/10 text-slate-300";

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${className}`}>
      {outcome}
    </span>
  );
}

function FillBadge({ side }: { side: string | null }) {
  const normalized = String(side ?? "").toUpperCase();

  const className =
    normalized === "OPEN" || normalized === "BUY"
      ? "bg-emerald-500/10 text-emerald-300"
      : normalized === "CLOSE" || normalized === "SELL"
        ? "bg-sky-500/10 text-sky-300"
        : "bg-slate-500/10 text-slate-300";

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${className}`}>
      {normalized || "—"}
    </span>
  );
}

function WorkspaceCard({
  title,
  icon,
  body,
}: {
  title: string;
  icon: ReactNode;
  body: string;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <div className="mb-4 text-emerald-400 [&>svg]:h-6 [&>svg]:w-6">
        {icon}
      </div>

      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>

      <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
    </section>
  );
}
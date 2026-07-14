"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Eye, EyeOff, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  toggleSignalWatch,
  updateSignalStatus,
} from "@/lib/signals/updateSignalState";

import {
  getPersistedStatusFromDisplayStatus,
  getSignalDisplayStatus,
  getWatchingFromDisplayStatus,
  shouldClearWatchingForDisplayStatus,
} from "@/lib/signals/displayState";

import {
  buildTradeSummary,
  type TradeSummaryOptionLegInput,
} from "@/lib/signals/buildTradeSummary";

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
export type SignalPersistedStatus =
  | "Active"
  | "Triggered"
  | "Closed"
  | "Expired";

export type SignalDisplayStatus =
  | "Watching"
  | "Active"
  | "Triggered"
  | "Closed"
  | "Expired";

export type SignalExecutionStatus = "OPEN" | "PARTIAL" | "CLOSED" | null;

export type SignalOptionLeg = {
  id?: string | null;
  leg_order?: number | null;
  action?: string | null;
  option_type?: "CALL" | "PUT" | string | null;
  strike_price?: number | string | null;
  expiration_date?: string | null;
  contracts?: number | string | null;
  entry_price?: number | string | null;
  exit_price?: number | string | null;
};

export type Signal = {
  id: string;

  organization_id?: string | null;

  asset?: string;
  price?: number | string;

  underlying?: string;
  instrument_type?: "OPTION" | "STOCK";

  action: "BUY" | "SELL" | "HOLD";
  open_action?: string | null;

  option_type?: "CALL" | "PUT";
  strike_price?: number;
  expiration_date?: string;

  entry_price?: number;
  exit_price?: number | null;

  /**
   * Execution timeframe stored in the legacy trade_style field.
   * Expected values: scalp, swing, leap.
   */
  trade_style?: string;

  /**
   * Detected trade structure stored separately.
   * Examples: IRON_CONDOR, CALL_CREDIT_SPREAD, LONG_CALL, STOCK.
   */
  strategy_type?: string | null;

  /**
   * Optional compatibility alias used by some Discord and legacy flows.
   */
  execution_style?: string | null;

  option_legs?: SignalOptionLeg[] | null;

  stop_loss_pct?: number | null;
  take_profit_pct?: number | null;

  confidence: number;
  status: SignalDisplayStatus;

  watching: boolean;
  watched: boolean;

  created_at?: string;
  closed_at?: string | null;

  outcome?: "WIN" | "LOSS" | "BREAKEVEN" | null;
  return_pct?: number | null;

  execution_status?: SignalExecutionStatus;
  contracts?: number | null;
  remaining_contracts?: number | null;
  pnl?: number | null;
  pnl_pct?: number | null;
};

interface SignalsTableProps {
  initialSignals?: Signal[] | null;
  isMasterAdmin?: boolean;
  deleteSignalAction?: (formData: FormData) => void | Promise<void>;
  selectedOrganizationId?: string;
  selectedOrganizationSlug?: string;
  range?: string;
  status?: string;
}

type SortKey =
  | "asset"
  | "underlying"
  | "confidence"
  | "created_at"
  | "strike_price";

type SortDir = "asc" | "desc";
type WatchFilter = "all" | "watching" | "watched";
type StatusFilter =
  | "all"
  | "Watching"
  | "Active"
  | "Triggered"
  | "Closed"
  | "Expired";

/* -------------------------------------------------
   HELPERS
------------------------------------------------- */
function normalizeSignals(value?: Signal[] | null): Signal[] {
  return Array.isArray(value) ? value : [];
}

function getTableSignalDisplayStatus(signal: Signal): SignalDisplayStatus {
  return getSignalDisplayStatus({
    status: signal.status,
    watching: signal.watching,
    watched: signal.watched,
    closed_at: signal.closed_at,
    outcome: signal.outcome,
    return_pct: signal.return_pct,
  }) as SignalDisplayStatus;
}

function getTradeSummaryForSignal(signal: Signal) {
  return buildTradeSummary({
    symbol: signal.asset,
    underlying: signal.underlying,
    instrument_type: signal.instrument_type,
    trade_style:
      signal.strategy_type ??
      signal.trade_style,
    execution_style:
      signal.execution_style ??
      signal.trade_style,
    action: signal.action,
    open_action: signal.open_action,
    entry_price: signal.entry_price ?? signal.price,
    exit_price: signal.exit_price,
    option_type: signal.option_type,
    strike_price: signal.strike_price,
    expiration_date: signal.expiration_date,
    contracts: signal.contracts,
    quantity: signal.contracts,
    option_legs: signal.option_legs as TradeSummaryOptionLegInput[] | null,
  });
}

function getStrategyLabel(signal: Signal) {
  const storedStrategy =
    formatStyleLabel(
      signal.strategy_type,
    );

  if (
    storedStrategy &&
    storedStrategy !== "—"
  ) {
    return storedStrategy;
  }

  const summary =
    getTradeSummaryForSignal(
      signal,
    );

  if (
    summary.tradeStyleLabel &&
    summary.tradeStyleLabel !==
      "Unknown"
  ) {
    return summary.tradeStyleLabel;
  }

  return "Unknown Strategy";
}

function getExecutionStyleLabel(
  signal: Signal,
) {
  const style =
    signal.execution_style ??
    signal.trade_style;

  if (!style) {
    return "—";
  }

  const normalized =
    String(style)
      .trim()
      .toLowerCase();

  if (normalized === "leap") {
    return "LEAP";
  }

  if (
    normalized === "scalp" ||
    normalized === "swing"
  ) {
    return (
      normalized.charAt(0).toUpperCase() +
      normalized.slice(1)
    );
  }

  return formatStyleLabel(style);
}

function getPrimaryStrike(signal: Signal) {
  const summary = getTradeSummaryForSignal(signal);
  return summary.primaryStrikePrice ?? signal.strike_price;
}

function getPrimaryExpiration(signal: Signal) {
  const summary = getTradeSummaryForSignal(signal);
  return summary.primaryExpirationDate ?? signal.expiration_date;
}

function getSortedOptionLegs(signal: Signal) {
  return [...(signal.option_legs ?? [])].sort((firstLeg, secondLeg) => {
    return Number(firstLeg.leg_order ?? 0) - Number(secondLeg.leg_order ?? 0);
  });
}

function getLegActionAbbreviation(action?: string | null) {
  const normalizedAction = String(action ?? "")
    .trim()
    .toUpperCase();

  if (normalizedAction === "BUY_TO_OPEN") return "BTO";
  if (normalizedAction === "SELL_TO_OPEN") return "STO";
  if (normalizedAction === "BUY_TO_CLOSE") return "BTC";
  if (normalizedAction === "SELL_TO_CLOSE") return "STC";

  return normalizedAction || "—";
}

function getOptionLegDisplayLines(signal: Signal) {
  const symbol = signal.asset ?? signal.underlying ?? "";

  return getSortedOptionLegs(signal).map((leg, index) => {
    const action = getLegActionAbbreviation(leg.action);
    const contracts = Number(leg.contracts ?? 0);
    const quantity =
      Number.isFinite(contracts) && contracts > 0 ? contracts : 1;
    const strike =
      leg.strike_price === null || leg.strike_price === undefined
        ? "—"
        : String(leg.strike_price);
    const optionType = String(leg.option_type ?? "").toUpperCase();

    return {
      key: leg.id ?? `${signal.id}-${index}`,
      line: `${action} ${quantity} ${symbol} ${strike} ${optionType}`.trim(),
      strike,
      expiration: leg.expiration_date ?? null,
    };
  });
}

function getStrikeDisplay(signal: Signal) {
  const legLines = getOptionLegDisplayLines(signal);

  if (legLines.length > 1) {
    return legLines.map((leg) => leg.strike).join(" / ");
  }

  if (legLines.length === 1) {
    return legLines[0].strike;
  }

  return formatStrike(getPrimaryStrike(signal));
}

function getExpirationDisplay(signal: Signal) {
  const expirations = getSortedOptionLegs(signal)
    .map((leg) => leg.expiration_date)
    .filter((value): value is string => Boolean(value));

  if (expirations.length === 0) {
    return formatDate(getPrimaryExpiration(signal));
  }

  const uniqueExpirations = [...new Set(expirations)];

  if (uniqueExpirations.length === 1) {
    return formatDate(uniqueExpirations[0]);
  }

  return uniqueExpirations.map(formatDate).join(" / ");
}

function getDisplayEntry(signal: Signal) {
  const summary = getTradeSummaryForSignal(signal);

  if (summary.netEntry !== null) {
    return Math.abs(summary.netEntry);
  }

  return signal.entry_price ?? signal.price;
}

function getStyleBadgeClasses(style?: string | null) {
  const normalizedStyle = String(style ?? "").toLowerCase();

  if (normalizedStyle.includes("credit") || normalizedStyle.includes("short")) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (normalizedStyle.includes("debit") || normalizedStyle.includes("long")) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }

  if (
    normalizedStyle.includes("iron") ||
    normalizedStyle.includes("condor") ||
    normalizedStyle.includes("butterfly")
  ) {
    return "border-purple-500/20 bg-purple-500/10 text-purple-300";
  }

  if (
    normalizedStyle.includes("scalp") ||
    normalizedStyle.includes("swing") ||
    normalizedStyle.includes("leap")
  ) {
    return "border-orange-500/20 bg-orange-500/10 text-orange-300";
  }

  return "border-slate-500/20 bg-slate-500/10 text-slate-300";
}

function getExecutionStyleBadgeClasses(
  style?: string | null,
) {
  const normalizedStyle =
    String(style ?? "")
      .trim()
      .toLowerCase();

  if (normalizedStyle === "scalp") {
    return "border-orange-500/20 bg-orange-500/10 text-orange-300";
  }

  if (normalizedStyle === "swing") {
    return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
  }

  if (normalizedStyle === "leap") {
    return "border-indigo-500/20 bg-indigo-500/10 text-indigo-300";
  }

  return "border-slate-500/20 bg-slate-500/10 text-slate-300";
}

function formatStyleLabel(style?: string | null) {
  if (!style) return "—";

  const normalizedStyle = String(style).trim();

  if (!normalizedStyle) return "—";

  return normalizedStyle
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getPnlClasses(value: number) {
  return value >= 0 ? "text-emerald-400" : "text-red-400";
}

function getExecutionBadge(executionStatus?: Signal["execution_status"]) {
  if (!executionStatus) return null;

  if (executionStatus === "OPEN") {
    return {
      label: "Execution: Open",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    };
  }

  if (executionStatus === "PARTIAL") {
    return {
      label: "Execution: Partial",
      className: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    };
  }

  if (executionStatus === "CLOSED") {
    return {
      label: "Execution: Closed",
      className: "border-sky-500/20 bg-sky-500/10 text-sky-300",
    };
  }

  return null;
}

function getStatusClasses(status: SignalDisplayStatus) {
  switch (status) {
    case "Watching":
      return "border-blue-500/30 bg-blue-500/10 text-blue-300";
    case "Active":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "Triggered":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "Closed":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "Expired":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  }
}

function getActionClasses(action: Signal["action"]) {
  switch (action) {
    case "BUY":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
    case "SELL":
      return "border-red-500/20 bg-red-500/10 text-red-300";
    case "HOLD":
      return "border-slate-500/20 bg-slate-500/10 text-slate-300";
  }
}

function formatEntry(value: Signal["entry_price"] | Signal["price"]) {
  if (typeof value === "number") return value.toString();
  return value ?? "—";
}

function formatStrike(value?: Signal["strike_price"] | number | null) {
  if (typeof value === "number") return value.toString();
  if (value === null || value === undefined) return "—";
  return String(value);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function getQuantityDisplay(signal: Signal) {
  if (!signal.execution_status || signal.contracts == null) {
    return "—";
  }

  if (
    signal.execution_status === "PARTIAL" &&
    signal.remaining_contracts != null
  ) {
    return `${signal.remaining_contracts} / ${signal.contracts}`;
  }

  if (
    signal.execution_status === "OPEN" &&
    signal.remaining_contracts != null &&
    signal.remaining_contracts !== signal.contracts
  ) {
    return `${signal.remaining_contracts} / ${signal.contracts}`;
  }

  if (signal.execution_status === "CLOSED") {
    return `0 / ${signal.contracts}`;
  }

  return `${signal.contracts}`;
}

function formatPnlValue(signal: Signal) {
  if (
    signal.execution_status === "CLOSED" &&
    typeof signal.pnl === "number"
  ) {
    return (
      <span className={getPnlClasses(signal.pnl)}>
        ${signal.pnl.toFixed(2)}
      </span>
    );
  }

  if (
    signal.execution_status === "OPEN" ||
    signal.execution_status === "PARTIAL"
  ) {
    return <span className="text-slate-500">{signal.execution_status}</span>;
  }

  return <span className="text-slate-500">—</span>;
}

function formatPnlPercent(signal: Signal) {
  if (
    signal.execution_status === "CLOSED" &&
    typeof signal.pnl_pct === "number"
  ) {
    return (
      <span className={getPnlClasses(signal.pnl_pct)}>
        {signal.pnl_pct.toFixed(2)}%
      </span>
    );
  }

  if (
    signal.execution_status === "OPEN" ||
    signal.execution_status === "PARTIAL"
  ) {
    return <span className="text-slate-500">{signal.execution_status}</span>;
  }

  return <span className="text-slate-500">—</span>;
}

function withOrgQuery(href: string, organizationSlug?: string | null) {
  if (!organizationSlug) return href;

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}org=${encodeURIComponent(organizationSlug)}`;
}

/* -------------------------------------------------
   COMPONENT
------------------------------------------------- */
export default function SignalsTable({
  initialSignals,
  isMasterAdmin = false,
  deleteSignalAction,
  selectedOrganizationId,
  selectedOrganizationSlug,
  range = "30d",
  status = "active_recent",
}: SignalsTableProps) {
  const router = useRouter();

  const [signals, setSignals] = useState<Signal[]>(() =>
    normalizeSignals(initialSignals),
  );

  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [watchFilter, setWatchFilter] = useState<WatchFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const optionStyle = {
    backgroundColor: "#020617",
    color: "#e5e7eb",
  };

  useEffect(() => {
    setSignals(normalizeSignals(initialSignals));
  }, [initialSignals]);

  const filteredSignals = useMemo(() => {
    let data = normalizeSignals(signals);

    if (selectedOrganizationId) {
      data = data.filter(
        (signal) =>
          !signal.organization_id ||
          signal.organization_id === selectedOrganizationId,
      );
    }

    if (statusFilter !== "all") {
      data = data.filter(
        (signal) => getTableSignalDisplayStatus(signal) === statusFilter,
      );
    }

    if (watchFilter === "watching") {
      data = data.filter((signal) => signal.watching);
    } else if (watchFilter === "watched") {
      data = data.filter((signal) => signal.watched);
    }

    data.sort((a, b) => {
      if (sortKey === "confidence") {
        return sortDir === "asc"
          ? a.confidence - b.confidence
          : b.confidence - a.confidence;
      }

      if (sortKey === "strike_price") {
        const aStrike = Number(getPrimaryStrike(a) ?? 0);
        const bStrike = Number(getPrimaryStrike(b) ?? 0);

        return sortDir === "asc" ? aStrike - bStrike : bStrike - aStrike;
      }

      if (sortKey === "created_at") {
        return sortDir === "asc"
          ? new Date(a.created_at ?? 0).getTime() -
              new Date(b.created_at ?? 0).getTime()
          : new Date(b.created_at ?? 0).getTime() -
              new Date(a.created_at ?? 0).getTime();
      }

      if (sortKey === "asset") {
        return sortDir === "asc"
          ? (a.asset ?? a.underlying ?? "").localeCompare(
              b.asset ?? b.underlying ?? "",
            )
          : (b.asset ?? b.underlying ?? "").localeCompare(
              a.asset ?? a.underlying ?? "",
            );
      }

      return sortDir === "asc"
        ? (a.underlying ?? a.asset ?? "").localeCompare(
            b.underlying ?? b.asset ?? "",
          )
        : (b.underlying ?? b.asset ?? "").localeCompare(
            a.underlying ?? a.asset ?? "",
          );
    });

    return data;
  }, [
    signals,
    selectedOrganizationId,
    statusFilter,
    watchFilter,
    sortKey,
    sortDir,
  ]);

  const canDeleteSignals =
    isMasterAdmin &&
    Boolean(deleteSignalAction) &&
    Boolean(selectedOrganizationId) &&
    Boolean(selectedOrganizationSlug);

  function handleToggleWatch(id: string) {
    const currentSignal = signals.find((signal) => signal.id === id);

    if (!currentSignal) return;

    const currentDisplayStatus = getTableSignalDisplayStatus(currentSignal);

    if (
      currentDisplayStatus === "Closed" ||
      currentDisplayStatus === "Expired"
    ) {
      window.alert("Closed or expired signals cannot be moved into Watching.");
      return;
    }

    const nextWatching = !currentSignal.watching;
    const nextDisplayStatus: SignalDisplayStatus = nextWatching
      ? "Watching"
      : "Active";

    setSignals((prev) =>
      normalizeSignals(prev).map((signal) =>
        signal.id === id
          ? {
              ...signal,
              status: nextDisplayStatus,
              watching: nextWatching,
              watched: currentSignal.watching ? true : signal.watched,
            }
          : signal,
      ),
    );

    startTransition(() => {
      toggleSignalWatch(id)
        .then(() => {
          router.refresh();
        })
        .catch((error) => {
          console.error(error);
          router.refresh();
        });
    });
  }

  function handleUpdateStatus(id: string, nextStatus: SignalDisplayStatus) {
    const currentSignal = signals.find((signal) => signal.id === id);

    if (!currentSignal) return;

    const currentDisplayStatus = getTableSignalDisplayStatus(currentSignal);

    if (nextStatus === currentDisplayStatus) return;

    if (nextStatus === "Closed" || nextStatus === "Expired") {
      window.alert(
        "Closed and Expired signals must be graded with outcome and return percentage. Opening the signal detail page now.",
      );

      router.push(
        withOrgQuery(`/dashboard/signals/${id}`, selectedOrganizationSlug),
      );
      return;
    }

    const nextPersistedStatus = getPersistedStatusFromDisplayStatus(nextStatus);
    const nextWatching = getWatchingFromDisplayStatus(nextStatus);
    const currentWatching = currentSignal.watching === true;
    const shouldToggleWatching = currentWatching !== nextWatching;

    setSignals((prev) =>
      normalizeSignals(prev).map((signal) =>
        signal.id === id
          ? {
              ...signal,
              status: nextStatus,
              watching: nextWatching,
              watched:
                shouldClearWatchingForDisplayStatus(nextStatus) &&
                signal.watching
                  ? true
                  : signal.watched || nextWatching,
              closed_at: null,
              execution_status:
                nextPersistedStatus === "Active" ||
                nextPersistedStatus === "Triggered"
                  ? signal.execution_status === "CLOSED"
                    ? null
                    : signal.execution_status
                  : signal.execution_status,
            }
          : signal,
      ),
    );

    startTransition(() => {
      updateSignalStatus(id, nextPersistedStatus)
        .then(async () => {
          if (shouldToggleWatching) {
            await toggleSignalWatch(id);
          }

          router.refresh();
        })
        .catch((error) => {
          console.error(error);
          router.refresh();
        });
    });
  }

  function handleSort(nextSortKey: SortKey) {
    if (sortKey === nextSortKey) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDir("desc");
  }

  function handleRowClick(id: string) {
    router.push(
      withOrgQuery(`/dashboard/signals/${id}`, selectedOrganizationSlug),
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden">
      <div className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Board Controls
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Filter, sort, watch, update status, and review strategy and
              execution style separately.
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full max-w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none hover:bg-slate-900 sm:w-auto"
            >
              <option style={optionStyle} value="all">
                Status: All
              </option>
              <option style={optionStyle} value="Watching">
                Watching
              </option>
              <option style={optionStyle} value="Active">
                Active
              </option>
              <option style={optionStyle} value="Triggered">
                Triggered
              </option>
              <option style={optionStyle} value="Closed">
                Closed
              </option>
              <option style={optionStyle} value="Expired">
                Expired
              </option>
            </select>

            <select
              value={watchFilter}
              onChange={(e) => setWatchFilter(e.target.value as WatchFilter)}
              className="w-full max-w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none hover:bg-slate-900 sm:w-auto"
            >
              <option style={optionStyle} value="all">
                Watch: All
              </option>
              <option style={optionStyle} value="watching">
                Watching
              </option>
              <option style={optionStyle} value="watched">
                Watched
              </option>
            </select>

            <button
              type="button"
              onClick={() => handleSort("created_at")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900 sm:w-auto"
            >
              <ArrowUpDown className="h-4 w-4 shrink-0" />
              <span>Date {sortKey === "created_at" ? `(${sortDir})` : ""}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSort("confidence")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900 sm:w-auto"
            >
              <ArrowUpDown className="h-4 w-4 shrink-0" />
              <span>
                Confidence {sortKey === "confidence" ? `(${sortDir})` : ""}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSort("strike_price")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900 sm:w-auto"
            >
              <ArrowUpDown className="h-4 w-4 shrink-0" />
              <span>
                Strike {sortKey === "strike_price" ? `(${sortDir})` : ""}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSort("asset")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900 sm:w-auto"
            >
              <ArrowUpDown className="h-4 w-4 shrink-0" />
              <span>Ticker {sortKey === "asset" ? `(${sortDir})` : ""}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="min-w-0 md:hidden">
        <div className="space-y-3">
          {filteredSignals.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-10 text-center text-sm text-slate-500">
              No signals match the selected filters.
            </div>
          )}

          {filteredSignals.map((signal) => {
            const displayStatus = getTableSignalDisplayStatus(signal);
            const symbol = signal.asset ?? signal.underlying ?? "";
            const underlying = signal.underlying ?? signal.asset ?? "";
            const entry = formatEntry(getDisplayEntry(signal));
            const strike = getStrikeDisplay(signal);
            const expiration = getExpirationDisplay(signal);
            const qtyDisplay = getQuantityDisplay(signal);
            const strategyLabel = getStrategyLabel(signal);
            const executionStyleLabel =
              getExecutionStyleLabel(signal);
            const optionLegLines = getOptionLegDisplayLines(signal);

            const executionBadge =
              displayStatus === "Closed" || displayStatus === "Expired"
                ? null
                : getExecutionBadge(signal.execution_status);

            return (
              <article
                key={signal.id}
                className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/70 p-4"
              >
                <button
                  type="button"
                  onClick={() => handleRowClick(signal.id)}
                  className="block w-full min-w-0 text-left"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-100">
                        {symbol || "—"}
                      </div>

                      {underlying && underlying !== symbol && (
                        <div className="mt-1 truncate text-xs text-slate-500">
                          Underlying: {underlying}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${getStyleBadgeClasses(
                          strategyLabel,
                        )}`}
                      >
                        {strategyLabel}
                      </span>

                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${getExecutionStyleBadgeClasses(
                          signal.execution_style ??
                            signal.trade_style,
                        )}`}
                      >
                        {executionStyleLabel}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div
                      className={`inline-flex max-w-full flex-col rounded-2xl border px-3 py-2 text-xs font-medium ${getActionClasses(
                        signal.action,
                      )}`}
                    >
                      <span className="truncate">
                        {signal.action} {symbol || "—"}
                      </span>
                      <span className="mt-0.5 opacity-80">Entry: {entry}</span>
                    </div>

                    {executionBadge && (
                      <div className="mt-2">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${executionBadge.className}`}
                        >
                          {executionBadge.label}
                        </span>
                      </div>
                    )}

                    {optionLegLines.length > 0 && (
                      <div className="mt-3 space-y-1 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2">
                        {optionLegLines.map((leg) => (
                          <div
                            key={leg.key}
                            className="text-[11px] font-medium text-slate-300"
                          >
                            {leg.line}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </button>

                <div className="mt-4 grid min-w-0 grid-cols-2 gap-3 text-sm">
                  <MobileMetric label="Strike" value={strike} />

                  <MobileMetric label="Expiration" value={expiration} />

                  <MobileMetric label="Qty" value={qtyDisplay} />

                  <MobileMetric
                    label="Confidence"
                    value={`${signal.confidence}%`}
                  />

                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      P/L ($)
                    </p>
                    <p className="mt-1 truncate">{formatPnlValue(signal)}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      P/L (%)
                    </p>
                    <p className="mt-1 truncate">{formatPnlPercent(signal)}</p>
                  </div>
                </div>

                <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <SignalStatusSelect
                    value={displayStatus}
                    optionStyle={optionStyle}
                    onChange={(nextStatus) =>
                      handleUpdateStatus(signal.id, nextStatus)
                    }
                  />

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleWatch(signal.id);
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-emerald-300 sm:w-auto"
                    aria-label={
                      signal.watching ? "Stop watching signal" : "Watch signal"
                    }
                  >
                    {signal.watching ? (
                      <EyeOff className="h-4 w-4 shrink-0" />
                    ) : (
                      <Eye className="h-4 w-4 shrink-0" />
                    )}
                    {signal.watching ? "Watching" : "Watch"}
                  </button>

                  {canDeleteSignals && (
                    <DeleteSignalForm
                      signal={signal}
                      symbol={symbol}
                      selectedOrganizationId={selectedOrganizationId}
                      selectedOrganizationSlug={selectedOrganizationSlug}
                      range={range}
                      status={status}
                      deleteSignalAction={deleteSignalAction}
                      mobile
                    />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="hidden min-w-0 md:block">
        <div className="w-full max-w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
          <div className="w-full overflow-x-auto">
            <table className="min-w-[1280px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 text-left">Ticker</th>
                  <th className="min-w-[220px] px-4 py-3 text-left">Signal</th>
                  <th className="min-w-[180px] px-4 py-3 text-left">
                    Strategy / Execution
                  </th>
                  <th className="px-4 py-3 text-left">Strike</th>
                  <th className="px-4 py-3 text-left">Expiration</th>
                  <th className="px-4 py-3 text-left">Entry</th>
                  <th className="px-4 py-3 text-left">Qty</th>
                  <th className="px-4 py-3 text-left">P/L ($)</th>
                  <th className="px-4 py-3 text-left">P/L (%)</th>
                  <th className="px-4 py-3 text-left">Confidence</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Watch</th>

                  {canDeleteSignals && (
                    <th className="px-4 py-3 text-right">Delete</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredSignals.length === 0 && (
                  <tr>
                    <td
                      colSpan={canDeleteSignals ? 13 : 12}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      No signals match the selected filters.
                    </td>
                  </tr>
                )}

                {filteredSignals.map((signal) => {
                  const displayStatus = getTableSignalDisplayStatus(signal);
                  const symbol = signal.asset ?? signal.underlying ?? "";
                  const underlying = signal.underlying ?? signal.asset ?? "";
                  const entry = formatEntry(getDisplayEntry(signal));
                  const strike = getStrikeDisplay(signal);
                  const expiration = getExpirationDisplay(signal);
                  const qtyDisplay = getQuantityDisplay(signal);
                  const strategyLabel = getStrategyLabel(signal);
                  const executionStyleLabel =
                    getExecutionStyleLabel(signal);
                  const optionLegLines = getOptionLegDisplayLines(signal);

                  const executionBadge =
                    displayStatus === "Closed" || displayStatus === "Expired"
                      ? null
                      : getExecutionBadge(signal.execution_status);

                  return (
                    <tr
                      key={signal.id}
                      onClick={() => handleRowClick(signal.id)}
                      className="cursor-pointer border-b border-white/10 transition hover:bg-slate-900/80"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-100">
                          {symbol || "—"}
                        </div>

                        {underlying && underlying !== symbol && (
                          <div className="mt-1 text-xs text-slate-500">
                            Underlying: {underlying}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div
                          className={`inline-flex flex-col rounded-2xl border px-3 py-2 text-xs font-medium ${getActionClasses(
                            signal.action,
                          )}`}
                        >
                          <span>
                            {signal.action} {symbol || "—"}
                          </span>
                          <span className="mt-0.5 opacity-80">
                            Entry: {entry}
                          </span>
                        </div>

                        {optionLegLines.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {optionLegLines.map((leg) => (
                              <div
                                key={leg.key}
                                className="whitespace-nowrap text-[11px] font-medium text-slate-400"
                              >
                                {leg.line}
                              </div>
                            ))}
                          </div>
                        )}

                        {executionBadge && (
                          <div className="mt-1">
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${executionBadge.className}`}
                            >
                              {executionBadge.label}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1.5">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStyleBadgeClasses(
                              strategyLabel,
                            )}`}
                          >
                            {strategyLabel}
                          </span>

                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${getExecutionStyleBadgeClasses(
                              signal.execution_style ??
                                signal.trade_style,
                            )}`}
                          >
                            {executionStyleLabel}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-300">
                        {strike}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {expiration}
                      </td>

                      <td className="px-4 py-3 text-slate-300">{entry}</td>

                      <td className="px-4 py-3 font-medium text-slate-300">
                        {qtyDisplay}
                      </td>

                      <td className="px-4 py-3">{formatPnlValue(signal)}</td>

                      <td className="px-4 py-3">{formatPnlPercent(signal)}</td>

                      <td className="px-4 py-3 text-slate-300">
                        {signal.confidence}%
                      </td>

                      <td className="px-4 py-3">
                        <SignalStatusSelect
                          value={displayStatus}
                          optionStyle={optionStyle}
                          onChange={(nextStatus) =>
                            handleUpdateStatus(signal.id, nextStatus)
                          }
                          compact
                        />
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleToggleWatch(signal.id);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-slate-800 hover:text-emerald-300"
                          aria-label={
                            signal.watching
                              ? "Stop watching signal"
                              : "Watch signal"
                          }
                        >
                          {signal.watching ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </td>

                      {canDeleteSignals && (
                        <td className="px-4 py-3 text-right">
                          <DeleteSignalForm
                            signal={signal}
                            symbol={symbol}
                            selectedOrganizationId={selectedOrganizationId}
                            selectedOrganizationSlug={selectedOrganizationSlug}
                            range={range}
                            status={status}
                            deleteSignalAction={deleteSignalAction}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate font-medium text-slate-300">{value}</p>
    </div>
  );
}

function SignalStatusSelect({
  value,
  optionStyle,
  onChange,
  compact = false,
}: {
  value: SignalDisplayStatus;
  optionStyle: React.CSSProperties;
  onChange: (value: SignalDisplayStatus) => void;
  compact?: boolean;
}) {
  return (
    <select
      value={value}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onChange={(e) => onChange(e.target.value as SignalDisplayStatus)}
      className={
        (compact
          ? "rounded-full border px-3 py-1 text-xs font-medium outline-none "
          : "w-full rounded-full border px-3 py-2 text-xs font-medium outline-none sm:w-auto ") +
        getStatusClasses(value)
      }
    >
      <option style={optionStyle} value="Watching">
        Watching
      </option>
      <option style={optionStyle} value="Active">
        Active
      </option>
      <option style={optionStyle} value="Triggered">
        Triggered
      </option>
      <option style={optionStyle} value="Closed">
        Closed
      </option>
      <option style={optionStyle} value="Expired">
        Expired
      </option>
    </select>
  );
}

function DeleteSignalForm({
  signal,
  symbol,
  selectedOrganizationId,
  selectedOrganizationSlug,
  range,
  status,
  deleteSignalAction,
  mobile = false,
}: {
  signal: Signal;
  symbol: string;
  selectedOrganizationId?: string;
  selectedOrganizationSlug?: string;
  range: string;
  status: string;
  deleteSignalAction?: (formData: FormData) => void | Promise<void>;
  mobile?: boolean;
}) {
  if (!deleteSignalAction) {
    return null;
  }

  return (
    <form
      action={deleteSignalAction}
      className={mobile ? "sm:ml-auto" : undefined}
      onClick={(e) => {
        e.stopPropagation();
      }}
      onSubmit={(e) => {
        e.stopPropagation();

        const confirmed = window.confirm(
          `Delete ${symbol || "this signal"}? This cannot be undone.`,
        );

        if (!confirmed) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="signal_id" value={signal.id} />

      <input
        type="hidden"
        name="organization_id"
        value={selectedOrganizationId}
      />

      <input type="hidden" name="org" value={selectedOrganizationSlug} />

      <input type="hidden" name="range" value={range} />
      <input type="hidden" name="status" value={status} />

      <button
        type="submit"
        className={
          mobile
            ? "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 sm:w-auto"
            : "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10"
        }
        aria-label="Delete signal"
        title="Delete signal"
      >
        <Trash2 className="h-4 w-4 shrink-0" />
        {mobile ? "Delete" : null}
      </button>
    </form>
  );
}
"use client";

import { useEffect, useMemo, useState, startTransition } from "react";
import { Eye, EyeOff, Trash2, ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";

/* 🔒 SERVER ACTIONS */
import {
  updateSignalStatus,
  toggleSignalWatch,
} from "@/lib/signals/updateSignalState";

import {
  getSignalDisplayStatus,
  getPersistedStatusFromDisplayStatus,
  getWatchingFromDisplayStatus,
  shouldClearWatchingForDisplayStatus,
} from "@/lib/signals/displayState";

/* -------------------------------------------------
   TYPES (OPTIONS-FIRST, EXECUTION-AWARE)
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

export type Signal = {
  id: string;

  organization_id?: string | null;

  asset?: string;
  price?: string;

  underlying?: string;
  instrument_type?: "OPTION" | "STOCK";

  action: "BUY" | "SELL" | "HOLD";

  option_type?: "CALL" | "PUT";
  strike_price?: number;
  expiration_date?: string;

  entry_price?: number;

  trade_style?: "scalp" | "swing" | "leap";

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
  exit_price?: number | null;

  execution_status?: "OPEN" | "CLOSED" | null;
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

function normalizeSignals(value?: Signal[] | null): Signal[] {
  return Array.isArray(value) ? value : [];
}

function getStyleBadgeClasses(style?: Signal["trade_style"]) {
  switch (style) {
    case "scalp":
      return "border-blue-500/20 bg-blue-500/10 text-blue-300";
    case "swing":
      return "border-purple-500/20 bg-purple-500/10 text-purple-300";
    case "leap":
      return "border-orange-500/20 bg-orange-500/10 text-orange-300";
    default:
      return "border-slate-500/20 bg-slate-500/10 text-slate-300";
  }
}

function formatStyleLabel(style?: Signal["trade_style"]) {
  return style ? style.toUpperCase() : "—";
}

function getPnlClasses(value: number) {
  return value >= 0 ? "text-emerald-400" : "text-red-400";
}

function getExecutionBadge(execution_status?: Signal["execution_status"]) {
  if (!execution_status) return null;

  if (execution_status === "OPEN") {
    return {
      label: "Execution: Open",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
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

function formatStrike(value?: Signal["strike_price"]) {
  if (typeof value === "number") return value.toString();
  if (value === null || value === undefined) return "—";
  return String(value);
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function withOrgQuery(href: string, organizationSlug?: string | null) {
  if (!organizationSlug) return href;

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}org=${encodeURIComponent(organizationSlug)}`;
}

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
    normalizeSignals(initialSignals)
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
          signal.organization_id === selectedOrganizationId
      );
    }

    if (statusFilter !== "all") {
      data = data.filter(
        (signal) => getSignalDisplayStatus(signal) === statusFilter
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
        const aStrike =
          typeof a.strike_price === "number"
            ? a.strike_price
            : Number(a.strike_price ?? 0);

        const bStrike =
          typeof b.strike_price === "number"
            ? b.strike_price
            : Number(b.strike_price ?? 0);

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
              b.asset ?? b.underlying ?? ""
            )
          : (b.asset ?? b.underlying ?? "").localeCompare(
              a.asset ?? a.underlying ?? ""
            );
      }

      return sortDir === "asc"
        ? (a.underlying ?? a.asset ?? "").localeCompare(
            b.underlying ?? b.asset ?? ""
          )
        : (b.underlying ?? b.asset ?? "").localeCompare(
            a.underlying ?? a.asset ?? ""
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

    const currentDisplayStatus = getSignalDisplayStatus(currentSignal);

    if (currentDisplayStatus === "Closed" || currentDisplayStatus === "Expired") {
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
          : signal
      )
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

    const currentDisplayStatus = getSignalDisplayStatus(currentSignal);

    if (nextStatus === currentDisplayStatus) return;

    if (nextStatus === "Closed" || nextStatus === "Expired") {
      window.alert(
        "Closed and Expired signals must be graded with outcome and return percentage. Opening the signal detail page now."
      );

      router.push(
        withOrgQuery(`/dashboard/signals/${id}`, selectedOrganizationSlug)
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
          : signal
      )
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
      withOrgQuery(`/dashboard/signals/${id}`, selectedOrganizationSlug)
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
              Filter, sort, watch, update status, and manage master-admin signal
              cleanup.
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
            const displayStatus = getSignalDisplayStatus(signal);
            const symbol = signal.asset ?? signal.underlying ?? "";
            const underlying = signal.underlying ?? signal.asset ?? "";
            const entry = formatEntry(signal.entry_price ?? signal.price);
            const strike = formatStrike(signal.strike_price);

            const qtyDisplay =
              signal.execution_status && signal.contracts != null
                ? signal.execution_status === "OPEN" &&
                  signal.remaining_contracts != null &&
                  signal.remaining_contracts !== signal.contracts
                  ? `${signal.remaining_contracts} / ${signal.contracts}`
                  : signal.execution_status === "CLOSED"
                    ? `0 / ${signal.contracts}`
                    : `${signal.contracts}`
                : "—";

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

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${getStyleBadgeClasses(
                        signal.trade_style
                      )}`}
                    >
                      {formatStyleLabel(signal.trade_style)}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div
                      className={`inline-flex max-w-full flex-col rounded-2xl border px-3 py-2 text-xs font-medium ${getActionClasses(
                        signal.action
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
                  </div>
                </button>

                <div className="mt-4 grid min-w-0 grid-cols-2 gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Strike
                    </p>
                    <p className="mt-1 truncate font-medium text-slate-300">
                      {strike}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Expiration
                    </p>
                    <p className="mt-1 truncate text-slate-300">
                      {formatDate(signal.expiration_date)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Qty
                    </p>
                    <p className="mt-1 truncate font-medium text-slate-300">
                      {qtyDisplay}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Confidence
                    </p>
                    <p className="mt-1 truncate text-slate-300">
                      {signal.confidence}%
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      P/L ($)
                    </p>
                    <p className="mt-1 truncate">
                      {signal.execution_status === "CLOSED" &&
                      signal.pnl != null ? (
                        <span className={getPnlClasses(signal.pnl)}>
                          ${signal.pnl.toFixed(2)}
                        </span>
                      ) : signal.execution_status === "OPEN" ? (
                        <span className="text-slate-500">OPEN</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      P/L (%)
                    </p>
                    <p className="mt-1 truncate">
                      {signal.execution_status === "CLOSED" &&
                      signal.pnl_pct != null ? (
                        <span className={getPnlClasses(signal.pnl_pct)}>
                          {signal.pnl_pct.toFixed(2)}%
                        </span>
                      ) : signal.execution_status === "OPEN" ? (
                        <span className="text-slate-500">OPEN</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={displayStatus}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onChange={(e) =>
                      handleUpdateStatus(
                        signal.id,
                        e.target.value as SignalDisplayStatus
                      )
                    }
                    className={`w-full rounded-full border px-3 py-2 text-xs font-medium outline-none sm:w-auto ${getStatusClasses(
                      displayStatus
                    )}`}
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
                    <form
                      action={deleteSignalAction}
                      className="sm:ml-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      onSubmit={(e) => {
                        e.stopPropagation();

                        const confirmed = window.confirm(
                          `Delete ${
                            symbol || "this signal"
                          }? This cannot be undone.`
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

                      <input
                        type="hidden"
                        name="org"
                        value={selectedOrganizationSlug}
                      />

                      <input type="hidden" name="range" value={range} />
                      <input type="hidden" name="status" value={status} />

                      <button
                        type="submit"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 sm:w-auto"
                        aria-label="Delete signal"
                        title="Delete signal"
                      >
                        <Trash2 className="h-4 w-4 shrink-0" />
                        Delete
                      </button>
                    </form>
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
            <table className="min-w-[1120px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 text-left">Ticker</th>
                  <th className="px-4 py-3 text-left">Signal</th>
                  <th className="px-4 py-3 text-left">Style</th>
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
                  const displayStatus = getSignalDisplayStatus(signal);
                  const symbol = signal.asset ?? signal.underlying ?? "";
                  const underlying = signal.underlying ?? signal.asset ?? "";
                  const entry = formatEntry(signal.entry_price ?? signal.price);
                  const strike = formatStrike(signal.strike_price);

                  const qtyDisplay =
                    signal.execution_status && signal.contracts != null
                      ? signal.execution_status === "OPEN" &&
                        signal.remaining_contracts != null &&
                        signal.remaining_contracts !== signal.contracts
                        ? `${signal.remaining_contracts} / ${signal.contracts}`
                        : signal.execution_status === "CLOSED"
                          ? `0 / ${signal.contracts}`
                          : `${signal.contracts}`
                      : "—";

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
                            signal.action
                          )}`}
                        >
                          <span>
                            {signal.action} {symbol || "—"}
                          </span>
                          <span className="mt-0.5 opacity-80">
                            Entry: {entry}
                          </span>
                        </div>

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
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStyleBadgeClasses(
                            signal.trade_style
                          )}`}
                        >
                          {formatStyleLabel(signal.trade_style)}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-300">
                        {strike}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {formatDate(signal.expiration_date)}
                      </td>

                      <td className="px-4 py-3 text-slate-300">{entry}</td>

                      <td className="px-4 py-3 font-medium text-slate-300">
                        {qtyDisplay}
                      </td>

                      <td className="px-4 py-3">
                        {signal.execution_status === "CLOSED" &&
                        signal.pnl != null ? (
                          <span className={getPnlClasses(signal.pnl)}>
                            ${signal.pnl.toFixed(2)}
                          </span>
                        ) : signal.execution_status === "OPEN" ? (
                          <span className="text-slate-500">OPEN</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {signal.execution_status === "CLOSED" &&
                        signal.pnl_pct != null ? (
                          <span className={getPnlClasses(signal.pnl_pct)}>
                            {signal.pnl_pct.toFixed(2)}%
                          </span>
                        ) : signal.execution_status === "OPEN" ? (
                          <span className="text-slate-500">OPEN</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {signal.confidence}%
                      </td>

                      <td className="px-4 py-3">
                        <select
                          value={displayStatus}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onChange={(e) =>
                            handleUpdateStatus(
                              signal.id,
                              e.target.value as SignalDisplayStatus
                            )
                          }
                          className={`rounded-full border px-3 py-1 text-xs font-medium outline-none ${getStatusClasses(
                            displayStatus
                          )}`}
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
                          <form
                            action={deleteSignalAction}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            onSubmit={(e) => {
                              e.stopPropagation();

                              const confirmed = window.confirm(
                                `Delete ${
                                  symbol || "this signal"
                                }? This cannot be undone.`
                              );

                              if (!confirmed) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <input
                              type="hidden"
                              name="signal_id"
                              value={signal.id}
                            />

                            <input
                              type="hidden"
                              name="organization_id"
                              value={selectedOrganizationId}
                            />

                            <input
                              type="hidden"
                              name="org"
                              value={selectedOrganizationSlug}
                            />

                            <input type="hidden" name="range" value={range} />
                            <input type="hidden" name="status" value={status} />

                            <button
                              type="submit"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10"
                              aria-label="Delete signal"
                              title="Delete signal"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </form>
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
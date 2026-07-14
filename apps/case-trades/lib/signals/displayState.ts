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

export type SignalExecutionStatus =
  | "OPEN"
  | "PARTIAL"
  | "CLOSED"
  | null
  | undefined;

export type SignalOutcome =
  | "WIN"
  | "LOSS"
  | "BREAKEVEN"
  | null;

export type SignalDisplayStateInput = {
  status?: string | null;
  watching?: boolean | null;
  watched?: boolean | null;
  execution_status?: SignalExecutionStatus;
  closed_at?: string | null;

  outcome?: SignalOutcome;
  return_pct?: number | null;

  strategy_type?: string | null;
  trade_style?: string | null;
  leg_count?: number | null;
  remaining_contracts?: number | null;
};

export function normalizePersistedSignalStatus(
  status?: string | null,
): SignalPersistedStatus {
  switch (String(status ?? "").trim().toLowerCase()) {
    case "triggered":
      return "Triggered";
    case "closed":
      return "Closed";
    case "expired":
      return "Expired";
    default:
      return "Active";
  }
}

export function getSignalDisplayStatus(
  signal: SignalDisplayStateInput,
): SignalDisplayStatus {
  const persisted = normalizePersistedSignalStatus(signal.status);

  if (persisted === "Closed") return "Closed";
  if (persisted === "Expired") return "Expired";

  if (
    signal.execution_status === "PARTIAL" &&
    persisted === "Active"
  ) {
    return "Triggered";
  }

  if (persisted === "Triggered") return "Triggered";

  if (persisted === "Active" && signal.watching) {
    return "Watching";
  }

  return "Active";
}

export function getPersistedStatusFromDisplayStatus(
  status: SignalDisplayStatus,
): SignalPersistedStatus {
  return status === "Watching" ? "Active" : status;
}

export const getWatchingFromDisplayStatus = (
  status: SignalDisplayStatus,
) => status === "Watching";

export const isWatchingSignal = (
  signal: SignalDisplayStateInput,
) => getSignalDisplayStatus(signal) === "Watching";

export const isActiveSignal = (
  signal: SignalDisplayStateInput,
) => getSignalDisplayStatus(signal) === "Active";

export const isTriggeredSignal = (
  signal: SignalDisplayStateInput,
) => getSignalDisplayStatus(signal) === "Triggered";

export const isClosedSignal = (
  signal: SignalDisplayStateInput,
) => getSignalDisplayStatus(signal) === "Closed";

export const isExpiredSignal = (
  signal: SignalDisplayStateInput,
) => getSignalDisplayStatus(signal) === "Expired";

export function canWatchSignal(
  signal: SignalDisplayStateInput,
) {
  const display = getSignalDisplayStatus(signal);
  return display === "Active" || display === "Watching";
}

export function canMoveSignalToStatus(
  signal: SignalDisplayStateInput,
  nextStatus: SignalDisplayStatus,
) {
  const current = getSignalDisplayStatus(signal);

  if (current === nextStatus) return false;

  if (
    (current === "Closed" || current === "Expired") &&
    nextStatus === "Watching"
  ) {
    return false;
  }

  return true;
}

export function signalNeedsOutcome(
  signal: SignalDisplayStateInput,
) {
  const display = getSignalDisplayStatus(signal);

  return (
    (display === "Closed" || display === "Expired") &&
    (signal.outcome == null || signal.return_pct == null)
  );
}

export const shouldClearWatchingForDisplayStatus = (
  status: SignalDisplayStatus,
) => status !== "Watching";

export function inferSignalOutcomeFromReturnPct(
  returnPct: number,
): Exclude<SignalOutcome, null> {
  if (returnPct > 0) return "WIN";
  if (returnPct < 0) return "LOSS";
  return "BREAKEVEN";
}

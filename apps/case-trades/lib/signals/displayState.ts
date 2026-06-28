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

export type SignalExecutionStatus = "OPEN" | "CLOSED" | null | undefined;

export type SignalDisplayStateInput = {
  status?: string | null;
  watching?: boolean | null;
  watched?: boolean | null;
  execution_status?: SignalExecutionStatus;
  closed_at?: string | null;
  outcome?: "WIN" | "LOSS" | "BREAKEVEN" | null;
  return_pct?: number | null;
};

export function normalizePersistedSignalStatus(
  status?: string | null
): SignalPersistedStatus {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();

  switch (normalized) {
    case "triggered":
      return "Triggered";

    case "closed":
      return "Closed";

    case "expired":
      return "Expired";

    case "active":
    default:
      return "Active";
  }
}

export function getSignalDisplayStatus(
  signal: SignalDisplayStateInput
): SignalDisplayStatus {
  const persistedStatus = normalizePersistedSignalStatus(signal.status);

  if (persistedStatus === "Closed") {
    return "Closed";
  }

  if (persistedStatus === "Expired") {
    return "Expired";
  }

  if (persistedStatus === "Triggered") {
    return "Triggered";
  }

  if (persistedStatus === "Active" && signal.watching === true) {
    return "Watching";
  }

  return "Active";
}

export function getPersistedStatusFromDisplayStatus(
  status: SignalDisplayStatus
): SignalPersistedStatus {
  if (status === "Watching") {
    return "Active";
  }

  return status;
}

export function getWatchingFromDisplayStatus(status: SignalDisplayStatus) {
  return status === "Watching";
}

export function isWatchingSignal(signal: SignalDisplayStateInput) {
  return getSignalDisplayStatus(signal) === "Watching";
}

export function isActiveSignal(signal: SignalDisplayStateInput) {
  return getSignalDisplayStatus(signal) === "Active";
}

export function isTriggeredSignal(signal: SignalDisplayStateInput) {
  return getSignalDisplayStatus(signal) === "Triggered";
}

export function isClosedSignal(signal: SignalDisplayStateInput) {
  return getSignalDisplayStatus(signal) === "Closed";
}

export function isExpiredSignal(signal: SignalDisplayStateInput) {
  return getSignalDisplayStatus(signal) === "Expired";
}

export function canWatchSignal(signal: SignalDisplayStateInput) {
  const displayStatus = getSignalDisplayStatus(signal);

  return displayStatus === "Active" || displayStatus === "Watching";
}

export function canMoveSignalToStatus(
  signal: SignalDisplayStateInput,
  nextStatus: SignalDisplayStatus
) {
  const currentStatus = getSignalDisplayStatus(signal);

  if (currentStatus === nextStatus) {
    return false;
  }

  if (
    (currentStatus === "Closed" || currentStatus === "Expired") &&
    nextStatus === "Watching"
  ) {
    return false;
  }

  return true;
}

export function signalNeedsOutcome(signal: SignalDisplayStateInput) {
  const displayStatus = getSignalDisplayStatus(signal);

  return (
    (displayStatus === "Closed" || displayStatus === "Expired") &&
    (signal.outcome === null ||
      signal.outcome === undefined ||
      signal.return_pct === null ||
      signal.return_pct === undefined)
  );
}

export function shouldClearWatchingForDisplayStatus(
  status: SignalDisplayStatus
) {
  return status !== "Watching";
}

export function inferSignalOutcomeFromReturnPct(
  returnPct: number
): "WIN" | "LOSS" | "BREAKEVEN" {
  if (returnPct > 0) {
    return "WIN";
  }

  if (returnPct < 0) {
    return "LOSS";
  }

  return "BREAKEVEN";
}
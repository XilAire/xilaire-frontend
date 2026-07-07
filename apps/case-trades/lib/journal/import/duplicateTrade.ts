import type { ParsedBrokerTrade } from "@/lib/journal/import/normalizeTrade";

export type ExistingJournalTradeForDuplicateCheck = {
  id: string;
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
};

export type DuplicateTradeCheckResult = {
  trade: ParsedBrokerTrade;
  duplicate: boolean;
  duplicateTradeId: string | null;
  reason: string | null;
};

function normalizeString(value: string | null | undefined) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeNumber(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace("%", "").replace("$", "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeDate(value: string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function numbersMatch(
  left: number | string | null | undefined,
  right: number | string | null | undefined,
  tolerance = 0.0001
) {
  const leftNumber = normalizeNumber(left);
  const rightNumber = normalizeNumber(right);

  if (leftNumber === null && rightNumber === null) return true;
  if (leftNumber === null || rightNumber === null) return false;

  return Math.abs(leftNumber - rightNumber) <= tolerance;
}

function datesMatch(
  left: string | null | undefined,
  right: string | null | undefined
) {
  return normalizeDate(left) === normalizeDate(right);
}

function isDuplicateTrade({
  importedTrade,
  existingTrade,
}: {
  importedTrade: ParsedBrokerTrade;
  existingTrade: ExistingJournalTradeForDuplicateCheck;
}) {
  const symbolMatches =
    normalizeString(importedTrade.symbol) === normalizeString(existingTrade.symbol);

  const instrumentMatches =
    normalizeString(importedTrade.instrument_type) ===
    normalizeString(existingTrade.instrument_type);

  const sideMatches =
    normalizeString(importedTrade.side) === normalizeString(existingTrade.side);

  const entryDateMatches = datesMatch(
    importedTrade.entry_date,
    existingTrade.entry_date
  );

  const exitDateMatches = datesMatch(
    importedTrade.exit_date,
    existingTrade.exit_date
  );

  const quantityMatches = numbersMatch(
    importedTrade.quantity,
    existingTrade.quantity
  );

  const entryPriceMatches = numbersMatch(
    importedTrade.entry_price,
    existingTrade.entry_price
  );

  const exitPriceMatches = numbersMatch(
    importedTrade.exit_price,
    existingTrade.exit_price
  );

  const exactLifecycleMatch =
    symbolMatches &&
    instrumentMatches &&
    sideMatches &&
    entryDateMatches &&
    exitDateMatches &&
    quantityMatches &&
    entryPriceMatches &&
    exitPriceMatches;

  if (exactLifecycleMatch) {
    return {
      duplicate: true,
      reason: "Exact trade match.",
    };
  }

  const pnlMatches = numbersMatch(
    importedTrade.profit_loss,
    existingTrade.profit_loss,
    0.01
  );

  const pnlPctMatches = numbersMatch(
    importedTrade.profit_loss_pct,
    existingTrade.profit_loss_pct,
    0.01
  );

  const likelyBrokerExportMatch =
    symbolMatches &&
    sideMatches &&
    quantityMatches &&
    entryDateMatches &&
    exitDateMatches &&
    pnlMatches &&
    pnlPctMatches;

  if (likelyBrokerExportMatch) {
    return {
      duplicate: true,
      reason: "Likely duplicate broker export row.",
    };
  }

  return {
    duplicate: false,
    reason: null,
  };
}

export function checkDuplicateTrades({
  importedTrades,
  existingTrades,
}: {
  importedTrades: ParsedBrokerTrade[];
  existingTrades: ExistingJournalTradeForDuplicateCheck[];
}): DuplicateTradeCheckResult[] {
  return importedTrades.map((trade) => {
    for (const existingTrade of existingTrades) {
      const result = isDuplicateTrade({
        importedTrade: trade,
        existingTrade,
      });

      if (result.duplicate) {
        return {
          trade,
          duplicate: true,
          duplicateTradeId: existingTrade.id,
          reason: result.reason,
        };
      }
    }

    return {
      trade,
      duplicate: false,
      duplicateTradeId: null,
      reason: null,
    };
  });
}
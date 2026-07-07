import type { SupabaseClient } from "@supabase/supabase-js";

import {
  checkDuplicateTrades,
  type DuplicateTradeCheckResult,
  type ExistingJournalTradeForDuplicateCheck,
} from "@/lib/journal/import/duplicateTrade";
import type { ParsedBrokerTrade } from "@/lib/journal/import/normalizeTrade";

export type JournalImportResult = {
  success: boolean;
  imported: number;
  skipped: number;
  duplicates: DuplicateTradeCheckResult[];
  errors: string[];
};

type InvalidTradeResult = {
  trade: ParsedBrokerTrade;
  index: number;
  missingFields: string[];
};

function isBlank(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "number") {
    return !Number.isFinite(value);
  }

  return value.trim().length === 0;
}

function validateTradeForImport(
  trade: ParsedBrokerTrade,
  index: number
): InvalidTradeResult | null {
  const missingFields: string[] = [];

  if (isBlank(trade.symbol)) {
    missingFields.push("symbol");
  }

  if (isBlank(trade.instrument_type)) {
    missingFields.push("instrument_type");
  }

  if (isBlank(trade.side)) {
    missingFields.push("side");
  }

  if (isBlank(trade.entry_date)) {
    missingFields.push("entry_date");
  }

  if (isBlank(trade.quantity) || Number(trade.quantity) <= 0) {
    missingFields.push("quantity");
  }

  if (missingFields.length === 0) {
    return null;
  }

  return {
    trade,
    index,
    missingFields,
  };
}

function formatInvalidTradeError(invalidTrade: InvalidTradeResult) {
  const tradeNumber = invalidTrade.index + 1;
  const trade = invalidTrade.trade;

  return [
    `Trade #${tradeNumber} is missing required field(s): ${invalidTrade.missingFields.join(
      ", "
    )}.`,
    `Symbol: ${trade.symbol || "—"}.`,
    `Side: ${trade.side || "—"}.`,
    `Entry Date: ${trade.entry_date || "—"}.`,
    `Exit Date: ${trade.exit_date || "—"}.`,
    `Quantity: ${trade.quantity ?? "—"}.`,
  ].join(" ");
}

export async function importParsedBrokerTrades({
  supabase,
  userId,
  trades,
}: {
  supabase: SupabaseClient;
  userId: string;
  trades: ParsedBrokerTrade[];
}): Promise<JournalImportResult> {
  const errors: string[] = [];

  if (!userId) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      duplicates: [],
      errors: ["Missing user ID."],
    };
  }

  if (!trades.length) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      duplicates: [],
      errors: ["There are no trades to import."],
    };
  }

  const { data: existingTradesData, error: existingTradesError } =
    await supabase
      .from("journal_trades")
      .select(
        `
        id,
        symbol,
        instrument_type,
        side,
        entry_date,
        exit_date,
        entry_price,
        exit_price,
        quantity,
        profit_loss,
        profit_loss_pct
        `
      )
      .eq("user_id", userId);

  if (existingTradesError) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      duplicates: [],
      errors: [
        `Failed to check existing journal trades: ${existingTradesError.message}`,
      ],
    };
  }

  const existingTrades =
    (existingTradesData ?? []) as ExistingJournalTradeForDuplicateCheck[];

  const duplicateResults = checkDuplicateTrades({
    importedTrades: trades,
    existingTrades,
  });

  const duplicateTrades = duplicateResults.filter((result) => result.duplicate);
  const newTrades = duplicateResults
    .filter((result) => !result.duplicate)
    .map((result) => result.trade);

  if (newTrades.length === 0) {
    return {
      success: true,
      imported: 0,
      skipped: duplicateTrades.length,
      duplicates: duplicateTrades,
      errors,
    };
  }

  const invalidTrades = newTrades
    .map((trade, index) => validateTradeForImport(trade, index))
    .filter((result): result is InvalidTradeResult => result !== null);

  if (invalidTrades.length > 0) {
    return {
      success: false,
      imported: 0,
      skipped: duplicateTrades.length + invalidTrades.length,
      duplicates: duplicateTrades,
      errors: invalidTrades.map(formatInvalidTradeError),
    };
  }

  const rows = newTrades.map((trade) => ({
    user_id: userId,
    symbol: trade.symbol,
    instrument_type: trade.instrument_type,
    side: trade.side,
    entry_date: trade.entry_date,
    exit_date: trade.exit_date,
    entry_price: trade.entry_price,
    exit_price: trade.exit_price,
    quantity: trade.quantity,
    profit_loss: trade.profit_loss,
    profit_loss_pct: trade.profit_loss_pct,
    notes: trade.notes,
  }));

  const { error: insertError } = await supabase
    .from("journal_trades")
    .insert(rows);

  if (insertError) {
    return {
      success: false,
      imported: 0,
      skipped: duplicateTrades.length,
      duplicates: duplicateTrades,
      errors: [`Failed to import broker trades: ${insertError.message}`],
    };
  }

  return {
    success: true,
    imported: newTrades.length,
    skipped: duplicateTrades.length,
    duplicates: duplicateTrades,
    errors,
  };
}
import type { CsvRow } from "@/lib/journal/import/csv";
import type { SupportedBroker } from "@/lib/journal/import/detectBroker";

export type ParsedBrokerTrade = {
  broker: SupportedBroker;
  symbol: string;
  instrument_type: "STOCK" | "OPTION";
  side: "BUY" | "SELL";
  entry_date: string | null;
  exit_date: string | null;
  entry_price: number | null;
  exit_price: number | null;
  quantity: number | null;
  profit_loss: number | null;
  profit_loss_pct: number | null;
  notes: string | null;
  raw: CsvRow;
};

export function parseNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const cleaned = value
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .replace(/\(/g, "-")
    .replace(/\)/g, "")
    .trim();

  if (!cleaned) return null;

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDate(value: string | null | undefined) {
  if (!value) return null;

  const cleaned = value.trim();

  if (!cleaned) return null;

  const date = new Date(cleaned);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function inferInstrumentType(symbol: string, description?: string) {
  const combined = `${symbol} ${description ?? ""}`.toUpperCase();

  if (
    combined.includes(" CALL") ||
    combined.includes(" PUT") ||
    /\d{6}[CP]\d{8}/.test(combined)
  ) {
    return "OPTION";
  }

  return "STOCK";
}

export function normalizeSide(value: string): "BUY" | "SELL" | null {
  const normalized = value.trim().toUpperCase();

  if (
    normalized.includes("BUY") ||
    normalized.includes("BOUGHT") ||
    normalized === "B"
  ) {
    return "BUY";
  }

  if (
    normalized.includes("SELL") ||
    normalized.includes("SOLD") ||
    normalized === "S"
  ) {
    return "SELL";
  }

  return null;
}

export function buildParsedTrade({
  broker,
  symbol,
  description,
  side,
  date,
  quantity,
  price,
  amount,
  profitLoss,
  profitLossPct,
  raw,
}: {
  broker: SupportedBroker;
  symbol: string;
  description?: string;
  side: "BUY" | "SELL";
  date: string | null;
  quantity: number | null;
  price: number | null;
  amount?: number | null;
  profitLoss?: number | null;
  profitLossPct?: number | null;
  raw: CsvRow;
}): ParsedBrokerTrade {
  return {
    broker,
    symbol: symbol.toUpperCase(),
    instrument_type: inferInstrumentType(symbol, description),
    side,
    entry_date: side === "BUY" ? date : null,
    exit_date: side === "SELL" ? date : null,
    entry_price: side === "BUY" ? price : null,
    exit_price: side === "SELL" ? price : null,
    quantity,
    profit_loss: profitLoss ?? amount ?? null,
    profit_loss_pct: profitLossPct ?? null,
    notes: description || null,
    raw,
  };
}
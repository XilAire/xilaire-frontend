export type SupportedBroker =
  | "CHARLES_SCHWAB"
  | "ROBINHOOD"
  | "FIDELITY"
  | "WEBULL"
  | "INTERACTIVE_BROKERS"
  | "TASTYTRADE"
  | "ETRADE"
  | "TRADESTATION"
  | "THINKORSWIM"
  | "GENERIC"
  | "UNKNOWN";

export type BrokerDetectionInput = {
  headers: string[];
  rows?: Record<string, string>[];
};

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\uFEFF/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function hasHeader(headers: string[], header: string) {
  return headers.includes(normalizeHeader(header));
}

function hasAnyHeader(headers: string[], candidates: string[]) {
  return candidates.some((candidate) => hasHeader(headers, candidate));
}

function hasAllHeaders(headers: string[], candidates: string[]) {
  return candidates.every((candidate) => hasHeader(headers, candidate));
}

function rowContains(rows: Record<string, string>[] | undefined, value: string) {
  if (!rows?.length) return false;

  const needle = value.toLowerCase();

  return rows.some((row) =>
    Object.values(row).some((cell) => cell.toLowerCase().includes(needle))
  );
}

export function detectBroker({
  headers,
  rows,
}: BrokerDetectionInput): SupportedBroker {
  const normalizedHeaders = headers.map(normalizeHeader);

  /*
     Fidelity must be checked before Schwab because Fidelity exports can contain
     generic fields like Action, Symbol, Quantity, and Price.
  */
  if (
    hasAnyHeader(normalizedHeaders, ["run_date", "trade_date"]) &&
    hasAnyHeader(normalizedHeaders, ["action", "trans_code", "transaction_type"]) &&
    hasAnyHeader(normalizedHeaders, ["symbol", "instrument"]) &&
    hasAnyHeader(normalizedHeaders, ["quantity", "qty"]) &&
    hasAnyHeader(normalizedHeaders, ["price", "amount"])
  ) {
    return "FIDELITY";
  }

  if (
    hasAllHeaders(normalizedHeaders, ["instrument", "trans_code"]) &&
    hasAnyHeader(normalizedHeaders, ["quantity", "price", "amount"])
  ) {
    return "FIDELITY";
  }

  if (
    rowContains(rows, "fidelity") ||
    rowContains(rows, "fidelity brokerage services")
  ) {
    return "FIDELITY";
  }

  if (
    hasAllHeaders(normalizedHeaders, [
      "activity_date",
      "process_date",
      "instrument",
      "description",
    ])
  ) {
    return "ROBINHOOD";
  }

  if (
    hasAnyHeader(normalizedHeaders, ["symbol", "ticker"]) &&
    hasAnyHeader(normalizedHeaders, ["filled_time", "time", "order_time"]) &&
    hasAnyHeader(normalizedHeaders, ["side", "action"]) &&
    hasAnyHeader(normalizedHeaders, ["filled_qty", "quantity", "qty"])
  ) {
    return "WEBULL";
  }

  if (
    hasAnyHeader(normalizedHeaders, ["symbol", "underlying"]) &&
    hasAnyHeader(normalizedHeaders, ["date_time", "trade_date", "date"]) &&
    hasAnyHeader(normalizedHeaders, ["buy_sell", "side", "action"]) &&
    (rowContains(rows, "interactive brokers") ||
      rowContains(rows, "ibkr") ||
      hasAnyHeader(normalizedHeaders, ["ib_order_id", "ib_exec_id"]))
  ) {
    return "INTERACTIVE_BROKERS";
  }

  if (
    hasAnyHeader(normalizedHeaders, ["symbol", "underlying"]) &&
    hasAnyHeader(normalizedHeaders, ["action", "transaction_type"]) &&
    hasAnyHeader(normalizedHeaders, ["quantity", "qty"]) &&
    (rowContains(rows, "tastytrade") ||
      hasAnyHeader(normalizedHeaders, ["tasty_order_id", "order_id"]))
  ) {
    return "TASTYTRADE";
  }

  if (
    hasAnyHeader(normalizedHeaders, ["symbol", "security"]) &&
    hasAnyHeader(normalizedHeaders, ["transaction_type", "action"]) &&
    hasAnyHeader(normalizedHeaders, ["quantity", "qty"]) &&
    (rowContains(rows, "etrade") ||
      rowContains(rows, "e*trade") ||
      hasAnyHeader(normalizedHeaders, ["account_number", "settlement_date"]))
  ) {
    return "ETRADE";
  }

  if (
    hasAnyHeader(normalizedHeaders, ["symbol"]) &&
    hasAnyHeader(normalizedHeaders, ["action", "side"]) &&
    hasAnyHeader(normalizedHeaders, ["quantity", "qty", "shares"]) &&
    hasAnyHeader(normalizedHeaders, ["price", "fill_price"]) &&
    (rowContains(rows, "tradestation") ||
      hasAnyHeader(normalizedHeaders, ["trade_station_order_id"]))
  ) {
    return "TRADESTATION";
  }

  if (
    hasAnyHeader(normalizedHeaders, ["symbol", "underlying"]) &&
    hasAnyHeader(normalizedHeaders, ["exec_time", "execution_time", "time"]) &&
    hasAnyHeader(normalizedHeaders, ["side", "action"]) &&
    hasAnyHeader(normalizedHeaders, ["qty", "quantity"]) &&
    (rowContains(rows, "thinkorswim") ||
      rowContains(rows, "tos") ||
      hasAnyHeader(normalizedHeaders, ["tos_order_id"]))
  ) {
    return "THINKORSWIM";
  }

  /*
     Schwab is intentionally below Fidelity and requires a stricter match.
     Schwab exports commonly include Action, Symbol, Quantity, Price, and Fees/Commission/Amount.
  */
  if (
    hasAllHeaders(normalizedHeaders, ["action", "symbol"]) &&
    hasAnyHeader(normalizedHeaders, ["quantity", "qty"]) &&
    hasAnyHeader(normalizedHeaders, ["price"]) &&
    hasAnyHeader(normalizedHeaders, ["amount", "net_amount", "fees", "commission"])
  ) {
    return "CHARLES_SCHWAB";
  }

  if (
    rowContains(rows, "charles schwab") ||
    rowContains(rows, "schwab") ||
    rowContains(rows, "schwab & co")
  ) {
    return "CHARLES_SCHWAB";
  }

  if (
    hasAnyHeader(normalizedHeaders, ["symbol", "ticker", "instrument"]) &&
    hasAnyHeader(normalizedHeaders, ["side", "action", "transaction_type"]) &&
    hasAnyHeader(normalizedHeaders, [
      "quantity",
      "qty",
      "shares",
      "contracts",
    ]) &&
    hasAnyHeader(normalizedHeaders, ["price", "entry_price", "average_price"])
  ) {
    return "GENERIC";
  }

  return "UNKNOWN";
}

export { normalizeHeader };
import type { CsvRow } from "@/lib/journal/import/csv";
import type { SupportedBroker } from "@/lib/journal/import/detectBroker";

export type ParsedBrokerOptionType =
  | "CALL"
  | "PUT";

export type ParsedBrokerOpenAction =
  | "BUY_TO_OPEN"
  | "SELL_TO_OPEN";

export type ParsedBrokerExecutionStyle =
  | "IMPORT";

export type ParsedBrokerTrade = {
  broker: SupportedBroker;
  symbol: string;
  instrument_type: "STOCK" | "OPTION";

  /**
   * Broker transaction direction.
   *
   * BUY and SELL are retained for backward compatibility with
   * the existing matching and duplicate-detection workflows.
   */
  side: "BUY" | "SELL";

  /**
   * Opening action inferred from the broker transaction.
   *
   * This gives buildTradeSummary and strategy detection enough
   * direction context to distinguish long and short option legs.
   */
  open_action: ParsedBrokerOpenAction;

  /**
   * Strategy structure.
   *
   * Individual imported rows default to UNKNOWN. The matching and
   * grouping layers can replace this with LONG_CALL, IRON_CONDOR,
   * BULL_PUT_CREDIT_SPREAD, and other detected strategies.
   */
  strategy_type: string;

  /**
   * Execution style remains separate from strategy structure.
   *
   * Broker imports do not normally contain Scalp, Swing, or LEAP,
   * so imported rows use IMPORT until the user edits the trade.
   */
  trade_style: ParsedBrokerExecutionStyle;

  option_type: ParsedBrokerOptionType | null;
  strike_price: number | null;
  expiration_date: string | null;

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

type ParsedOptionMetadata = {
  optionType: ParsedBrokerOptionType | null;
  strikePrice: number | null;
  expirationDate: string | null;
};

export function parseNumber(
  value: string | number | null | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    typeof value === "number"
  ) {
    return Number.isFinite(value)
      ? value
      : null;
  }

  const cleaned = value
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .replace(/\(/g, "-")
    .replace(/\)/g, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

export function parseDate(
  value: string | null | undefined,
) {
  if (!value) {
    return null;
  }

  const cleaned = value.trim();

  if (!cleaned) {
    return null;
  }

  const date = new Date(cleaned);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date.toISOString();
}

export function inferInstrumentType(
  symbol: string,
  description?: string,
): "STOCK" | "OPTION" {
  const combined =
    `${symbol} ${description ?? ""}`
      .toUpperCase();

  if (
    combined.includes(" CALL") ||
    combined.includes(" PUT") ||
    /\d{6}[CP]\d{8}/.test(
      combined,
    ) ||
    /\b[CP]\d{8}\b/.test(
      combined,
    )
  ) {
    return "OPTION";
  }

  return "STOCK";
}

export function normalizeSide(
  value: string,
): "BUY" | "SELL" | null {
  const normalized =
    value
      .trim()
      .toUpperCase();

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

function normalizeSymbol(
  value: string,
) {
  return value
    .trim()
    .toUpperCase();
}

function inferOpenAction(
  side: "BUY" | "SELL",
): ParsedBrokerOpenAction {
  return side === "SELL"
    ? "SELL_TO_OPEN"
    : "BUY_TO_OPEN";
}

function parseOccOptionSymbol(
  value: string,
): ParsedOptionMetadata | null {
  const normalized = value
    .replace(/\s+/g, "")
    .toUpperCase();

  /*
   * Standard OCC option symbol:
   *
   * ROOT + YYMMDD + C/P + 8-digit strike
   *
   * Example:
   * AAPL260117C00200000
   */
  const match = normalized.match(
    /^([A-Z0-9.]{1,10})(\d{6})([CP])(\d{8})$/,
  );

  if (!match) {
    return null;
  }

  const expirationToken =
    match[2];

  const optionTypeToken =
    match[3];

  const strikeToken =
    match[4];

  const year =
    Number(
      expirationToken.slice(
        0,
        2,
      ),
    );

  const month =
    Number(
      expirationToken.slice(
        2,
        4,
      ),
    );

  const day =
    Number(
      expirationToken.slice(
        4,
        6,
      ),
    );

  const fullYear =
    year >= 70
      ? 1900 + year
      : 2000 + year;

  const expirationDate =
    toIsoDateOnly({
      year:
        fullYear,
      month,
      day,
    });

  const strikePrice =
    Number(strikeToken) /
    1000;

  return {
    optionType:
      optionTypeToken === "C"
        ? "CALL"
        : "PUT",

    strikePrice:
      Number.isFinite(
        strikePrice,
      )
        ? strikePrice
        : null,

    expirationDate,
  };
}

function parseHumanOptionDescription(
  value: string,
): ParsedOptionMetadata {
  const normalized =
    value
      .replace(/,/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

  const optionType =
    /\bCALL\b/.test(normalized)
      ? "CALL"
      : /\bPUT\b/.test(normalized)
        ? "PUT"
        : null;

  /*
   * Common broker descriptions:
   *
   * AAPL 01/17/2026 200 CALL
   * AAPL JAN 17 2026 200 C
   * AAPL 200 CALL 01/17/2026
   */
  const numericDateMatch =
    normalized.match(
      /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/,
    );

  let expirationDate:
    | string
    | null = null;

  if (numericDateMatch) {
    const month =
      Number(
        numericDateMatch[1],
      );

    const day =
      Number(
        numericDateMatch[2],
      );

    const rawYear =
      Number(
        numericDateMatch[3],
      );

    const year =
      rawYear < 100
        ? rawYear >= 70
          ? 1900 + rawYear
          : 2000 + rawYear
        : rawYear;

    expirationDate =
      toIsoDateOnly({
        year,
        month,
        day,
      });
  }

  if (!expirationDate) {
    const parsedDate =
      extractMonthNameDate(
        normalized,
      );

    expirationDate =
      parsedDate;
  }

  let strikePrice:
    | number
    | null = null;

  const strikeBeforeType =
    normalized.match(
      /\b(\d+(?:\.\d+)?)\s+(?:CALL|PUT)\b/,
    );

  const strikeAfterType =
    normalized.match(
      /\b(?:CALL|PUT)\s+(\d+(?:\.\d+)?)\b/,
    );

  const strikeToken =
    strikeBeforeType?.[1] ??
    strikeAfterType?.[1] ??
    null;

  if (strikeToken) {
    const parsedStrike =
      Number(strikeToken);

    strikePrice =
      Number.isFinite(
        parsedStrike,
      )
        ? parsedStrike
        : null;
  }

  return {
    optionType,
    strikePrice,
    expirationDate,
  };
}

function inferOptionMetadata({
  symbol,
  description,
}: {
  symbol: string;
  description?: string;
}): ParsedOptionMetadata {
  const occFromSymbol =
    parseOccOptionSymbol(
      symbol,
    );

  if (occFromSymbol) {
    return occFromSymbol;
  }

  const occFromDescription =
    description
      ? description
          .split(/\s+/)
          .map((token) =>
            parseOccOptionSymbol(
              token,
            ),
          )
          .find(
            (
              metadata,
            ): metadata is ParsedOptionMetadata =>
              metadata !== null,
          ) ?? null
      : null;

  if (occFromDescription) {
    return occFromDescription;
  }

  return parseHumanOptionDescription(
    `${symbol} ${description ?? ""}`,
  );
}

function extractMonthNameDate(
  value: string,
) {
  const monthMap:
    Record<string, number> = {
      JAN: 1,
      JANUARY: 1,
      FEB: 2,
      FEBRUARY: 2,
      MAR: 3,
      MARCH: 3,
      APR: 4,
      APRIL: 4,
      MAY: 5,
      JUN: 6,
      JUNE: 6,
      JUL: 7,
      JULY: 7,
      AUG: 8,
      AUGUST: 8,
      SEP: 9,
      SEPT: 9,
      SEPTEMBER: 9,
      OCT: 10,
      OCTOBER: 10,
      NOV: 11,
      NOVEMBER: 11,
      DEC: 12,
      DECEMBER: 12,
    };

  const monthFirst =
    value.match(
      /\b(JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|JUL(?:Y)?|AUG(?:UST)?|SEP(?:T|TEMBER)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?)\s+(\d{1,2})\s+(\d{2,4})\b/,
    );

  const dayFirst =
    value.match(
      /\b(\d{1,2})\s+(JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|JUL(?:Y)?|AUG(?:UST)?|SEP(?:T|TEMBER)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?)\s+(\d{2,4})\b/,
    );

  const monthToken =
    monthFirst?.[1] ??
    dayFirst?.[2] ??
    null;

  const dayToken =
    monthFirst?.[2] ??
    dayFirst?.[1] ??
    null;

  const yearToken =
    monthFirst?.[3] ??
    dayFirst?.[3] ??
    null;

  if (
    !monthToken ||
    !dayToken ||
    !yearToken
  ) {
    return null;
  }

  const month =
    monthMap[monthToken];

  const day =
    Number(dayToken);

  const rawYear =
    Number(yearToken);

  const year =
    rawYear < 100
      ? rawYear >= 70
        ? 1900 + rawYear
        : 2000 + rawYear
      : rawYear;

  return toIsoDateOnly({
    year,
    month,
    day,
  });
}

function toIsoDateOnly({
  year,
  month,
  day,
}: {
  year: number;
  month: number;
  day: number;
}) {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

  if (
    date.getUTCFullYear() !==
      year ||
    date.getUTCMonth() !==
      month - 1 ||
    date.getUTCDate() !==
      day
  ) {
    return null;
  }

  return date
    .toISOString()
    .slice(
      0,
      10,
    );
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
  const normalizedSymbol =
    normalizeSymbol(symbol);

  const instrumentType =
    inferInstrumentType(
      normalizedSymbol,
      description,
    );

  const optionMetadata =
    instrumentType === "OPTION"
      ? inferOptionMetadata({
          symbol:
            normalizedSymbol,
          description,
        })
      : {
          optionType:
            null,
          strikePrice:
            null,
          expirationDate:
            null,
        };

  return {
    broker,

    symbol:
      normalizedSymbol,

    instrument_type:
      instrumentType,

    side,

    open_action:
      inferOpenAction(side),

    strategy_type:
      instrumentType === "STOCK"
        ? "STOCK"
        : "UNKNOWN",

    trade_style:
      "IMPORT",

    option_type:
      optionMetadata.optionType,

    strike_price:
      optionMetadata.strikePrice,

    expiration_date:
      optionMetadata.expirationDate,

    entry_date:
      side === "BUY"
        ? date
        : null,

    exit_date:
      side === "SELL"
        ? date
        : null,

    entry_price:
      side === "BUY"
        ? price
        : null,

    exit_price:
      side === "SELL"
        ? price
        : null,

    quantity,

    profit_loss:
      profitLoss ??
      amount ??
      null,

    profit_loss_pct:
      profitLossPct ??
      null,

    notes:
      description ||
      null,

    raw,
  };
}

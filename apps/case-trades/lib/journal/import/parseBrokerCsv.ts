import { parseCsv } from "@/lib/journal/import/csv";
import {
  detectBroker,
  type SupportedBroker,
} from "@/lib/journal/import/detectBroker";
import { matchBrokerTrades } from "@/lib/journal/import/matchTrades";
import type { ParsedBrokerTrade } from "@/lib/journal/import/normalizeTrade";

import { parseEtradeRows } from "@/lib/journal/import/parsers/etrade";
import { parseFidelityRows } from "@/lib/journal/import/parsers/fidelity";
import { parseGenericRows } from "@/lib/journal/import/parsers/generic";
import { parseIbkrRows } from "@/lib/journal/import/parsers/ibkr";
import { parseRobinhoodRows } from "@/lib/journal/import/parsers/robinhood";
import { parseSchwabRows } from "@/lib/journal/import/parsers/schwab";
import { parseTastytradeRows } from "@/lib/journal/import/parsers/tastytrade";
import { parseThinkOrSwimRows } from "@/lib/journal/import/parsers/thinkorswim";
import { parseTradeStationRows } from "@/lib/journal/import/parsers/tradestation";
import { parseWebullRows } from "@/lib/journal/import/parsers/webull";

export type { ParsedBrokerTrade } from "@/lib/journal/import/normalizeTrade";
export type { SupportedBroker } from "@/lib/journal/import/detectBroker";

export type ParseBrokerCsvResult = {
  broker: SupportedBroker;
  trades: ParsedBrokerTrade[];
  errors: string[];
  warnings: string[];
};

function parseRowsForBroker({
  broker,
  rows,
}: {
  broker: SupportedBroker;
  rows: Record<string, string>[];
}) {
  if (broker === "CHARLES_SCHWAB") {
    return parseSchwabRows(rows);
  }

  if (broker === "ROBINHOOD") {
    return parseRobinhoodRows(rows);
  }

  if (broker === "FIDELITY") {
    return parseFidelityRows(rows);
  }

  if (broker === "WEBULL") {
    return parseWebullRows(rows);
  }

  if (broker === "INTERACTIVE_BROKERS") {
    return parseIbkrRows(rows);
  }

  if (broker === "TASTYTRADE") {
    return parseTastytradeRows(rows);
  }

  if (broker === "ETRADE") {
    return parseEtradeRows(rows);
  }

  if (broker === "TRADESTATION") {
    return parseTradeStationRows(rows);
  }

  if (broker === "THINKORSWIM") {
    return parseThinkOrSwimRows(rows);
  }

  return parseGenericRows(rows);
}

export function parseBrokerCsv(csvText: string): ParseBrokerCsvResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!csvText.trim()) {
    return {
      broker: "UNKNOWN",
      trades: [],
      errors: ["CSV file is empty."],
      warnings,
    };
  }

  const parsedCsv = parseCsv(csvText);

  if (parsedCsv.rows.length === 0 || parsedCsv.headers.length === 0) {
    return {
      broker: "UNKNOWN",
      trades: [],
      errors: ["No trade rows found in CSV."],
      warnings,
    };
  }

  const detectedBroker = detectBroker({
    headers: parsedCsv.headers,
    rows: parsedCsv.rows,
  });

  if (detectedBroker === "UNKNOWN") {
    warnings.push(
      "Broker format could not be detected. Using generic CSV parser."
    );
  }

  const parserBroker =
    detectedBroker === "UNKNOWN" ? "GENERIC" : detectedBroker;

  const parsedTrades = parseRowsForBroker({
    broker: parserBroker,
    rows: parsedCsv.rows,
  });

  if (parsedTrades.length === 0) {
    errors.push("No valid trades could be parsed from this CSV.");
  }

  const matchedTrades = matchBrokerTrades(parsedTrades);

  return {
    broker: parserBroker,
    trades: matchedTrades,
    errors,
    warnings,
  };
}
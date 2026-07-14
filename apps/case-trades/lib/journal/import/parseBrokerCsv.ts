import { parseCsv } from "@/lib/journal/import/csv";
import {
  detectBroker,
  type SupportedBroker,
} from "@/lib/journal/import/detectBroker";
import {
  matchBrokerTrades,
  type MatchedBrokerTrade,
} from "@/lib/journal/import/matchTrades";
import {
  groupBrokerStrategies,
  type GroupedBrokerStrategyTrade,
} from "@/lib/journal/import/groupStrategies";
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
  trades: GroupedBrokerStrategyTrade[];

  /**
   * Number of returned strategy records that combine multiple option legs.
   */
  groupedStrategies: number;

  /**
   * Total number of option legs represented across all returned strategies.
   */
  totalOptionLegs: number;

  errors: string[];
  warnings: string[];
};

function parseRowsForBroker({
  broker,
  rows,
}: {
  broker: SupportedBroker;
  rows: Record<string, string>[];
}): ParsedBrokerTrade[] {
  if (
    broker ===
    "CHARLES_SCHWAB"
  ) {
    return parseSchwabRows(
      rows,
    );
  }

  if (
    broker ===
    "ROBINHOOD"
  ) {
    return parseRobinhoodRows(
      rows,
    );
  }

  if (
    broker ===
    "FIDELITY"
  ) {
    return parseFidelityRows(
      rows,
    );
  }

  if (
    broker ===
    "WEBULL"
  ) {
    return parseWebullRows(
      rows,
    );
  }

  if (
    broker ===
    "INTERACTIVE_BROKERS"
  ) {
    return parseIbkrRows(
      rows,
    );
  }

  if (
    broker ===
    "TASTYTRADE"
  ) {
    return parseTastytradeRows(
      rows,
    );
  }

  if (
    broker ===
    "ETRADE"
  ) {
    return parseEtradeRows(
      rows,
    );
  }

  if (
    broker ===
    "TRADESTATION"
  ) {
    return parseTradeStationRows(
      rows,
    );
  }

  if (
    broker ===
    "THINKORSWIM"
  ) {
    return parseThinkOrSwimRows(
      rows,
    );
  }

  return parseGenericRows(
    rows,
  );
}

function buildMatchWarnings(
  trades: MatchedBrokerTrade[],
) {
  const warnings:
    string[] = [];

  const openOnlyCount =
    trades.filter(
      (trade) =>
        trade.match_type ===
        "OPEN_ONLY",
    ).length;

  const closeOnlyCount =
    trades.filter(
      (trade) =>
        trade.match_type ===
        "CLOSE_ONLY",
    ).length;

  const partialCount =
    trades.filter(
      (trade) =>
        trade.match_type ===
        "PARTIAL_OPEN_CLOSE",
    ).length;

  if (
    openOnlyCount > 0
  ) {
    warnings.push(
      `${openOnlyCount} imported trade${
        openOnlyCount === 1
          ? ""
          : "s"
      } remain open because no matching close transaction was found.`,
    );
  }

  if (
    closeOnlyCount > 0
  ) {
    warnings.push(
      `${closeOnlyCount} imported trade${
        closeOnlyCount === 1
          ? ""
          : "s"
      } contain close activity without a matching opening transaction in this CSV.`,
    );
  }

  if (
    partialCount > 0
  ) {
    warnings.push(
      `${partialCount} imported trade${
        partialCount === 1
          ? ""
          : "s"
      } were reconstructed from multiple opening lots and partial closes.`,
    );
  }

  const optionTrades =
    trades.filter(
      (trade) =>
        trade.instrument_type ===
        "OPTION",
    );

  const missingOptionMetadata =
    optionTrades.filter(
      (trade) =>
        !trade.option_type ||
        trade.strike_price ===
          null ||
        !trade.expiration_date,
    ).length;

  if (
    missingOptionMetadata > 0
  ) {
    warnings.push(
      `${missingOptionMetadata} option trade${
        missingOptionMetadata === 1
          ? ""
          : "s"
      } could not be fully identified by option type, strike, and expiration. Strategy detection may remain Unknown until the trade is edited.`,
    );
  }

  const unknownStrategies =
    optionTrades.filter(
      (trade) =>
        !trade.strategy_type ||
        trade.strategy_type ===
          "UNKNOWN" ||
        trade.strategy_type ===
          "MULTI_LEG_OPTIONS",
    ).length;

  if (
    unknownStrategies > 0
  ) {
    warnings.push(
      `${unknownStrategies} option trade${
        unknownStrategies === 1
          ? ""
          : "s"
      } could not be assigned a final strategy during CSV matching.`,
    );
  }

  return warnings;
}

function buildStrategyGroupingWarnings(
  trades: GroupedBrokerStrategyTrade[],
) {
  const warnings:
    string[] = [];

  const groupedCount =
    trades.filter(
      (trade) =>
        trade.grouped,
    ).length;

  if (
    groupedCount > 0
  ) {
    warnings.push(
      `${groupedCount} multi-leg option strateg${
        groupedCount === 1
          ? "y was"
          : "ies were"
      } reconstructed from individually matched option contracts.`,
    );
  }

  const unknownGroupedStrategies =
    trades.filter(
      (trade) =>
        trade.instrument_type ===
          "OPTION" &&
        (
          !trade.strategy_type ||
          trade.strategy_type ===
            "UNKNOWN" ||
          trade.strategy_type ===
            "MULTI_LEG_OPTIONS"
        ),
    ).length;

  if (
    unknownGroupedStrategies >
    0
  ) {
    warnings.push(
      `${unknownGroupedStrategies} option strateg${
        unknownGroupedStrategies ===
        1
          ? "y could"
          : "ies could"
      } not be classified after grouping and will remain available for manual review.`,
    );
  }

  return warnings;
}

function validateGroupedTrades(
  trades: GroupedBrokerStrategyTrade[],
) {
  const errors:
    string[] = [];

  trades.forEach(
    (
      trade,
      index,
    ) => {
      const tradeNumber =
        index + 1;

      if (
        !trade.symbol
      ) {
        errors.push(
          `Grouped trade #${tradeNumber} is missing a symbol.`,
        );
      }

      if (
        !trade.instrument_type
      ) {
        errors.push(
          `Grouped trade #${tradeNumber} is missing an instrument type.`,
        );
      }

      if (
        trade.instrument_type ===
          "OPTION" &&
        trade.option_legs.length ===
          0
      ) {
        errors.push(
          `Grouped option trade #${tradeNumber} does not contain any option legs.`,
        );
      }

      if (
        trade.quantity ===
          null ||
        !Number.isFinite(
          Number(
            trade.quantity,
          ),
        ) ||
        Number(
          trade.quantity,
        ) <= 0
      ) {
        errors.push(
          `Grouped trade #${tradeNumber} has an invalid strategy quantity.`,
        );
      }
    },
  );

  return errors;
}

function validateMatchedTrades(
  trades: MatchedBrokerTrade[],
) {
  const errors:
    string[] = [];

  trades.forEach(
    (
      trade,
      index,
    ) => {
      const tradeNumber =
        index + 1;

      if (
        !trade.symbol
      ) {
        errors.push(
          `Matched trade #${tradeNumber} is missing a symbol.`,
        );
      }

      if (
        !trade.instrument_type
      ) {
        errors.push(
          `Matched trade #${tradeNumber} is missing an instrument type.`,
        );
      }

      if (
        !trade.entry_date &&
        !trade.exit_date
      ) {
        errors.push(
          `Matched trade #${tradeNumber} is missing both entry and exit dates.`,
        );
      }

      if (
        trade.quantity ===
          null ||
        !Number.isFinite(
          Number(
            trade.quantity,
          ),
        ) ||
        Number(
          trade.quantity,
        ) <= 0
      ) {
        errors.push(
          `Matched trade #${tradeNumber} has an invalid quantity.`,
        );
      }
    },
  );

  return errors;
}

function getGroupedStrategyCount(
  trades: GroupedBrokerStrategyTrade[],
) {
  return trades.filter(
    (trade) =>
      trade.grouped,
  ).length;
}

function getTotalOptionLegCount(
  trades: GroupedBrokerStrategyTrade[],
) {
  return trades.reduce(
    (
      total,
      trade,
    ) =>
      total +
      (
        trade.option_legs?.length ??
        0
      ),
    0,
  );
}

export function parseBrokerCsv(
  csvText: string,
): ParseBrokerCsvResult {
  const errors:
    string[] = [];

  const warnings:
    string[] = [];

  if (
    !csvText.trim()
  ) {
    return {
      broker:
        "UNKNOWN",

      trades:
        [],

      groupedStrategies:
        0,

      totalOptionLegs:
        0,

      errors:
        [
          "CSV file is empty.",
        ],

      warnings,
    };
  }

  const parsedCsv =
    parseCsv(
      csvText,
    );

  if (
    parsedCsv.rows.length ===
      0 ||
    parsedCsv.headers.length ===
      0
  ) {
    return {
      broker:
        "UNKNOWN",

      trades:
        [],

      groupedStrategies:
        0,

      totalOptionLegs:
        0,

      errors:
        [
          "No trade rows found in CSV.",
        ],

      warnings,
    };
  }

  const detectedBroker =
    detectBroker({
      headers:
        parsedCsv.headers,

      rows:
        parsedCsv.rows,
    });

  if (
    detectedBroker ===
    "UNKNOWN"
  ) {
    warnings.push(
      "Broker format could not be detected. Using generic CSV parser.",
    );
  }

  const parserBroker:
    SupportedBroker =
    detectedBroker ===
    "UNKNOWN"
      ? "GENERIC"
      : detectedBroker;

  let parsedTrades:
    ParsedBrokerTrade[] = [];

  try {
    parsedTrades =
      parseRowsForBroker({
        broker:
          parserBroker,

        rows:
          parsedCsv.rows,
      });
  } catch (
    parserError
  ) {
    const message =
      parserError instanceof
      Error
        ? parserError.message
        : String(
            parserError,
          );

    return {
      broker:
        parserBroker,

      trades:
        [],

      groupedStrategies:
        0,

      totalOptionLegs:
        0,

      errors: [
        `Failed to parse ${parserBroker} CSV rows: ${message}`,
      ],

      warnings,
    };
  }

  if (
    parsedTrades.length ===
    0
  ) {
    errors.push(
      "No valid trades could be parsed from this CSV.",
    );

    return {
      broker:
        parserBroker,

      trades:
        [],

      groupedStrategies:
        0,

      totalOptionLegs:
        0,

      errors,

      warnings,
    };
  }

  let matchedTrades:
    MatchedBrokerTrade[] =
      [];

  try {
    matchedTrades =
      matchBrokerTrades(
        parsedTrades,
      );
  } catch (
    matchError
  ) {
    const message =
      matchError instanceof
      Error
        ? matchError.message
        : String(
            matchError,
          );

    return {
      broker:
        parserBroker,

      trades:
        [],

      groupedStrategies:
        0,

      totalOptionLegs:
        0,

      errors: [
        `Failed to match broker trade lifecycles: ${message}`,
      ],

      warnings,
    };
  }

  if (
    matchedTrades.length ===
    0
  ) {
    errors.push(
      "Broker rows were parsed, but no trade lifecycles could be reconstructed.",
    );
  }

  warnings.push(
    ...buildMatchWarnings(
      matchedTrades,
    ),
  );

  errors.push(
    ...validateMatchedTrades(
      matchedTrades,
    ),
  );

  let groupedTrades:
    GroupedBrokerStrategyTrade[] =
      [];

  try {
    groupedTrades =
      groupBrokerStrategies(
        matchedTrades,
      );
  } catch (
    groupingError
  ) {
    const message =
      groupingError instanceof
      Error
        ? groupingError.message
        : String(
            groupingError,
          );

    return {
      broker:
        parserBroker,

      trades:
        [],

      groupedStrategies:
        0,

      totalOptionLegs:
        0,

      errors: [
        ...errors,
        `Failed to group matched option contracts into strategies: ${message}`,
      ],

      warnings,
    };
  }

  warnings.push(
    ...buildStrategyGroupingWarnings(
      groupedTrades,
    ),
  );

  errors.push(
    ...validateGroupedTrades(
      groupedTrades,
    ),
  );

  return {
    broker:
      parserBroker,

    trades:
      groupedTrades,

    groupedStrategies:
      getGroupedStrategyCount(
        groupedTrades,
      ),

    totalOptionLegs:
      getTotalOptionLegCount(
        groupedTrades,
      ),

    errors,

    warnings,
  };
}

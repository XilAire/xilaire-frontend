import type { MatchedBrokerTrade } from "@/lib/journal/import/matchTrades";
import {
  buildTradeSummary,
  type NormalizedTradeSummaryLeg,
  type TradeSummaryDebitCredit,
  type TradeSummaryOptionLegInput,
} from "@/lib/signals/buildTradeSummary";

const GROUPING_WINDOW_MINUTES = 15;
const UNKNOWN_STRATEGIES = new Set([
  "",
  "UNKNOWN",
  "MULTI_LEG_OPTIONS",
]);

export type GroupedBrokerOptionLeg = {
  id: string;
  leg_order: number;
  action: string;
  option_type: "CALL" | "PUT";
  strike_price: number | null;
  expiration_date: string | null;
  contracts: number;
  entry_price: number | null;
  exit_price: number | null;
  source_trade: MatchedBrokerTrade;
};

export type GroupedBrokerStrategyTrade = MatchedBrokerTrade & {
  /**
   * Every matched lifecycle row represented by this strategy.
   */
  grouped_trades: MatchedBrokerTrade[];

  /**
   * Normalized option legs suitable for signal_option_legs-style rendering.
   */
  option_legs: GroupedBrokerOptionLeg[];

  /**
   * Strategy-level calculations.
   */
  strategy_entry_type: TradeSummaryDebitCredit;
  signed_strategy_entry: number | null;
  strategy_entry_price: number | null;

  total_debit: number;
  total_credit: number;

  signed_strategy_exit: number | null;
  strategy_exit_price: number | null;

  total_exit_debit: number;
  total_exit_credit: number;

  strategy_profit_loss: number | null;
  strategy_profit_loss_dollars: number | null;
  strategy_return_pct: number | null;

  total_contracts: number;
  strategy_contracts: number;

  /**
   * True when multiple matched option lifecycle rows were combined.
   */
  grouped: boolean;
};

type CandidateGroup = {
  trades: MatchedBrokerTrade[];
  tradeIndexes: number[];
};

type GroupingContext = {
  trades: MatchedBrokerTrade[];
  usedIndexes: Set<number>;
};

function normalizeText(
  value: string | null | undefined,
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function normalizeNumber(
  value: number | string | null | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    typeof value === "string"
      ? Number(
          value
            .replace(/\$/g, "")
            .replace(/,/g, "")
            .replace(/%/g, "")
            .replace(/\(/g, "-")
            .replace(/\)/g, "")
            .trim(),
        )
      : Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function normalizePositiveNumber(
  value: number | string | null | undefined,
) {
  const parsed =
    normalizeNumber(value);

  if (
    parsed === null ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

function normalizeOptionType(
  value: string | null | undefined,
): "CALL" | "PUT" | null {
  const normalized =
    normalizeText(value);

  if (
    normalized === "CALL" ||
    normalized === "C"
  ) {
    return "CALL";
  }

  if (
    normalized === "PUT" ||
    normalized === "P"
  ) {
    return "PUT";
  }

  return null;
}

function normalizeOpeningAction(
  trade: MatchedBrokerTrade,
) {
  const savedAction =
    normalizeText(
      trade.open_action,
    );

  if (
    savedAction === "BUY_TO_OPEN" ||
    savedAction === "BTO"
  ) {
    return "BUY_TO_OPEN";
  }

  if (
    savedAction === "SELL_TO_OPEN" ||
    savedAction === "STO"
  ) {
    return "SELL_TO_OPEN";
  }

  return trade.side === "SELL"
    ? "SELL_TO_OPEN"
    : "BUY_TO_OPEN";
}

function getLifecycleTimestamp(
  trade: MatchedBrokerTrade,
) {
  const value =
    trade.entry_date ??
    trade.exit_date;

  if (!value) {
    return null;
  }

  const timestamp =
    new Date(value)
      .getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : null;
}

function getExitTimestamp(
  trade: MatchedBrokerTrade,
) {
  if (!trade.exit_date) {
    return null;
  }

  const timestamp =
    new Date(
      trade.exit_date,
    ).getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : null;
}

function roundTimestampToWindow(
  timestamp: number | null,
) {
  if (timestamp === null) {
    return "OPEN";
  }

  const windowMs =
    GROUPING_WINDOW_MINUTES *
    60 *
    1000;

  return String(
    Math.floor(
      timestamp /
      windowMs,
    ),
  );
}

function buildPrimaryGroupingKey(
  trade: MatchedBrokerTrade,
) {
  return [
    normalizeText(
      trade.broker,
    ),
    normalizeText(
      trade.symbol,
    ),
    roundTimestampToWindow(
      getLifecycleTimestamp(
        trade,
      ),
    ),
    roundTimestampToWindow(
      getExitTimestamp(
        trade,
      ),
    ),
    trade.match_type,
  ].join("|");
}

function isOptionTrade(
  trade: MatchedBrokerTrade,
) {
  return (
    normalizeText(
      trade.instrument_type,
    ) === "OPTION"
  );
}

function hasUsableOptionIdentity(
  trade: MatchedBrokerTrade,
) {
  return (
    normalizeOptionType(
      trade.option_type,
    ) !== null &&
    normalizeNumber(
      trade.strike_price,
    ) !== null
  );
}

function buildLegFromTrade({
  trade,
  legOrder,
}: {
  trade: MatchedBrokerTrade;
  legOrder: number;
}): GroupedBrokerOptionLeg | null {
  const optionType =
    normalizeOptionType(
      trade.option_type,
    );

  if (!optionType) {
    return null;
  }

  const contracts =
    normalizePositiveNumber(
      trade.quantity,
    ) ?? 1;

  return {
    id:
      `${trade.symbol}-${legOrder}-${trade.option_type ?? "OPTION"}-${trade.strike_price ?? "NA"}-${trade.expiration_date ?? "NA"}`,

    leg_order:
      legOrder,

    action:
      normalizeOpeningAction(
        trade,
      ),

    option_type:
      optionType,

    strike_price:
      normalizeNumber(
        trade.strike_price,
      ),

    expiration_date:
      trade.expiration_date ??
      null,

    contracts,

    entry_price:
      normalizeNumber(
        trade.entry_price,
      ),

    exit_price:
      normalizeNumber(
        trade.exit_price,
      ),

    source_trade:
      trade,
  };
}

function mapLegsForSummary(
  legs: GroupedBrokerOptionLeg[],
): TradeSummaryOptionLegInput[] {
  return legs.map(
    (leg) => ({
      id:
        leg.id,

      leg_order:
        leg.leg_order,

      action:
        leg.action,

      option_type:
        leg.option_type,

      strike_price:
        leg.strike_price,

      expiration_date:
        leg.expiration_date,

      contracts:
        leg.contracts,

      entry_price:
        leg.entry_price,

      exit_price:
        leg.exit_price,
    }),
  );
}

function isDetectedStrategyUsable(
  strategyType: string,
  legCount: number,
) {
  const normalized =
    normalizeText(
      strategyType,
    );

  if (
    UNKNOWN_STRATEGIES.has(
      normalized,
    )
  ) {
    return false;
  }

  if (
    legCount > 1 &&
    (
      normalized === "LONG_CALL" ||
      normalized === "SHORT_CALL" ||
      normalized === "LONG_PUT" ||
      normalized === "SHORT_PUT" ||
      normalized === "SINGLE_CALL" ||
      normalized === "SINGLE_PUT"
    )
  ) {
    return false;
  }

  return true;
}

function getGroupQuantity(
  trades: MatchedBrokerTrade[],
) {
  const quantities =
    trades
      .map(
        (trade) =>
          normalizePositiveNumber(
            trade.quantity,
          ),
      )
      .filter(
        (
          quantity,
        ): quantity is number =>
          quantity !== null,
      );

  if (
    quantities.length === 0
  ) {
    return 1;
  }

  return Math.min(
    ...quantities,
  );
}

function getEarliestDate(
  trades: MatchedBrokerTrade[],
  key:
    | "entry_date"
    | "exit_date",
) {
  return trades
    .map(
      (trade) =>
        trade[key],
    )
    .filter(
      (
        value,
      ): value is string =>
        Boolean(value),
    )
    .sort()[0] ??
    null;
}

function getLatestDate(
  trades: MatchedBrokerTrade[],
  key:
    | "entry_date"
    | "exit_date",
) {
  const values =
    trades
      .map(
        (trade) =>
          trade[key],
      )
      .filter(
        (
          value,
        ): value is string =>
          Boolean(value),
      )
      .sort();

  return values[
    values.length - 1
  ] ?? null;
}

function mergeNotes(
  trades: MatchedBrokerTrade[],
) {
  const notes =
    trades
      .map(
        (trade) =>
          trade.notes,
      )
      .filter(
        (
          value,
        ): value is string =>
          Boolean(
            value?.trim(),
          ),
      );

  if (
    notes.length === 0
  ) {
    return null;
  }

  return Array.from(
    new Set(notes),
  ).join(" | ");
}

function mergeSourceTrades(
  trades: MatchedBrokerTrade[],
) {
  return trades.flatMap(
    (trade) =>
      trade.source_trades ??
      [trade],
  );
}

function chooseRepresentativeTrade(
  trades: MatchedBrokerTrade[],
) {
  return (
    trades.find(
      (trade) =>
        trade.match_type ===
        "OPEN_CLOSE",
    ) ??
    trades.find(
      (trade) =>
        trade.match_type ===
        "PARTIAL_OPEN_CLOSE",
    ) ??
    trades[0]
  );
}

function buildGroupedTrade(
  trades: MatchedBrokerTrade[],
): GroupedBrokerStrategyTrade {
  const sortedTrades =
    [...trades].sort(
      (
        first,
        second,
      ) => {
        const firstStrike =
          normalizeNumber(
            first.strike_price,
          ) ??
          Number.POSITIVE_INFINITY;

        const secondStrike =
          normalizeNumber(
            second.strike_price,
          ) ??
          Number.POSITIVE_INFINITY;

        if (
          firstStrike !==
          secondStrike
        ) {
          return (
            firstStrike -
            secondStrike
          );
        }

        return normalizeText(
          first.option_type,
        ).localeCompare(
          normalizeText(
            second.option_type,
          ),
        );
      },
    );

  const legs =
    sortedTrades
      .map(
        (
          trade,
          index,
        ) =>
          buildLegFromTrade({
            trade,
            legOrder:
              index + 1,
          }),
      )
      .filter(
        (
          leg,
        ): leg is GroupedBrokerOptionLeg =>
          leg !== null,
      );

  const representativeTrade =
    chooseRepresentativeTrade(
      sortedTrades,
    );

  const strategyQuantity =
    getGroupQuantity(
      sortedTrades,
    );

  const summary =
    buildTradeSummary({
      symbol:
        representativeTrade.symbol,

      instrument_type:
        representativeTrade.instrument_type,

      strategy_type:
        UNKNOWN_STRATEGIES.has(
          normalizeText(
            representativeTrade.strategy_type,
          ),
        )
          ? undefined
          : representativeTrade.strategy_type,

      execution_style:
        representativeTrade.trade_style,

      action:
        representativeTrade.side,

      open_action:
        representativeTrade.open_action,

      entry_price:
        representativeTrade.entry_price,

      exit_price:
        representativeTrade.exit_price,

      quantity:
        strategyQuantity,

      contracts:
        strategyQuantity,

      option_type:
        representativeTrade.option_type,

      strike_price:
        representativeTrade.strike_price,

      expiration_date:
        representativeTrade.expiration_date,

      option_legs:
        mapLegsForSummary(
          legs,
        ),
    });

  const grouped =
    sortedTrades.length > 1;

  const combinedPnl =
    sortedTrades.every(
      (trade) =>
        trade.profit_loss !==
        null,
    )
      ? Number(
          sortedTrades
            .reduce(
              (
                total,
                trade,
              ) =>
                total +
                (
                  normalizeNumber(
                    trade.profit_loss,
                  ) ??
                  0
                ),
              0,
            )
            .toFixed(2),
        )
      : summary.netPnlDollars;

  const sourceTrades =
    mergeSourceTrades(
      sortedTrades,
    );

  return {
    ...representativeTrade,

    symbol:
      summary.symbol,

    strategy_type:
      summary.strategyType,

    /*
     * ParsedBrokerTrade currently defines imported execution style as the
     * literal "IMPORT". Keep the grouped trade compatible with that contract.
     * The detected strategy remains stored separately in strategy_type.
     */
    trade_style:
      "IMPORT",

    side:
      summary.debitCredit ===
      "CREDIT"
        ? "SELL"
        : "BUY",

    open_action:
      summary.debitCredit ===
      "CREDIT"
        ? "SELL_TO_OPEN"
        : "BUY_TO_OPEN",

    option_type:
      legs.length === 1
        ? legs[0].option_type
        : null,

    strike_price:
      legs.length === 1
        ? legs[0].strike_price
        : null,

    expiration_date:
      summary.primaryExpirationDate,

    entry_date:
      getEarliestDate(
        sortedTrades,
        "entry_date",
      ),

    exit_date:
      getLatestDate(
        sortedTrades,
        "exit_date",
      ),

    entry_price:
      summary.netEntryAmount,

    exit_price:
      summary.netExitAmount,

    quantity:
      summary.strategyContracts ||
      strategyQuantity,

    profit_loss:
      combinedPnl,

    profit_loss_pct:
      summary.returnPct,

    notes:
      mergeNotes(
        sortedTrades,
      ),

    matched:
      sortedTrades.every(
        (trade) =>
          trade.matched,
      ),

    match_type:
      sortedTrades.some(
        (trade) =>
          trade.match_type ===
          "PARTIAL_OPEN_CLOSE",
      )
        ? "PARTIAL_OPEN_CLOSE"
        : sortedTrades.every(
              (trade) =>
                trade.match_type ===
                "OPEN_CLOSE",
            )
          ? "OPEN_CLOSE"
          : sortedTrades.every(
                (trade) =>
                  trade.match_type ===
                  "OPEN_ONLY",
              )
            ? "OPEN_ONLY"
            : sortedTrades.every(
                  (trade) =>
                    trade.match_type ===
                    "CLOSE_ONLY",
                )
              ? "CLOSE_ONLY"
              : "UNMATCHED",

    source_trades:
      sourceTrades,

    leg_count:
      summary.legCount,

    grouped_trades:
      sortedTrades,

    option_legs:
      legs,

    strategy_entry_type:
      summary.debitCredit,

    signed_strategy_entry:
      summary.netEntry,

    strategy_entry_price:
      summary.netEntryAmount,

    total_debit:
      summary.totalPaid,

    total_credit:
      summary.totalReceived,

    signed_strategy_exit:
      summary.netExit,

    strategy_exit_price:
      summary.netExitAmount,

    total_exit_debit:
      summary.totalExitPaid,

    total_exit_credit:
      summary.totalExitReceived,

    strategy_profit_loss:
      summary.netPnl,

    strategy_profit_loss_dollars:
      combinedPnl,

    strategy_return_pct:
      summary.returnPct,

    total_contracts:
      summary.totalContracts,

    strategy_contracts:
      summary.strategyContracts,

    grouped,
  };
}

function buildSingleTradeGroup(
  trade: MatchedBrokerTrade,
) {
  return buildGroupedTrade(
    [trade],
  );
}

function combinations(
  indexes: number[],
  size: number,
) {
  const results:
    number[][] = [];

  function walk(
    start: number,
    current: number[],
  ) {
    if (
      current.length ===
      size
    ) {
      results.push(
        [...current],
      );
      return;
    }

    for (
      let index = start;
      index < indexes.length;
      index += 1
    ) {
      current.push(
        indexes[index],
      );

      walk(
        index + 1,
        current,
      );

      current.pop();
    }
  }

  walk(
    0,
    [],
  );

  return results;
}

function scoreCandidateGroup(
  candidate: CandidateGroup,
) {
  const groupedTrade =
    buildGroupedTrade(
      candidate.trades,
    );

  const strategyType =
    normalizeText(
      groupedTrade.strategy_type,
    );

  if (
    !isDetectedStrategyUsable(
      strategyType,
      groupedTrade.leg_count,
    )
  ) {
    return null;
  }

  let score =
    groupedTrade.leg_count *
    100;

  if (
    strategyType.includes(
      "IRON_CONDOR",
    ) ||
    strategyType.includes(
      "IRON_BUTTERFLY",
    )
  ) {
    score += 80;
  }

  if (
    strategyType.includes(
      "BUTTERFLY",
    ) ||
    strategyType.includes(
      "CALENDAR",
    ) ||
    strategyType.includes(
      "DIAGONAL",
    ) ||
    strategyType.includes(
      "STRADDLE",
    ) ||
    strategyType.includes(
      "STRANGLE",
    )
  ) {
    score += 50;
  }

  if (
    strategyType.includes(
      "SPREAD",
    )
  ) {
    score += 30;
  }

  const uniqueExpirations =
    new Set(
      candidate.trades.map(
        (trade) =>
          trade.expiration_date ??
          "",
      ),
    );

  if (
    uniqueExpirations.size <= 2
  ) {
    score += 10;
  }

  const quantities =
    candidate.trades
      .map(
        (trade) =>
          normalizePositiveNumber(
            trade.quantity,
          ),
      )
      .filter(
        (
          value,
        ): value is number =>
          value !== null,
      );

  if (
    quantities.length > 0 &&
    Math.max(
      ...quantities,
    ) ===
      Math.min(
        ...quantities,
      )
  ) {
    score += 10;
  }

  return {
    score,
    groupedTrade,
  };
}

function findBestCandidate(
  context: GroupingContext,
) {
  const availableIndexes =
    context.trades
      .map(
        (
          _trade,
          index,
        ) =>
          index,
      )
      .filter(
        (index) =>
          !context.usedIndexes.has(
            index,
          ),
      );

  const candidateSizes =
    [4, 3, 2];

  let best:
    | {
        score: number;
        candidate: CandidateGroup;
        groupedTrade: GroupedBrokerStrategyTrade;
      }
    | null = null;

  for (
    const size of
    candidateSizes
  ) {
    if (
      availableIndexes.length <
      size
    ) {
      continue;
    }

    for (
      const candidateIndexes of
      combinations(
        availableIndexes,
        size,
      )
    ) {
      const candidateTrades =
        candidateIndexes.map(
          (index) =>
            context.trades[index],
        );

      const scored =
        scoreCandidateGroup({
          trades:
            candidateTrades,
          tradeIndexes:
            candidateIndexes,
        });

      if (!scored) {
        continue;
      }

      if (
        !best ||
        scored.score >
          best.score
      ) {
        best = {
          score:
            scored.score,

          candidate: {
            trades:
              candidateTrades,

            tradeIndexes:
              candidateIndexes,
          },

          groupedTrade:
            scored.groupedTrade,
        };
      }
    }

    /*
     * Prefer the largest valid strategy structure. Once a valid
     * four-leg or three-leg grouping exists, do not break it into
     * smaller spreads.
     */
    if (
      best &&
      best.candidate.trades.length ===
        size
    ) {
      break;
    }
  }

  return best;
}

function groupOptionBucket(
  trades: MatchedBrokerTrade[],
) {
  const context:
    GroupingContext = {
      trades,
      usedIndexes:
        new Set<number>(),
    };

  const grouped:
    GroupedBrokerStrategyTrade[] =
      [];

  while (
    context.usedIndexes.size <
    context.trades.length
  ) {
    const best =
      findBestCandidate(
        context,
      );

    if (!best) {
      break;
    }

    grouped.push(
      best.groupedTrade,
    );

    best.candidate.tradeIndexes.forEach(
      (index) =>
        context.usedIndexes.add(
          index,
        ),
    );
  }

  context.trades.forEach(
    (
      trade,
      index,
    ) => {
      if (
        !context.usedIndexes.has(
          index,
        )
      ) {
        grouped.push(
          buildSingleTradeGroup(
            trade,
          ),
        );
      }
    },
  );

  return grouped;
}

function sortGroupedTrades(
  trades: GroupedBrokerStrategyTrade[],
) {
  return [...trades].sort(
    (
      first,
      second,
    ) => {
      const firstDate =
        first.entry_date ??
        first.exit_date;

      const secondDate =
        second.entry_date ??
        second.exit_date;

      const firstTime =
        firstDate
          ? new Date(
              firstDate,
            ).getTime()
          : 0;

      const secondTime =
        secondDate
          ? new Date(
              secondDate,
            ).getTime()
          : 0;

      return (
        secondTime -
        firstTime
      );
    },
  );
}

/**
 * Combines individually matched option contract lifecycles into complete
 * multi-leg strategy trades.
 *
 * Pipeline:
 *
 * parseBrokerCsv()
 *   -> matchBrokerTrades()
 *   -> groupBrokerStrategies()
 *   -> importParsedBrokerTrades()
 */
export function groupBrokerStrategies(
  trades: MatchedBrokerTrade[],
): GroupedBrokerStrategyTrade[] {
  if (
    trades.length === 0
  ) {
    return [];
  }

  const passthroughTrades:
    GroupedBrokerStrategyTrade[] =
      [];

  const optionBuckets =
    new Map<
      string,
      MatchedBrokerTrade[]
    >();

  for (
    const trade of
    trades
  ) {
    if (
      !isOptionTrade(
        trade,
      ) ||
      !hasUsableOptionIdentity(
        trade,
      )
    ) {
      passthroughTrades.push(
        buildSingleTradeGroup(
          trade,
        ),
      );

      continue;
    }

    const key =
      buildPrimaryGroupingKey(
        trade,
      );

    const existing =
      optionBuckets.get(
        key,
      ) ??
      [];

    existing.push(
      trade,
    );

    optionBuckets.set(
      key,
      existing,
    );
  }

  const groupedOptionTrades =
    Array.from(
      optionBuckets.values(),
    ).flatMap(
      groupOptionBucket,
    );

  return sortGroupedTrades([
    ...passthroughTrades,
    ...groupedOptionTrades,
  ]);
}

export function isGroupedBrokerStrategyTrade(
  trade: MatchedBrokerTrade | GroupedBrokerStrategyTrade,
): trade is GroupedBrokerStrategyTrade {
  return (
    "grouped_trades" in
      trade &&
    Array.isArray(
      trade.grouped_trades,
    ) &&
    "option_legs" in
      trade &&
    Array.isArray(
      trade.option_legs,
    )
  );
}

export function getGroupedTradeOptionLegInputs(
  trade: GroupedBrokerStrategyTrade,
): TradeSummaryOptionLegInput[] {
  return mapLegsForSummary(
    trade.option_legs,
  );
}

export function getGroupedTradeDisplayLegs(
  trade: GroupedBrokerStrategyTrade,
): NormalizedTradeSummaryLeg[] {
  const summary =
    buildTradeSummary({
      symbol:
        trade.symbol,

      instrument_type:
        trade.instrument_type,

      strategy_type:
        trade.strategy_type,

      execution_style:
        trade.trade_style,

      action:
        trade.side,

      open_action:
        trade.open_action,

      entry_price:
        trade.entry_price,

      exit_price:
        trade.exit_price,

      quantity:
        trade.quantity,

      contracts:
        trade.strategy_contracts,

      option_legs:
        getGroupedTradeOptionLegInputs(
          trade,
        ),
    });

  return summary.legs;
}

import type {
  ParsedBrokerOpenAction,
  ParsedBrokerTrade,
} from "@/lib/journal/import/normalizeTrade";
import {
  buildTradeSummary,
  type TradeSummaryOptionLegInput,
} from "@/lib/signals/buildTradeSummary";

const EPSILON = 0.000001;

export type MatchedBrokerTrade = ParsedBrokerTrade & {
  matched: boolean;
  match_type:
    | "OPEN_ONLY"
    | "CLOSE_ONLY"
    | "OPEN_CLOSE"
    | "PARTIAL_OPEN_CLOSE"
    | "UNMATCHED";

  /**
   * Original broker rows that produced this normalized lifecycle trade.
   */
  source_trades: ParsedBrokerTrade[];

  /**
   * Number of option legs represented by this normalized trade.
   *
   * At this matching layer, each unique contract identity is matched
   * independently, so options normally produce one leg. The later import
   * grouping layer can combine related rows into multi-leg strategies.
   */
  leg_count: number;
};

type PositionDirection =
  | "LONG"
  | "SHORT";

type OpenLot = {
  trade: ParsedBrokerTrade;
  direction: PositionDirection;
  remainingQuantity: number;
};

type MatchResult = {
  matchedTrades: MatchedBrokerTrade[];
  remainingLots: OpenLot[];
};

function normalizeSymbol(
  value: string | null | undefined,
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function normalizeInstrument(
  value: string | null | undefined,
): "STOCK" | "OPTION" {
  const normalized =
    String(value ?? "")
      .trim()
      .toUpperCase();

  return normalized === "OPTION"
    ? "OPTION"
    : "STOCK";
}

function normalizeOptionType(
  value: string | null | undefined,
) {
  const normalized =
    String(value ?? "")
      .trim()
      .toUpperCase();

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

  return "";
}

function normalizeDateOnly(
  value: string | null | undefined,
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return date
    .toISOString()
    .slice(
      0,
      10,
    );
}

function normalizeStrike(
  value: number | null | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "";
  }

  return Number(value)
    .toFixed(4);
}

function toNumber(
  value: number | null | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function roundQuantity(
  value: number,
) {
  if (
    !Number.isFinite(value) ||
    Math.abs(value) <= EPSILON
  ) {
    return 0;
  }

  return Number(
    value.toFixed(8),
  );
}

function hasMeaningfulQuantity(
  value: number,
) {
  return (
    Number.isFinite(value) &&
    Math.abs(value) > EPSILON
  );
}

function safeQuantity(
  value: number | null | undefined,
) {
  const quantity =
    toNumber(value);

  if (
    quantity === null ||
    quantity <= EPSILON
  ) {
    return 0;
  }

  return roundQuantity(
    quantity,
  );
}

function getTradeDate(
  trade: ParsedBrokerTrade,
) {
  return (
    trade.entry_date ??
    trade.exit_date
  );
}

function getTradePrice(
  trade: ParsedBrokerTrade,
) {
  return (
    trade.entry_price ??
    trade.exit_price
  );
}

function getTradeTimestamp(
  trade: ParsedBrokerTrade,
) {
  const value =
    getTradeDate(trade);

  if (!value) {
    return 0;
  }

  const timestamp =
    new Date(value)
      .getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}

function compareTradeDates(
  left: ParsedBrokerTrade,
  right: ParsedBrokerTrade,
) {
  return (
    getTradeTimestamp(left) -
    getTradeTimestamp(right)
  );
}

/**
 * Match option lifecycle rows only against the same contract.
 *
 * Matching merely by ticker and instrument type can incorrectly combine
 * different strikes, expirations, or calls/puts into one trade.
 */
function buildGroupKey(
  trade: ParsedBrokerTrade,
) {
  const parts = [
    normalizeSymbol(
      trade.symbol,
    ),
    normalizeInstrument(
      trade.instrument_type,
    ),
  ];

  if (
    trade.instrument_type ===
    "OPTION"
  ) {
    parts.push(
      normalizeOptionType(
        trade.option_type,
      ),
      normalizeStrike(
        trade.strike_price,
      ),
      normalizeDateOnly(
        trade.expiration_date,
      ),
    );
  }

  return parts.join("|");
}

function getOpeningAction(
  direction: PositionDirection,
): ParsedBrokerOpenAction {
  return direction === "SHORT"
    ? "SELL_TO_OPEN"
    : "BUY_TO_OPEN";
}

function getLifecycleSide(
  direction: PositionDirection,
): "BUY" | "SELL" {
  return direction === "SHORT"
    ? "SELL"
    : "BUY";
}

function calculatePnl({
  entryPrice,
  exitPrice,
  quantity,
  instrumentType,
  direction,
}: {
  entryPrice: number | null;
  exitPrice: number | null;
  quantity: number;
  instrumentType: "STOCK" | "OPTION";
  direction: PositionDirection;
}) {
  if (
    entryPrice === null ||
    exitPrice === null ||
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(exitPrice) ||
    !hasMeaningfulQuantity(quantity)
  ) {
    return null;
  }

  const multiplier =
    instrumentType === "OPTION"
      ? 100
      : 1;

  const directionMultiplier =
    direction === "SHORT"
      ? -1
      : 1;

  return Number(
    (
      (
        exitPrice -
        entryPrice
      ) *
      directionMultiplier *
      quantity *
      multiplier
    ).toFixed(2),
  );
}

function calculatePnlPct({
  entryPrice,
  exitPrice,
  direction,
}: {
  entryPrice: number | null;
  exitPrice: number | null;
  direction: PositionDirection;
}) {
  if (
    entryPrice === null ||
    exitPrice === null ||
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(exitPrice) ||
    entryPrice === 0
  ) {
    return null;
  }

  const directionMultiplier =
    direction === "SHORT"
      ? -1
      : 1;

  return Number(
    (
      (
        (
          exitPrice -
          entryPrice
        ) /
        Math.abs(entryPrice)
      ) *
      directionMultiplier *
      100
    ).toFixed(2),
  );
}

function weightedAveragePrice(
  fills: Array<{
    quantity: number;
    price: number | null;
  }>,
) {
  const validFills =
    fills.filter(
      (fill) =>
        hasMeaningfulQuantity(
          fill.quantity,
        ) &&
        fill.price !== null &&
        Number.isFinite(
          fill.price,
        ),
    );

  const totalQuantity =
    validFills.reduce(
      (sum, fill) =>
        sum +
        fill.quantity,
      0,
    );

  if (
    !hasMeaningfulQuantity(
      totalQuantity,
    )
  ) {
    return null;
  }

  const totalValue =
    validFills.reduce(
      (sum, fill) =>
        sum +
        fill.quantity *
          Number(
            fill.price,
          ),
      0,
    );

  return Number(
    (
      totalValue /
      totalQuantity
    ).toFixed(4),
  );
}

function mergeNotes(
  trades: ParsedBrokerTrade[],
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

function buildStrategyMetadata({
  trade,
  direction,
  quantity,
  entryPrice,
  exitPrice,
}: {
  trade: ParsedBrokerTrade;
  direction: PositionDirection;
  quantity: number;
  entryPrice: number | null;
  exitPrice: number | null;
}) {
  if (
    trade.instrument_type !==
    "OPTION"
  ) {
    return {
      strategyType:
        "STOCK",
      legCount:
        0,
    };
  }

  const leg:
    TradeSummaryOptionLegInput = {
      leg_order:
        1,

      action:
        getOpeningAction(
          direction,
        ),

      option_type:
        trade.option_type,

      strike_price:
        trade.strike_price,

      expiration_date:
        trade.expiration_date,

      contracts:
        quantity,

      entry_price:
        entryPrice,

      exit_price:
        exitPrice,
    };

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

      open_action:
        getOpeningAction(
          direction,
        ),

      contracts:
        quantity,

      option_type:
        trade.option_type,

      strike_price:
        trade.strike_price,

      expiration_date:
        trade.expiration_date,

      option_legs:
        [leg],
    });

  return {
    strategyType:
      summary.strategyType,
    legCount:
      summary.legCount,
  };
}

function buildMatchedTrade({
  openTrades,
  closeTrade,
  quantity,
  direction,
}: {
  openTrades: ParsedBrokerTrade[];
  closeTrade: ParsedBrokerTrade;
  quantity: number;
  direction: PositionDirection;
}): MatchedBrokerTrade {
  const normalizedQuantity =
    roundQuantity(
      quantity,
    );

  const representativeTrade =
    openTrades[0] ??
    closeTrade;

  const symbol =
    normalizeSymbol(
      representativeTrade.symbol,
    );

  const instrumentType =
    normalizeInstrument(
      representativeTrade.instrument_type,
    );

  const entryDate =
    openTrades
      .map(
        (trade) =>
          trade.entry_date ??
          trade.exit_date,
      )
      .filter(
        (
          value,
        ): value is string =>
          Boolean(value),
      )
      .sort()[0] ??
    null;

  const exitDate =
    closeTrade.exit_date ??
    closeTrade.entry_date ??
    null;

  const averageEntryPrice =
    weightedAveragePrice(
      openTrades.map(
        (trade) => ({
          quantity:
            safeQuantity(
              trade.quantity,
            ),
          price:
            getTradePrice(
              trade,
            ),
        }),
      ),
    );

  const exitPrice =
    getTradePrice(
      closeTrade,
    );

  const calculatedProfitLoss =
    calculatePnl({
      entryPrice:
        averageEntryPrice,
      exitPrice,
      quantity:
        normalizedQuantity,
      instrumentType,
      direction,
    });

  const calculatedProfitLossPct =
    calculatePnlPct({
      entryPrice:
        averageEntryPrice,
      exitPrice,
      direction,
    });

  const strategyMetadata =
    buildStrategyMetadata({
      trade:
        representativeTrade,
      direction,
      quantity:
        normalizedQuantity,
      entryPrice:
        averageEntryPrice,
      exitPrice,
    });

  const sourceTrades = [
    ...openTrades,
    closeTrade,
  ];

  return {
    broker:
      closeTrade.broker,

    symbol,

    instrument_type:
      instrumentType,

    side:
      getLifecycleSide(
        direction,
      ),

    open_action:
      getOpeningAction(
        direction,
      ),

    strategy_type:
      strategyMetadata.strategyType,

    trade_style:
      representativeTrade.trade_style ??
      "IMPORT",

    option_type:
      representativeTrade.option_type ??
      closeTrade.option_type ??
      null,

    strike_price:
      representativeTrade.strike_price ??
      closeTrade.strike_price ??
      null,

    expiration_date:
      representativeTrade.expiration_date ??
      closeTrade.expiration_date ??
      null,

    entry_date:
      entryDate,

    exit_date:
      exitDate,

    entry_price:
      averageEntryPrice,

    exit_price:
      exitPrice,

    quantity:
      normalizedQuantity,

    profit_loss:
      calculatedProfitLoss,

    profit_loss_pct:
      calculatedProfitLossPct,

    notes:
      mergeNotes(
        sourceTrades,
      ),

    raw:
      closeTrade.raw,

    matched:
      true,

    match_type:
      openTrades.length > 1
        ? "PARTIAL_OPEN_CLOSE"
        : "OPEN_CLOSE",

    source_trades:
      sourceTrades,

    leg_count:
      strategyMetadata.legCount,
  };
}

function buildOpenOnlyTrade({
  trade,
  direction,
}: {
  trade: ParsedBrokerTrade;
  direction: PositionDirection;
}): MatchedBrokerTrade {
  const quantity =
    safeQuantity(
      trade.quantity,
    );

  const entryPrice =
    getTradePrice(
      trade,
    );

  const strategyMetadata =
    buildStrategyMetadata({
      trade,
      direction,
      quantity,
      entryPrice,
      exitPrice:
        null,
    });

  return {
    ...trade,

    side:
      getLifecycleSide(
        direction,
      ),

    open_action:
      getOpeningAction(
        direction,
      ),

    strategy_type:
      strategyMetadata.strategyType,

    trade_style:
      trade.trade_style ??
      "IMPORT",

    quantity,

    entry_date:
      trade.entry_date ??
      trade.exit_date,

    exit_date:
      null,

    entry_price:
      entryPrice,

    exit_price:
      null,

    profit_loss:
      null,

    profit_loss_pct:
      null,

    matched:
      false,

    match_type:
      "OPEN_ONLY",

    source_trades:
      [trade],

    leg_count:
      strategyMetadata.legCount,
  };
}

function buildCloseOnlyTrade({
  trade,
  direction,
}: {
  trade: ParsedBrokerTrade;
  direction: PositionDirection;
}): MatchedBrokerTrade {
  const quantity =
    safeQuantity(
      trade.quantity,
    );

  const exitPrice =
    getTradePrice(
      trade,
    );

  const strategyMetadata =
    buildStrategyMetadata({
      trade,
      direction,
      quantity,
      entryPrice:
        null,
      exitPrice,
    });

  return {
    ...trade,

    side:
      getLifecycleSide(
        direction,
      ),

    open_action:
      getOpeningAction(
        direction,
      ),

    strategy_type:
      strategyMetadata.strategyType,

    trade_style:
      trade.trade_style ??
      "IMPORT",

    quantity,

    entry_date:
      null,

    exit_date:
      trade.exit_date ??
      trade.entry_date,

    entry_price:
      null,

    exit_price:
      exitPrice,

    matched:
      false,

    match_type:
      "CLOSE_ONLY",

    source_trades:
      [trade],

    leg_count:
      strategyMetadata.legCount,
  };
}

function cloneTradeWithQuantity(
  trade: ParsedBrokerTrade,
  quantity: number,
): ParsedBrokerTrade {
  return {
    ...trade,
    quantity:
      roundQuantity(
        quantity,
      ),
  };
}

function consumeLots({
  openLots,
  closeTrade,
  closeQuantity,
  direction,
}: {
  openLots: OpenLot[];
  closeTrade: ParsedBrokerTrade;
  closeQuantity: number;
  direction: PositionDirection;
}) {
  let remainingCloseQuantity =
    closeQuantity;

  const consumedOpenTrades:
    ParsedBrokerTrade[] = [];

  while (
    hasMeaningfulQuantity(
      remainingCloseQuantity,
    ) &&
    openLots.length > 0
  ) {
    const currentOpenLot =
      openLots[0];

    const currentOpenQuantity =
      roundQuantity(
        currentOpenLot.remainingQuantity,
      );

    if (
      !hasMeaningfulQuantity(
        currentOpenQuantity,
      )
    ) {
      openLots.shift();
      continue;
    }

    const consumedQuantity =
      roundQuantity(
        Math.min(
          currentOpenQuantity,
          remainingCloseQuantity,
        ),
      );

    if (
      !hasMeaningfulQuantity(
        consumedQuantity,
      )
    ) {
      break;
    }

    consumedOpenTrades.push(
      cloneTradeWithQuantity(
        currentOpenLot.trade,
        consumedQuantity,
      ),
    );

    currentOpenLot.remainingQuantity =
      roundQuantity(
        currentOpenQuantity -
          consumedQuantity,
      );

    remainingCloseQuantity =
      roundQuantity(
        remainingCloseQuantity -
          consumedQuantity,
      );

    if (
      !hasMeaningfulQuantity(
        currentOpenLot.remainingQuantity,
      )
    ) {
      currentOpenLot.remainingQuantity =
        0;

      openLots.shift();
    }
  }

  const matchedQuantity =
    roundQuantity(
      closeQuantity -
        remainingCloseQuantity,
    );

  const matchedTrade =
    hasMeaningfulQuantity(
      matchedQuantity,
    )
      ? buildMatchedTrade({
          openTrades:
            consumedOpenTrades,
          closeTrade:
            cloneTradeWithQuantity(
              closeTrade,
              matchedQuantity,
            ),
          quantity:
            matchedQuantity,
          direction,
        })
      : null;

  return {
    matchedTrade,
    remainingCloseQuantity,
  };
}

function matchGroupedTrades(
  trades: ParsedBrokerTrade[],
): MatchResult {
  const matchedTrades:
    MatchedBrokerTrade[] = [];

  const longLots:
    OpenLot[] = [];

  const shortLots:
    OpenLot[] = [];

  const sortedTrades = [
    ...trades,
  ].sort(
    compareTradeDates,
  );

  for (
    const trade of
    sortedTrades
  ) {
    const quantity =
      safeQuantity(
        trade.quantity,
      );

    if (
      !hasMeaningfulQuantity(
        quantity,
      )
    ) {
      continue;
    }

    /*
     * BUY:
     * 1. Closes an existing short lot.
     * 2. Any remainder opens a new long lot.
     */
    if (
      trade.side === "BUY"
    ) {
      const shortClose =
        consumeLots({
          openLots:
            shortLots,
          closeTrade:
            trade,
          closeQuantity:
            quantity,
          direction:
            "SHORT",
        });

      if (
        shortClose.matchedTrade
      ) {
        matchedTrades.push(
          shortClose.matchedTrade,
        );
      }

      if (
        hasMeaningfulQuantity(
          shortClose.remainingCloseQuantity,
        )
      ) {
        longLots.push({
          trade:
            cloneTradeWithQuantity(
              trade,
              shortClose.remainingCloseQuantity,
            ),

          direction:
            "LONG",

          remainingQuantity:
            shortClose.remainingCloseQuantity,
        });
      }

      continue;
    }

    /*
     * SELL:
     * 1. Closes an existing long lot.
     * 2. Any remainder opens a new short lot.
     */
    if (
      trade.side === "SELL"
    ) {
      const longClose =
        consumeLots({
          openLots:
            longLots,
          closeTrade:
            trade,
          closeQuantity:
            quantity,
          direction:
            "LONG",
        });

      if (
        longClose.matchedTrade
      ) {
        matchedTrades.push(
          longClose.matchedTrade,
        );
      }

      if (
        hasMeaningfulQuantity(
          longClose.remainingCloseQuantity,
        )
      ) {
        shortLots.push({
          trade:
            cloneTradeWithQuantity(
              trade,
              longClose.remainingCloseQuantity,
            ),

          direction:
            "SHORT",

          remainingQuantity:
            longClose.remainingCloseQuantity,
        });
      }
    }
  }

  for (
    const openLot of
    longLots
  ) {
    const remainingQuantity =
      roundQuantity(
        openLot.remainingQuantity,
      );

    if (
      hasMeaningfulQuantity(
        remainingQuantity,
      )
    ) {
      matchedTrades.push(
        buildOpenOnlyTrade({
          trade:
            cloneTradeWithQuantity(
              openLot.trade,
              remainingQuantity,
            ),
          direction:
            "LONG",
        }),
      );
    }
  }

  for (
    const openLot of
    shortLots
  ) {
    const remainingQuantity =
      roundQuantity(
        openLot.remainingQuantity,
      );

    if (
      hasMeaningfulQuantity(
        remainingQuantity,
      )
    ) {
      matchedTrades.push(
        buildOpenOnlyTrade({
          trade:
            cloneTradeWithQuantity(
              openLot.trade,
              remainingQuantity,
            ),
          direction:
            "SHORT",
        }),
      );
    }
  }

  return {
    matchedTrades,
    remainingLots: [
      ...longLots,
      ...shortLots,
    ],
  };
}

export function matchBrokerTrades(
  trades: ParsedBrokerTrade[],
): MatchedBrokerTrade[] {
  const groupedTrades =
    new Map<
      string,
      ParsedBrokerTrade[]
    >();

  for (
    const trade of
    trades
  ) {
    const key =
      buildGroupKey(
        trade,
      );

    const existingTrades =
      groupedTrades.get(key) ??
      [];

    existingTrades.push(
      trade,
    );

    groupedTrades.set(
      key,
      existingTrades,
    );
  }

  return Array.from(
    groupedTrades.values(),
  )
    .flatMap(
      (groupTrades) =>
        matchGroupedTrades(
          groupTrades,
        ).matchedTrades,
    )
    .sort(
      (left, right) => {
        const leftDate =
          left.entry_date ??
          left.exit_date;

        const rightDate =
          right.entry_date ??
          right.exit_date;

        const leftTime =
          leftDate
            ? new Date(
                leftDate,
              ).getTime()
            : 0;

        const rightTime =
          rightDate
            ? new Date(
                rightDate,
              ).getTime()
            : 0;

        return (
          rightTime -
          leftTime
        );
      },
    );
}

import type { ParsedBrokerTrade } from "@/lib/journal/import/normalizeTrade";

const EPSILON = 0.000001;

export type MatchedBrokerTrade = ParsedBrokerTrade & {
  matched: boolean;
  match_type:
    | "OPEN_ONLY"
    | "CLOSE_ONLY"
    | "OPEN_CLOSE"
    | "PARTIAL_OPEN_CLOSE"
    | "UNMATCHED";
  source_trades: ParsedBrokerTrade[];
};

type OpenLot = {
  trade: ParsedBrokerTrade;
  remainingQuantity: number;
};

function normalizeSymbol(value: string) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function normalizeInstrument(value: string | null | undefined) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  return normalized === "OPTION" ? "OPTION" : "STOCK";
}

function toNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  return Number(value);
}

function roundQuantity(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) <= EPSILON) {
    return 0;
  }

  return Number(value.toFixed(8));
}

function hasMeaningfulQuantity(value: number) {
  return Number.isFinite(value) && Math.abs(value) > EPSILON;
}

function safeQuantity(value: number | null | undefined) {
  const quantity = toNumber(value);

  if (quantity === null || quantity <= EPSILON) {
    return 0;
  }

  return roundQuantity(quantity);
}

function getTradeDate(trade: ParsedBrokerTrade) {
  return trade.entry_date ?? trade.exit_date;
}

function getTradePrice(trade: ParsedBrokerTrade) {
  return trade.entry_price ?? trade.exit_price;
}

function compareTradeDates(
  left: ParsedBrokerTrade,
  right: ParsedBrokerTrade
) {
  const leftDate = getTradeDate(left);
  const rightDate = getTradeDate(right);

  const leftTime = leftDate ? new Date(leftDate).getTime() : 0;
  const rightTime = rightDate ? new Date(rightDate).getTime() : 0;

  return leftTime - rightTime;
}

function buildGroupKey(trade: ParsedBrokerTrade) {
  return [
    normalizeSymbol(trade.symbol),
    normalizeInstrument(trade.instrument_type),
  ].join("|");
}

function calculatePnl({
  entryPrice,
  exitPrice,
  quantity,
  instrumentType,
}: {
  entryPrice: number | null;
  exitPrice: number | null;
  quantity: number;
  instrumentType: "STOCK" | "OPTION";
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

  const multiplier = instrumentType === "OPTION" ? 100 : 1;

  return Number(((exitPrice - entryPrice) * quantity * multiplier).toFixed(2));
}

function calculatePnlPct({
  entryPrice,
  exitPrice,
}: {
  entryPrice: number | null;
  exitPrice: number | null;
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

  return Number((((exitPrice - entryPrice) / entryPrice) * 100).toFixed(2));
}

function weightedAveragePrice(
  fills: { quantity: number; price: number | null }[]
) {
  const validFills = fills.filter(
    (fill) =>
      hasMeaningfulQuantity(fill.quantity) &&
      fill.price !== null &&
      Number.isFinite(fill.price)
  );

  const totalQuantity = validFills.reduce(
    (sum, fill) => sum + fill.quantity,
    0
  );

  if (!hasMeaningfulQuantity(totalQuantity)) {
    return null;
  }

  const totalValue = validFills.reduce(
    (sum, fill) => sum + fill.quantity * Number(fill.price),
    0
  );

  return Number((totalValue / totalQuantity).toFixed(4));
}

function buildMatchedTrade({
  openTrades,
  closeTrade,
  quantity,
}: {
  openTrades: ParsedBrokerTrade[];
  closeTrade: ParsedBrokerTrade;
  quantity: number;
}): MatchedBrokerTrade {
  const normalizedQuantity = roundQuantity(quantity);
  const symbol = normalizeSymbol(closeTrade.symbol || openTrades[0]?.symbol);
  const instrumentType = normalizeInstrument(
    closeTrade.instrument_type || openTrades[0]?.instrument_type
  );

  const entryDate =
    openTrades
      .map((trade) => trade.entry_date ?? trade.exit_date)
      .filter(Boolean)
      .sort()[0] ?? null;

  const exitDate = closeTrade.exit_date ?? closeTrade.entry_date ?? null;

  const averageEntryPrice = weightedAveragePrice(
    openTrades.map((trade) => ({
      quantity: safeQuantity(trade.quantity),
      price: getTradePrice(trade),
    }))
  );

  const exitPrice = getTradePrice(closeTrade);

  const calculatedProfitLoss = calculatePnl({
    entryPrice: averageEntryPrice,
    exitPrice,
    quantity: normalizedQuantity,
    instrumentType,
  });

  const calculatedProfitLossPct = calculatePnlPct({
    entryPrice: averageEntryPrice,
    exitPrice,
  });

  return {
    broker: closeTrade.broker,
    symbol,
    instrument_type: instrumentType,
    side: "BUY",
    entry_date: entryDate,
    exit_date: exitDate,
    entry_price: averageEntryPrice,
    exit_price: exitPrice,
    quantity: normalizedQuantity,
    profit_loss: calculatedProfitLoss,
    profit_loss_pct: calculatedProfitLossPct,
    notes:
      closeTrade.notes ??
      openTrades
        .map((trade) => trade.notes)
        .filter(Boolean)
        .join(" | ") ??
      null,
    raw: closeTrade.raw,
    matched: true,
    match_type:
      openTrades.length > 1 ? "PARTIAL_OPEN_CLOSE" : "OPEN_CLOSE",
    source_trades: [...openTrades, closeTrade],
  };
}

function buildOpenOnlyTrade(trade: ParsedBrokerTrade): MatchedBrokerTrade {
  return {
    ...trade,
    quantity: safeQuantity(trade.quantity),
    entry_date: trade.entry_date ?? trade.exit_date,
    exit_date: null,
    entry_price: trade.entry_price ?? trade.exit_price,
    exit_price: null,
    profit_loss: null,
    profit_loss_pct: null,
    matched: false,
    match_type: "OPEN_ONLY",
    source_trades: [trade],
  };
}

function buildCloseOnlyTrade(trade: ParsedBrokerTrade): MatchedBrokerTrade {
  return {
    ...trade,
    quantity: safeQuantity(trade.quantity),
    entry_date: trade.entry_date,
    exit_date: trade.exit_date ?? trade.entry_date,
    entry_price: trade.entry_price,
    exit_price: trade.exit_price ?? trade.entry_price,
    matched: false,
    match_type: "CLOSE_ONLY",
    source_trades: [trade],
  };
}

function cloneTradeWithQuantity(
  trade: ParsedBrokerTrade,
  quantity: number
): ParsedBrokerTrade {
  return {
    ...trade,
    quantity: roundQuantity(quantity),
  };
}

function matchGroupedTrades(trades: ParsedBrokerTrade[]) {
  const matchedTrades: MatchedBrokerTrade[] = [];
  const openLots: OpenLot[] = [];

  const sortedTrades = [...trades].sort(compareTradeDates);

  for (const trade of sortedTrades) {
    const quantity = safeQuantity(trade.quantity);

    if (!hasMeaningfulQuantity(quantity)) {
      continue;
    }

    if (trade.side === "BUY") {
      openLots.push({
        trade,
        remainingQuantity: quantity,
      });
      continue;
    }

    if (trade.side === "SELL") {
      let remainingCloseQuantity = quantity;
      const consumedOpenTrades: ParsedBrokerTrade[] = [];

      while (
        hasMeaningfulQuantity(remainingCloseQuantity) &&
        openLots.length > 0
      ) {
        const currentOpenLot = openLots[0];
        const currentOpenQuantity = roundQuantity(
          currentOpenLot.remainingQuantity
        );

        if (!hasMeaningfulQuantity(currentOpenQuantity)) {
          openLots.shift();
          continue;
        }

        const consumedQuantity = roundQuantity(
          Math.min(currentOpenQuantity, remainingCloseQuantity)
        );

        if (!hasMeaningfulQuantity(consumedQuantity)) {
          break;
        }

        consumedOpenTrades.push(
          cloneTradeWithQuantity(currentOpenLot.trade, consumedQuantity)
        );

        currentOpenLot.remainingQuantity = roundQuantity(
          currentOpenQuantity - consumedQuantity
        );
        remainingCloseQuantity = roundQuantity(
          remainingCloseQuantity - consumedQuantity
        );

        if (!hasMeaningfulQuantity(currentOpenLot.remainingQuantity)) {
          currentOpenLot.remainingQuantity = 0;
          openLots.shift();
        }
      }

      const matchedQuantity = roundQuantity(quantity - remainingCloseQuantity);

      if (hasMeaningfulQuantity(matchedQuantity)) {
        matchedTrades.push(
          buildMatchedTrade({
            openTrades: consumedOpenTrades,
            closeTrade: cloneTradeWithQuantity(trade, matchedQuantity),
            quantity: matchedQuantity,
          })
        );
      }

      if (hasMeaningfulQuantity(remainingCloseQuantity)) {
        matchedTrades.push(
          buildCloseOnlyTrade(
            cloneTradeWithQuantity(trade, remainingCloseQuantity)
          )
        );
      }
    }
  }

  for (const openLot of openLots) {
    const remainingQuantity = roundQuantity(openLot.remainingQuantity);

    if (hasMeaningfulQuantity(remainingQuantity)) {
      matchedTrades.push(
        buildOpenOnlyTrade(
          cloneTradeWithQuantity(openLot.trade, remainingQuantity)
        )
      );
    }
  }

  return matchedTrades;
}

export function matchBrokerTrades(
  trades: ParsedBrokerTrade[]
): MatchedBrokerTrade[] {
  const groupedTrades = new Map<string, ParsedBrokerTrade[]>();

  for (const trade of trades) {
    const key = buildGroupKey(trade);
    const existingTrades = groupedTrades.get(key) ?? [];

    existingTrades.push(trade);
    groupedTrades.set(key, existingTrades);
  }

  return Array.from(groupedTrades.values())
    .flatMap((groupTrades) => matchGroupedTrades(groupTrades))
    .sort((left, right) => {
      const leftDate = left.entry_date ?? left.exit_date;
      const rightDate = right.entry_date ?? right.exit_date;

      const leftTime = leftDate ? new Date(leftDate).getTime() : 0;
      const rightTime = rightDate ? new Date(rightDate).getTime() : 0;

      return rightTime - leftTime;
    });
}
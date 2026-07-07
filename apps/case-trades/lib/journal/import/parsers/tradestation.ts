import { getValue, type CsvRow } from "@/lib/journal/import/csv";
import {
  buildParsedTrade,
  normalizeSide,
  parseDate,
  parseNumber,
  type ParsedBrokerTrade,
} from "@/lib/journal/import/normalizeTrade";

function cleanTradeStationSymbol(symbol: string, description: string) {
  const rawSymbol = symbol.trim().toUpperCase();

  if (rawSymbol) {
    return rawSymbol;
  }

  const firstToken = description.trim().split(/\s+/)[0];

  return firstToken?.toUpperCase() ?? "";
}

function resolveTradeStationSide({
  action,
  side,
  transactionType,
  description,
}: {
  action: string;
  side: string;
  transactionType: string;
  description: string;
}) {
  return (
    normalizeSide(action) ??
    normalizeSide(side) ??
    normalizeSide(transactionType) ??
    normalizeSide(description)
  );
}

export function parseTradeStationRows(rows: CsvRow[]): ParsedBrokerTrade[] {
  return rows
    .map((row) => {
      const description = getValue(row, [
        "description",
        "security description",
        "symbol description",
        "instrument description",
        "name",
      ]);

      const symbol = cleanTradeStationSymbol(
        getValue(row, ["symbol", "ticker", "instrument", "underlying"]),
        description
      );

      const action = getValue(row, [
        "action",
        "order action",
        "transaction",
        "type",
      ]);

      const sideRaw = getValue(row, ["side", "buy sell", "buy_sell"]);

      const transactionType = getValue(row, [
        "transaction type",
        "transaction_type",
        "activity type",
        "activity_type",
      ]);

      const side = resolveTradeStationSide({
        action,
        side: sideRaw,
        transactionType,
        description,
      });

      if (!symbol || !side) {
        return null;
      }

      const date = parseDate(
        getValue(row, [
          "date",
          "trade date",
          "trade_date",
          "execution time",
          "execution_time",
          "executed at",
          "executed_at",
          "filled time",
          "filled_time",
          "time",
        ])
      );

      const quantity = Math.abs(
        parseNumber(
          getValue(row, [
            "quantity",
            "qty",
            "shares",
            "contracts",
            "filled qty",
            "filled_qty",
            "fill quantity",
            "fill_quantity",
          ])
        ) ?? 0
      );

      const price = parseNumber(
        getValue(row, [
          "price",
          "fill price",
          "fill_price",
          "filled price",
          "filled_price",
          "execution price",
          "execution_price",
          "average price",
          "avg price",
        ])
      );

      const amount = parseNumber(
        getValue(row, [
          "amount",
          "net amount",
          "net_amount",
          "net amt",
          "value",
          "proceeds",
          "principal",
          "trade value",
          "trade_value",
        ])
      );

      const profitLoss = parseNumber(
        getValue(row, [
          "realized gain loss",
          "realized gain/loss",
          "realized pnl",
          "realized_pnl",
          "profit loss",
          "profit_loss",
          "p l",
          "pnl",
          "gain loss",
        ])
      );

      const profitLossPct = parseNumber(
        getValue(row, [
          "profit loss pct",
          "profit_loss_pct",
          "pnl pct",
          "pnl %",
          "gain loss pct",
          "return pct",
          "return %",
          "realized pnl %",
        ])
      );

      return buildParsedTrade({
        broker: "TRADESTATION",
        symbol,
        description,
        side,
        date,
        quantity: quantity || null,
        price,
        amount,
        profitLoss,
        profitLossPct,
        raw: row,
      });
    })
    .filter((trade): trade is ParsedBrokerTrade => trade !== null);
}
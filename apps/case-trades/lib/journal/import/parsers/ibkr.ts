import { getValue, type CsvRow } from "@/lib/journal/import/csv";
import {
  buildParsedTrade,
  normalizeSide,
  parseDate,
  parseNumber,
  type ParsedBrokerTrade,
} from "@/lib/journal/import/normalizeTrade";

function cleanIbkrSymbol(symbol: string, description: string) {
  const rawSymbol = symbol.trim().toUpperCase();

  if (rawSymbol) {
    return rawSymbol;
  }

  const firstToken = description.trim().split(/\s+/)[0];

  return firstToken?.toUpperCase() ?? "";
}

function resolveIbkrSide({
  buySell,
  side,
  action,
  description,
}: {
  buySell: string;
  side: string;
  action: string;
  description: string;
}) {
  return (
    normalizeSide(buySell) ??
    normalizeSide(side) ??
    normalizeSide(action) ??
    normalizeSide(description)
  );
}

export function parseIbkrRows(rows: CsvRow[]): ParsedBrokerTrade[] {
  return rows
    .map((row) => {
      const description = getValue(row, [
        "description",
        "security description",
        "asset description",
        "name",
        "contract description",
      ]);

      const symbol = cleanIbkrSymbol(
        getValue(row, [
          "symbol",
          "underlying",
          "ticker",
          "instrument",
          "contract",
        ]),
        description
      );

      const buySell = getValue(row, ["buy sell", "buy_sell"]);
      const sideRaw = getValue(row, ["side"]);
      const action = getValue(row, [
        "action",
        "transaction type",
        "transaction",
        "type",
      ]);

      const side = resolveIbkrSide({
        buySell,
        side: sideRaw,
        action,
        description,
      });

      if (!symbol || !side) {
        return null;
      }

      const date = parseDate(
        getValue(row, [
          "date time",
          "date_time",
          "trade date",
          "trade_date",
          "date",
          "time",
          "execution time",
          "execution_time",
          "settlement date",
        ])
      );

      const quantity = Math.abs(
        parseNumber(
          getValue(row, [
            "quantity",
            "qty",
            "shares",
            "contracts",
            "trade quantity",
            "trade_quantity",
          ])
        ) ?? 0
      );

      const price = parseNumber(
        getValue(row, [
          "trade price",
          "trade_price",
          "price",
          "fill price",
          "fill_price",
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
          "trade money",
          "trade_money",
        ])
      );

      const profitLoss = parseNumber(
        getValue(row, [
          "realized pnl",
          "realized_pnl",
          "realized p l",
          "realized gain loss",
          "realized gain/loss",
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
        broker: "INTERACTIVE_BROKERS",
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
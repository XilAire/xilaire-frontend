import { getValue, type CsvRow } from "@/lib/journal/import/csv";
import {
  buildParsedTrade,
  normalizeSide,
  parseDate,
  parseNumber,
  type ParsedBrokerTrade,
} from "@/lib/journal/import/normalizeTrade";

function cleanTastytradeSymbol(symbol: string, description: string) {
  const rawSymbol = symbol.trim().toUpperCase();

  if (rawSymbol) {
    return rawSymbol;
  }

  const firstToken = description.trim().split(/\s+/)[0];

  return firstToken?.toUpperCase() ?? "";
}

function resolveTastytradeSide({
  action,
  transactionType,
  side,
  description,
}: {
  action: string;
  transactionType: string;
  side: string;
  description: string;
}) {
  return (
    normalizeSide(action) ??
    normalizeSide(transactionType) ??
    normalizeSide(side) ??
    normalizeSide(description)
  );
}

export function parseTastytradeRows(rows: CsvRow[]): ParsedBrokerTrade[] {
  return rows
    .map((row) => {
      const description = getValue(row, [
        "description",
        "security description",
        "symbol description",
        "instrument description",
        "name",
      ]);

      const symbol = cleanTastytradeSymbol(
        getValue(row, ["symbol", "underlying", "ticker", "instrument"]),
        description
      );

      const action = getValue(row, [
        "action",
        "order action",
        "transaction",
        "type",
      ]);

      const transactionType = getValue(row, [
        "transaction type",
        "transaction_type",
        "activity type",
        "activity_type",
      ]);

      const sideRaw = getValue(row, ["side", "buy sell", "buy_sell"]);

      const side = resolveTastytradeSide({
        action,
        transactionType,
        side: sideRaw,
        description,
      });

      if (!symbol || !side) {
        return null;
      }

      const date = parseDate(
        getValue(row, [
          "date",
          "time",
          "trade date",
          "trade_date",
          "executed at",
          "executed_at",
          "execution time",
          "execution_time",
          "activity date",
          "activity_date",
        ])
      );

      const quantity = Math.abs(
        parseNumber(
          getValue(row, [
            "quantity",
            "qty",
            "contracts",
            "shares",
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
          "average price",
          "avg price",
          "execution price",
          "execution_price",
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
        broker: "TASTYTRADE",
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
import { getValue, type CsvRow } from "@/lib/journal/import/csv";
import {
  buildParsedTrade,
  normalizeSide,
  parseDate,
  parseNumber,
  type ParsedBrokerTrade,
} from "@/lib/journal/import/normalizeTrade";

function cleanThinkOrSwimSymbol(symbol: string, description: string) {
  const rawSymbol = symbol.trim().toUpperCase();

  if (rawSymbol) {
    return rawSymbol;
  }

  const firstToken = description.trim().split(/\s+/)[0];

  return firstToken?.toUpperCase() ?? "";
}

function resolveThinkOrSwimSide({
  side,
  action,
  transactionType,
  description,
}: {
  side: string;
  action: string;
  transactionType: string;
  description: string;
}) {
  return (
    normalizeSide(side) ??
    normalizeSide(action) ??
    normalizeSide(transactionType) ??
    normalizeSide(description)
  );
}

export function parseThinkOrSwimRows(rows: CsvRow[]): ParsedBrokerTrade[] {
  return rows
    .map((row) => {
      const description = getValue(row, [
        "description",
        "security description",
        "symbol description",
        "instrument description",
        "name",
      ]);

      const symbol = cleanThinkOrSwimSymbol(
        getValue(row, ["symbol", "ticker", "instrument", "underlying"]),
        description
      );

      const sideRaw = getValue(row, ["side", "buy sell", "buy_sell"]);

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

      const side = resolveThinkOrSwimSide({
        side: sideRaw,
        action,
        transactionType,
        description,
      });

      if (!symbol || !side) {
        return null;
      }

      const date = parseDate(
        getValue(row, [
          "exec time",
          "exec_time",
          "execution time",
          "execution_time",
          "date",
          "trade date",
          "trade_date",
          "filled time",
          "filled_time",
          "time",
        ])
      );

      const quantity = Math.abs(
        parseNumber(
          getValue(row, [
            "qty",
            "quantity",
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
        broker: "THINKORSWIM",
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
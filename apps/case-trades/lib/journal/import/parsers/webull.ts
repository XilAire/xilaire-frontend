import { getValue, type CsvRow } from "@/lib/journal/import/csv";
import {
  buildParsedTrade,
  normalizeSide,
  parseDate,
  parseNumber,
  type ParsedBrokerTrade,
} from "@/lib/journal/import/normalizeTrade";

function cleanWebullSymbol(symbol: string, description: string) {
  const rawSymbol = symbol.trim().toUpperCase();

  if (rawSymbol) {
    return rawSymbol;
  }

  const firstToken = description.trim().split(/\s+/)[0];

  return firstToken?.toUpperCase() ?? "";
}

function resolveWebullSide({
  side,
  action,
  description,
}: {
  side: string;
  action: string;
  description: string;
}) {
  return normalizeSide(side) ?? normalizeSide(action) ?? normalizeSide(description);
}

export function parseWebullRows(rows: CsvRow[]): ParsedBrokerTrade[] {
  return rows
    .map((row) => {
      const description = getValue(row, [
        "description",
        "security description",
        "security",
        "name",
        "instrument name",
      ]);

      const symbol = cleanWebullSymbol(
        getValue(row, ["symbol", "ticker", "instrument", "underlying"]),
        description
      );

      const sideRaw = getValue(row, ["side", "action", "transaction type"]);

      const action = getValue(row, [
        "action",
        "order action",
        "transaction",
        "type",
      ]);

      const side = resolveWebullSide({
        side: sideRaw,
        action,
        description,
      });

      if (!symbol || !side) {
        return null;
      }

      const date = parseDate(
        getValue(row, [
          "filled time",
          "fill time",
          "time",
          "order time",
          "trade date",
          "date",
          "executed at",
        ])
      );

      const quantity = Math.abs(
        parseNumber(
          getValue(row, [
            "filled qty",
            "filled quantity",
            "quantity",
            "qty",
            "shares",
            "contracts",
          ])
        ) ?? 0
      );

      const price = parseNumber(
        getValue(row, [
          "avg price",
          "average price",
          "filled price",
          "fill price",
          "price",
          "execution price",
        ])
      );

      const amount = parseNumber(
        getValue(row, [
          "amount",
          "net amount",
          "net amt",
          "value",
          "proceeds",
          "principal",
        ])
      );

      const profitLoss = parseNumber(
        getValue(row, [
          "profit loss",
          "profit_loss",
          "p l",
          "pnl",
          "gain loss",
          "realized gain loss",
          "realized gain/loss",
          "realized pnl",
        ])
      );

      const profitLossPct = parseNumber(
        getValue(row, [
          "profit loss pct",
          "profit_loss_pct",
          "pnl pct",
          "gain loss pct",
          "return pct",
          "return %",
          "realized pnl %",
        ])
      );

      return buildParsedTrade({
        broker: "WEBULL",
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
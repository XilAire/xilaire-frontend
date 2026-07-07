import { getValue, type CsvRow } from "@/lib/journal/import/csv";
import {
  buildParsedTrade,
  normalizeSide,
  parseDate,
  parseNumber,
  type ParsedBrokerTrade,
} from "@/lib/journal/import/normalizeTrade";

export function parseGenericRows(rows: CsvRow[]): ParsedBrokerTrade[] {
  return rows
    .map((row) => {
      const symbol = getValue(row, [
        "symbol",
        "ticker",
        "instrument",
        "underlying",
      ]).toUpperCase();

      const description = getValue(row, [
        "description",
        "security description",
        "security",
        "name",
        "notes",
      ]);

      const sideRaw = getValue(row, [
        "side",
        "action",
        "transaction type",
        "trans code",
      ]);

      const side = normalizeSide(sideRaw);

      if (!symbol || !side) {
        return null;
      }

      const date = parseDate(
        getValue(row, [
          "date",
          "trade date",
          "activity date",
          "process date",
          "settlement date",
          "execution time",
          "filled time",
        ])
      );

      const quantity = Math.abs(
        parseNumber(
          getValue(row, ["quantity", "qty", "shares", "contracts", "filled qty"])
        ) ?? 0
      );

      const price = parseNumber(
        getValue(row, [
          "price",
          "entry price",
          "exit price",
          "execution price",
          "average price",
          "avg price",
          "fill price",
        ])
      );

      const amount = parseNumber(
        getValue(row, ["amount", "net amount", "net amt", "value", "proceeds"])
      );

      const profitLoss = parseNumber(
        getValue(row, [
          "profit loss",
          "profit_loss",
          "p l",
          "pnl",
          "gain loss",
          "realized gain loss",
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
        ])
      );

      return buildParsedTrade({
        broker: "GENERIC",
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
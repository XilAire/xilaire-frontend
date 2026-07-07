import { getValue, type CsvRow } from "@/lib/journal/import/csv";
import {
  buildParsedTrade,
  normalizeSide,
  parseDate,
  parseNumber,
  type ParsedBrokerTrade,
} from "@/lib/journal/import/normalizeTrade";

function resolveRobinhoodSide({
  description,
  action,
  transCode,
}: {
  description: string;
  action: string;
  transCode: string;
}) {
  return normalizeSide(description) ?? normalizeSide(action) ?? normalizeSide(transCode);
}

function cleanRobinhoodSymbol(symbol: string, description: string) {
  const rawSymbol = symbol.trim().toUpperCase();

  if (rawSymbol) {
    return rawSymbol;
  }

  const firstToken = description.trim().split(/\s+/)[0];

  return firstToken?.toUpperCase() ?? "";
}

export function parseRobinhoodRows(rows: CsvRow[]): ParsedBrokerTrade[] {
  return rows
    .map((row) => {
      const description = getValue(row, [
        "description",
        "security description",
        "security",
        "name",
      ]);

      const symbol = cleanRobinhoodSymbol(
        getValue(row, ["instrument", "symbol", "ticker"]),
        description
      );

      const action = getValue(row, [
        "action",
        "transaction type",
        "transaction",
        "type",
      ]);

      const transCode = getValue(row, ["trans code", "trans_code"]);

      const side = resolveRobinhoodSide({
        description,
        action,
        transCode,
      });

      if (!symbol || !side) {
        return null;
      }

      const date = parseDate(
        getValue(row, [
          "activity date",
          "process date",
          "date",
          "trade date",
          "settlement date",
        ])
      );

      const quantity = Math.abs(
        parseNumber(getValue(row, ["quantity", "qty", "shares", "contracts"])) ??
          0
      );

      const price = parseNumber(
        getValue(row, [
          "price",
          "fill price",
          "execution price",
          "average price",
          "avg price",
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
        broker: "ROBINHOOD",
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
import { getValue, type CsvRow } from "@/lib/journal/import/csv";
import {
  buildParsedTrade,
  normalizeSide,
  parseDate,
  parseNumber,
  type ParsedBrokerTrade,
} from "@/lib/journal/import/normalizeTrade";

function cleanFidelitySymbol(symbol: string, description: string) {
  const rawSymbol = symbol.trim().toUpperCase();

  if (rawSymbol) {
    return rawSymbol;
  }

  const firstToken = description.trim().split(/\s+/)[0];

  return firstToken?.toUpperCase() ?? "";
}

function resolveFidelitySide({
  transCode,
  action,
  description,
}: {
  transCode: string;
  action: string;
  description: string;
}) {
  return (
    normalizeSide(transCode) ??
    normalizeSide(action) ??
    normalizeSide(description)
  );
}

export function parseFidelityRows(rows: CsvRow[]): ParsedBrokerTrade[] {
  return rows
    .map((row) => {
      const description = getValue(row, [
        "description",
        "security description",
        "security",
        "name",
      ]);

      const symbol = cleanFidelitySymbol(
        getValue(row, ["symbol", "instrument", "ticker"]),
        description
      );

      const transCode = getValue(row, [
        "trans code",
        "trans_code",
        "transaction type",
        "transaction",
        "type",
      ]);

      const action = getValue(row, ["action", "side"]);

      const side = resolveFidelitySide({
        transCode,
        action,
        description,
      });

      if (!symbol || !side) {
        return null;
      }

      const date = parseDate(
        getValue(row, [
          "run date",
          "trade date",
          "settlement date",
          "activity date",
          "date",
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
        broker: "FIDELITY",
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
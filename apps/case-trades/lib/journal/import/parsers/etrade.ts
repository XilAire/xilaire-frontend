import { getValue, type CsvRow } from "@/lib/journal/import/csv";
import {
  buildParsedTrade,
  normalizeSide,
  parseDate,
  parseNumber,
  type ParsedBrokerTrade,
} from "@/lib/journal/import/normalizeTrade";

function cleanEtradeSymbol(symbol: string, description: string) {
  const rawSymbol = symbol.trim().toUpperCase();

  if (rawSymbol) {
    return rawSymbol;
  }

  const firstToken = description.trim().split(/\s+/)[0];

  return firstToken?.toUpperCase() ?? "";
}

function resolveEtradeSide({
  transactionType,
  action,
  side,
  description,
}: {
  transactionType: string;
  action: string;
  side: string;
  description: string;
}) {
  return (
    normalizeSide(transactionType) ??
    normalizeSide(action) ??
    normalizeSide(side) ??
    normalizeSide(description)
  );
}

export function parseEtradeRows(rows: CsvRow[]): ParsedBrokerTrade[] {
  return rows
    .map((row) => {
      const description = getValue(row, [
        "description",
        "security description",
        "security",
        "security description",
        "name",
      ]);

      const symbol = cleanEtradeSymbol(
        getValue(row, [
          "symbol",
          "ticker",
          "security",
          "instrument",
          "underlying",
        ]),
        description
      );

      const transactionType = getValue(row, [
        "transaction type",
        "transaction_type",
        "transaction",
        "type",
      ]);

      const action = getValue(row, ["action", "order action"]);

      const sideRaw = getValue(row, ["side", "buy sell", "buy_sell"]);

      const side = resolveEtradeSide({
        transactionType,
        action,
        side: sideRaw,
        description,
      });

      if (!symbol || !side) {
        return null;
      }

      const date = parseDate(
        getValue(row, [
          "transaction date",
          "transaction_date",
          "date",
          "trade date",
          "trade_date",
          "settlement date",
          "settlement_date",
          "activity date",
          "activity_date",
          "execution time",
          "execution_time",
          "executed at",
          "executed_at",
        ])
      );

      const quantity = Math.abs(
        parseNumber(
          getValue(row, [
            "quantity",
            "qty",
            "shares",
            "contracts",
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
        broker: "ETRADE",
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
import type {
  HTMLAttributes,
} from "react";

export type MoneyDisplayProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> & {
  value:
    | number
    | null
    | undefined;
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  showPositiveSign?: boolean;
  useAccountingFormat?: boolean;
  fallback?: string;
};

function joinClassNames(
  ...classNames: Array<
    string | false | null | undefined
  >
) {
  return classNames
    .filter(Boolean)
    .join(" ");
}

function isValidMoneyValue(
  value:
    | number
    | null
    | undefined,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

export default function MoneyDisplay({
  value,
  currency = "USD",
  locale = "en-US",
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
  showPositiveSign = false,
  useAccountingFormat = false,
  fallback = "—",
  className,
  ...spanProps
}: MoneyDisplayProps) {
  if (!isValidMoneyValue(value)) {
    return (
      <span
        className={joinClassNames(
          "tabular-nums",
          className,
        )}
        {...spanProps}
      >
        {fallback}
      </span>
    );
  }

  const formatter =
    new Intl.NumberFormat(
      locale,
      {
        style: "currency",
        currency,
        currencySign:
          useAccountingFormat
            ? "accounting"
            : "standard",
        signDisplay:
          showPositiveSign
            ? "always"
            : "auto",
        minimumFractionDigits,
        maximumFractionDigits,
      },
    );

  return (
    <span
      className={joinClassNames(
        "tabular-nums",
        className,
      )}
      {...spanProps}
    >
      {formatter.format(value)}
    </span>
  );
}
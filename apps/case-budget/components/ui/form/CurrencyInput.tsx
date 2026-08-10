"use client";

import {
  forwardRef,
  useMemo,
  type InputHTMLAttributes,
  type FocusEvent,
} from "react";

import NumberInput from "./NumberInput";

export type CurrencyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  currency?: string;
  locale?: string;
  isInvalid?: boolean;
};

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(
  locale: string,
  currency: string,
) {
  const key = `${locale}-${currency}`;

  if (!formatterCache.has(key)) {
    formatterCache.set(
      key,
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    );
  }

  return formatterCache.get(key)!;
}

function sanitize(value: string) {
  return value.replace(/[^0-9.-]/g, "");
}

const CurrencyInput = forwardRef<
  HTMLInputElement,
  CurrencyInputProps
>(function CurrencyInput(
  {
    currency = "USD",
    locale = "en-US",
    isInvalid = false,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  const formatter = useMemo(
    () => getFormatter(locale, currency),
    [locale, currency],
  );

  function handleFocus(
    event: FocusEvent<HTMLInputElement>,
  ) {
    event.currentTarget.value = sanitize(
      event.currentTarget.value,
    );

    onFocus?.(event);
  }

  function handleBlur(
    event: FocusEvent<HTMLInputElement>,
  ) {
    const raw = sanitize(event.currentTarget.value);

    if (raw !== "") {
      const amount = Number(raw);

      if (!Number.isNaN(amount)) {
        event.currentTarget.value =
          formatter.format(amount);
      }
    }

    onBlur?.(event);
  }

  return (
    <NumberInput
      ref={ref}
      isInvalid={isInvalid}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    />
  );
});

CurrencyInput.displayName = "CurrencyInput";

export default CurrencyInput;
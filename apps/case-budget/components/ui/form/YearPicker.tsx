"use client";

import { forwardRef, useMemo } from "react";
import { CalendarRange } from "lucide-react";

import Select, {
  type SelectOption,
  type SelectProps,
} from "./Select";

export type YearOption = SelectOption & {
  year: number;
};

export type YearPickerProps = Omit<
  SelectProps,
  "options"
> & {
  startYear?: number;
  endYear?: number;
};

const YearPicker = forwardRef<
  HTMLSelectElement,
  YearPickerProps
>(function YearPicker(
  {
    startYear = new Date().getFullYear() - 20,
    endYear = new Date().getFullYear() + 20,
    placeholder = "Select year",
    ...props
  },
  ref,
) {
  const options = useMemo<YearOption[]>(() => {
    const years: YearOption[] = [];

    for (
      let year = endYear;
      year >= startYear;
      year--
    ) {
      years.push({
        value: String(year),
        label: String(year),
        year,
      });
    }

    return years;
  }, [startYear, endYear]);

  return (
    <Select
      ref={ref}
      options={options}
      placeholder={placeholder}
      leftIcon={<CalendarRange size={18} />}
      {...props}
    />
  );
});

YearPicker.displayName = "YearPicker";

export default YearPicker;
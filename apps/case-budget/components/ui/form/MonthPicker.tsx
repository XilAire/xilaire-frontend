"use client";

import { forwardRef } from "react";
import { CalendarDays } from "lucide-react";

import Select, {
  type SelectOption,
  type SelectProps,
} from "./Select";

export type Month =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12;

export type MonthOption = SelectOption & {
  month: Month;
};

export type MonthPickerProps = Omit<
  SelectProps,
  "options"
> & {
  options?: MonthOption[];
};

const months: MonthOption[] = [
  {
    value: "1",
    label: "January",
    month: 1,
  },
  {
    value: "2",
    label: "February",
    month: 2,
  },
  {
    value: "3",
    label: "March",
    month: 3,
  },
  {
    value: "4",
    label: "April",
    month: 4,
  },
  {
    value: "5",
    label: "May",
    month: 5,
  },
  {
    value: "6",
    label: "June",
    month: 6,
  },
  {
    value: "7",
    label: "July",
    month: 7,
  },
  {
    value: "8",
    label: "August",
    month: 8,
  },
  {
    value: "9",
    label: "September",
    month: 9,
  },
  {
    value: "10",
    label: "October",
    month: 10,
  },
  {
    value: "11",
    label: "November",
    month: 11,
  },
  {
    value: "12",
    label: "December",
    month: 12,
  },
];

const MonthPicker = forwardRef<
  HTMLSelectElement,
  MonthPickerProps
>(function MonthPicker(
  {
    options = months,
    placeholder = "Select month",
    ...props
  },
  ref,
) {
  return (
    <Select
      ref={ref}
      options={options}
      placeholder={placeholder}
      leftIcon={<CalendarDays size={18} />}
      {...props}
    />
  );
});

MonthPicker.displayName = "MonthPicker";

export default MonthPicker;
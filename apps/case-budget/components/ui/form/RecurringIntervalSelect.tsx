"use client";

import { forwardRef } from "react";
import { Repeat } from "lucide-react";

import Select, {
  type SelectOption,
  type SelectProps,
} from "./Select";

export type RecurringInterval =
  | "once"
  | "daily"
  | "weekly"
  | "biweekly"
  | "semimonthly"
  | "monthly"
  | "quarterly"
  | "semiannually"
  | "annually"
  | "custom";

export type RecurringIntervalOption =
  SelectOption & {
    interval: RecurringInterval;
  };

export type RecurringIntervalSelectProps =
  Omit<SelectProps, "options"> & {
    options?: RecurringIntervalOption[];
  };

const defaultIntervals: RecurringIntervalOption[] =
  [
    {
      value: "once",
      label: "One Time",
      interval: "once",
    },
    {
      value: "daily",
      label: "Daily",
      interval: "daily",
    },
    {
      value: "weekly",
      label: "Weekly",
      interval: "weekly",
    },
    {
      value: "biweekly",
      label: "Bi-Weekly",
      interval: "biweekly",
    },
    {
      value: "semimonthly",
      label: "Semi-Monthly",
      interval: "semimonthly",
    },
    {
      value: "monthly",
      label: "Monthly",
      interval: "monthly",
    },
    {
      value: "quarterly",
      label: "Quarterly",
      interval: "quarterly",
    },
    {
      value: "semiannually",
      label: "Semi-Annually",
      interval: "semiannually",
    },
    {
      value: "annually",
      label: "Annually",
      interval: "annually",
    },
    {
      value: "custom",
      label: "Custom",
      interval: "custom",
    },
  ];

const RecurringIntervalSelect =
  forwardRef<
    HTMLSelectElement,
    RecurringIntervalSelectProps
  >(function RecurringIntervalSelect(
    {
      options = defaultIntervals,
      placeholder = "Select frequency",
      ...props
    },
    ref,
  ) {
    return (
      <Select
        ref={ref}
        options={options}
        placeholder={placeholder}
        leftIcon={<Repeat size={18} />}
        {...props}
      />
    );
  });

RecurringIntervalSelect.displayName =
  "RecurringIntervalSelect";

export default RecurringIntervalSelect;
"use client";

import { forwardRef } from "react";
import { Landmark } from "lucide-react";

import Select, {
  type SelectOption,
  type SelectProps,
} from "./Select";

export type AccountType =
  | "checking"
  | "savings"
  | "cash"
  | "credit_card"
  | "investment"
  | "loan"
  | "mortgage"
  | "retirement"
  | "crypto"
  | "other";

export type AccountOption = SelectOption & {
  type: AccountType;
  institution?: string;
  lastFour?: string;
};

export type AccountSelectProps = Omit<
  SelectProps,
  "options"
> & {
  options?: AccountOption[];
};

const defaultAccounts: AccountOption[] = [
  {
    value: "checking",
    label: "Checking Account",
    type: "checking",
  },
  {
    value: "savings",
    label: "Savings Account",
    type: "savings",
  },
  {
    value: "cash",
    label: "Cash",
    type: "cash",
  },
  {
    value: "credit_card",
    label: "Credit Card",
    type: "credit_card",
  },
  {
    value: "investment",
    label: "Investment Account",
    type: "investment",
  },
  {
    value: "retirement",
    label: "Retirement Account",
    type: "retirement",
  },
  {
    value: "loan",
    label: "Loan",
    type: "loan",
  },
  {
    value: "mortgage",
    label: "Mortgage",
    type: "mortgage",
  },
  {
    value: "crypto",
    label: "Cryptocurrency Wallet",
    type: "crypto",
  },
  {
    value: "other",
    label: "Other Account",
    type: "other",
  },
];

const AccountSelect = forwardRef<
  HTMLSelectElement,
  AccountSelectProps
>(function AccountSelect(
  {
    options = defaultAccounts,
    placeholder = "Select an account",
    ...props
  },
  ref,
) {
  return (
    <Select
      ref={ref}
      options={options}
      placeholder={placeholder}
      leftIcon={<Landmark size={18} />}
      {...props}
    />
  );
});

AccountSelect.displayName = "AccountSelect";

export default AccountSelect;
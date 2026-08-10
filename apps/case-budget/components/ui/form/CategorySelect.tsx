"use client";

import { forwardRef } from "react";
import { Tag } from "lucide-react";

import Select, {
  type SelectOption,
  type SelectProps,
} from "./Select";

export type BudgetCategory =
  | "income"
  | "housing"
  | "utilities"
  | "transportation"
  | "food"
  | "insurance"
  | "healthcare"
  | "debt"
  | "personal"
  | "entertainment"
  | "savings"
  | "investments"
  | "gifts"
  | "education"
  | "business"
  | "taxes"
  | "other";

export type CategoryOption = SelectOption & {
  category: BudgetCategory;
};

export type CategorySelectProps = Omit<
  SelectProps,
  "options"
> & {
  options?: CategoryOption[];
};

const defaultCategories: CategoryOption[] = [
  {
    value: "income",
    label: "Income",
    category: "income",
  },
  {
    value: "housing",
    label: "Housing",
    category: "housing",
  },
  {
    value: "utilities",
    label: "Utilities",
    category: "utilities",
  },
  {
    value: "transportation",
    label: "Transportation",
    category: "transportation",
  },
  {
    value: "food",
    label: "Food & Dining",
    category: "food",
  },
  {
    value: "insurance",
    label: "Insurance",
    category: "insurance",
  },
  {
    value: "healthcare",
    label: "Healthcare",
    category: "healthcare",
  },
  {
    value: "debt",
    label: "Debt Payments",
    category: "debt",
  },
  {
    value: "personal",
    label: "Personal",
    category: "personal",
  },
  {
    value: "entertainment",
    label: "Entertainment",
    category: "entertainment",
  },
  {
    value: "savings",
    label: "Savings",
    category: "savings",
  },
  {
    value: "investments",
    label: "Investments",
    category: "investments",
  },
  {
    value: "gifts",
    label: "Gifts & Donations",
    category: "gifts",
  },
  {
    value: "education",
    label: "Education",
    category: "education",
  },
  {
    value: "business",
    label: "Business",
    category: "business",
  },
  {
    value: "taxes",
    label: "Taxes",
    category: "taxes",
  },
  {
    value: "other",
    label: "Other",
    category: "other",
  },
];

const CategorySelect = forwardRef<
  HTMLSelectElement,
  CategorySelectProps
>(function CategorySelect(
  {
    options = defaultCategories,
    placeholder = "Select a category",
    ...props
  },
  ref,
) {
  return (
    <Select
      ref={ref}
      options={options}
      placeholder={placeholder}
      leftIcon={<Tag size={18} />}
      {...props}
    />
  );
});

CategorySelect.displayName = "CategorySelect";

export default CategorySelect;
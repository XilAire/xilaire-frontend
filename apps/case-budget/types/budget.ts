export type BudgetIncomeStatus =
  | "planned"
  | "partial"
  | "received";

export type BudgetIncomeSource = {
  id: string;
  name: string;
  amount: number;
  receivedAmount: number;
  status: BudgetIncomeStatus;
};

export type BudgetCategoryData = {
  id: string;
  name: string;
  assignedAmount: number;
  spentAmount: number;
};

export type BudgetCategoryGroupData = {
  id: string;
  name: string;
  description?: string;
  categories: BudgetCategoryData[];
};

export type BudgetMonthData = {
  monthKey: string;
  incomeSources: BudgetIncomeSource[];
  budgetGroups: BudgetCategoryGroupData[];
};

export type BudgetMonthsByKey = Record<
  string,
  BudgetMonthData
>;

export type CreateBudgetCategoryData = {
  name: string;
  assignedAmount: number;
};

export type CreateBudgetGroupData = {
  name: string;
  description?: string;
};

export type BudgetMonthCreationMethod =
  | "blank"
  | "copy-previous";
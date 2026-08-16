/**
 * CASE Budget debt domain types.
 *
 * File:
 * apps/case-budget/types/debt.ts
 *
 * Shared application-level contracts for workspace-scoped debt tracking.
 *
 * Database row types remain in:
 *
 * apps/case-budget/types/database.ts
 *
 * This file represents the normalized shapes consumed by React providers,
 * server actions, dashboard components, notifications, reporting, and debt
 * planning features.
 */

export type DebtType =
  | "credit-card"
  | "personal-loan"
  | "student-loan"
  | "auto-loan"
  | "mortgage"
  | "medical"
  | "other";

export type DebtStatus =
  | "active"
  | "paid-off";

/**
 * Canonical application debt record.
 *
 * The workspace/user ownership fields remain server-side concerns and are
 * intentionally not exposed through this UI-facing domain model.
 */
export type DebtData = {
  id:
    string;

  name:
    string;

  lender?:
    string;

  type:
    DebtType;

  originalBalance:
    number;

  currentBalance:
    number;

  interestRate:
    number;

  minimumPayment:
    number;

  dueDay?:
    number;

  status:
    DebtStatus;

  createdAt:
    string;

  updatedAt:
    string;
};

/**
 * Input accepted when creating a debt.
 *
 * currentBalance defaults to originalBalance when omitted.
 * interestRate and minimumPayment default to zero.
 * status is derived from the resulting current balance.
 */
export type CreateDebtData = {
  name:
    string;

  lender?:
    string;

  type:
    DebtType;

  originalBalance:
    number;

  currentBalance?:
    number;

  interestRate?:
    number;

  minimumPayment?:
    number;

  dueDay?:
    number;
};

/**
 * Fields that may be changed on an existing debt.
 *
 * id and createdAt remain immutable.
 * updatedAt is controlled by the server/database.
 */
export type UpdateDebtData = Partial<
  Omit<
    DebtData,
    | "id"
    | "createdAt"
    | "updatedAt"
  >
>;

/**
 * Canonical persisted debt-payment record.
 */
export type DebtPaymentData = {
  id:
    string;

  debtId:
    string;

  amount:
    number;

  balanceBefore:
    number;

  balanceAfter:
    number;

  paymentDate:
    string;

  notes?:
    string;

  createdAt:
    string;
};

/**
 * Input used to record a payment against a debt.
 *
 * The server resolves workspace ownership, validates the debt, calculates
 * balanceBefore/balanceAfter, updates the debt balance/status, and writes the
 * immutable payment-history row.
 */
export type RecordDebtPaymentData = {
  debtId:
    string;

  amount:
    number;

  paymentDate?:
    string;

  notes?:
    string;
};

/**
 * Result returned after a successful debt payment.
 *
 * Returning both records lets the provider update its in-memory canonical
 * state without performing a second immediate read.
 */
export type RecordDebtPaymentResultData = {
  debt:
    DebtData;

  payment:
    DebtPaymentData;
};

/**
 * Read model returned by the production debt loader.
 */
export type DebtWorkspaceData = {
  debts:
    DebtData[];

  payments:
    DebtPaymentData[];
};

/**
 * Result contracts shared by server actions.
 */
export type GetDebtsResult =
  | {
      success:
        true;

      debts:
        DebtData[];

      payments:
        DebtPaymentData[];
    }
  | {
      success:
        false;

      error:
        string;
    };

export type CreateDebtResult =
  | {
      success:
        true;

      debt:
        DebtData;
    }
  | {
      success:
        false;

      error:
        string;

      fieldErrors?:
        Partial<
          Record<
            keyof CreateDebtData,
            string
          >
        >;
    };

export type UpdateDebtResult =
  | {
      success:
        true;

      debt:
        DebtData;
    }
  | {
      success:
        false;

      error:
        string;

      fieldErrors?:
        Partial<
          Record<
            keyof UpdateDebtData,
            string
          >
        >;
    };

export type DeleteDebtResult =
  | {
      success:
        true;

      debtId:
        string;
    }
  | {
      success:
        false;

      error:
        string;
    };

export type RecordDebtPaymentResult =
  | {
      success:
        true;

      debt:
        DebtData;

      payment:
        DebtPaymentData;
    }
  | {
      success:
        false;

      error:
        string;

      fieldErrors?:
        Partial<
          Record<
            keyof RecordDebtPaymentData,
            string
          >
        >;
    };

/**
 * Narrow runtime helpers used by actions/providers when normalizing untyped
 * database or external values.
 */
export function isDebtType(
  value:
    unknown,
): value is DebtType {
  return (
    value ===
      "credit-card" ||
    value ===
      "personal-loan" ||
    value ===
      "student-loan" ||
    value ===
      "auto-loan" ||
    value ===
      "mortgage" ||
    value ===
      "medical" ||
    value ===
      "other"
  );
}

export function isDebtStatus(
  value:
    unknown,
): value is DebtStatus {
  return (
    value ===
      "active" ||
    value ===
      "paid-off"
  );
}

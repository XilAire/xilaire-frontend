"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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

export type DebtData = {
  id: string;
  name: string;
  lender?: string;
  type: DebtType;
  originalBalance: number;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  dueDay?: number;
  status: DebtStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateDebtData = {
  name: string;
  lender?: string;
  type: DebtType;
  originalBalance: number;
  currentBalance?: number;
  interestRate?: number;
  minimumPayment?: number;
  dueDay?: number;
};

export type UpdateDebtData = Partial<
  Omit<
    DebtData,
    "id" | "createdAt"
  >
>;

type DebtsContextValue = {
  debts: DebtData[];
  activeDebts: DebtData[];
  paidOffDebts: DebtData[];
  totalDebt: number;
  totalMinimumPayments: number;

  addDebt: (
    debt: CreateDebtData,
  ) => DebtData;

  updateDebt: (
    debtId: string,
    updates: UpdateDebtData,
  ) => void;

  deleteDebt: (
    debtId: string,
  ) => void;

  recordDebtPayment: (
    debtId: string,
    amount: number,
  ) => void;

  getDebtById: (
    debtId: string,
  ) => DebtData | null;
};

export type DebtsProviderProps = {
  children: ReactNode;
  initialDebts?: DebtData[];
};

const DEBTS_STORAGE_KEY =
  "case-budget:debts:v1";

const defaultDebts: DebtData[] =
  [];

const DebtsContext =
  createContext<
    DebtsContextValue | undefined
  >(undefined);

function createDebtId() {
  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return `debt-${crypto.randomUUID()}`;
  }

  return `debt-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function normalizeCurrency(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Math.round(
    value * 100,
  ) / 100;
}

function cloneDebts(
  debts: DebtData[],
) {
  return debts.map(
    (
      debt,
    ) => ({
      ...debt,
    }),
  );
}

function isDebtData(
  value: unknown,
): value is DebtData {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value,
    )
  ) {
    return false;
  }

  const candidate =
    value as Partial<DebtData>;

  return (
    typeof candidate.id ===
      "string" &&
    typeof candidate.name ===
      "string" &&
    typeof candidate.originalBalance ===
      "number" &&
    typeof candidate.currentBalance ===
      "number" &&
    typeof candidate.interestRate ===
      "number" &&
    typeof candidate.minimumPayment ===
      "number" &&
    (
      candidate.status ===
        "active" ||
      candidate.status ===
        "paid-off"
    ) &&
    typeof candidate.createdAt ===
      "string" &&
    typeof candidate.updatedAt ===
      "string"
  );
}

function loadStoredDebts() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    const storedValue =
      window.localStorage.getItem(
        DEBTS_STORAGE_KEY,
      );

    if (!storedValue) {
      return null;
    }

    const parsedValue:
      unknown =
      JSON.parse(
        storedValue,
      );

    if (
      !Array.isArray(
        parsedValue,
      ) ||
      !parsedValue.every(
        isDebtData,
      )
    ) {
      window.localStorage.removeItem(
        DEBTS_STORAGE_KEY,
      );

      return null;
    }

    return cloneDebts(
      parsedValue,
    );
  } catch {
    return null;
  }
}

export default function DebtsProvider({
  children,
  initialDebts = defaultDebts,
}: DebtsProviderProps) {
  const [
    debts,
    setDebts,
  ] = useState<DebtData[]>(
    () =>
      cloneDebts(
        initialDebts,
      ),
  );

  const [
    hasHydratedStorage,
    setHasHydratedStorage,
  ] =
    useState(
      false,
    );

  useEffect(
    () => {
      const storedDebts =
        loadStoredDebts();

      if (
        storedDebts
      ) {
        setDebts(
          storedDebts,
        );
      }

      setHasHydratedStorage(
        true,
      );
    },
    [],
  );

  useEffect(
    () => {
      if (
        !hasHydratedStorage
      ) {
        return;
      }

      try {
        window.localStorage.setItem(
          DEBTS_STORAGE_KEY,
          JSON.stringify(
            debts,
          ),
        );
      } catch {
        // Local storage may be unavailable or full.
      }
    },
    [
      debts,
      hasHydratedStorage,
    ],
  );

  const activeDebts =
    useMemo(
      () =>
        debts.filter(
          (
            debt,
          ) =>
            debt.status ===
            "active",
        ),
      [
        debts,
      ],
    );

  const paidOffDebts =
    useMemo(
      () =>
        debts.filter(
          (
            debt,
          ) =>
            debt.status ===
            "paid-off",
        ),
      [
        debts,
      ],
    );

  const totalDebt =
    useMemo(
      () =>
        normalizeCurrency(
          activeDebts.reduce(
            (
              total,
              debt,
            ) =>
              total +
              debt.currentBalance,
            0,
          ),
        ),
      [
        activeDebts,
      ],
    );

  const totalMinimumPayments =
    useMemo(
      () =>
        normalizeCurrency(
          activeDebts.reduce(
            (
              total,
              debt,
            ) =>
              total +
              debt.minimumPayment,
            0,
          ),
        ),
      [
        activeDebts,
      ],
    );

  const addDebt =
    useCallback(
      (
        debt:
          CreateDebtData,
      ) => {
        const timestamp =
          new Date().toISOString();

        const originalBalance =
          normalizeCurrency(
            debt.originalBalance,
          );

        const currentBalance =
          normalizeCurrency(
            debt.currentBalance ??
            originalBalance,
          );

        const newDebt:
          DebtData = {
            id:
              createDebtId(),

            name:
              debt.name.trim(),

            lender:
              debt.lender?.trim() ||
              undefined,

            type:
              debt.type,

            originalBalance,

            currentBalance,

            interestRate:
              Number.isFinite(
                debt.interestRate,
              )
                ? debt.interestRate ??
                  0
                : 0,

            minimumPayment:
              normalizeCurrency(
                debt.minimumPayment ??
                0,
              ),

            dueDay:
              debt.dueDay,

            status:
              currentBalance <=
              0
                ? "paid-off"
                : "active",

            createdAt:
              timestamp,

            updatedAt:
              timestamp,
          };

        setDebts(
          (
            currentDebts,
          ) => [
            newDebt,
            ...currentDebts,
          ],
        );

        return newDebt;
      },
      [],
    );

  const updateDebt =
    useCallback(
      (
        debtId: string,
        updates:
          UpdateDebtData,
      ) => {
        setDebts(
          (
            currentDebts,
          ) =>
            currentDebts.map(
              (
                debt,
              ) => {
                if (
                  debt.id !==
                  debtId
                ) {
                  return debt;
                }

                const currentBalance =
                  updates.currentBalance ===
                  undefined
                    ? debt.currentBalance
                    : normalizeCurrency(
                        updates.currentBalance,
                      );

                return {
                  ...debt,
                  ...updates,

                  id:
                    debt.id,

                  name:
                    updates.name?.trim() ||
                    debt.name,

                  lender:
                    updates.lender ===
                    undefined
                      ? debt.lender
                      : updates.lender.trim() ||
                        undefined,

                  originalBalance:
                    updates.originalBalance ===
                    undefined
                      ? debt.originalBalance
                      : normalizeCurrency(
                          updates.originalBalance,
                        ),

                  currentBalance,

                  minimumPayment:
                    updates.minimumPayment ===
                    undefined
                      ? debt.minimumPayment
                      : normalizeCurrency(
                          updates.minimumPayment,
                        ),

                  status:
                    currentBalance <=
                    0
                      ? "paid-off"
                      : updates.status ??
                        debt.status,

                  createdAt:
                    debt.createdAt,

                  updatedAt:
                    new Date().toISOString(),
                };
              },
            ),
        );
      },
      [],
    );

  const deleteDebt =
    useCallback(
      (
        debtId: string,
      ) => {
        setDebts(
          (
            currentDebts,
          ) =>
            currentDebts.filter(
              (
                debt,
              ) =>
                debt.id !==
                debtId,
            ),
        );
      },
      [],
    );

  const recordDebtPayment =
    useCallback(
      (
        debtId: string,
        amount: number,
      ) => {
        if (
          !Number.isFinite(
            amount,
          ) ||
          amount <= 0
        ) {
          return;
        }

        setDebts(
          (
            currentDebts,
          ) =>
            currentDebts.map(
              (
                debt,
              ) => {
                if (
                  debt.id !==
                  debtId
                ) {
                  return debt;
                }

                const nextBalance =
                  normalizeCurrency(
                    Math.max(
                      0,
                      debt.currentBalance -
                      amount,
                    ),
                  );

                return {
                  ...debt,

                  currentBalance:
                    nextBalance,

                  status:
                    nextBalance ===
                    0
                      ? "paid-off"
                      : "active",

                  updatedAt:
                    new Date().toISOString(),
                };
              },
            ),
        );
      },
      [],
    );

  const getDebtById =
    useCallback(
      (
        debtId: string,
      ) => {
        return (
          debts.find(
            (
              debt,
            ) =>
              debt.id ===
              debtId,
          ) ??
          null
        );
      },
      [
        debts,
      ],
    );

  const value =
    useMemo<DebtsContextValue>(
      () => ({
        debts,
        activeDebts,
        paidOffDebts,
        totalDebt,
        totalMinimumPayments,
        addDebt,
        updateDebt,
        deleteDebt,
        recordDebtPayment,
        getDebtById,
      }),
      [
        activeDebts,
        addDebt,
        debts,
        deleteDebt,
        getDebtById,
        paidOffDebts,
        recordDebtPayment,
        totalDebt,
        totalMinimumPayments,
        updateDebt,
      ],
    );

  return (
    <DebtsContext.Provider
      value={
        value
      }
    >
      {children}
    </DebtsContext.Provider>
  );
}

export function useDebts() {
  const context =
    useContext(
      DebtsContext,
    );

  if (!context) {
    throw new Error(
      "useDebts must be used within a DebtsProvider.",
    );
  }

  return context;
}
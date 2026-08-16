"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  archiveDebt as archiveDebtAction,
  type ArchiveDebtResult,
} from "@/actions/debts/archive-debt";

import {
  createDebt as createDebtAction,
} from "@/actions/debts/create-debt";

import {
  getDebts as getDebtsAction,
} from "@/actions/debts/get-debts";

import {
  recordDebtPayment as recordDebtPaymentAction,
} from "@/actions/debts/record-debt-payment";

import {
  updateDebt as updateDebtAction,
} from "@/actions/debts/update-debt";

import type {
  CreateDebtData,
  CreateDebtResult,
  DebtData,
  DebtPaymentData,
  GetDebtsResult,
  RecordDebtPaymentData,
  RecordDebtPaymentResult,
  UpdateDebtData,
  UpdateDebtResult,
} from "@/types/debt";

export type {
  CreateDebtData,
  DebtData,
  DebtPaymentData,
  DebtStatus,
  DebtType,
  RecordDebtPaymentData,
  UpdateDebtData,
} from "@/types/debt";

export type DebtsProviderProps = {
  children:
    ReactNode;

  /**
   * Optional server-provided debt state.
   *
   * When supplied, the provider can render immediately from canonical server
   * data and then refresh from Supabase after mounting.
   */
  initialDebts?:
    DebtData[];

  /**
   * Optional server-provided payment history.
   */
  initialPayments?:
    DebtPaymentData[];
};

type DebtsContextValue = {
  debts:
    DebtData[];

  activeDebts:
    DebtData[];

  paidOffDebts:
    DebtData[];

  payments:
    DebtPaymentData[];

  totalDebt:
    number;

  totalMinimumPayments:
    number;

  isLoading:
    boolean;

  isMutating:
    boolean;

  error:
    string | null;

  refreshDebts:
    () => Promise<GetDebtsResult>;

  addDebt:
    (
      debt:
        CreateDebtData,
    ) => Promise<CreateDebtResult>;

  updateDebt:
    (
      debtId:
        string,
      updates:
        UpdateDebtData,
    ) => Promise<UpdateDebtResult>;

  deleteDebt:
    (
      debtId:
        string,
    ) => Promise<ArchiveDebtResult>;

  restoreDebt:
    (
      debtId:
        string,
    ) => Promise<ArchiveDebtResult>;

  recordDebtPayment:
    (
      debtId:
        string,
      amount:
        number,
      options?:
        Omit<
          RecordDebtPaymentData,
          | "debtId"
          | "amount"
        >,
    ) => Promise<RecordDebtPaymentResult>;

  getDebtById:
    (
      debtId:
        string,
    ) => DebtData | null;

  getPaymentsForDebt:
    (
      debtId:
        string,
    ) => DebtPaymentData[];

  clearError:
    () => void;
};

const defaultDebts:
  DebtData[] = [];

const defaultPayments:
  DebtPaymentData[] = [];

const DebtsContext =
  createContext<
    DebtsContextValue | undefined
  >(undefined);

function cloneDebts(
  debts:
    DebtData[],
): DebtData[] {
  return debts.map(
    (
      debt,
    ) => ({
      ...debt,
    }),
  );
}

function clonePayments(
  payments:
    DebtPaymentData[],
): DebtPaymentData[] {
  return payments.map(
    (
      payment,
    ) => ({
      ...payment,
    }),
  );
}

function normalizeCurrency(
  value:
    number,
): number {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Math.round(
    (
      value +
      Number.EPSILON
    ) *
      100,
  ) /
    100;
}

function sortDebts(
  debts:
    DebtData[],
): DebtData[] {
  return [
    ...debts,
  ].sort(
    (
      left,
      right,
    ) => {
      if (
        left.status !==
        right.status
      ) {
        return left.status ===
          "active"
          ? -1
          : 1;
      }

      const updatedDifference =
        Date.parse(
          right.updatedAt,
        ) -
        Date.parse(
          left.updatedAt,
        );

      if (
        Number.isFinite(
          updatedDifference,
        ) &&
        updatedDifference !==
          0
      ) {
        return updatedDifference;
      }

      return Date.parse(
        right.createdAt,
      ) -
        Date.parse(
          left.createdAt,
        );
    },
  );
}

function sortPayments(
  payments:
    DebtPaymentData[],
): DebtPaymentData[] {
  return [
    ...payments,
  ].sort(
    (
      left,
      right,
    ) => {
      const paymentDateDifference =
        right.paymentDate.localeCompare(
          left.paymentDate,
        );

      if (
        paymentDateDifference !==
        0
      ) {
        return paymentDateDifference;
      }

      return Date.parse(
        right.createdAt,
      ) -
        Date.parse(
          left.createdAt,
        );
    },
  );
}

function replaceDebt(
  currentDebts:
    DebtData[],
  updatedDebt:
    DebtData,
): DebtData[] {
  const existingIndex =
    currentDebts.findIndex(
      (
        debt,
      ) =>
        debt.id ===
        updatedDebt.id,
    );

  if (
    existingIndex ===
      -1
  ) {
    return sortDebts([
      updatedDebt,
      ...currentDebts,
    ]);
  }

  return sortDebts(
    currentDebts.map(
      (
        debt,
      ) =>
        debt.id ===
        updatedDebt.id
          ? updatedDebt
          : debt,
    ),
  );
}

function upsertPayment(
  currentPayments:
    DebtPaymentData[],
  payment:
    DebtPaymentData,
): DebtPaymentData[] {
  const withoutExisting =
    currentPayments.filter(
      (
        currentPayment,
      ) =>
        currentPayment.id !==
        payment.id,
    );

  return sortPayments([
    payment,
    ...withoutExisting,
  ]);
}

export default function DebtsProvider({
  children,
  initialDebts =
    defaultDebts,
  initialPayments =
    defaultPayments,
}: DebtsProviderProps) {
  const [
    debts,
    setDebts,
  ] =
    useState<
      DebtData[]
    >(
      () =>
        sortDebts(
          cloneDebts(
            initialDebts,
          ),
        ),
    );

  const [
    payments,
    setPayments,
  ] =
    useState<
      DebtPaymentData[]
    >(
      () =>
        sortPayments(
          clonePayments(
            initialPayments,
          ),
        ),
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true,
    );

  const [
    mutationCount,
    setMutationCount,
  ] =
    useState(
      0,
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  /**
   * Prevent an older refresh response from replacing a newer refresh.
   *
   * This matters when the active workspace changes quickly or a component
   * explicitly refreshes while the provider's initial load is still pending.
   */
  const refreshRequestIdRef =
    useRef(
      0,
    );

  const mountedRef =
    useRef(
      true,
    );

  useEffect(
    () => {
      mountedRef.current =
        true;

      return () => {
        mountedRef.current =
          false;
      };
    },
    [],
  );

  const clearError =
    useCallback(
      () => {
        setError(
          null,
        );
      },
      [],
    );

  const beginMutation =
    useCallback(
      () => {
        setMutationCount(
          (
            current,
          ) =>
            current +
            1,
        );
      },
      [],
    );

  const endMutation =
    useCallback(
      () => {
        setMutationCount(
          (
            current,
          ) =>
            Math.max(
              0,
              current -
                1,
            ),
        );
      },
      [],
    );

  const refreshDebts =
    useCallback(
      async (): Promise<GetDebtsResult> => {
        const requestId =
          refreshRequestIdRef.current +
          1;

        refreshRequestIdRef.current =
          requestId;

        setIsLoading(
          true,
        );

        try {
          const result =
            await getDebtsAction();

          if (
            !mountedRef.current ||
            refreshRequestIdRef.current !==
              requestId
          ) {
            return result;
          }

          if (
            !result.success
          ) {
            setError(
              result.error,
            );

            return result;
          }

          setDebts(
            sortDebts(
              cloneDebts(
                result.debts,
              ),
            ),
          );

          setPayments(
            sortPayments(
              clonePayments(
                result.payments,
              ),
            ),
          );

          setError(
            null,
          );

          return result;
        } catch (
          caughtError
        ) {
          console.error(
            "[CASE Budget DebtsProvider] Failed to refresh debts.",
            caughtError,
          );

          const result:
            GetDebtsResult = {
              success:
                false,

              error:
                "CASE Budget could not load your debts. Please try again.",
            };

          if (
            mountedRef.current &&
            refreshRequestIdRef.current ===
              requestId
          ) {
            setError(
              result.error,
            );
          }

          return result;
        } finally {
          if (
            mountedRef.current &&
            refreshRequestIdRef.current ===
              requestId
          ) {
            setIsLoading(
              false,
            );
          }
        }
      },
      [],
    );

  /**
   * Supabase is now the canonical source of debt data.
   *
   * There is intentionally no localStorage hydration or persistence here.
   * Every provider mount reloads the authenticated active workspace.
   */
  useEffect(
    () => {
      void refreshDebts();
    },
    [
      refreshDebts,
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
      async (
        debt:
          CreateDebtData,
      ): Promise<CreateDebtResult> => {
        beginMutation();

        try {
          const result =
            await createDebtAction(
              debt,
            );

          if (
            !result.success
          ) {
            setError(
              result.error,
            );

            return result;
          }

          setDebts(
            (
              currentDebts,
            ) =>
              replaceDebt(
                currentDebts,
                result.debt,
              ),
          );

          setError(
            null,
          );

          return result;
        } catch (
          caughtError
        ) {
          console.error(
            "[CASE Budget DebtsProvider] Failed to create debt.",
            caughtError,
          );

          const result:
            CreateDebtResult = {
              success:
                false,

              error:
                "CASE Budget could not create the debt. Please try again.",
            };

          setError(
            result.error,
          );

          return result;
        } finally {
          endMutation();
        }
      },
      [
        beginMutation,
        endMutation,
      ],
    );

  const updateDebt =
    useCallback(
      async (
        debtId:
          string,
        updates:
          UpdateDebtData,
      ): Promise<UpdateDebtResult> => {
        beginMutation();

        try {
          const result =
            await updateDebtAction({
              debtId,
              updates,
            });

          if (
            !result.success
          ) {
            setError(
              result.error,
            );

            return result;
          }

          setDebts(
            (
              currentDebts,
            ) =>
              replaceDebt(
                currentDebts,
                result.debt,
              ),
          );

          setError(
            null,
          );

          return result;
        } catch (
          caughtError
        ) {
          console.error(
            "[CASE Budget DebtsProvider] Failed to update debt.",
            caughtError,
          );

          const result:
            UpdateDebtResult = {
              success:
                false,

              error:
                "CASE Budget could not update the debt. Please try again.",
            };

          setError(
            result.error,
          );

          return result;
        } finally {
          endMutation();
        }
      },
      [
        beginMutation,
        endMutation,
      ],
    );

  /**
   * The existing UI calls this deleteDebt for compatibility, but production
   * behavior is a soft archive. No debt or payment-history row is deleted.
   */
  const deleteDebt =
    useCallback(
      async (
        debtId:
          string,
      ): Promise<ArchiveDebtResult> => {
        beginMutation();

        try {
          const result =
            await archiveDebtAction({
              debtId,
              archived:
                true,
            });

          if (
            !result.success
          ) {
            setError(
              result.error,
            );

            return result;
          }

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

          setError(
            null,
          );

          return result;
        } catch (
          caughtError
        ) {
          console.error(
            "[CASE Budget DebtsProvider] Failed to archive debt.",
            caughtError,
          );

          const result:
            ArchiveDebtResult = {
              success:
                false,

              error:
                "CASE Budget could not archive the debt. Please try again.",
            };

          setError(
            result.error,
          );

          return result;
        } finally {
          endMutation();
        }
      },
      [
        beginMutation,
        endMutation,
      ],
    );

  const restoreDebt =
    useCallback(
      async (
        debtId:
          string,
      ): Promise<ArchiveDebtResult> => {
        beginMutation();

        try {
          const result =
            await archiveDebtAction({
              debtId,
              archived:
                false,
            });

          if (
            !result.success
          ) {
            setError(
              result.error,
            );

            return result;
          }

          setDebts(
            (
              currentDebts,
            ) =>
              replaceDebt(
                currentDebts,
                result.debt,
              ),
          );

          setError(
            null,
          );

          return result;
        } catch (
          caughtError
        ) {
          console.error(
            "[CASE Budget DebtsProvider] Failed to restore debt.",
            caughtError,
          );

          const result:
            ArchiveDebtResult = {
              success:
                false,

              error:
                "CASE Budget could not restore the debt. Please try again.",
            };

          setError(
            result.error,
          );

          return result;
        } finally {
          endMutation();
        }
      },
      [
        beginMutation,
        endMutation,
      ],
    );

  const recordDebtPayment =
    useCallback(
      async (
        debtId:
          string,
        amount:
          number,
        options:
          Omit<
            RecordDebtPaymentData,
            | "debtId"
            | "amount"
          > = {},
      ): Promise<RecordDebtPaymentResult> => {
        beginMutation();

        try {
          const result =
            await recordDebtPaymentAction({
              debtId,
              amount,
              ...options,
            });

          if (
            !result.success
          ) {
            setError(
              result.error,
            );

            return result;
          }

          setDebts(
            (
              currentDebts,
            ) =>
              replaceDebt(
                currentDebts,
                result.debt,
              ),
          );

          setPayments(
            (
              currentPayments,
            ) =>
              upsertPayment(
                currentPayments,
                result.payment,
              ),
          );

          setError(
            null,
          );

          return result;
        } catch (
          caughtError
        ) {
          console.error(
            "[CASE Budget DebtsProvider] Failed to record debt payment.",
            caughtError,
          );

          const result:
            RecordDebtPaymentResult = {
              success:
                false,

              error:
                "CASE Budget could not record the debt payment. Please try again.",
            };

          setError(
            result.error,
          );

          return result;
        } finally {
          endMutation();
        }
      },
      [
        beginMutation,
        endMutation,
      ],
    );

  const getDebtById =
    useCallback(
      (
        debtId:
          string,
      ): DebtData | null => {
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

  const getPaymentsForDebt =
    useCallback(
      (
        debtId:
          string,
      ): DebtPaymentData[] => {
        return payments.filter(
          (
            payment,
          ) =>
            payment.debtId ===
            debtId,
        );
      },
      [
        payments,
      ],
    );

  const isMutating =
    mutationCount >
    0;

  const value =
    useMemo<DebtsContextValue>(
      () => ({
        debts,
        activeDebts,
        paidOffDebts,
        payments,
        totalDebt,
        totalMinimumPayments,
        isLoading,
        isMutating,
        error,
        refreshDebts,
        addDebt,
        updateDebt,
        deleteDebt,
        restoreDebt,
        recordDebtPayment,
        getDebtById,
        getPaymentsForDebt,
        clearError,
      }),
      [
        debts,
        activeDebts,
        paidOffDebts,
        payments,
        totalDebt,
        totalMinimumPayments,
        isLoading,
        isMutating,
        error,
        refreshDebts,
        addDebt,
        updateDebt,
        deleteDebt,
        restoreDebt,
        recordDebtPayment,
        getDebtById,
        getPaymentsForDebt,
        clearError,
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

export function useDebts():
  DebtsContextValue {
  const context =
    useContext(
      DebtsContext,
    );

  if (
    !context
  ) {
    throw new Error(
      "useDebts must be used within a DebtsProvider.",
    );
  }

  return context;
}

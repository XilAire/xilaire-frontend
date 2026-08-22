"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  refreshBillStatuses,
} from "@/lib/bills/bill-utils";
import {
  generateNextBill,
} from "@/lib/bills/recurring-bills";

import {
  isSpendingBill,
  type BillData,
} from "@/types/bill";
import type {
  BudgetCategoryData,
} from "@/types/budget";

type BillsContextValue = {
  bills: BillData[];

  addBill: (
    bill: BillData,
  ) => Promise<BillData | null>;

  updateBill: (
    bill: BillData,
  ) => Promise<BillData | null>;

  deleteBill: (
    billId: string,
  ) => Promise<boolean>;

  markBillPaid: (
    bill: BillData,
    paidDate: string,
    paidAmount?: number,
  ) => Promise<BillData | null>;

  getBillById: (
    billId: string,
  ) => BillData | null;

  getLinkedBillForBudgetItem: (
    budgetItem: BudgetCategoryData,
  ) => BillData | null;

  getLinkedBillsForBudgetItem: (
    budgetItem: BudgetCategoryData,
  ) => BillData[];
};

export type BillsProviderProps = {
  children: React.ReactNode;
  initialBills?: BillData[];
};

type BillsApiError = {
  code:
    string;

  message:
    string;
};

type BillsApiResponse<
  Data,
> =
  | {
      success:
        true;

      data:
        Data;

      error:
        null;
    }
  | {
      success:
        false;

      data:
        null;

      error:
        BillsApiError;
    };

type BillsListResponseData = {
  bills:
    BillData[];
};

type BillCreateResponseData = {
  bill:
    BillData;
};

type BillUpdateResponseData = {
  bill:
    BillData;
};

type BillDeleteResponseData = {
  billId:
    string;
};

const BILLS_API_PATH =
  "/api/bills";

const defaultBills:
  BillData[] = [];

const BillsContext =
  createContext<
    BillsContextValue | undefined
  >(undefined);

function normalizeBudgetItemName(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    );
}

function getLinkedBillPriority(
  bill: BillData,
) {
  if (
    bill.status ===
    "paid"
  ) {
    return 2;
  }

  return 1;
}

function sortLinkedBills(
  firstBill: BillData,
  secondBill: BillData,
) {
  const priorityDifference =
    getLinkedBillPriority(
      firstBill,
    ) -
    getLinkedBillPriority(
      secondBill,
    );

  if (
    priorityDifference !==
    0
  ) {
    return priorityDifference;
  }

  return firstBill.dueDate.localeCompare(
    secondBill.dueDate,
  );
}

function isBillLinkedToBudgetItem(
  bill: BillData,
  budgetItem: BudgetCategoryData,
) {
  if (!bill.budgetItem) {
    return false;
  }

  if (
    bill.budgetItem.id ===
    budgetItem.id
  ) {
    return true;
  }

  if (
    bill.budgetItem.id &&
    bill.budgetItem.id !== ""
  ) {
    return false;
  }

  const normalizedBudgetItemName =
    normalizeBudgetItemName(
      budgetItem.name,
    );

  const normalizedLinkedItemName =
    normalizeBudgetItemName(
      bill.budgetItem.name,
    );

  return (
    normalizedBudgetItemName !== "" &&
    normalizedBudgetItemName ===
      normalizedLinkedItemName
  );
}

export default function BillsProvider({
  children,
  initialBills = defaultBills,
}: BillsProviderProps) {
  const [
    storedBills,
    setStoredBills,
  ] = useState<BillData[]>(
    () =>
      refreshBillStatuses(
        initialBills,
      ),
  );

  const billsRef =
    useRef<BillData[]>(
      refreshBillStatuses(
        initialBills,
      ),
    );

  const replaceBills =
    useCallback(
      (
        nextBills: BillData[],
      ) => {
        const refreshedBills =
          refreshBillStatuses(
            nextBills,
          );

        billsRef.current =
          refreshedBills;

        setStoredBills(
          refreshedBills,
        );
      },
      [],
    );

  const updateBillsState =
    useCallback(
      (
        updater:
          (
            currentBills:
              BillData[],
          ) =>
            BillData[],
      ) => {
        setStoredBills(
          (
            currentBills,
          ) => {
            const nextBills =
              refreshBillStatuses(
                updater(
                  currentBills,
                ),
              );

            billsRef.current =
              nextBills;

            return nextBills;
          },
        );
      },
      [],
    );

  const reloadBillsFromServer =
    useCallback(
      async () => {
        try {
          const serverBills =
            await fetchBillsFromApi();

          replaceBills(
            serverBills,
          );

        } catch (
          error
        ) {
          logBillsProviderError({
            operation:
              "reloadBillsFromServer",

            error,
          });
        }
      },
      [
        replaceBills,
      ],
    );

  useEffect(
    () => {
      let isCancelled =
        false;

      const initializeBills =
        async () => {
          try {
            const serverBills =
              await fetchBillsFromApi();

            if (
              isCancelled
            ) {
              return;
            }

            replaceBills(
              serverBills,
            );
          } catch (
            error
          ) {
            if (
              isCancelled
            ) {
              return;
            }

            logBillsProviderError({
              operation:
                "initializeBills",

              error,
            });
          }
        };

      void initializeBills();

      return () => {
        isCancelled =
          true;
      };
    },
    [
      replaceBills,
    ],
  );

  const bills =
    useMemo(
      () =>
        refreshBillStatuses(
          storedBills,
        ),
      [storedBills],
    );

  const addBill =
    useCallback(
      async (
        bill: BillData,
      ) => {
        try {
          const savedBill =
            await createBillViaApi(
              bill,
            );

          updateBillsState(
            (
              currentBills,
            ) => [
              savedBill,
              ...currentBills.filter(
                (
                  currentBill,
                ) =>
                  currentBill.id !==
                  savedBill.id,
              ),
            ],
          );

          return savedBill;
        } catch (
          error
        ) {
          logBillsProviderError({
            operation:
              "addBill",

            error,
          });

          return null;
        }
      },
      [
        updateBillsState,
      ],
    );

  const updateBill =
    useCallback(
      async (
        updatedBill: BillData,
      ) => {
        try {
          const savedBill =
            await updateBillViaApi(
              updatedBill,
            );

          updateBillsState(
            (
              currentBills,
            ) =>
              currentBills.map(
                (
                  currentBill,
                ) =>
                  currentBill.id ===
                  savedBill.id
                    ? savedBill
                    : currentBill,
              ),
          );

          return savedBill;
        } catch (
          error
        ) {
          logBillsProviderError({
            operation:
              "updateBill",

            error,
          });

          await reloadBillsFromServer();

          return null;
        }
      },
      [
        reloadBillsFromServer,
        updateBillsState,
      ],
    );

  const deleteBill =
    useCallback(
      async (
        billId: string,
      ) => {
        const normalizedBillId =
          billId.trim();

        if (
          !normalizedBillId
        ) {
          return false;
        }

        try {
          await deleteBillViaApi(
            normalizedBillId,
          );

          updateBillsState(
            (
              currentBills,
            ) =>
              currentBills.filter(
                (
                  currentBill,
                ) =>
                  currentBill.id !==
                  normalizedBillId,
              ),
          );

          return true;
        } catch (
          error
        ) {
          logBillsProviderError({
            operation:
              "deleteBill",

            error,
          });

          await reloadBillsFromServer();

          return false;
        }
      },
      [
        reloadBillsFromServer,
        updateBillsState,
      ],
    );

  const markBillPaid =
    useCallback(
      async (
        bill: BillData,
        paidDate: string,
        paidAmount?: number,
      ) => {
        /*
         * Spending entries are monthly spending envelopes, not
         * single-payment obligations.
         *
         * Their actual spending must come from transactions linked to
         * the corresponding budget item. They must never be converted
         * to a paid bill or assigned one canonical payment transaction.
         */
        if (
          isSpendingBill(
            bill,
          )
        ) {
          logBillsProviderError({
            operation:
              "markBillPaid",

            error:
              new Error(
                "Monthly spending items cannot be marked paid. Their spending is tracked from linked transactions.",
              ),
          });

          return null;
        }

        const normalizedPaidDate =
          paidDate.trim();

        if (
          !normalizedPaidDate
        ) {
          logBillsProviderError({
            operation:
              "markBillPaid",

            error:
              new Error(
                "A payment date is required before a bill can be marked paid.",
              ),
          });

          return null;
        }

        const resolvedPaidAmount =
          bill.amountType ===
            "variable"
            ? paidAmount ??
              bill.paidAmount
            : paidAmount ??
              bill.amount;

        if (
          !Number.isFinite(
            resolvedPaidAmount,
          ) ||
          (
            resolvedPaidAmount ??
            0
          ) <= 0
        ) {
          logBillsProviderError({
            operation:
              "markBillPaid",

            error:
              new Error(
                bill.amountType ===
                  "variable"
                  ? "Enter the actual amount paid before marking this variable bill as paid."
                  : "A valid payment amount is required before this bill can be marked paid.",
              ),
          });

          return null;
        }

        const timestamp =
          new Date().toISOString();

        const paidBill: BillData = {
          ...bill,

          status:
            "paid",

          paidDate:
            normalizedPaidDate,

          paidAmount:
            resolvedPaidAmount,

          updatedAt:
            timestamp,
        };

        try {
          /*
           * The PUT route is responsible for creating the canonical
           * payment transaction and linking paymentTransactionId.
           */
          const savedPaidBill =
            await updateBillViaApi(
              paidBill,
            );

          const generatedNextBill =
            generateNextBill(
              savedPaidBill,
            );

          let savedNextBill:
            BillData | null =
            null;

          if (
            generatedNextBill
          ) {
            const matchingNextBillExists =
              billsRef.current.some(
                (
                  currentBill,
                ) =>
                  currentBill.id !==
                    savedPaidBill.id &&
                  currentBill.name ===
                    generatedNextBill.name &&
                  currentBill.dueDate ===
                    generatedNextBill.dueDate &&
                  currentBill.status !==
                    "paid",
              );

            if (
              !matchingNextBillExists
            ) {
              try {
                savedNextBill =
                  await createBillViaApi(
                    generatedNextBill,
                  );
              } catch (
                error
              ) {
                /*
                 * The paid occurrence has already been saved. A failure
                 * to generate the next recurrence should not cause the
                 * client to pretend the payment itself failed.
                 */
                logBillsProviderError({
                  operation:
                    "markBillPaid.createNextBill",

                  error,
                });
              }
            }
          }

          updateBillsState(
            (
              currentBills,
            ) => {
              const updatedBills =
                currentBills.map(
                  (
                    currentBill,
                  ) =>
                    currentBill.id ===
                    savedPaidBill.id
                      ? savedPaidBill
                      : currentBill,
                );

              if (
                !savedNextBill ||
                updatedBills.some(
                  (
                    currentBill,
                  ) =>
                    currentBill.id ===
                    savedNextBill?.id,
                )
              ) {
                return updatedBills;
              }

              return [
                ...updatedBills,
                savedNextBill,
              ];
            },
          );

          return savedPaidBill;
        } catch (
          error
        ) {
          logBillsProviderError({
            operation:
              "markBillPaid",

            error,
          });

          await reloadBillsFromServer();

          return null;
        }
      },
      [
        reloadBillsFromServer,
        updateBillsState,
      ],
    );

  const getBillById =
    useCallback(
      (
        billId: string,
      ) => {
        return (
          bills.find(
            (
              bill,
            ) =>
              bill.id ===
              billId,
          ) ??
          null
        );
      },
      [bills],
    );

  const getLinkedBillsForBudgetItem =
    useCallback(
      (
        budgetItem:
          BudgetCategoryData,
      ) => {
        return bills
          .filter(
            (
              bill,
            ) =>
              isBillLinkedToBudgetItem(
                bill,
                budgetItem,
              ),
          )
          .sort(
            sortLinkedBills,
          );
      },
      [bills],
    );

  const getLinkedBillForBudgetItem =
    useCallback(
      (
        budgetItem:
          BudgetCategoryData,
      ) => {
        return (
          getLinkedBillsForBudgetItem(
            budgetItem,
          )[0] ??
          null
        );
      },
      [
        getLinkedBillsForBudgetItem,
      ],
    );

  const value =
    useMemo<BillsContextValue>(
      () => ({
        bills,
        addBill,
        updateBill,
        deleteBill,
        markBillPaid,
        getBillById,
        getLinkedBillForBudgetItem,
        getLinkedBillsForBudgetItem,
      }),
      [
        addBill,
        bills,
        deleteBill,
        getBillById,
        getLinkedBillForBudgetItem,
        getLinkedBillsForBudgetItem,
        markBillPaid,
        updateBill,
      ],
    );

  return (
    <BillsContext.Provider
      value={value}
    >
      {children}
    </BillsContext.Provider>
  );
}

export function useBills() {
  const context =
    useContext(
      BillsContext,
    );

  if (
    !context
  ) {
    throw new Error(
      "useBills must be used within a BillsProvider.",
    );
  }

  return context;
}

async function fetchBillsFromApi() {
  const response =
    await fetch(
      BILLS_API_PATH,
      {
        method:
          "GET",

        credentials:
          "same-origin",

        cache:
          "no-store",

        headers: {
          Accept:
            "application/json",
        },
      },
    );

  const result =
    await readBillsApiResponse<
      BillsListResponseData
    >(
      response,
    );

  return result.bills;
}

async function createBillViaApi(
  bill:
    BillData,
) {
  const response =
    await fetch(
      BILLS_API_PATH,
      {
        method:
          "POST",

        credentials:
          "same-origin",

        cache:
          "no-store",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            action:
              "create",

            bill,
          }),
      },
    );

  const result =
    await readBillsApiResponse<
      BillCreateResponseData
    >(
      response,
    );

  return result.bill;
}

async function updateBillViaApi(
  bill:
    BillData,
) {
  const encodedBillId =
    encodeURIComponent(
      bill.id,
    );

  const response =
    await fetch(
      `${BILLS_API_PATH}/${encodedBillId}`,
      {
        method:
          "PUT",

        credentials:
          "same-origin",

        cache:
          "no-store",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            bill,
          }),
      },
    );

  const result =
    await readBillsApiResponse<
      BillUpdateResponseData
    >(
      response,
    );

  return result.bill;
}

async function deleteBillViaApi(
  billId:
    string,
) {
  const encodedBillId =
    encodeURIComponent(
      billId,
    );

  const response =
    await fetch(
      `${BILLS_API_PATH}/${encodedBillId}`,
      {
        method:
          "DELETE",

        credentials:
          "same-origin",

        cache:
          "no-store",

        headers: {
          Accept:
            "application/json",
        },
      },
    );

  const result =
    await readBillsApiResponse<
      BillDeleteResponseData
    >(
      response,
    );

  return result.billId;
}

async function readBillsApiResponse<
  Data,
>(
  response:
    Response,
) {
  let parsedValue:
    unknown;

  try {
    parsedValue =
      await response.json();
  } catch {
    throw new Error(
      `CASE Budget received an invalid response from the Bills API (${response.status}).`,
    );
  }

  if (
    !isBillsApiResponse<Data>(
      parsedValue,
    )
  ) {
    throw new Error(
      `CASE Budget received an unexpected Bills API response (${response.status}).`,
    );
  }

  if (
    !response.ok ||
    !parsedValue.success
  ) {
    const message =
      parsedValue.success
        ? `CASE Budget Bills API request failed with HTTP ${response.status}.`
        : parsedValue.error.message;

    throw new Error(
      message,
    );
  }

  return parsedValue.data;
}

function isBillsApiResponse<
  Data,
>(
  value:
    unknown,
): value is BillsApiResponse<Data> {
  if (
    !isRecord(
      value,
    )
  ) {
    return false;
  }

  if (
    value.success ===
      true
  ) {
    return (
      "data" in
        value &&
      value.data !==
        null &&
      value.error ===
        null
    );
  }

  if (
    value.success ===
      false
  ) {
    return (
      value.data ===
        null &&
      isRecord(
        value.error,
      ) &&
      typeof value.error.code ===
        "string" &&
      typeof value.error.message ===
        "string"
    );
  }

  return false;
}

function isRecord(
  value:
    unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function logBillsProviderError({
  operation,
  error,
}: {
  operation:
    string;

  error:
    unknown;
}) {
  console.error(
    `[CASE Budget Bills] ${operation} failed.`,
    {
      error:
        error instanceof
          Error
          ? {
              name:
                error.name,

              message:
                error.message,
            }
          : {
              message:
                "Unknown error",
            },
    },
  );
}

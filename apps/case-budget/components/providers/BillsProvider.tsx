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
  useBudget,
} from "@/components/providers/BudgetProvider";

import type {
  BillData,
} from "@/types/bill";
import type {
  BudgetCategoryData,
} from "@/types/budget";

export type BudgetItemSyncResult =
  | {
      status: "updated";
      updatedBillIds: string[];
    }
  | {
      status: "suggested";
      suggestedBillIds: string[];
    }
  | {
      status:
        | "manual"
        | "disabled"
        | "unlinked";
      affectedBillIds: string[];
    };

type BillsContextValue = {
  bills: BillData[];

  addBill: (
    bill: BillData,
  ) => void;

  updateBill: (
    bill: BillData,
  ) => void;

  deleteBill: (
    billId: string,
  ) => void;

  markBillPaid: (
    bill: BillData,
    paidDate: string,
  ) => void;

  getBillById: (
    billId: string,
  ) => BillData | null;

  getLinkedBillForBudgetItem: (
    budgetItem: BudgetCategoryData,
  ) => BillData | null;

  getLinkedBillsForBudgetItem: (
    budgetItem: BudgetCategoryData,
  ) => BillData[];

  syncBudgetItemUpdate: (
    previousBudgetItem: BudgetCategoryData,
    updatedBudgetItem: BudgetCategoryData,
  ) => BudgetItemSyncResult;
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

type BillImportResponseData = {
  bills:
    BillData[];

  importedCount:
    number;
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

const BILLS_STORAGE_KEY =
  "case-budget:bills:v2";

const LEGACY_BILLS_STORAGE_KEY =
  "case-budget:bills:v1";

const LEGACY_DEMO_BILL_IDS =
  new Set([
    "mortgage",
    "electric",
  ]);

const defaultBills:
  BillData[] = [];

function isStoredBillData(
  value: unknown,
): value is BillData {
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
    value as Partial<BillData>;

  return (
    typeof candidate.id ===
      "string" &&
    typeof candidate.name ===
      "string" &&
    typeof candidate.amount ===
      "number" &&
    Number.isFinite(
      candidate.amount,
    ) &&
    typeof candidate.dueDate ===
      "string" &&
    typeof candidate.status ===
      "string" &&
    typeof candidate.frequency ===
      "string" &&
    typeof candidate.paymentMethod ===
      "string"
  );
}

function loadStoredBills() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const currentBills =
    readStoredBills(
      BILLS_STORAGE_KEY,
    );

  if (
    currentBills
  ) {
    return currentBills;
  }

  const legacyBills =
    readStoredBills(
      LEGACY_BILLS_STORAGE_KEY,
    );

  if (
    !legacyBills
  ) {
    return null;
  }

  const migratedBills =
    legacyBills.filter(
      (
        bill,
      ) =>
        !isUntouchedLegacyDemoBill(
          bill,
        ),
    );

  try {
    window.localStorage.setItem(
      BILLS_STORAGE_KEY,
      JSON.stringify(
        migratedBills,
      ),
    );

    window.localStorage.removeItem(
      LEGACY_BILLS_STORAGE_KEY,
    );
  } catch {
    // Local storage may be unavailable or full.
  }

  return refreshBillStatuses(
    migratedBills,
  );
}

function readStoredBills(
  storageKey: string,
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    const storedValue =
      window.localStorage.getItem(
        storageKey,
      );

    if (
      !storedValue
    ) {
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
        isStoredBillData,
      )
    ) {
      window.localStorage.removeItem(
        storageKey,
      );

      return null;
    }

    return refreshBillStatuses(
      parsedValue,
    );
  } catch {
    return null;
  }
}

function clearLegacyBillStorage() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    window.localStorage.removeItem(
      BILLS_STORAGE_KEY,
    );

    window.localStorage.removeItem(
      LEGACY_BILLS_STORAGE_KEY,
    );
  } catch {
    // Local storage may be unavailable.
  }
}

function isUntouchedLegacyDemoBill(
  bill: BillData,
) {
  if (
    !LEGACY_DEMO_BILL_IDS.has(
      bill.id,
    )
  ) {
    return false;
  }

  switch (
    bill.id
  ) {
    case "mortgage":
      return (
        bill.name ===
          "Mortgage" &&
        bill.payee ===
          "Rocket Mortgage" &&
        bill.amount ===
          1850 &&
        bill.dueDate ===
          "2026-08-01" &&
        bill.frequency ===
          "monthly" &&
        bill.paymentMethod ===
          "autopay" &&
        bill.account?.id ===
          "checking" &&
        bill.budgetItem?.id ===
          "category-mortgage"
      );

    case "electric":
      return (
        bill.name ===
          "Electric" &&
        bill.payee ===
          "Florida Power & Light" &&
        bill.amount ===
          182.55 &&
        bill.dueDate ===
          "2026-08-03" &&
        bill.frequency ===
          "monthly" &&
        bill.paymentMethod ===
          "manual" &&
        bill.account?.id ===
          "checking" &&
        bill.budgetItem?.id ===
          "category-electricity"
      );

    default:
      return false;
  }
}

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

function createUniqueBillId(
  preferredId: string,
  bills: BillData[],
) {
  const normalizedPreferredId =
    preferredId.trim();

  const existingIds =
    new Set(
      bills.map(
        (
          bill,
        ) =>
          bill.id,
      ),
    );

  if (
    normalizedPreferredId &&
    !existingIds.has(
      normalizedPreferredId,
    )
  ) {
    return normalizedPreferredId;
  }

  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return `bill-${crypto.randomUUID()}`;
  }

  let candidateId =
    `bill-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;

  while (
    existingIds.has(
      candidateId,
    )
  ) {
    candidateId =
      `bill-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
  }

  return candidateId;
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
  const {
    updateBudgetItemById,
  } = useBudget();

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

          clearLegacyBillStorage();
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
          const localBills =
            loadStoredBills();

          try {
            const serverBills =
              await fetchBillsFromApi();

            if (
              isCancelled
            ) {
              return;
            }

            if (
              serverBills.length >
              0
            ) {
              replaceBills(
                serverBills,
              );

              clearLegacyBillStorage();

              return;
            }

            const migrationBills =
              localBills ??
              (
                initialBills.length >
                0
                  ? refreshBillStatuses(
                      initialBills,
                    )
                  : []
              );

            if (
              migrationBills.length ===
              0
            ) {
              replaceBills(
                [],
              );

              clearLegacyBillStorage();

              return;
            }

            const importedBills =
              await importBillsToApi(
                migrationBills,
              );

            if (
              isCancelled
            ) {
              return;
            }

            replaceBills(
              importedBills,
            );

            clearLegacyBillStorage();
          } catch (
            error
          ) {
            if (
              isCancelled
            ) {
              return;
            }

            if (
              localBills
            ) {
              replaceBills(
                localBills,
              );
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
      initialBills,
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
      (
        bill: BillData,
      ) => {
        const [normalizedInputBill] =
          refreshBillStatuses([
            bill,
          ]);

        if (
          !normalizedInputBill
        ) {
          return;
        }

        const optimisticBill: BillData = {
          ...normalizedInputBill,

          id:
            createUniqueBillId(
              normalizedInputBill.id,
              billsRef.current,
            ),
        };

        updateBillsState(
          (
            currentBills,
          ) => [
            optimisticBill,
            ...currentBills,
          ],
        );

        if (
          optimisticBill.budgetItem &&
          optimisticBill.budgetSync
            ?.enabled &&
          optimisticBill.budgetSync
            .mode ===
            "automatic"
        ) {
          updateBudgetItemById(
            optimisticBill.budgetItem.id,
            {
              name:
                optimisticBill
                  .budgetItem.name,

              assignedAmount:
                optimisticBill.amount,
            },
          );
        }

        void (
          async () => {
            try {
              const savedBill =
                await createBillViaApi(
                  optimisticBill,
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
                      optimisticBill.id
                        ? savedBill
                        : currentBill,
                  ),
              );
            } catch (
              error
            ) {
              updateBillsState(
                (
                  currentBills,
                ) =>
                  currentBills.filter(
                    (
                      currentBill,
                    ) =>
                      currentBill.id !==
                      optimisticBill.id,
                  ),
              );

              logBillsProviderError({
                operation:
                  "addBill",

                error,
              });
            }
          }
        )();
      },
      [
        updateBillsState,
        updateBudgetItemById,
      ],
    );

  const updateBill =
    useCallback(
      (
        updatedBill: BillData,
      ) => {
        const [normalizedBill] =
          refreshBillStatuses([
            updatedBill,
          ]);

        if (
          !normalizedBill
        ) {
          return;
        }

        const previousBill =
          billsRef.current.find(
            (
              currentBill,
            ) =>
              currentBill.id ===
              normalizedBill.id,
          ) ??
          null;

        updateBillsState(
          (
            currentBills,
          ) =>
            currentBills.map(
              (
                currentBill,
              ) =>
                currentBill.id ===
                normalizedBill.id
                  ? normalizedBill
                  : currentBill,
            ),
        );

        if (
          normalizedBill.budgetItem &&
          normalizedBill.budgetSync
            ?.enabled &&
          normalizedBill.budgetSync
            .mode ===
            "automatic"
        ) {
          updateBudgetItemById(
            normalizedBill.budgetItem.id,
            {
              name:
                normalizedBill
                  .budgetItem.name,

              assignedAmount:
                normalizedBill.amount,
            },
          );
        }

        void (
          async () => {
            try {
              const savedBill =
                await updateBillViaApi(
                  normalizedBill,
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
                      normalizedBill.id
                        ? savedBill
                        : currentBill,
                  ),
              );
            } catch (
              error
            ) {
              if (
                previousBill
              ) {
                updateBillsState(
                  (
                    currentBills,
                  ) =>
                    currentBills.map(
                      (
                        currentBill,
                      ) =>
                        currentBill.id ===
                        normalizedBill.id
                          ? previousBill
                          : currentBill,
                    ),
                );
              } else {
                await reloadBillsFromServer();
              }

              logBillsProviderError({
                operation:
                  "updateBill",

                error,
              });
            }
          }
        )();
      },
      [
        reloadBillsFromServer,
        updateBillsState,
        updateBudgetItemById,
      ],
    );

  const deleteBill =
    useCallback(
      (
        billId: string,
      ) => {
        const normalizedBillId =
          billId.trim();

        if (
          !normalizedBillId
        ) {
          return;
        }

        const deletedBill =
          billsRef.current.find(
            (
              bill,
            ) =>
              bill.id ===
              normalizedBillId,
          ) ??
          null;

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

        void (
          async () => {
            try {
              await deleteBillViaApi(
                normalizedBillId,
              );
            } catch (
              error
            ) {
              if (
                deletedBill
              ) {
                updateBillsState(
                  (
                    currentBills,
                  ) => {
                    if (
                      currentBills.some(
                        (
                          currentBill,
                        ) =>
                          currentBill.id ===
                          deletedBill.id,
                      )
                    ) {
                      return currentBills;
                    }

                    return [
                      deletedBill,
                      ...currentBills,
                    ];
                  },
                );
              } else {
                await reloadBillsFromServer();
              }

              logBillsProviderError({
                operation:
                  "deleteBill",

                error,
              });
            }
          }
        )();
      },
      [
        reloadBillsFromServer,
        updateBillsState,
      ],
    );

  const markBillPaid =
    useCallback(
      (
        bill: BillData,
        paidDate: string,
      ) => {
        const timestamp =
          new Date().toISOString();

        const paidBill: BillData = {
          ...bill,

          status:
            "paid",

          paidDate,

          updatedAt:
            timestamp,
        };

        const generatedNextBill =
          generateNextBill(
            paidBill,
          );

        const currentBillsSnapshot =
          billsRef.current;

        const matchingNextBillExists =
          generatedNextBill
            ? currentBillsSnapshot.some(
                (
                  currentBill,
                ) =>
                  currentBill.id !==
                    paidBill.id &&
                  currentBill.name ===
                    generatedNextBill.name &&
                  currentBill.dueDate ===
                    generatedNextBill.dueDate &&
                  currentBill.status !==
                    "paid",
              )
            : false;

        const optimisticNextBill =
          generatedNextBill &&
          !matchingNextBillExists
            ? {
                ...generatedNextBill,

                id:
                  createUniqueBillId(
                    generatedNextBill.id,
                    currentBillsSnapshot,
                  ),
              }
            : null;

        const previousBill =
          currentBillsSnapshot.find(
            (
              currentBill,
            ) =>
              currentBill.id ===
              paidBill.id,
          ) ??
          null;

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
                  paidBill.id
                    ? paidBill
                    : currentBill,
              );

            if (
              !optimisticNextBill
            ) {
              return updatedBills;
            }

            return [
              ...updatedBills,
              optimisticNextBill,
            ];
          },
        );

        void (
          async () => {
            try {
              const savedPaidBill =
                await updateBillViaApi(
                  paidBill,
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
                      paidBill.id
                        ? savedPaidBill
                        : currentBill,
                  ),
              );

              if (
                !optimisticNextBill
              ) {
                return;
              }

              try {
                const savedNextBill =
                  await createBillViaApi(
                    optimisticNextBill,
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
                        optimisticNextBill.id
                          ? savedNextBill
                          : currentBill,
                    ),
                );
              } catch (
                error
              ) {
                updateBillsState(
                  (
                    currentBills,
                  ) =>
                    currentBills.filter(
                      (
                        currentBill,
                      ) =>
                        currentBill.id !==
                        optimisticNextBill.id,
                    ),
                );

                logBillsProviderError({
                  operation:
                    "markBillPaid.createNextBill",

                  error,
                });
              }
            } catch (
              error
            ) {
              updateBillsState(
                (
                  currentBills,
                ) => {
                  const withoutOptimisticNext =
                    optimisticNextBill
                      ? currentBills.filter(
                          (
                            currentBill,
                          ) =>
                            currentBill.id !==
                            optimisticNextBill.id,
                        )
                      : currentBills;

                  if (
                    !previousBill
                  ) {
                    return withoutOptimisticNext;
                  }

                  return withoutOptimisticNext.map(
                    (
                      currentBill,
                    ) =>
                      currentBill.id ===
                      paidBill.id
                        ? previousBill
                        : currentBill,
                  );
                },
              );

              logBillsProviderError({
                operation:
                  "markBillPaid.updatePaidBill",

                error,
              });
            }
          }
        )();
      },
      [
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

  const syncBudgetItemUpdate =
    useCallback(
      (
        previousBudgetItem:
          BudgetCategoryData,
        updatedBudgetItem:
          BudgetCategoryData,
      ): BudgetItemSyncResult => {
        const linkedBills =
          bills.filter(
            (
              bill,
            ) =>
              isBillLinkedToBudgetItem(
                bill,
                previousBudgetItem,
              ),
          );

        if (
          linkedBills.length ===
          0
        ) {
          return {
            status:
              "unlinked",

            affectedBillIds:
              [],
          };
        }

        const enabledBills =
          linkedBills.filter(
            (
              bill,
            ) =>
              bill.budgetSync
                ?.enabled,
          );

        if (
          enabledBills.length ===
          0
        ) {
          return {
            status:
              "disabled",

            affectedBillIds:
              linkedBills.map(
                (
                  bill,
                ) =>
                  bill.id,
              ),
          };
        }

        const automaticBills =
          enabledBills.filter(
            (
              bill,
            ) =>
              bill.budgetSync
                ?.mode ===
              "automatic",
          );

        const suggestedBills =
          enabledBills.filter(
            (
              bill,
            ) =>
              bill.budgetSync
                ?.mode ===
              "suggest",
          );

        const manualBills =
          enabledBills.filter(
            (
              bill,
            ) =>
              bill.budgetSync
                ?.mode ===
              "manual",
          );

        if (
          automaticBills.length >
          0
        ) {
          const timestamp =
            new Date().toISOString();

          const updatedAutomaticBills =
            automaticBills.map(
              (
                bill,
              ): BillData => {
                const updatedBudgetReference =
                  bill.budgetItem
                    ? {
                        ...bill.budgetItem,

                        id:
                          updatedBudgetItem.id,

                        name:
                          updatedBudgetItem.name,
                      }
                    : undefined;

                return {
                  ...bill,

                  name:
                    updatedBudgetItem.name,

                  budgetItem:
                    updatedBudgetReference,

                  updatedAt:
                    timestamp,
                };
              },
            );

          const updatedBillById =
            new Map(
              updatedAutomaticBills.map(
                (
                  bill,
                ) => [
                  bill.id,
                  bill,
                ],
              ),
            );

          updateBillsState(
            (
              currentBills,
            ) =>
              currentBills.map(
                (
                  bill,
                ) =>
                  updatedBillById.get(
                    bill.id,
                  ) ??
                  bill,
              ),
          );

          void (
            async () => {
              const results =
                await Promise.allSettled(
                  updatedAutomaticBills.map(
                    (
                      bill,
                    ) =>
                      updateBillViaApi(
                        bill,
                      ),
                  ),
                );

              const hasFailure =
                results.some(
                  (
                    result,
                  ) =>
                    result.status ===
                    "rejected",
                );

              if (
                hasFailure
              ) {
                logBillsProviderError({
                  operation:
                    "syncBudgetItemUpdate",

                  error:
                    new Error(
                      "One or more automatic bill synchronization updates could not be persisted.",
                    ),
                });

                await reloadBillsFromServer();

                return;
              }

              const savedBills =
                results
                  .filter(
                    (
                      result,
                    ): result is PromiseFulfilledResult<BillData> =>
                      result.status ===
                      "fulfilled",
                  )
                  .map(
                    (
                      result,
                    ) =>
                      result.value,
                  );

              const savedBillById =
                new Map(
                  savedBills.map(
                    (
                      bill,
                    ) => [
                      bill.id,
                      bill,
                    ],
                  ),
                );

              updateBillsState(
                (
                  currentBills,
                ) =>
                  currentBills.map(
                    (
                      bill,
                    ) =>
                      savedBillById.get(
                        bill.id,
                      ) ??
                      bill,
                  ),
              );
            }
          )();

          return {
            status:
              "updated",

            updatedBillIds:
              updatedAutomaticBills.map(
                (
                  bill,
                ) =>
                  bill.id,
              ),
          };
        }

        if (
          suggestedBills.length >
          0
        ) {
          return {
            status:
              "suggested",

            suggestedBillIds:
              suggestedBills.map(
                (
                  bill,
                ) =>
                  bill.id,
              ),
          };
        }

        return {
          status:
            "manual",

          affectedBillIds:
            manualBills.map(
              (
                bill,
              ) =>
                bill.id,
            ),
        };
      },
      [
        bills,
        reloadBillsFromServer,
        updateBillsState,
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
        syncBudgetItemUpdate,
      }),
      [
        addBill,
        bills,
        deleteBill,
        getBillById,
        getLinkedBillForBudgetItem,
        getLinkedBillsForBudgetItem,
        markBillPaid,
        syncBudgetItemUpdate,
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

async function importBillsToApi(
  bills:
    BillData[],
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
              "import",

            bills,
          }),
      },
    );

  const result =
    await readBillsApiResponse<
      BillImportResponseData
    >(
      response,
    );

  return result.bills;
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

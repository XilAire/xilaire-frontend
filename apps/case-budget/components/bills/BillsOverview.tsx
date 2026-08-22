"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import AddBillModal from "@/components/bills/AddBillModal";
import BillDetailsDrawer from "@/components/bills/BillDetailsDrawer";
import BillFilters from "@/components/bills/BillFilters";
import BillList from "@/components/bills/BillList";
import BillPaymentHistory from "@/components/bills/BillPaymentHistory";
import BillSummaryCards from "@/components/bills/BillSummaryCards";
import BillsHeader from "@/components/bills/BillsHeader";
import EditBillModal from "@/components/bills/EditBillModal";
import EmptyBillsState from "@/components/bills/EmptyBillsState";
import MarkBillPaidModal from "@/components/bills/MarkBillPaidModal";
import PageContainer from "@/components/layout/PageContainer";
import {
  useBills,
} from "@/components/providers/BillsProvider";
import {
  useBudget,
} from "@/components/providers/BudgetProvider";
import Pagination from "@/components/ui/Pagination";

import usePagination from "@/hooks/usePagination";

import {
  calculateBillSummary,
} from "@/lib/bills/bill-utils";

import {
  isSpendingBill,
  type BillData,
  type BillFilters as BillFilterValues,
} from "@/types/bill";

const defaultFilters: BillFilterValues = {
  search: "",
  status: "all",
  frequency: "all",
  paymentMethod: "all",
  accountId: "all",
  budgetItemId: "all",
  dateFrom: undefined,
  dateTo: undefined,
};

const DEFAULT_BILL_PAGE_SIZE =
  10;

const BILL_PAGE_SIZE_OPTIONS = [
  10,
  25,
  50,
  100,
];

export default function BillsOverview() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPage =
    parsePositiveInteger(
      searchParams.get(
        "page",
      ),
      1,
    );

  const initialPageSize =
    normalizeBillPageSize(
      parsePositiveInteger(
        searchParams.get(
          "pageSize",
        ),
        DEFAULT_BILL_PAGE_SIZE,
      ),
    );

  const {
    bills,
    addBill,
    updateBill,
    deleteBill,
    markBillPaid,
    getBillById,
  } = useBills();

  const {
    getBudgetItemById,
  } = useBudget();

  const [
    filters,
    setFilters,
  ] = useState<BillFilterValues>(
    defaultFilters,
  );

  const [
    selectedBillId,
    setSelectedBillId,
  ] = useState<string | null>(
    null,
  );

  const [
    addBillOpen,
    setAddBillOpen,
  ] = useState(false);

  const [
    detailsDrawerOpen,
    setDetailsDrawerOpen,
  ] = useState(false);

  const [
    editBillOpen,
    setEditBillOpen,
  ] = useState(false);

  const [
    markPaidOpen,
    setMarkPaidOpen,
  ] = useState(false);

  const filteredBills =
    useMemo(() => {
      const normalizedSearch =
        filters.search
          .trim()
          .toLowerCase();

      return bills.filter(
        (
          bill,
        ) => {
          const searchableText = [
            bill.name,
            bill.payee ?? "",
            bill.account?.name ?? "",
            bill.budgetItem?.name ??
              "",
            bill.budgetItem
              ?.categoryName ?? "",
            bill.note ?? "",
          ]
            .join(" ")
            .toLowerCase();

          if (
            normalizedSearch !==
              "" &&
            !searchableText.includes(
              normalizedSearch,
            )
          ) {
            return false;
          }

          if (
            filters.status !==
              "all" &&
            bill.status !==
              filters.status
          ) {
            return false;
          }

          if (
            filters.frequency !==
              "all" &&
            bill.frequency !==
              filters.frequency
          ) {
            return false;
          }

          if (
            filters.paymentMethod !==
              "all" &&
            bill.paymentMethod !==
              filters.paymentMethod
          ) {
            return false;
          }

          if (
            filters.accountId !==
              "all" &&
            bill.account?.id !==
              filters.accountId
          ) {
            return false;
          }

          if (
            filters.budgetItemId !==
              "all" &&
            bill.budgetItem?.id !==
              filters.budgetItemId
          ) {
            return false;
          }

          if (
            filters.dateFrom &&
            bill.dueDate <
              filters.dateFrom
          ) {
            return false;
          }

          if (
            filters.dateTo &&
            bill.dueDate >
              filters.dateTo
          ) {
            return false;
          }

          return true;
        },
      );
    }, [
      bills,
      filters,
    ]);

  const orderedFilteredBills =
    useMemo(
      () =>
        [
          ...filteredBills,
        ].sort(
          compareBillsForDisplay,
        ),
      [
        filteredBills,
      ],
    );

  const {
    currentPage,
    pageSize,
    totalItems,
    paginatedItems:
      paginatedBills,
    setCurrentPage,
    setPageSize,
  } = usePagination({
    items:
      orderedFilteredBills,
    initialPage,
    initialPageSize,
    resetDependencies: [
      filters.search,
      filters.status,
      filters.frequency,
      filters.paymentMethod,
      filters.accountId,
      filters.budgetItemId,
      filters.dateFrom,
      filters.dateTo,
    ],
    onPageChange: (
      page,
    ) => {
      updatePaginationSearchParams({
        router,
        searchParams,
        page,
      });
    },
    onPageSizeChange: (
      nextPageSize,
    ) => {
      updatePaginationSearchParams({
        router,
        searchParams,
        page:
          1,
        pageSize:
          nextPageSize,
      });
    },
  });

  const spendingBills =
    useMemo(
      () =>
        paginatedBills.filter(
          (
            bill,
          ) =>
            isSpendingBill(
              bill,
            ),
        ),
      [
        paginatedBills,
      ],
    );

  const scheduledBills =
    useMemo(
      () =>
        paginatedBills.filter(
          (
            bill,
          ) =>
            !isSpendingBill(
              bill,
            ) &&
            bill.status !==
              "paid",
        ),
      [
        paginatedBills,
      ],
    );

  const paidBills =
    useMemo(
      () =>
        paginatedBills.filter(
          (
            bill,
          ) =>
            bill.status ===
            "paid",
        ),
      [
        paginatedBills,
      ],
    );

  const summary =
    useMemo(
      () =>
        calculateBillSummary(
          filteredBills,
        ),
      [
        filteredBills,
      ],
    );

  const activeSelectedBill =
    useMemo(
      () => {
        if (!selectedBillId) {
          return null;
        }

        return getBillById(
          selectedBillId,
        );
      },
      [
        getBillById,
        selectedBillId,
      ],
    );

  const hasFilteredBills =
    filteredBills.length > 0;

  useEffect(() => {
    const billId =
      searchParams.get(
        "billId",
      );

    /*
     * The billId query parameter is only used to deep-link the details
     * drawer. While Edit or Mark Paid is open, never allow this effect to
     * reopen the details drawer behind that modal.
     */
    if (
      !billId ||
      editBillOpen ||
      markPaidOpen
    ) {
      return;
    }

    if (
      selectedBillId ===
        billId &&
      detailsDrawerOpen
    ) {
      return;
    }

    const bill =
      getBillById(
        billId,
      );

    if (!bill) {
      return;
    }

    setSelectedBillId(
      bill.id,
    );

    setDetailsDrawerOpen(
      true,
    );
  }, [
    detailsDrawerOpen,
    editBillOpen,
    getBillById,
    markPaidOpen,
    searchParams,
    selectedBillId,
  ]);

  function handleOpenBudgetItem(
    budgetItemId: string,
  ) {
    router.push(
      `/dashboard/budget?budgetItemId=${budgetItemId}`,
    );
  }

  function clearSelectedBill() {
    setSelectedBillId(
      null,
    );
  }

  function clearBillIdFromUrl() {
    const params =
      new URLSearchParams(
        searchParams.toString(),
      );

    if (
      !params.has(
        "billId",
      )
    ) {
      return;
    }

    params.delete(
      "billId",
    );

    const queryString =
      params.toString();

    router.replace(
      queryString
        ? `/dashboard/bills?${queryString}`
        : "/dashboard/bills",
      {
        scroll:
          false,
      },
    );
  }

  function closeAllBillOverlays() {
    /*
     * Clear the deep-link before changing overlay state. Otherwise the billId
     * effect can observe the stale query parameter during the same render
     * cycle and immediately reopen the drawer.
     */
    clearBillIdFromUrl();

    setDetailsDrawerOpen(
      false,
    );

    setEditBillOpen(
      false,
    );

    setMarkPaidOpen(
      false,
    );

    clearSelectedBill();
  }

  function handleAddBill(
    bill: BillData,
  ) {
    addBill(
      bill,
    );

    setAddBillOpen(
      false,
    );
  }

  async function handleUpdateBill(
    updatedBill: BillData,
  ) {
    await updateBill(
      updatedBill,
    );

    closeAllBillOverlays();
  }

  async function handleDeleteBill(
    billId: string,
  ) {
    await deleteBill(
      billId,
    );

    closeAllBillOverlays();
  }

  async function handleMarkBillPaid(
    bill: BillData,
    paidDate: string,
    paidAmount: number,
  ) {
    /*
     * Spending entries are monthly spending envelopes. They accumulate
     * transactions and must never enter the single-payment workflow.
     */
    if (
      isSpendingBill(
        bill,
      )
    ) {
      closeAllBillOverlays();
      return;
    }

    /*
     * Wait for the provider/API mutation to finish before clearing selection
     * and closing overlays. Closing early races the provider state update and
     * can leave a stale backdrop/drawer mounted.
     */
    await markBillPaid(
      bill,
      paidDate,
      paidAmount,
    );

    closeAllBillOverlays();
  }

  function handleOpenBillDetails(
    bill: BillData,
  ) {
    const params =
      new URLSearchParams(
        searchParams.toString(),
      );

    params.set(
      "billId",
      bill.id,
    );

    router.replace(
      `/dashboard/bills?${params.toString()}`,
    );

    setSelectedBillId(
      bill.id,
    );

    setEditBillOpen(
      false,
    );

    setMarkPaidOpen(
      false,
    );

    setDetailsDrawerOpen(
      true,
    );
  }

  function handleCloseBillDetails() {
    clearBillIdFromUrl();

    setDetailsDrawerOpen(
      false,
    );

    clearSelectedBill();
  }

  function handleOpenEditBill(
    bill: BillData,
  ) {
    /*
     * billId represents the details drawer only. Remove it before switching
     * overlays so the URL effect cannot reopen the drawer behind Edit.
     */
    clearBillIdFromUrl();

    setSelectedBillId(
      bill.id,
    );

    setDetailsDrawerOpen(
      false,
    );

    setMarkPaidOpen(
      false,
    );

    setEditBillOpen(
      true,
    );
  }

  function handleCloseEditBill() {
    clearBillIdFromUrl();

    setEditBillOpen(
      false,
    );

    clearSelectedBill();
  }

  function handleOpenMarkPaid(
    bill: BillData,
  ) {
    if (
      bill.status ===
        "paid" ||
      isSpendingBill(
        bill,
      )
    ) {
      return;
    }

    /*
     * Remove the details deep-link before opening Mark Paid. This is the key
     * guard against the drawer reopening while the payment mutation is
     * completing.
     */
    clearBillIdFromUrl();

    setSelectedBillId(
      bill.id,
    );

    setDetailsDrawerOpen(
      false,
    );

    setEditBillOpen(
      false,
    );

    setMarkPaidOpen(
      true,
    );
  }

  function handleCloseMarkPaid() {
    clearBillIdFromUrl();

    setMarkPaidOpen(
      false,
    );

    clearSelectedBill();
  }

  function handleOpenAddBill() {
    setAddBillOpen(
      true,
    );
  }

  function handleCloseAddBill() {
    setAddBillOpen(
      false,
    );
  }

  return (
    <>
      <PageContainer>
        <div className="space-y-8 py-6 sm:py-8">
          <BillsHeader
            onAddBill={
              handleOpenAddBill
            }
          />

          <BillSummaryCards
            summary={
              summary
            }
          />

          <BillFilters
            filters={
              filters
            }
            onChange={
              setFilters
            }
          />

          {!hasFilteredBills ? (
            <EmptyBillsState
              onAddBill={
                handleOpenAddBill
              }
            />
          ) : (
            <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm">
              <div className="space-y-8 p-4 sm:p-5">
                {spendingBills.length >
                0 ? (
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                        Monthly Spending
                      </h2>

                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        These items accumulate transactions throughout the month and are not marked paid as a single bill.
                      </p>
                    </div>

                    <BillList
                      bills={
                        spendingBills
                      }
                      onViewDetails={
                        handleOpenBillDetails
                      }
                      onEdit={
                        handleOpenEditBill
                      }
                      getSpendingAmount={(
                        bill,
                      ) => {
                        const budgetItemId =
                          bill.budgetItem
                            ?.id;

                        if (
                          !budgetItemId
                        ) {
                          return 0;
                        }

                        const location =
                          getBudgetItemById(
                            budgetItemId,
                          );

                        return (
                          location?.item
                            .spentAmount ??
                          0
                        );
                      }}
                    />
                  </div>
                ) : null}

                {scheduledBills.length >
                0 ? (
                  <BillList
                    bills={
                      scheduledBills
                    }
                    onViewDetails={
                      handleOpenBillDetails
                    }
                    onEdit={
                      handleOpenEditBill
                    }
                    onMarkPaid={
                      handleOpenMarkPaid
                    }
                  />
                ) : null}

                {paidBills.length >
                0 ? (
                  <BillPaymentHistory
                    bills={
                      paidBills
                    }
                    onViewDetails={
                      handleOpenBillDetails
                    }
                    onEdit={
                      handleOpenEditBill
                    }
                  />
                ) : null}
              </div>

              <Pagination
                currentPage={
                  currentPage
                }
                totalItems={
                  totalItems
                }
                pageSize={
                  pageSize
                }
                itemLabel="bills"
                showFirstLast
                showPageSizeSelector
                pageSizeOptions={
                  BILL_PAGE_SIZE_OPTIONS
                }
                onPageChange={
                  setCurrentPage
                }
                onPageSizeChange={
                  setPageSize
                }
              />
            </section>
          )}
        </div>
      </PageContainer>

      <AddBillModal
        isOpen={
          addBillOpen
        }
        onClose={
          handleCloseAddBill
        }
        onAddBill={
          handleAddBill
        }
      />

      <BillDetailsDrawer
        isOpen={
          detailsDrawerOpen
        }
        bill={
          activeSelectedBill
        }
        onClose={
          handleCloseBillDetails
        }
        onEdit={
          handleOpenEditBill
        }
        onMarkPaid={
          handleOpenMarkPaid
        }
        onOpenBudgetItem={
          handleOpenBudgetItem
        }
      />

      <EditBillModal
        isOpen={
          editBillOpen
        }
        bill={
          activeSelectedBill
        }
        onClose={
          handleCloseEditBill
        }
        onUpdateBill={
          handleUpdateBill
        }
        onDeleteBill={
          handleDeleteBill
        }
      />

      <MarkBillPaidModal
        isOpen={
          markPaidOpen
        }
        bill={
          activeSelectedBill
        }
        onClose={
          handleCloseMarkPaid
        }
        onConfirm={
          handleMarkBillPaid
        }
      />
    </>
  );
}

function compareBillsForDisplay(
  firstBill:
    BillData,
  secondBill:
    BillData,
) {
  const firstIsPaid =
    firstBill.status ===
    "paid";

  const secondIsPaid =
    secondBill.status ===
    "paid";

  if (
    firstIsPaid !==
    secondIsPaid
  ) {
    return firstIsPaid
      ? 1
      : -1;
  }

  const dateComparison =
    firstBill.dueDate.localeCompare(
      secondBill.dueDate,
    );

  if (
    dateComparison !==
    0
  ) {
    return firstIsPaid
      ? -dateComparison
      : dateComparison;
  }

  return firstBill.name.localeCompare(
    secondBill.name,
  );
}

function parsePositiveInteger(
  value:
    string | null,
  fallback:
    number,
) {
  if (
    !value
  ) {
    return fallback;
  }

  const parsedValue =
    Number(
      value,
    );

  if (
    !Number.isInteger(
      parsedValue,
    ) ||
    parsedValue <
      1
  ) {
    return fallback;
  }

  return parsedValue;
}

function normalizeBillPageSize(
  value:
    number,
) {
  return BILL_PAGE_SIZE_OPTIONS.includes(
    value,
  )
    ? value
    : DEFAULT_BILL_PAGE_SIZE;
}

function updatePaginationSearchParams({
  router,
  searchParams,
  page,
  pageSize,
}: {
  router:
    ReturnType<
      typeof useRouter
    >;

  searchParams:
    ReturnType<
      typeof useSearchParams
    >;

  page:
    number;

  pageSize?:
    number;
}) {
  const params =
    new URLSearchParams(
      searchParams.toString(),
    );

  if (
    page <=
    1
  ) {
    params.delete(
      "page",
    );
  } else {
    params.set(
      "page",
      String(
        page,
      ),
    );
  }

  if (
    pageSize !==
    undefined
  ) {
    if (
      pageSize ===
      DEFAULT_BILL_PAGE_SIZE
    ) {
      params.delete(
        "pageSize",
      );
    } else {
      params.set(
        "pageSize",
        String(
          pageSize,
        ),
      );
    }
  }

  const queryString =
    params.toString();

  router.replace(
    queryString
      ? `/dashboard/bills?${queryString}`
      : "/dashboard/bills",
    {
      scroll:
        false,
    },
  );
}


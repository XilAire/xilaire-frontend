"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import AddBudgetCategoryModal from "@/components/budget/AddBudgetCategoryModal";
import AddBudgetItemModal, {
  type AddBudgetItemFormData,
} from "@/components/budget/AddBudgetItemModal";
import AddIncomeModal, {
  type AddIncomeFormData,
} from "@/components/budget/AddIncomeModal";
import BudgetCategoryGroup from "@/components/budget/BudgetCategoryGroup";
import BudgetHeader from "@/components/budget/BudgetHeader";
import BudgetIncomeCard from "@/components/budget/BudgetIncomeCard";
import BudgetMonthPickerModal from "@/components/budget/BudgetMonthPickerModal";
import BudgetSummaryCards from "@/components/budget/BudgetSummaryCards";
import EditBudgetCategoryModal from "@/components/budget/EditBudgetCategoryModal";
import EditBudgetItemModal from "@/components/budget/EditBudgetItemModal";
import EditIncomeModal, {
  type EditIncomeFormData,
} from "@/components/budget/EditIncomeModal";
import EmptyBudgetMonthCard from "@/components/budget/EmptyBudgetMonthCard";
import RemainingBudgetCard from "@/components/budget/RemainingBudgetCard";
import PageContainer from "@/components/layout/PageContainer";
import {
  useBills,
} from "@/components/providers/BillsProvider";
import {
  useBudget,
} from "@/components/providers/BudgetProvider";
import type {
  BillData,
} from "@/types/bill";
import type {
  BudgetCategoryData,
  BudgetCategoryGroupData,
  BudgetIncomeSource,
} from "@/types/budget";

function joinClassNames(
  ...classNames: Array<
    string | false | null | undefined
  >
) {
  return classNames
    .filter(Boolean)
    .join(" ");
}

export default function BudgetOverview() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    getLinkedBillsForBudgetItem,
  } = useBills();

  const {
    selectedMonth,
    selectedBudgetMonth,
    hasSelectedBudget,
    incomeSources,
    budgetGroups,
    previousMonth,
    canCopyPreviousMonth,
    returnBudgetMonthKey,
    monthNavigation,
    totals,
    isLoading,
    isMutating,
    error,
    pendingApproval,
    clearError,
    clearPendingApproval,
    navigateToMonth,
    goToPreviousMonth,
    goToNextMonth,
    createBlankBudget,
    copyPreviousMonth,
    returnToExistingBudget,
    addIncome,
    updateIncome,
    deleteIncome,
    addBudgetGroup,
    updateBudgetGroup,
    deleteBudgetGroup,
    addBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,
  } = useBudget();

  const [
    selectedIncomeSource,
    setSelectedIncomeSource,
  ] = useState<
    BudgetIncomeSource | null
  >(null);

  const [
    selectedGroup,
    setSelectedGroup,
  ] = useState<
    BudgetCategoryGroupData | null
  >(null);

  const [
    selectedBudgetCategory,
    setSelectedBudgetCategory,
  ] = useState<
    BudgetCategoryGroupData | null
  >(null);

  const [
    selectedItem,
    setSelectedItem,
  ] = useState<
    BudgetCategoryData | null
  >(null);

  const [
    selectedItemGroup,
    setSelectedItemGroup,
  ] = useState<
    BudgetCategoryGroupData | null
  >(null);

  const [
    isMonthPickerOpen,
    setIsMonthPickerOpen,
  ] = useState(false);

  const [
    isAddIncomeModalOpen,
    setIsAddIncomeModalOpen,
  ] = useState(false);

  const [
    isEditIncomeModalOpen,
    setIsEditIncomeModalOpen,
  ] = useState(false);

  const [
    isAddBudgetCategoryModalOpen,
    setIsAddBudgetCategoryModalOpen,
  ] = useState(false);

  const [
    isEditBudgetCategoryModalOpen,
    setIsEditBudgetCategoryModalOpen,
  ] = useState(false);

  const [
    isAddItemModalOpen,
    setIsAddItemModalOpen,
  ] = useState(false);

  const [
    isEditItemModalOpen,
    setIsEditItemModalOpen,
  ] = useState(false);

  function closeBudgetEditorModals() {
    setIsAddIncomeModalOpen(
      false,
    );

    setIsEditIncomeModalOpen(
      false,
    );

    setIsAddBudgetCategoryModalOpen(
      false,
    );

    setIsEditBudgetCategoryModalOpen(
      false,
    );

    setIsAddItemModalOpen(
      false,
    );

    setIsEditItemModalOpen(
      false,
    );

    setSelectedIncomeSource(
      null,
    );

    setSelectedGroup(
      null,
    );

    setSelectedBudgetCategory(
      null,
    );

    setSelectedItem(
      null,
    );

    setSelectedItemGroup(
      null,
    );
  }

  function handleNavigateToMonth(
    month: Date,
  ) {
    closeBudgetEditorModals();
    navigateToMonth(month);
  }

  function handlePreviousMonth() {
    closeBudgetEditorModals();
    goToPreviousMonth();
  }

  function handleNextMonth() {
    closeBudgetEditorModals();
    goToNextMonth();
  }

  function handleMonthClick() {
    setIsMonthPickerOpen(
      true,
    );
  }

  function handleCloseMonthPicker() {
    setIsMonthPickerOpen(
      false,
    );
  }

  function handleSelectMonth(
    month: Date,
  ) {
    handleNavigateToMonth(
      month,
    );

    handleCloseMonthPicker();
  }

  async function handleCreateBlankBudget() {
    if (
      isMutating
    ) {
      return;
    }

    await createBlankBudget();
  }

  async function handleCopyPreviousMonth() {
    if (
      isMutating
    ) {
      return;
    }

    await copyPreviousMonth();
  }

  function handleReturnToExistingBudget() {
    closeBudgetEditorModals();
    returnToExistingBudget();
  }

  function handleOpenAddIncome() {
    if (
      !hasSelectedBudget ||
      isMutating
    ) {
      return;
    }

    setIsAddIncomeModalOpen(
      true,
    );
  }

  function handleCloseAddIncome() {
    setIsAddIncomeModalOpen(
      false,
    );
  }

  async function handleCreateIncome(
    income: AddIncomeFormData,
  ) {
    if (
      !hasSelectedBudget ||
      isMutating
    ) {
      return;
    }

    const result =
      await addIncome(
        income,
      );

    if (
      result.success &&
      !result.approvalRequired
    ) {
      handleCloseAddIncome();
    }
  }

  function handleOpenEditIncome(
    incomeSource: BudgetIncomeSource,
  ) {
    if (
      !hasSelectedBudget ||
      isMutating
    ) {
      return;
    }

    setSelectedIncomeSource(
      incomeSource,
    );

    setIsEditIncomeModalOpen(
      true,
    );
  }

  function handleCloseEditIncome() {
    setIsEditIncomeModalOpen(
      false,
    );

    setSelectedIncomeSource(
      null,
    );
  }

  async function handleUpdateIncome(
    updatedIncomeSource: EditIncomeFormData,
  ) {
    if (
      !hasSelectedBudget ||
      isMutating
    ) {
      return;
    }

    const result =
      await updateIncome(
        updatedIncomeSource,
      );

    if (
      result.success &&
      !result.approvalRequired
    ) {
      handleCloseEditIncome();
    }
  }

  async function handleDeleteIncome(
    incomeSourceId: string,
  ) {
    if (
      !hasSelectedBudget ||
      isMutating
    ) {
      return;
    }

    const result =
      await deleteIncome(
        incomeSourceId,
      );

    if (
      result.success &&
      !result.approvalRequired
    ) {
      handleCloseEditIncome();
    }
  }

  function handleOpenAddBudgetCategory() {
    if (
      !hasSelectedBudget ||
      isMutating
    ) {
      return;
    }

    setIsAddBudgetCategoryModalOpen(
      true,
    );
  }

  function handleCloseAddBudgetCategory() {
    setIsAddBudgetCategoryModalOpen(
      false,
    );
  }

  async function handleCreateBudgetCategory(
    category: Parameters<
      typeof addBudgetGroup
    >[0],
  ) {
    if (
      !hasSelectedBudget ||
      isMutating
    ) {
      return;
    }

    const result =
      await addBudgetGroup(
        category,
      );

    if (
      result.success &&
      !result.approvalRequired
    ) {
      handleCloseAddBudgetCategory();
    }
  }

  function handleOpenEditBudgetCategory(
    group: BudgetCategoryGroupData,
  ) {
    if (
      !hasSelectedBudget ||
      isMutating
    ) {
      return;
    }

    setSelectedBudgetCategory(
      group,
    );

    setIsEditBudgetCategoryModalOpen(
      true,
    );
  }

  function handleCloseEditBudgetCategory() {
    setIsEditBudgetCategoryModalOpen(
      false,
    );

    setSelectedBudgetCategory(
      null,
    );
  }

  async function handleUpdateBudgetCategory(
    updatedCategory: BudgetCategoryGroupData,
  ) {
    if (
      !hasSelectedBudget ||
      isMutating
    ) {
      return;
    }

    const result =
      await updateBudgetGroup(
        updatedCategory,
      );

    if (
      result.success &&
      !result.approvalRequired
    ) {
      handleCloseEditBudgetCategory();
    }
  }

  async function handleDeleteBudgetCategory(
    category: BudgetCategoryGroupData,
  ) {
    if (
      !hasSelectedBudget ||
      isMutating
    ) {
      return;
    }

    const result =
      await deleteBudgetGroup(
        category.id,
      );

    if (
      !result.success ||
      result.approvalRequired
    ) {
      return;
    }

    if (
      selectedGroup?.id ===
      category.id
    ) {
      setSelectedGroup(
        null,
      );

      setIsAddItemModalOpen(
        false,
      );
    }

    if (
      selectedItemGroup?.id ===
      category.id
    ) {
      setSelectedItem(
        null,
      );

      setSelectedItemGroup(
        null,
      );

      setIsEditItemModalOpen(
        false,
      );
    }

    handleCloseEditBudgetCategory();
  }

  function handleOpenAddItem(
    group: BudgetCategoryGroupData,
  ) {
    if (
      !hasSelectedBudget ||
      isMutating
    ) {
      return;
    }

    setSelectedGroup(
      group,
    );

    setIsAddItemModalOpen(
      true,
    );
  }

  function handleCloseAddItem() {
    setIsAddItemModalOpen(
      false,
    );

    setSelectedGroup(
      null,
    );
  }

  async function handleAddItem(
    item: AddBudgetItemFormData,
  ) {
    if (
      !hasSelectedBudget ||
      !selectedGroup ||
      isMutating
    ) {
      return;
    }

    const result =
      await addBudgetItem(
        selectedGroup.id,
        item,
      );

    if (
      result.success &&
      !result.approvalRequired
    ) {
      handleCloseAddItem();
    }
  }

  function handleOpenEditItem(
    item: BudgetCategoryData,
    group: BudgetCategoryGroupData,
  ) {
    if (
      !hasSelectedBudget ||
      isMutating
    ) {
      return;
    }

    setSelectedItem(
      item,
    );

    setSelectedItemGroup(
      group,
    );

    setIsEditItemModalOpen(
      true,
    );
  }

  function handleCloseEditItem() {
    setIsEditItemModalOpen(
      false,
    );

    setSelectedItem(
      null,
    );

    setSelectedItemGroup(
      null,
    );
  }

  async function handleUpdateItem(
    updatedItem: BudgetCategoryData,
  ) {
    if (
      !hasSelectedBudget ||
      !selectedItemGroup ||
      !selectedItem ||
      isMutating
    ) {
      return;
    }

    const result =
      await updateBudgetItem(
        selectedItemGroup.id,
        updatedItem,
      );

    if (
      result.success &&
      !result.approvalRequired
    ) {
      handleCloseEditItem();
    }
  }

  useEffect(() => {
    const budgetItemId =
      searchParams.get(
        "budgetItemId",
      );

    if (
      !budgetItemId ||
      !selectedBudgetMonth
    ) {
      return;
    }

    if (
      selectedItem?.id ===
        budgetItemId &&
      isEditItemModalOpen
    ) {
      return;
    }

    for (const group of selectedBudgetMonth.budgetGroups) {
      const item =
        group.categories.find(
          (
            currentItem,
          ) =>
            currentItem.id ===
            budgetItemId,
        );

      if (!item) {
        continue;
      }

      setSelectedItem(
        item,
      );

      setSelectedItemGroup(
        group,
      );

      setIsEditItemModalOpen(
        true,
      );

      return;
    }
  }, [
    isEditItemModalOpen,
    searchParams,
    selectedBudgetMonth,
    selectedItem,
  ]);

  function handleViewBill(
    bill: BillData,
  ) {
    router.push(`/dashboard/bills?billId=${bill.id}`);
  }

  async function handleDeleteItem(
    itemId: string,
  ) {
    if (
      !hasSelectedBudget ||
      !selectedItemGroup ||
      isMutating
    ) {
      return;
    }

    const result =
      await deleteBudgetItem(
        selectedItemGroup.id,
        itemId,
      );

    if (
      result.success &&
      !result.approvalRequired
    ) {
      handleCloseEditItem();
    }
  }

  return (
    <>
      <PageContainer>
        <div className="space-y-6 py-6 sm:space-y-8 sm:py-8">
          {error ? (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                {error}
              </p>

              <button
                type="button"
                onClick={
                  clearError
                }
                className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-red-500/30 px-3 text-xs font-bold text-red-700 transition-colors hover:bg-red-500/10 dark:text-red-300"
              >
                Dismiss
              </button>
            </div>
          ) : null}

          {pendingApproval ? (
            <div
              role="status"
              className="flex flex-col gap-3 rounded-2xl border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  Household approval required
                </p>

                <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                  Your requested budget change was submitted for approval. No budget data was changed yet.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  clearPendingApproval
                }
                className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-default)] px-3 text-xs font-bold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-muted)]"
              >
                Dismiss
              </button>
            </div>
          ) : null}

          {isLoading ? (
            <div
              role="status"
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 py-3 text-sm font-semibold text-[var(--text-muted)]"
            >
              Loading budget from Supabase...
            </div>
          ) : null}

          <BudgetHeader
            title="Monthly Budget"
            description="Plan every dollar, track your spending, and stay in control of your financial goals."
            monthLabel={
              monthNavigation.monthLabel
            }
            previousMonthLabel={
              monthNavigation.previousMonthLabel
            }
            nextMonthLabel={
              monthNavigation.nextMonthLabel
            }
            onPreviousMonth={
              handlePreviousMonth
            }
            onNextMonth={
              handleNextMonth
            }
            onMonthClick={
              handleMonthClick
            }
          />

          {!isLoading &&
          hasSelectedBudget ? (
            <>
              <BudgetSummaryCards
                plannedIncome={
                  totals.plannedIncome
                }
                assignedAmount={
                  totals.assignedAmount
                }
                remainingAmount={
                  totals.remainingAmount
                }
                spentAmount={
                  totals.spentAmount
                }
                availableAmount={
                  totals.availableAmount
                }
                rolloverAmount={
                  totals.rolloverAmount
                }
              />

              <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
                <div className="min-w-0 space-y-8">
                  <BudgetIncomeCard
                    incomeSources={
                      incomeSources
                    }
                    plannedIncome={
                      totals.plannedIncome
                    }
                    receivedIncome={
                      totals.receivedIncome
                    }
                    onAddIncome={
                      handleOpenAddIncome
                    }
                    onEditIncome={
                      handleOpenEditIncome
                    }
                  />

                  <section
                    aria-labelledby="budget-categories-heading"
                    className="space-y-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
                          Spending Plan
                        </p>

                        <h2
                          id="budget-categories-heading"
                          className="mt-2 text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl"
                        >
                          Budget Categories
                        </h2>

                        <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                          Organize your
                          spending into
                          categories, then
                          add individual
                          budget items
                          inside each one.
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">
                        <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-default)] px-3 py-2 text-center text-xs font-semibold text-[var(--text-muted)]">
                          {
                            budgetGroups.length
                          }{" "}
                          categories
                        </div>

                        <button
                          type="button"
                          onClick={
                            handleOpenAddBudgetCategory
                          }
                          disabled={
                            isMutating
                          }
                          className={joinClassNames(
                            "inline-flex",
                            "min-h-11",
                            "shrink-0",
                            "items-center",
                            "justify-center",
                            "gap-2",
                            "whitespace-nowrap",
                            "rounded-xl",
                            "bg-[var(--primary)]",
                            "px-5",
                            "py-2.5",
                            "text-sm",
                            "font-bold",
                            "leading-none",
                            "text-white",
                            "outline-none",
                            "transition-[filter,box-shadow]",
                            "hover:brightness-95",
                            "focus-visible:ring-2",
                            "focus-visible:ring-[var(--primary)]",
                            "focus-visible:ring-offset-2",
                            "focus-visible:ring-offset-[var(--background)]",
                            "disabled:cursor-not-allowed",
                            "disabled:opacity-60",
                          )}
                        >
                          <PlusIcon />

                          Add Category
                        </button>
                      </div>
                    </div>

                    {budgetGroups.length >
                    0 ? (
                      <div className="space-y-4">
                        {budgetGroups.map(
                          (
                            group,
                          ) => (
                            <BudgetCategoryGroup
                              key={
                                group.id
                              }
                              group={
                                group
                              }
                              onAddItem={
                                handleOpenAddItem
                              }
                              onEditItem={
                                handleOpenEditItem
                              }
                              onEditCategory={
                                handleOpenEditBudgetCategory
                              }
                              getLinkedBillsForBudgetItem={
                                getLinkedBillsForBudgetItem
                              }
                              onViewBill={
                                handleViewBill
                              }
                            />
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-default)] px-5 py-10 text-center sm:px-6">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)]">
                          <FolderIcon />
                        </div>

                        <h3 className="mt-4 font-bold text-[var(--text-primary)]">
                          No budget
                          categories yet
                        </h3>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
                          Create your
                          first category,
                          then add budget
                          items and assign
                          money to them.
                        </p>

                        <button
                          type="button"
                          onClick={
                            handleOpenAddBudgetCategory
                          }
                          disabled={
                            isMutating
                          }
                          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-bold leading-none text-white outline-none transition-[filter,box-shadow] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <PlusIcon />

                          Add Category
                        </button>
                      </div>
                    )}
                  </section>
                </div>

                <aside className="min-w-0 2xl:sticky 2xl:top-6 2xl:self-start">
                  <RemainingBudgetCard
                    income={
                      totals.plannedIncome
                    }
                    assigned={
                      totals.assignedAmount
                    }
                    unassignedAmount={
                      totals.remainingAmount
                    }
                    availableAmount={
                      totals.availableAmount
                    }
                    rolloverAmount={
                      totals.rolloverAmount
                    }
                  />
                </aside>
              </div>
            </>
          ) : !isLoading ? (
            <EmptyBudgetMonthCard
              monthLabel={
                monthNavigation.monthLabel
              }
              previousMonthLabel={
                monthNavigation.previousMonthLabel
                  .replace("View ", "")
                  .replace(" budget", "")
              }
              canCopyPreviousMonth={
                canCopyPreviousMonth
              }
              onCreateBlankBudget={
                handleCreateBlankBudget
              }
              onCopyPreviousMonth={
                handleCopyPreviousMonth
              }
              onReturnToExistingBudget={
                returnBudgetMonthKey
                  ? handleReturnToExistingBudget
                  : undefined
              }
            />
          ) : null}
        </div>
      </PageContainer>

      <BudgetMonthPickerModal
        isOpen={
          isMonthPickerOpen
        }
        selectedMonth={
          selectedMonth
        }
        onClose={
          handleCloseMonthPicker
        }
        onSelectMonth={
          handleSelectMonth
        }
      />

      {!isLoading &&
      hasSelectedBudget ? (
        <>
          <AddIncomeModal
            isOpen={
              isAddIncomeModalOpen
            }
            onClose={
              handleCloseAddIncome
            }
            onSubmit={
              handleCreateIncome
            }
          />

          <EditIncomeModal
            isOpen={
              isEditIncomeModalOpen
            }
            incomeSource={
              selectedIncomeSource
            }
            onClose={
              handleCloseEditIncome
            }
            onSubmit={
              handleUpdateIncome
            }
            onDelete={
              handleDeleteIncome
            }
          />

          <AddBudgetCategoryModal
            isOpen={
              isAddBudgetCategoryModalOpen
            }
            onClose={
              handleCloseAddBudgetCategory
            }
            onSubmit={
              handleCreateBudgetCategory
            }
          />

          <EditBudgetCategoryModal
            isOpen={
              isEditBudgetCategoryModalOpen
            }
            category={
              selectedBudgetCategory
            }
            onClose={
              handleCloseEditBudgetCategory
            }
            onSubmit={
              handleUpdateBudgetCategory
            }
            onDelete={
              handleDeleteBudgetCategory
            }
          />

          <AddBudgetItemModal
            isOpen={
              isAddItemModalOpen
            }
            group={
              selectedGroup
            }
            onClose={
              handleCloseAddItem
            }
            onSubmit={
              handleAddItem
            }
          />

          <EditBudgetItemModal
            isOpen={
              isEditItemModalOpen
            }
            item={
              selectedItem
            }
            group={
              selectedItemGroup
            }
            onClose={() => {
              handleCloseEditItem();

              const params =
                new URLSearchParams(
                  searchParams.toString(),
                );

              params.delete(
                "budgetItemId",
              );

              const queryString =
                params.toString();

              router.replace(
                queryString
                  ? `/dashboard/budget?${queryString}`
                  : "/dashboard/budget",
              );
            }}
            onSubmit={
              handleUpdateItem
            }
            onDelete={
              handleDeleteItem
            }
          />
        </>
      ) : null}
    </>
  );
}

function PlusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" />
    </svg>
  );
}
"use client";

import {
  useEffect,
  useMemo,
} from "react";

import {
  useBudget,
} from "@/components/providers/BudgetProvider";

import {
  billBudgetSyncModeDefinitions,
  type BillBudgetSyncMode,
} from "@/types/bill";

export type BillBudgetLinkValue = {
  budgetItemId: string;
  budgetSyncEnabled: boolean;
  budgetSyncMode: BillBudgetSyncMode;
};

type BillBudgetLinkCardProps = {
  value: BillBudgetLinkValue;
  onChange: (
    value: BillBudgetLinkValue,
  ) => void;
  idPrefix?: string;
  disabled?: boolean;
};

export default function BillBudgetLinkCard({
  value,
  onChange,
  idPrefix = "bill-budget-link",
  disabled = false,
}: BillBudgetLinkCardProps) {
  const {
    budgetGroups,
  } = useBudget();

  const budgetItemReferences =
    useMemo(
      () =>
        budgetGroups.flatMap(
          (group) =>
            group.categories.map(
              (item) => ({
                id: item.id,
                name: item.name,
                categoryId:
                  group.id,
                categoryName:
                  group.name,
              }),
            ),
        ),
      [budgetGroups],
    );

  const selectedBudgetItem =
    useMemo(
      () =>
        budgetItemReferences.find(
          (item) =>
            item.id ===
            value.budgetItemId,
        ),
      [
        budgetItemReferences,
        value.budgetItemId,
      ],
    );

  const hasBudgetItems =
    budgetItemReferences.length > 0;

  const hasLinkedBudgetItem =
    Boolean(selectedBudgetItem);

  const canEnableBudgetLink =
    hasBudgetItems &&
    !disabled;

  const syncControlsEnabled =
    hasLinkedBudgetItem &&
    value.budgetSyncEnabled &&
    !disabled;

  useEffect(() => {
    if (
      value.budgetItemId === ""
    ) {
      if (
        value.budgetSyncEnabled
      ) {
        onChange({
          ...value,
          budgetSyncEnabled: false,
        });
      }

      return;
    }

    if (
      selectedBudgetItem
    ) {
      return;
    }

    const fallbackBudgetItem =
      budgetItemReferences[0];

    onChange({
      ...value,
      budgetItemId:
        fallbackBudgetItem?.id ?? "",
      budgetSyncEnabled:
        Boolean(fallbackBudgetItem) &&
        value.budgetSyncEnabled,
    });
  }, [
    budgetItemReferences,
    onChange,
    selectedBudgetItem,
    value,
  ]);

  function updateValue(
    updates: Partial<BillBudgetLinkValue>,
  ) {
    onChange({
      ...value,
      ...updates,
    });
  }

  function handleBudgetItemChange(
    budgetItemId: string,
  ) {
    if (
      disabled
    ) {
      return;
    }

    const selectedItemExists =
      budgetItemReferences.some(
        (item) =>
          item.id ===
          budgetItemId,
      );

    if (
      !selectedItemExists
    ) {
      updateValue({
        budgetItemId: "",
        budgetSyncEnabled: false,
      });

      return;
    }

    updateValue({
      budgetItemId,
      budgetSyncEnabled: true,
      budgetSyncMode:
        value.budgetSyncMode ||
        "suggest",
    });
  }

  function handleBudgetLinkToggle() {
    if (
      disabled
    ) {
      return;
    }

    if (
      hasLinkedBudgetItem
    ) {
      updateValue({
        budgetItemId: "",
        budgetSyncEnabled: false,
      });

      return;
    }

    const firstBudgetItem =
      budgetItemReferences[0];

    if (
      !firstBudgetItem
    ) {
      updateValue({
        budgetItemId: "",
        budgetSyncEnabled: false,
      });

      return;
    }

    updateValue({
      budgetItemId:
        firstBudgetItem.id,
      budgetSyncEnabled: true,
      budgetSyncMode:
        value.budgetSyncMode ||
        "suggest",
    });
  }

  function handleSyncToggle() {
    if (
      disabled ||
      !hasLinkedBudgetItem
    ) {
      return;
    }

    updateValue({
      budgetSyncEnabled:
        !value.budgetSyncEnabled,
    });
  }

  function handleSyncModeChange(
    mode: BillBudgetSyncMode,
  ) {
    if (!syncControlsEnabled) {
      return;
    }

    updateValue({
      budgetSyncMode: mode,
    });
  }

  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BudgetIcon />

            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Link to Budget
            </h3>
          </div>

          <p className="mt-1.5 text-sm leading-5 text-[var(--text-muted)]">
            Connect this bill to a
            budget item so CASE Budget
            can identify changes and
            help keep your monthly plan
            accurate.
          </p>
        </div>

        <SwitchButton
          id={`${idPrefix}-enabled`}
          checked={
            hasLinkedBudgetItem
          }
          disabled={
            disabled ||
            !canEnableBudgetLink
          }
          label="Link this bill to a budget item"
          onClick={
            handleBudgetLinkToggle
          }
        />
      </div>

      {hasLinkedBudgetItem ? (
        <div className="mt-5 space-y-5">
          <div>
            <label
              htmlFor={`${idPrefix}-budget-item`}
              className="mb-2 block text-sm font-bold text-[var(--text-primary)]"
            >
              Budget Item
            </label>

            <select
              id={`${idPrefix}-budget-item`}
              value={value.budgetItemId}
              disabled={disabled}
              onChange={(event) =>
                handleBudgetItemChange(
                  event.target.value,
                )
              }
              className={getInputClassName(
                disabled,
              )}
            >
              <option value="">
                Select a budget item
              </option>

              {budgetItemReferences.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.categoryName} —{" "}
                    {item.name}
                  </option>
                ),
              )}
            </select>

            {selectedBudgetItem ? (
              <div className="mt-3 flex items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
                  <LinkIcon />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    Linked Budget Item
                  </p>

                  <p className="mt-0.5 truncate text-sm font-bold text-[var(--text-primary)]">
                    {
                      selectedBudgetItem.categoryName
                    }{" "}
                    →{" "}
                    {
                      selectedBudgetItem.name
                    }
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <label
                  htmlFor={`${idPrefix}-sync-enabled`}
                  className="text-sm font-bold text-[var(--text-primary)]"
                >
                  Budget Sync
                </label>

                <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
                  Control how changes to
                  this bill should affect
                  its linked budget item.
                </p>
              </div>

              <SwitchButton
                id={`${idPrefix}-sync-enabled`}
                checked={
                  value.budgetSyncEnabled
                }
                disabled={
                  disabled ||
                  !hasLinkedBudgetItem
                }
                label="Enable budget synchronization"
                onClick={
                  handleSyncToggle
                }
              />
            </div>

            {value.budgetSyncEnabled ? (
              <fieldset className="mt-4">
                <legend className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Sync Mode
                </legend>

                <div className="grid gap-3">
                  {billBudgetSyncModeDefinitions.map(
                    (definition) => {
                      const isSelected =
                        value.budgetSyncMode ===
                        definition.value;

                      const inputId = `${idPrefix}-sync-mode-${definition.value}`;

                      return (
                        <label
                          key={
                            definition.value
                          }
                          htmlFor={
                            inputId
                          }
                          className={[
                            "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 outline-none transition",
                            isSelected
                              ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface-default))]"
                              : "border-[var(--border-subtle)] bg-[var(--surface-default)] hover:border-[var(--border-strong)]",
                            syncControlsEnabled
                              ? ""
                              : "cursor-not-allowed opacity-60",
                          ].join(" ")}
                        >
                          <input
                            id={
                              inputId
                            }
                            type="radio"
                            name={`${idPrefix}-sync-mode`}
                            value={
                              definition.value
                            }
                            checked={
                              isSelected
                            }
                            disabled={
                              !syncControlsEnabled
                            }
                            onChange={() =>
                              handleSyncModeChange(
                                definition.value,
                              )
                            }
                            className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
                          />

                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-[var(--text-primary)]">
                                {
                                  definition.label
                                }
                              </span>

                              {definition.value ===
                              "suggest" ? (
                                <span className="rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--primary)]">
                                  Recommended
                                </span>
                              ) : null}
                            </span>

                            <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
                              {
                                definition.description
                              }
                            </span>
                          </span>
                        </label>
                      );
                    },
                  )}
                </div>
              </fieldset>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-default)] p-3.5">
                <p className="text-sm leading-5 text-[var(--text-muted)]">
                  This bill will remain
                  connected to the
                  selected budget item,
                  but CASE Budget will
                  not suggest or apply
                  budget updates.
                </p>
              </div>
            )}
          </div>


          <BudgetSyncInformation
            hasLinkedBudgetItem={
              hasLinkedBudgetItem
            }
            syncEnabled={
              value.budgetSyncEnabled
            }
            syncMode={
              value.budgetSyncMode
            }
          />

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-3.5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--text-muted)]">
                <InformationIcon />
              </div>

              <p className="text-xs leading-5 text-[var(--text-muted)]">
                Marking a bill as paid
                will not directly change
                budget spending. The
                associated transaction
                will update the budget
                item after the payment
                is recorded.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={[
            "mt-4 rounded-xl border border-dashed bg-[var(--surface-default)] p-4",
            hasBudgetItems
              ? "border-[var(--border-subtle)]"
              : "border-[color-mix(in_srgb,var(--warning)_28%,var(--border-subtle))]",
          ].join(" ")}
        >
          {hasBudgetItems ? (
            <p className="text-sm leading-5 text-[var(--text-muted)]">
              This bill is not connected
              to your budget. Enable the
              link to select a budget item
              and configure synchronization.
            </p>
          ) : (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)]">
                <InformationIcon />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  No budget items available
                </p>

                <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
                  Create a budget item for
                  the selected month before
                  linking this bill.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}


type BudgetSyncInformationProps = {
  hasLinkedBudgetItem: boolean;
  syncEnabled: boolean;
  syncMode: BillBudgetSyncMode;
};

function BudgetSyncInformation({
  hasLinkedBudgetItem,
  syncEnabled,
  syncMode,
}: BudgetSyncInformationProps) {
  let title = "No budget item linked";
  let description =
    "Select a budget item to enable synchronization.";
  let accent = "text-[var(--text-primary)]";

  if (hasLinkedBudgetItem && !syncEnabled) {
    title = "Synchronization disabled";
    description =
      "The bill stays linked, but no budget updates will occur.";
  } else if (hasLinkedBudgetItem && syncMode === "automatic") {
    title = "Automatic synchronization";
    description =
      "Saving this bill updates the linked budget item's name and assigned amount.";
    accent = "text-[var(--success)]";
  } else if (hasLinkedBudgetItem && syncMode === "suggest") {
    title = "Suggested synchronization";
    description =
      "CASE Budget will suggest changes before updating the linked budget item.";
  } else if (hasLinkedBudgetItem && syncMode === "manual") {
    title = "Manual synchronization";
    description =
      "The bill and budget item stay linked but are managed independently.";
  }

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-3.5">
      <p className={`text-sm font-bold ${accent}`}>
        {title}
      </p>

      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

type SwitchButtonProps = {
  id: string;
  checked: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
};

function SwitchButton({
  id,
  checked,
  disabled = false,
  label,
  onClick,
}: SwitchButtonProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        "relative inline-flex h-7 w-12 shrink-0 rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "bg-[var(--primary)]"
          : "bg-[var(--border-strong)]",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
          checked
            ? "translate-x-6"
            : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

function getInputClassName(
  disabled: boolean,
) {
  return [
    "min-h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-3.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]",
    disabled
      ? "cursor-not-allowed opacity-60"
      : "",
  ].join(" ");
}

function BudgetIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-[var(--primary)]"
    >
      <rect
        width="20"
        height="14"
        x="2"
        y="5"
        rx="2"
      />
      <path d="M16 13h4" />
      <path d="M16 9h4" />
      <path d="M6 9h4v4H6z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function InformationIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
      />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
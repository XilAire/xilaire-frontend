"use client";

import {
  type FormEvent,
  useEffect,
  useId,
  useState,
} from "react";

import type {
  BudgetCategoryGroupData,
} from "@/types/budget";

export type EditBudgetCategoryModalProps = {
  isOpen: boolean;
  category: BudgetCategoryGroupData | null;
  onClose: () => void;
  onSubmit: (
    category: BudgetCategoryGroupData,
  ) => void;
  onDelete: (
    category: BudgetCategoryGroupData,
  ) => void;
};

function joinClassNames(
  ...classNames: Array<
    string | false | null | undefined
  >
) {
  return classNames
    .filter(Boolean)
    .join(" ");
}

export default function EditBudgetCategoryModal({
  isOpen,
  category,
  onClose,
  onSubmit,
  onDelete,
}: EditBudgetCategoryModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const nameId = useId();
  const nameErrorId = useId();
  const categoryDescriptionId =
    useId();

  const [
    name,
    setName,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    nameError,
    setNameError,
  ] = useState<
    string | null
  >(null);

  const [
    isDeleteConfirmationOpen,
    setIsDeleteConfirmationOpen,
  ] = useState(false);

  useEffect(
    () => {
      if (
        !isOpen ||
        !category
      ) {
        return;
      }

      setName(
        category.name,
      );

      setDescription(
        category.description ??
          "",
      );

      setNameError(null);

      setIsDeleteConfirmationOpen(
        false,
      );
    },
    [
      category,
      isOpen,
    ],
  );

  useEffect(
    () => {
      if (!isOpen) {
        return;
      }

      function handleKeyDown(
        event: KeyboardEvent,
      ) {
        if (
          event.key !==
          "Escape"
        ) {
          return;
        }

        if (
          isDeleteConfirmationOpen
        ) {
          setIsDeleteConfirmationOpen(
            false,
          );

          return;
        }

        onClose();
      }

      document.addEventListener(
        "keydown",
        handleKeyDown,
      );

      const originalOverflow =
        document.body.style
          .overflow;

      document.body.style.overflow =
        "hidden";

      return () => {
        document.removeEventListener(
          "keydown",
          handleKeyDown,
        );

        document.body.style.overflow =
          originalOverflow;
      };
    },
    [
      isDeleteConfirmationOpen,
      isOpen,
      onClose,
    ],
  );

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!category) {
      return;
    }

    const trimmedName =
      name.trim();

    const trimmedDescription =
      description.trim();

    if (!trimmedName) {
      setNameError(
        "Enter a category name.",
      );

      return;
    }

    setNameError(null);

    onSubmit({
      ...category,
      name: trimmedName,
      description:
        trimmedDescription ||
        undefined,
    });
  }

  function handleNameChange(
    value: string,
  ) {
    setName(value);

    if (nameError) {
      setNameError(null);
    }
  }

  function handleDelete() {
    if (!category) {
      return;
    }

    onDelete(
      category,
    );
  }

  function handleBackdropClick(
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    if (
      event.target !==
      event.currentTarget
    ) {
      return;
    }

    if (
      isDeleteConfirmationOpen
    ) {
      return;
    }

    onClose();
  }

  if (
    !isOpen ||
    !category
  ) {
    return null;
  }

  return (
    <div
      role="presentation"
      onMouseDown={
        handleBackdropClick
      }
      className={joinClassNames(
        "fixed",
        "inset-0",
        "z-[60]",
        "flex",
        "items-end",
        "justify-center",
        "overflow-y-auto",
        "bg-black/50",
        "p-0",
        "backdrop-blur-sm",
        "sm:items-center",
        "sm:p-6",
      )}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={
          titleId
        }
        aria-describedby={
          descriptionId
        }
        className={joinClassNames(
          "relative",
          "w-full",
          "max-w-lg",
          "overflow-hidden",
          "rounded-t-3xl",
          "border",
          "border-[var(--border-default)]",
          "bg-[var(--surface-default)]",
          "shadow-2xl",
          "sm:rounded-3xl",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
              Edit category
            </p>

            <h2
              id={titleId}
              className="mt-2 text-xl font-bold text-[var(--text-primary)]"
            >
              {category.name}
            </h2>

            <p
              id={
                descriptionId
              }
              className="mt-1 text-sm leading-6 text-[var(--text-muted)]"
            >
              Rename this category or
              update its description.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close edit category modal"
            onClick={onClose}
            className={joinClassNames(
              "inline-flex",
              "h-10",
              "w-10",
              "shrink-0",
              "items-center",
              "justify-center",
              "rounded-xl",
              "text-[var(--text-muted)]",
              "outline-none",
              "transition-colors",
              "hover:bg-[var(--surface-muted)]",
              "hover:text-[var(--text-primary)]",
              "focus-visible:ring-2",
              "focus-visible:ring-[var(--primary)]",
            )}
          >
            <CloseIcon />
          </button>
        </div>

        {isDeleteConfirmationOpen ? (
          <div className="px-5 py-6 sm:px-6">
            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--danger)_25%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] text-[var(--danger)]">
                  <TrashIcon />
                </div>

                <div className="min-w-0">
                  <h3 className="font-bold text-[var(--text-primary)]">
                    Delete this
                    category?
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    This will remove{" "}
                    <strong>
                      {category.name}
                    </strong>{" "}
                    and all{" "}
                    {
                      category
                        .categories
                        .length
                    }{" "}
                    budget items inside
                    it from the current
                    month. This action
                    cannot be undone.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setIsDeleteConfirmationOpen(
                      false,
                    )
                  }
                  className={joinClassNames(
                    "inline-flex",
                    "min-h-11",
                    "items-center",
                    "justify-center",
                    "rounded-xl",
                    "border",
                    "border-[var(--border-default)]",
                    "bg-[var(--surface-default)]",
                    "px-5",
                    "text-sm",
                    "font-semibold",
                    "text-[var(--text-primary)]",
                    "outline-none",
                    "transition-colors",
                    "hover:bg-[var(--surface-muted)]",
                    "focus-visible:ring-2",
                    "focus-visible:ring-[var(--primary)]",
                  )}
                >
                  Keep Category
                </button>

                <button
                  type="button"
                  onClick={
                    handleDelete
                  }
                  className={joinClassNames(
                    "inline-flex",
                    "min-h-11",
                    "items-center",
                    "justify-center",
                    "gap-2",
                    "rounded-xl",
                    "bg-[var(--danger)]",
                    "px-5",
                    "text-sm",
                    "font-bold",
                    "text-white",
                    "outline-none",
                    "transition-[filter,box-shadow]",
                    "hover:brightness-95",
                    "focus-visible:ring-2",
                    "focus-visible:ring-[var(--danger)]",
                    "focus-visible:ring-offset-2",
                    "focus-visible:ring-offset-[var(--surface-default)]",
                  )}
                >
                  <TrashIcon />

                  Delete Category
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form
            onSubmit={
              handleSubmit
            }
          >
            <div className="space-y-5 px-5 py-6 sm:px-6">
              <div>
                <label
                  htmlFor={nameId}
                  className="block text-sm font-semibold text-[var(--text-primary)]"
                >
                  Category name
                </label>

                <input
                  id={nameId}
                  type="text"
                  autoFocus
                  value={name}
                  onChange={(event) =>
                    handleNameChange(
                      event.target
                        .value,
                    )
                  }
                  aria-invalid={
                    nameError
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    nameError
                      ? nameErrorId
                      : undefined
                  }
                  className={joinClassNames(
                    "mt-2",
                    "h-12",
                    "w-full",
                    "rounded-xl",
                    "border",
                    "bg-[var(--surface-default)]",
                    "px-4",
                    "text-sm",
                    "text-[var(--text-primary)]",
                    "outline-none",
                    "transition-[border-color,box-shadow]",
                    "focus:ring-2",
                    "focus:ring-[var(--primary)]",
                    nameError
                      ? "border-[var(--danger)]"
                      : "border-[var(--border-default)]",
                  )}
                />

                {nameError ? (
                  <p
                    id={
                      nameErrorId
                    }
                    className="mt-2 text-sm text-[var(--danger)]"
                  >
                    {nameError}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor={
                    categoryDescriptionId
                  }
                  className="block text-sm font-semibold text-[var(--text-primary)]"
                >
                  Description

                  <span className="ml-1 font-normal text-[var(--text-muted)]">
                    (optional)
                  </span>
                </label>

                <textarea
                  id={
                    categoryDescriptionId
                  }
                  rows={3}
                  value={
                    description
                  }
                  onChange={(event) =>
                    setDescription(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Describe what belongs in this category."
                  className={joinClassNames(
                    "mt-2",
                    "w-full",
                    "resize-none",
                    "rounded-xl",
                    "border",
                    "border-[var(--border-default)]",
                    "bg-[var(--surface-default)]",
                    "px-4",
                    "py-3",
                    "text-sm",
                    "text-[var(--text-primary)]",
                    "outline-none",
                    "transition-[border-color,box-shadow]",
                    "placeholder:text-[var(--text-muted)]",
                    "focus:border-[var(--primary)]",
                    "focus:ring-2",
                    "focus:ring-[var(--primary)]",
                  )}
                />

                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                  This description
                  appears beneath the
                  category name.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <button
                type="button"
                onClick={() =>
                  setIsDeleteConfirmationOpen(
                    true,
                  )
                }
                className={joinClassNames(
                  "inline-flex",
                  "min-h-11",
                  "items-center",
                  "justify-center",
                  "gap-2",
                  "rounded-xl",
                  "border",
                  "border-[color-mix(in_srgb,var(--danger)_30%,transparent)]",
                  "bg-[var(--surface-default)]",
                  "px-4",
                  "text-sm",
                  "font-semibold",
                  "text-[var(--danger)]",
                  "outline-none",
                  "transition-colors",
                  "hover:bg-[color-mix(in_srgb,var(--danger)_8%,var(--surface-default))]",
                  "focus-visible:ring-2",
                  "focus-visible:ring-[var(--danger)]",
                )}
              >
                <TrashIcon />

                Delete
              </button>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onClose}
                  className={joinClassNames(
                    "inline-flex",
                    "min-h-11",
                    "items-center",
                    "justify-center",
                    "rounded-xl",
                    "border",
                    "border-[var(--border-default)]",
                    "bg-[var(--surface-default)]",
                    "px-5",
                    "text-sm",
                    "font-semibold",
                    "text-[var(--text-primary)]",
                    "outline-none",
                    "transition-colors",
                    "hover:bg-[var(--surface-muted)]",
                    "focus-visible:ring-2",
                    "focus-visible:ring-[var(--primary)]",
                  )}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={joinClassNames(
                    "inline-flex",
                    "min-h-11",
                    "items-center",
                    "justify-center",
                    "gap-2",
                    "rounded-xl",
                    "bg-[var(--primary)]",
                    "px-5",
                    "text-sm",
                    "font-bold",
                    "text-white",
                    "outline-none",
                    "transition-[filter,box-shadow]",
                    "hover:brightness-95",
                    "focus-visible:ring-2",
                    "focus-visible:ring-[var(--primary)]",
                    "focus-visible:ring-offset-2",
                    "focus-visible:ring-offset-[var(--surface-default)]",
                  )}
                >
                  <SaveIcon />

                  Save Changes
                </button>
              </div>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function SaveIcon() {
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
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </svg>
  );
}

function TrashIcon() {
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}
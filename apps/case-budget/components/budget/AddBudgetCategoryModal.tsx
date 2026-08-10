"use client";

import {
  type FormEvent,
  useEffect,
  useId,
  useState,
} from "react";

import type {
  CreateBudgetGroupData,
} from "@/types/budget";

export type AddBudgetCategoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    category: CreateBudgetGroupData,
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

export default function AddBudgetCategoryModal({
  isOpen,
  onClose,
  onSubmit,
}: AddBudgetCategoryModalProps) {
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

  useEffect(
    () => {
      if (!isOpen) {
        return;
      }

      setName("");
      setDescription("");
      setNameError(null);
    },
    [
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
          event.key ===
          "Escape"
        ) {
          onClose();
        }
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
      isOpen,
      onClose,
    ],
  );

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

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

  function handleBackdropClick(
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    if (
      event.target ===
      event.currentTarget
    ) {
      onClose();
    }
  }

  if (!isOpen) {
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
        "z-50",
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
              New category
            </p>

            <h2
              id={titleId}
              className="mt-2 text-xl font-bold text-[var(--text-primary)]"
            >
              Add Budget Category
            </h2>

            <p
              id={
                descriptionId
              }
              className="mt-1 text-sm leading-6 text-[var(--text-muted)]"
            >
              Create a category such as
              Housing, Transportation,
              Food, Insurance, or
              Personal Spending.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close add category modal"
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
                    event.target.value,
                  )
                }
                placeholder="Example: Insurance"
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
                  "placeholder:text-[var(--text-muted)]",
                  "focus:ring-2",
                  "focus:ring-[var(--primary)]",
                  nameError
                    ? "border-[var(--danger)]"
                    : "border-[var(--border-default)]",
                )}
              />

              {nameError ? (
                <p
                  id={nameErrorId}
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
                    event.target.value,
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
                You can add individual
                budget items after
                creating the category.
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
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
              <PlusIcon />

              Create Category
            </button>
          </div>
        </form>
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
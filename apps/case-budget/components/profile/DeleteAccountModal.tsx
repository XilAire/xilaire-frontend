"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  useRouter,
} from "next/navigation";

import {
  deleteAccountAction,
} from "@/actions/profile/delete-account";

import {
  initialDeleteAccountActionState,
} from "@/types/account-deletion";

type DeleteAccountModalProps = {
  isOpen:
    boolean;

  email:
    string;

  onClose:
    () => void;
};

const REQUIRED_CONFIRMATION_TEXT =
  "DELETE";

export default function DeleteAccountModal({
  isOpen,
  email,
  onClose,
}: DeleteAccountModalProps) {
  const router =
    useRouter();

  const dialogRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const confirmationInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [
    confirmationText,
    setConfirmationText,
  ] =
    useState(
      "",
    );

  const [
    state,
    formAction,
  ] =
    useActionState(
      deleteAccountAction,
      initialDeleteAccountActionState,
    );

  const canDelete =
    useMemo(
      () =>
        confirmationText.trim() ===
        REQUIRED_CONFIRMATION_TEXT,
      [
        confirmationText,
      ],
    );

  useEffect(
    () => {
      if (
        !isOpen
      ) {
        return;
      }

      const previousOverflow =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      setConfirmationText(
        "",
      );

      const focusTimer =
        window.setTimeout(
          () => {
            confirmationInputRef.current?.focus();
          },
          0,
        );

      function handleKeyDown(
        event:
          KeyboardEvent,
      ) {
        if (
          event.key ===
          "Escape"
        ) {
          event.preventDefault();

          onClose();

          return;
        }

        if (
          event.key !==
          "Tab"
        ) {
          return;
        }

        keepFocusInsideDialog(
          event,
          dialogRef.current,
        );
      }

      document.addEventListener(
        "keydown",
        handleKeyDown,
      );

      return () => {
        window.clearTimeout(
          focusTimer,
        );

        document.body.style.overflow =
          previousOverflow;

        document.removeEventListener(
          "keydown",
          handleKeyDown,
        );
      };
    },
    [
      isOpen,
      onClose,
    ],
  );

  useEffect(
    () => {
      if (
        !state.success
      ) {
        return;
      }

      /*
       * The server action only reports success after the Supabase
       * Auth account has been deleted.
       *
       * At that point the current CASE Budget session is no longer
       * valid, so move the browser out of the authenticated app.
       */
      router.replace(
        "/sign-in?message=Your%20CASE%20Budget%20account%20was%20deleted.",
      );

      router.refresh();
    },
    [
      router,
      state.success,
    ],
  );

  if (
    !isOpen
  ) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        ref={
          dialogRef
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-description"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-[color-mix(in_srgb,var(--danger)_28%,var(--border-subtle))] bg-[var(--surface-default)] shadow-2xl sm:max-w-xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--danger)]">
              Danger zone
            </p>

            <h2
              id="delete-account-title"
              className="mt-2 text-xl font-bold tracking-tight text-[var(--text-primary)]"
            >
              Delete CASE Budget account
            </h2>

            <p
              id="delete-account-description"
              className="mt-2 text-sm leading-6 text-[var(--text-muted)]"
            >
              Permanently delete your account and associated personal data.
              This action cannot be undone.
            </p>
          </div>

          <CloseButton
            onClose={
              onClose
            }
          />
        </div>

        <form
          action={
            formAction
          }
          className="space-y-5 px-5 py-5 sm:px-6 sm:py-6"
          noValidate
        >
          <CriticalWarning />

          <AccountIdentityCard
            email={
              email
            }
          />

          <DataDeletionList />

          {state.message &&
          !state.success ? (
            <ActionErrorMessage
              message={
                state.message
              }
              requiresOwnershipTransfer={
                state.requiresOwnershipTransfer
              }
            />
          ) : null}

          <div>
            <label
              htmlFor="deleteAccountConfirmation"
              className="text-sm font-bold text-[var(--text-primary)]"
            >
              Confirm account deletion
            </label>

            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              Type{" "}
              <strong className="font-black text-[var(--danger)]">
                {REQUIRED_CONFIRMATION_TEXT}
              </strong>{" "}
              to confirm that you understand this action is permanent.
            </p>

            <input
              ref={
                confirmationInputRef
              }
              id="deleteAccountConfirmation"
              name="confirmation"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={
                confirmationText
              }
              onChange={(
                event,
              ) => {
                setConfirmationText(
                  event.target.value,
                );
              }}
              aria-invalid={
                Boolean(
                  state
                    .fieldErrors
                    .confirmation,
                )
              }
              aria-describedby={
                state
                  .fieldErrors
                  .confirmation
                  ? "delete-account-confirmation-error"
                  : "delete-account-confirmation-description"
              }
              placeholder={
                REQUIRED_CONFIRMATION_TEXT
              }
              className={[
                "mt-3 min-h-12 w-full rounded-xl border bg-[var(--surface-muted)] px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)]",
                state
                  .fieldErrors
                  .confirmation
                  ? "border-[var(--danger)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--danger)_20%,transparent)]"
                  : "border-[var(--border-subtle)] focus:border-[var(--danger)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--danger)_20%,transparent)]",
              ].join(
                " ",
              )}
            />

            <p
              id="delete-account-confirmation-description"
              className="mt-2 text-xs leading-5 text-[var(--text-muted)]"
            >
              This confirmation is case-sensitive.
            </p>

            {state
              .fieldErrors
              .confirmation ? (
              <p
                id="delete-account-confirmation-error"
                role="alert"
                className="mt-2 text-xs font-semibold text-[var(--danger)]"
              >
                {
                  state
                    .fieldErrors
                    .confirmation
                }
              </p>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[var(--border-subtle)] pt-5 sm:flex-row sm:justify-end">
            <CancelButton
              onClose={
                onClose
              }
            />

            <DeleteAccountButton
              canDelete={
                canDelete
              }
            />
          </div>
        </form>
      </div>
    </div>
  );
}

function CloseButton({
  onClose,
}: {
  onClose:
    () => void;
}) {
  const {
    pending,
  } =
    useFormStatus();

  return (
    <button
      type="button"
      onClick={
        onClose
      }
      disabled={
        pending
      }
      aria-label="Close delete account"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <CloseIcon />
    </button>
  );
}

function CancelButton({
  onClose,
}: {
  onClose:
    () => void;
}) {
  const {
    pending,
  } =
    useFormStatus();

  return (
    <button
      type="button"
      onClick={
        onClose
      }
      disabled={
        pending
      }
      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      Cancel
    </button>
  );
}

function DeleteAccountButton({
  canDelete,
}: {
  canDelete:
    boolean;
}) {
  const {
    pending,
  } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={
        !canDelete ||
        pending
      }
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--danger)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--danger)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)] disabled:cursor-not-allowed disabled:opacity-45"
    >
      {pending ? (
        <>
          <SpinnerIcon />

          Deleting account...
        </>
      ) : (
        <>
          <TrashIcon />

          Permanently delete account
        </>
      )}
    </button>
  );
}

function CriticalWarning() {
  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-[var(--danger)]">
          <WarningIcon />
        </span>

        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            This action is permanent
          </p>

          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Once your CASE Budget account is deleted, you will lose access to
            the account and data that belongs exclusively to it. Deleted data
            cannot be restored through the application.
          </p>
        </div>
      </div>
    </div>
  );
}

function AccountIdentityCard({
  email,
}: {
  email:
    string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        Account being deleted
      </p>

      <p className="mt-2 break-all text-sm font-bold text-[var(--text-primary)]">
        {email ||
          "Current CASE Budget account"}
      </p>
    </div>
  );
}

function DataDeletionList() {
  const deletionItems = [
    "Your CASE Budget user profile",
    "Personal account preferences",
    "Authentication access to CASE Budget",
    "Personal workspace data owned exclusively by the account",
  ];

  return (
    <div>
      <p className="text-sm font-bold text-[var(--text-primary)]">
        Account deletion may remove
      </p>

      <div className="mt-3 space-y-2">
        {deletionItems.map(
          (
            item,
          ) => (
            <div
              key={
                item
              }
              className="flex items-start gap-3 rounded-lg bg-[var(--surface-muted)] px-3 py-2.5"
            >
              <span className="mt-0.5 shrink-0 text-[var(--danger)]">
                <MinusCircleIcon />
              </span>

              <span className="text-xs leading-5 text-[var(--text-muted)]">
                {item}
              </span>
            </div>
          ),
        )}
      </div>

      <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
        Shared household or workspace information may require ownership
        transfer or separate deletion rules before the account itself can be
        removed.
      </p>
    </div>
  );
}

function ActionErrorMessage({
  message,
  requiresOwnershipTransfer,
}: {
  message:
    string;

  requiresOwnershipTransfer:
    boolean;
}) {
  return (
    <div
      role="alert"
      className={[
        "rounded-xl border p-4",
        requiresOwnershipTransfer
          ? "border-[color-mix(in_srgb,var(--warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)]"
          : "border-[color-mix(in_srgb,var(--danger)_25%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]",
      ].join(
        " ",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={[
            "mt-0.5 shrink-0",
            requiresOwnershipTransfer
              ? "text-[var(--warning)]"
              : "text-[var(--danger)]",
          ].join(
            " ",
          )}
        >
          {requiresOwnershipTransfer ? (
            <OwnershipIcon />
          ) : (
            <WarningIcon />
          )}
        </span>

        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {requiresOwnershipTransfer
              ? "Workspace ownership must be resolved"
              : "Account deletion could not be completed"}
          </p>

          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            {message}
          </p>

          {requiresOwnershipTransfer ? (
            <p className="mt-2 text-xs font-semibold leading-5 text-[var(--text-primary)]">
              Your account has not been deleted.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function keepFocusInsideDialog(
  event:
    KeyboardEvent,

  dialog:
    HTMLElement | null,
) {
  if (
    !dialog
  ) {
    return;
  }

  const focusableElements =
    Array.from(
      dialog.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])",
      ),
    );

  if (
    focusableElements.length ===
    0
  ) {
    event.preventDefault();

    return;
  }

  const firstElement =
    focusableElements[0];

  const lastElement =
    focusableElements[
      focusableElements.length -
      1
    ];

  if (
    event.shiftKey &&
    document.activeElement ===
      firstElement
  ) {
    event.preventDefault();

    lastElement.focus();

    return;
  }

  if (
    !event.shiftKey &&
    document.activeElement ===
      lastElement
  ) {
    event.preventDefault();

    firstElement.focus();
  }
}

function CloseIcon() {
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function TrashIcon() {
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function WarningIcon() {
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
      <path d="M10.3 3.6 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function OwnershipIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="9"
        cy="8"
        r="4"
      />

      <path d="M2 21a7 7 0 0 1 14 0" />

      <path d="M17 8h5" />

      <path d="M19.5 5.5 22 8l-2.5 2.5" />
    </svg>
  );
}

function MinusCircleIcon() {
  return (
    <svg
      width="16"
      height="16"
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
        r="9"
      />

      <path d="M8 12h8" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />

      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
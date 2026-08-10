"use client";

import {
  useActionState,
  useEffect,
  useRef,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  updateEmailAction,
} from "@/actions/profile/update-email";

import {
  initialUpdateEmailActionState,
} from "@/types/profile";

type ChangeEmailModalProps = {
  isOpen:
    boolean;

  currentEmail:
    string;

  onClose:
    () => void;
};

export default function ChangeEmailModal({
  isOpen,
  currentEmail,
  onClose,
}: ChangeEmailModalProps) {
  const dialogRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const firstFieldRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [
    state,
    formAction,
  ] =
    useActionState(
      updateEmailAction,
      initialUpdateEmailActionState,
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

      const focusTimer =
        window.setTimeout(
          () => {
            firstFieldRef.current?.focus();
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

  if (
    !isOpen
  ) {
    return null;
  }

  const hasPendingConfirmation =
    state.success &&
    state.confirmationRequired;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
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
        aria-labelledby="change-email-title"
        aria-describedby="change-email-description"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-2xl sm:max-w-xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
              Account
            </p>

            <h2
              id="change-email-title"
              className="mt-2 text-xl font-bold tracking-tight text-[var(--text-primary)]"
            >
              Change email address
            </h2>

            <p
              id="change-email-description"
              className="mt-2 text-sm leading-6 text-[var(--text-muted)]"
            >
              Update the email address used to sign in to your CASE Budget
              account.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            aria-label="Close change email"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            <CloseIcon />
          </button>
        </div>

        {hasPendingConfirmation ? (
          <ConfirmationPendingState
            currentEmail={
              currentEmail
            }
            message={
              state.message
            }
            onClose={
              onClose
            }
          />
        ) : (
          <form
            action={
              formAction
            }
            className="space-y-5 px-5 py-5 sm:px-6 sm:py-6"
            noValidate
          >
            {state.message ? (
              <ActionMessage
                message={
                  state.message
                }
              />
            ) : null}

            <CurrentEmailCard
              currentEmail={
                currentEmail
              }
            />

            <FormField
              id="email"
              label="New email address"
              description="Enter the new email address you want to use for CASE Budget."
              error={
                state
                  .fieldErrors
                  .email
              }
            >
              <input
                ref={
                  firstFieldRef
                }
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                maxLength={254}
                placeholder="name@example.com"
                aria-invalid={
                  Boolean(
                    state
                      .fieldErrors
                      .email,
                  )
                }
                aria-describedby={
                  state
                    .fieldErrors
                    .email
                    ? "email-error"
                    : "email-description"
                }
                className={getInputClassName(
                  Boolean(
                    state
                      .fieldErrors
                      .email,
                  ),
                )}
              />
            </FormField>

            <FormField
              id="confirmEmail"
              label="Confirm new email address"
              description="Re-enter the new email address to make sure it is correct."
              error={
                state
                  .fieldErrors
                  .confirmEmail
              }
            >
              <input
                id="confirmEmail"
                name="confirmEmail"
                type="email"
                autoComplete="off"
                inputMode="email"
                maxLength={254}
                placeholder="name@example.com"
                aria-invalid={
                  Boolean(
                    state
                      .fieldErrors
                      .confirmEmail,
                  )
                }
                aria-describedby={
                  state
                    .fieldErrors
                    .confirmEmail
                    ? "confirmEmail-error"
                    : "confirmEmail-description"
                }
                className={getInputClassName(
                  Boolean(
                    state
                      .fieldErrors
                      .confirmEmail,
                  ),
                )}
              />
            </FormField>

            <SecurityNotice />

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--border-subtle)] pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={
                  onClose
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                Cancel
              </button>

              <ChangeEmailButton />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function CurrentEmailCard({
  currentEmail,
}: {
  currentEmail:
    string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        Current email
      </p>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 break-all text-sm font-bold text-[var(--text-primary)]">
          {currentEmail ||
            "No email address available"}
        </p>

        <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--success)]">
          <CheckIcon />

          Current
        </span>
      </div>
    </div>
  );
}

function SecurityNotice() {
  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--primary)_18%,transparent)] bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-[var(--primary)]">
          <ShieldIcon />
        </span>

        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            Email verification is required
          </p>

          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            CASE Budget uses Supabase authentication to protect email changes.
            Your current login email remains active until the new address is
            successfully verified.
          </p>
        </div>
      </div>
    </div>
  );
}

function ConfirmationPendingState({
  currentEmail,
  message,
  onClose,
}: {
  currentEmail:
    string;

  message:
    string;

  onClose:
    () => void;
}) {
  return (
    <div className="space-y-6 px-5 py-6 sm:px-6">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]">
          <MailCheckIcon />
        </div>

        <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
          Check your email
        </h3>

        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
          {message}
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Until verification is complete
        </p>

        <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
          Continue signing in with{" "}
          <strong className="break-all font-bold">
            {currentEmail}
          </strong>
          .
        </p>
      </div>

      <div className="rounded-xl border border-[color-mix(in_srgb,var(--warning)_22%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 text-[var(--warning)]">
            <ClockIcon />
          </span>

          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Verification may expire
            </p>

            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              Complete the verification from the email sent by CASE Budget.
              If the link expires, return here and start a new email-change
              request.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t border-[var(--border-subtle)] pt-5">
        <button
          type="button"
          onClick={
            onClose
          }
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--primary-foreground)] outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] sm:w-auto"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function FormField({
  id,
  label,
  description,
  error,
  children,
}: {
  id:
    string;

  label:
    string;

  description?:
    string;

  error?:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={
          id
        }
        className="text-sm font-bold text-[var(--text-primary)]"
      >
        {label}
      </label>

      <div className="mt-2">
        {children}
      </div>

      {description &&
      !error ? (
        <p
          id={`${id}-description`}
          className="mt-2 text-xs leading-5 text-[var(--text-muted)]"
        >
          {description}
        </p>
      ) : null}

      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 text-xs font-semibold text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ActionMessage({
  message,
}: {
  message:
    string;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--danger)_25%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-3 text-sm leading-5 text-[var(--danger)]"
    >
      <span className="mt-0.5 shrink-0">
        <AlertIcon />
      </span>

      <span>
        {message}
      </span>
    </div>
  );
}

function ChangeEmailButton() {
  const {
    pending,
  } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={
        pending
      }
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--primary-foreground)] outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? (
        <>
          <SpinnerIcon />

          Sending verification...
        </>
      ) : (
        <>
          <MailIcon />

          Change email
        </>
      )}
    </button>
  );
}

function getInputClassName(
  hasError:
    boolean,
) {
  return [
    "min-h-12 w-full rounded-xl border bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)]",
    hasError
      ? "border-[var(--danger)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--danger)_20%,transparent)]"
      : "border-[var(--border-subtle)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]",
  ].join(
    " ",
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

function MailIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />

      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function MailCheckIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />

      <path d="m3 7 9 6 9-6" />
      <path d="m15 16 2 2 4-4" />
    </svg>
  );
}

function ShieldIcon() {
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
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ClockIcon() {
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
        cx="12"
        cy="12"
        r="9"
      />

      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 12 4 4 8-8" />
    </svg>
  );
}

function AlertIcon() {
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
        r="9"
      />

      <path d="M12 8v5" />
      <path d="M12 16h.01" />
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
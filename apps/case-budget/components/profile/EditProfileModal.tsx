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
  updateProfileAction,
} from "@/actions/profile/update-profile";

import {
  initialUpdateProfileActionState,
} from "@/types/profile";

type EditProfileModalProps = {
  isOpen:
    boolean;

  firstName:
    string;

  lastName:
    string;

  displayName:
    string;

  email:
    string;

  onClose:
    () => void;
};

export default function EditProfileModal({
  isOpen,
  firstName,
  lastName,
  displayName,
  email,
  onClose,
}: EditProfileModalProps) {
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
      updateProfileAction,
      initialUpdateProfileActionState,
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

  useEffect(
    () => {
      if (
        !state.success
      ) {
        return;
      }

      const closeTimer =
        window.setTimeout(
          () => {
            onClose();
          },
          800,
        );

      return () => {
        window.clearTimeout(
          closeTimer,
        );
      };
    },
    [
      onClose,
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
        aria-labelledby="edit-profile-title"
        aria-describedby="edit-profile-description"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-2xl sm:max-w-xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
              Account
            </p>

            <h2
              id="edit-profile-title"
              className="mt-2 text-xl font-bold tracking-tight text-[var(--text-primary)]"
            >
              Edit profile
            </h2>

            <p
              id="edit-profile-description"
              className="mt-2 text-sm leading-6 text-[var(--text-muted)]"
            >
              Update the name information associated with your CASE Budget
              account.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            aria-label="Close edit profile"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            <CloseIcon />
          </button>
        </div>

        <form
          action={
            formAction
          }
          className="space-y-5 px-5 py-5 sm:px-6 sm:py-6"
          noValidate
        >
          {state.message ? (
            <ActionMessage
              success={
                state.success
              }
              message={
                state.message
              }
            />
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="firstName"
              label="First name"
              error={
                state
                  .fieldErrors
                  .firstName
              }
            >
              <input
                ref={
                  firstFieldRef
                }
                id="firstName"
                name="firstName"
                type="text"
                defaultValue={
                  firstName
                }
                autoComplete="given-name"
                maxLength={100}
                aria-invalid={
                  Boolean(
                    state
                      .fieldErrors
                      .firstName,
                  )
                }
                aria-describedby={
                  state
                    .fieldErrors
                    .firstName
                    ? "firstName-error"
                    : undefined
                }
                className={getInputClassName(
                  Boolean(
                    state
                      .fieldErrors
                      .firstName,
                  ),
                )}
              />
            </FormField>

            <FormField
              id="lastName"
              label="Last name"
              error={
                state
                  .fieldErrors
                  .lastName
              }
            >
              <input
                id="lastName"
                name="lastName"
                type="text"
                defaultValue={
                  lastName
                }
                autoComplete="family-name"
                maxLength={100}
                aria-invalid={
                  Boolean(
                    state
                      .fieldErrors
                      .lastName,
                  )
                }
                aria-describedby={
                  state
                    .fieldErrors
                    .lastName
                    ? "lastName-error"
                    : undefined
                }
                className={getInputClassName(
                  Boolean(
                    state
                      .fieldErrors
                      .lastName,
                  ),
                )}
              />
            </FormField>
          </div>

          <FormField
            id="displayName"
            label="Display name"
            description="This is the name CASE Budget displays throughout the application."
            error={
              state
                .fieldErrors
                .displayName
            }
          >
            <input
              id="displayName"
              name="displayName"
              type="text"
              defaultValue={
                displayName
              }
              autoComplete="name"
              maxLength={150}
              aria-invalid={
                Boolean(
                  state
                    .fieldErrors
                    .displayName,
                )
              }
              aria-describedby={
                state
                  .fieldErrors
                  .displayName
                  ? "displayName-error"
                  : "displayName-description"
              }
              className={getInputClassName(
                Boolean(
                  state
                    .fieldErrors
                    .displayName,
                ),
              )}
            />
          </FormField>

          <FormField
            id="email"
            label="Email address"
            description="Email changes require a separate account verification process."
          >
            <div className="relative">
              <input
                id="email"
                type="email"
                value={
                  email
                }
                readOnly
                disabled
                className="min-h-12 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 pr-24 text-sm text-[var(--text-muted)] outline-none disabled:cursor-not-allowed"
              />

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-[var(--surface-default)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Verified
              </span>
            </div>
          </FormField>

          <div className="rounded-xl border border-[color-mix(in_srgb,var(--primary)_18%,transparent)] bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 text-[var(--primary)]">
                <InfoIcon />
              </span>

              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  Profile changes update your account
                </p>

                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                  Your updated name will be synchronized with your CASE Budget
                  authentication profile and used throughout the application.
                </p>
              </div>
            </div>
          </div>

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

            <SaveProfileButton />
          </div>
        </form>
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
  success,
  message,
}: {
  success:
    boolean;

  message:
    string;
}) {
  return (
    <div
      role={
        success
          ? "status"
          : "alert"
      }
      className={[
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-5",
        success
          ? "border-[color-mix(in_srgb,var(--success)_25%,transparent)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)] text-[var(--success)]"
          : "border-[color-mix(in_srgb,var(--danger)_25%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] text-[var(--danger)]",
      ].join(
        " ",
      )}
    >
      <span className="mt-0.5 shrink-0">
        {success ? (
          <CheckIcon />
        ) : (
          <AlertIcon />
        )}
      </span>

      <span>
        {message}
      </span>
    </div>
  );
}

function SaveProfileButton() {
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

          Saving...
        </>
      ) : (
        <>
          <SaveIcon />

          Save changes
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

function SaveIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 3h12l2 2v16H5Z" />
      <path d="M8 3v6h8V3" />
      <path d="M8 21v-7h8v7" />
    </svg>
  );
}

function InfoIcon() {
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

      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
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
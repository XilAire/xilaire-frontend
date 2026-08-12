"use client";

import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  acceptHouseholdInviteAction,
} from "@/actions/household/accept-invite";

import {
  initialAcceptHouseholdInviteActionState,
} from "@/types/household/accept-invite";

export default function AcceptInviteForm() {
  const router =
    useRouter();

  const [
    state,
    formAction,
    isPending,
  ] =
    useActionState(
      acceptHouseholdInviteAction,
      initialAcceptHouseholdInviteActionState,
    );

  const [
    password,
    setPassword,
  ] =
    useState(
      "",
    );

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState(
      "",
    );

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(
      false,
    );

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] =
    useState(
      false,
    );

  useEffect(
    () => {
      if (
        !state.success
      ) {
        return;
      }

      const destination =
        state.redirectTo ??
        "/dashboard";

      router.replace(
        destination,
      );

      router.refresh();
    },
    [
      router,
      state.redirectTo,
      state.success,
    ],
  );

  const passwordRequirements =
    getPasswordRequirements(
      password,
    );

  const passwordsMatch =
    password.length >
      0 &&
    confirmPassword.length >
      0 &&
    password ===
      confirmPassword;

  const canSubmit =
    passwordRequirements.every(
      (
        requirement,
      ) =>
        requirement.met,
    ) &&
    passwordsMatch &&
    !isPending;

  const errorMessage =
    state.error ??
    (
      !state.success
        ? state.message
        : null
    );

  return (
    <form
      action={
        formAction
      }
      className="space-y-6"
    >
      {errorMessage ? (
        <ErrorMessage
          message={
            errorMessage
          }
        />
      ) : null}

      <div>
        <label
          className="mb-2 block text-sm font-bold text-[var(--text-primary)]"
          htmlFor="password"
        >
          Create password
        </label>

        <div className="relative">
          <input
            id="password"
            name="password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            autoComplete="new-password"
            required
            minLength={
              8
            }
            value={
              password
            }
            disabled={
              isPending
            }
            onChange={(
              event,
            ) => {
              setPassword(
                event.target
                  .value,
              );
            }}
            className="min-h-12 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 pr-12 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Create a secure password"
          />

          <PasswordVisibilityButton
            visible={
              showPassword
            }
            onClick={() => {
              setShowPassword(
                (
                  current,
                ) =>
                  !current,
              );
            }}
          />
        </div>

        <PasswordRequirements
          requirements={
            passwordRequirements
          }
        />
      </div>

      <div>
        <label
          className="mb-2 block text-sm font-bold text-[var(--text-primary)]"
          htmlFor="confirmPassword"
        >
          Confirm password
        </label>

        <div className="relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            autoComplete="new-password"
            required
            minLength={
              8
            }
            value={
              confirmPassword
            }
            disabled={
              isPending
            }
            onChange={(
              event,
            ) => {
              setConfirmPassword(
                event.target
                  .value,
              );
            }}
            className="min-h-12 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 pr-12 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Enter your password again"
          />

          <PasswordVisibilityButton
            visible={
              showConfirmPassword
            }
            onClick={() => {
              setShowConfirmPassword(
                (
                  current,
                ) =>
                  !current,
              );
            }}
          />
        </div>

        {confirmPassword.length >
        0 ? (
          <div className="mt-2">
            <RequirementRow
              met={
                passwordsMatch
              }
              label={
                passwordsMatch
                  ? "Passwords match"
                  : "Passwords must match"
              }
            />
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
            <ShieldIcon />
          </div>

          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Secure your account
            </p>

            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              This password will be used with your invited email address
              whenever you sign in to CASE Budget.
            </p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={
          !canSubmit
        }
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--primary-foreground)] shadow-sm outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <>
            <SpinnerIcon />

            Setting up account...
          </>
        ) : (
          <>
            Finish setup

            <ArrowRightIcon />
          </>
        )}
      </button>

      <p className="text-center text-xs leading-5 text-[var(--text-muted)]">
        After setup, you can sign in using your email address and this password.
      </p>
    </form>
  );
}

type PasswordRequirement = {
  id:
    string;

  label:
    string;

  met:
    boolean;
};

function getPasswordRequirements(
  password:
    string,
): PasswordRequirement[] {
  return [
    {
      id:
        "length",

      label:
        "At least 8 characters",

      met:
        password.length >=
        8,
    },
    {
      id:
        "uppercase",

      label:
        "At least one uppercase letter",

      met:
        /[A-Z]/.test(
          password,
        ),
    },
    {
      id:
        "lowercase",

      label:
        "At least one lowercase letter",

      met:
        /[a-z]/.test(
          password,
        ),
    },
    {
      id:
        "number",

      label:
        "At least one number",

      met:
        /[0-9]/.test(
          password,
        ),
    },
    {
      id:
        "special",

      label:
        "At least one special character",

      met:
        /[^A-Za-z0-9]/.test(
          password,
        ),
    },
  ];
}

function PasswordRequirements({
  requirements,
}: {
  requirements:
    PasswordRequirement[];
}) {
  return (
    <div className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3">
      <p className="mb-2 text-xs font-bold text-[var(--text-secondary)]">
        Password requirements
      </p>

      <div className="space-y-1.5">
        {requirements.map(
          (
            requirement,
          ) => (
            <RequirementRow
              key={
                requirement.id
              }
              met={
                requirement.met
              }
              label={
                requirement.label
              }
            />
          ),
        )}
      </div>
    </div>
  );
}

function RequirementRow({
  met,
  label,
}: {
  met:
    boolean;

  label:
    string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={[
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
          met
            ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
            : "border-[var(--border-strong)] text-transparent",
        ].join(
          " ",
        )}
      >
        <CheckIcon />
      </span>

      <span
        className={[
          "text-xs",
          met
            ? "font-medium text-[var(--primary)]"
            : "text-[var(--text-muted)]",
        ].join(
          " ",
        )}
      >
        {label}
      </span>
    </div>
  );
}

function ErrorMessage({
  message,
}: {
  message:
    string;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      <div className="flex gap-3">
        <div className="mt-0.5 shrink-0">
          <ErrorIcon />
        </div>

        <p className="leading-5">
          {message}
        </p>
      </div>
    </div>
  );
}

function PasswordVisibilityButton({
  visible,
  onClick,
}: {
  visible:
    boolean;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      aria-label={
        visible
          ? "Hide password"
          : "Show password"
      }
      aria-pressed={
        visible
      }
      onClick={
        onClick
      }
      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-[var(--text-muted)] outline-none transition hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]"
    >
      {visible ? (
        <EyeOffIcon />
      ) : (
        <EyeIcon />
      )}
    </button>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-2.5 w-2.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="3"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m5 12 4 4L19 6"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12s3.5-6 9.75-6 9.75 6 9.75 6-3.5 6-9.75 6S2.25 12 2.25 12Z"
      />

      <circle
        cx="12"
        cy="12"
        r="2.75"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m3 3 18 18"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.6 6.15A10.9 10.9 0 0 1 12 6c6.25 0 9.75 6 9.75 6a17.5 17.5 0 0 1-2.2 2.85"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.15 6.15C3.65 8 2.25 12 2.25 12s3.5 6 9.75 6a10.5 10.5 0 0 0 3.2-.48"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.88 9.88A3 3 0 0 0 14.12 14.12"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3 5.25 5.75v5.15c0 4.45 2.7 8.45 6.75 10.1 4.05-1.65 6.75-5.65 6.75-10.1V5.75L12 3Z"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m9.25 12 1.75 1.75 3.75-4"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12h14"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14 7 5 5-5 5"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path
        strokeLinecap="round"
        d="M12 7.5v5"
      />

      <circle
        cx="12"
        cy="16.5"
        r=".75"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
      />

      <path
        className="opacity-90"
        fill="currentColor"
        d="M21 12a9 9 0 0 0-9-9v3a6 6 0 0 1 6 6h3Z"
      />
    </svg>
  );
}
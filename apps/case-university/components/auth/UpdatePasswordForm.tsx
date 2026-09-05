"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  supabaseCaseUniversity,
} from "@/lib/supabase/client";

type PasswordRequirement = {
  id:
    string;

  label:
    string;

  passed:
    boolean;
};

export default function UpdatePasswordForm() {
  const router =
    useRouter();

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] =
    useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<string | null>(
      null,
    );

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<string | null>(
      null,
    );

  const passwordRequirements =
    useMemo<PasswordRequirement[]>(
      () => [
        {
          id:
            "length",

          label:
            "At least 12 characters",

          passed:
            password.length >=
            12,
        },

        {
          id:
            "uppercase",

          label:
            "At least one uppercase letter",

          passed:
            /[A-Z]/.test(
              password,
            ),
        },

        {
          id:
            "lowercase",

          label:
            "At least one lowercase letter",

          passed:
            /[a-z]/.test(
              password,
            ),
        },

        {
          id:
            "number",

          label:
            "At least one number",

          passed:
            /\d/.test(
              password,
            ),
        },

        {
          id:
            "special",

          label:
            "At least one special character",

          passed:
            /[^A-Za-z0-9]/.test(
              password,
            ),
        },
      ],
      [
        password,
      ],
    );

  const passwordIsValid =
    passwordRequirements.every(
      (
        requirement,
      ) =>
        requirement.passed,
    );

  const passwordsMatch =
    password.length >
      0 &&
    password ===
      confirmPassword;

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      isSubmitting
    ) {
      return;
    }

    setErrorMessage(
      null,
    );

    setSuccessMessage(
      null,
    );

    if (
      !passwordIsValid
    ) {
      setErrorMessage(
        "Your new password does not meet all security requirements.",
      );

      return;
    }

    if (
      !passwordsMatch
    ) {
      setErrorMessage(
        "The passwords do not match.",
      );

      return;
    }

    setIsSubmitting(
      true,
    );

    try {
      const {
        error,
      } =
        await supabaseCaseUniversity.auth.updateUser(
          {
            password,
          },
        );

      if (
        error
      ) {
        console.error(
          "CASE University password update failed",
          error,
        );

        if (
          isRecoverySessionError(
            error.message,
          )
        ) {
          setErrorMessage(
            "Your password reset session has expired or is no longer valid. Request a new reset link.",
          );

          return;
        }

        setErrorMessage(
          normalizeUpdateError(
            error.message,
          ),
        );

        return;
      }

      setSuccessMessage(
        "Your password has been updated successfully.",
      );

      setPassword(
        "",
      );

      setConfirmPassword(
        "",
      );

      /*
       * End the recovery session after the password
       * change so the user signs in normally using
       * the new password.
       *
       * This signs out the current browser session
       * only. It does not intentionally revoke every
       * other session on the account.
       */
      const {
        error:
          signOutError,
      } =
        await supabaseCaseUniversity.auth.signOut({
          scope:
            "local",
        });

      if (
        signOutError
      ) {
        console.error(
          "CASE University could not clear the recovery session",
          signOutError,
        );
      }

      window.setTimeout(
        () => {
          router.replace(
            "/auth/signin?password=updated",
          );

          router.refresh();
        },
        900,
      );
    } catch (
      error
    ) {
      console.error(
        "Unexpected CASE University password update failure",
        error,
      );

      setErrorMessage(
        "Unable to update your password right now. Please try again.",
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-5"
    >
      <div>
        <label
          htmlFor="new-password"
          className="block text-sm font-semibold text-[var(--text-primary)]"
        >
          New password
        </label>

        <div className="relative mt-2">
          <input
            id="new-password"
            name="password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            autoComplete="new-password"
            required
            minLength={
              12
            }
            value={
              password
            }
            onChange={(
              event,
            ) =>
              setPassword(
                event.target.value,
              )
            }
            disabled={
              isSubmitting
            }
            placeholder="Enter a strong password"
            className="
              block
              w-full
              rounded-xl
              border
              border-[var(--border-default)]
              bg-[var(--surface-muted)]
              px-4
              py-3
              pr-12
              text-sm
              text-[var(--text-primary)]
              outline-none
              transition
              placeholder:text-[var(--text-muted)]
              hover:border-[var(--border-strong)]
              focus:border-[var(--primary)]
              focus:bg-[var(--surface-default)]
              focus:ring-2
              focus:ring-[var(--focus-ring)]
              disabled:cursor-not-allowed
              disabled:opacity-60
              sm:text-base
            "
          />

          <PasswordVisibilityButton
            shown={
              showPassword
            }
            onClick={() =>
              setShowPassword(
                (
                  current,
                ) =>
                  !current,
              )
            }
            disabled={
              isSubmitting
            }
          />
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Password requirements
        </p>

        <div className="mt-3 space-y-2">
          {passwordRequirements.map(
            (
              requirement,
            ) => (
              <div
                key={
                  requirement.id
                }
                className="flex items-center gap-2"
              >
                <span
                  aria-hidden="true"
                  className={
                    requirement.passed
                      ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-default)] text-[var(--text-muted)]"
                  }
                >
                  {requirement.passed ? (
                    <CheckIcon />
                  ) : (
                    <DotIcon />
                  )}
                </span>

                <span
                  className={
                    requirement.passed
                      ? "text-xs text-[var(--text-secondary)]"
                      : "text-xs text-[var(--text-muted)]"
                  }
                >
                  {
                    requirement.label
                  }
                </span>
              </div>
            ),
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="confirm-password"
          className="block text-sm font-semibold text-[var(--text-primary)]"
        >
          Confirm new password
        </label>

        <div className="relative mt-2">
          <input
            id="confirm-password"
            name="confirmPassword"
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            autoComplete="new-password"
            required
            minLength={
              12
            }
            value={
              confirmPassword
            }
            onChange={(
              event,
            ) =>
              setConfirmPassword(
                event.target.value,
              )
            }
            disabled={
              isSubmitting
            }
            placeholder="Enter your password again"
            className="
              block
              w-full
              rounded-xl
              border
              border-[var(--border-default)]
              bg-[var(--surface-muted)]
              px-4
              py-3
              pr-12
              text-sm
              text-[var(--text-primary)]
              outline-none
              transition
              placeholder:text-[var(--text-muted)]
              hover:border-[var(--border-strong)]
              focus:border-[var(--primary)]
              focus:bg-[var(--surface-default)]
              focus:ring-2
              focus:ring-[var(--focus-ring)]
              disabled:cursor-not-allowed
              disabled:opacity-60
              sm:text-base
            "
          />

          <PasswordVisibilityButton
            shown={
              showConfirmPassword
            }
            onClick={() =>
              setShowConfirmPassword(
                (
                  current,
                ) =>
                  !current,
              )
            }
            disabled={
              isSubmitting
            }
          />
        </div>

        {confirmPassword ? (
          <div className="mt-2 flex items-center gap-2">
            <span
              className={
                passwordsMatch
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }
            >
              {passwordsMatch ? (
                <CheckIcon />
              ) : (
                <XIcon />
              )}
            </span>

            <p
              className={
                passwordsMatch
                  ? "text-xs font-medium text-emerald-700 dark:text-emerald-300"
                  : "text-xs font-medium text-red-700 dark:text-red-300"
              }
            >
              {passwordsMatch
                ? "Passwords match"
                : "Passwords do not match"}
            </p>
          </div>
        ) : null}
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="
            rounded-xl
            border
            border-red-200
            bg-red-50
            px-4
            py-3
            text-sm
            leading-6
            text-red-700

            dark:border-red-900/60
            dark:bg-red-950/30
            dark:text-red-300
          "
        >
          {
            errorMessage
          }
        </div>
      ) : null}

      {successMessage ? (
        <div
          role="status"
          className="
            rounded-xl
            border
            border-emerald-200
            bg-emerald-50
            px-4
            py-3
            text-sm
            leading-6
            text-emerald-700

            dark:border-emerald-900/60
            dark:bg-emerald-950/30
            dark:text-emerald-300
          "
        >
          {
            successMessage
          }
        </div>
      ) : null}

      <button
        type="submit"
        disabled={
          isSubmitting ||
          !passwordIsValid ||
          !passwordsMatch
        }
        className="
          flex
          w-full
          items-center
          justify-center
          rounded-xl
          bg-[var(--primary)]
          px-4
          py-3
          text-sm
          font-bold
          text-[var(--primary-foreground)]
          shadow-[var(--shadow-primary)]
          transition
          hover:bg-[var(--primary-hover)]
          focus:outline-none
          focus-visible:ring-2
          focus-visible:ring-[var(--focus-ring)]
          focus-visible:ring-offset-2
          focus-visible:ring-offset-[var(--surface-default)]
          disabled:cursor-not-allowed
          disabled:opacity-50
          sm:text-base
        "
      >
        {isSubmitting
          ? "Updating password..."
          : "Update password"}
      </button>
    </form>
  );
}

function PasswordVisibilityButton({
  shown,
  onClick,
  disabled,
}: {
  shown:
    boolean;

  onClick:
    () => void;

  disabled:
    boolean;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      disabled={
        disabled
      }
      aria-label={
        shown
          ? "Hide password"
          : "Show password"
      }
      className="
        absolute
        inset-y-0
        right-0
        flex
        w-12
        items-center
        justify-center
        text-[var(--text-muted)]
        transition
        hover:text-[var(--text-primary)]
        focus:outline-none
        focus-visible:ring-2
        focus-visible:ring-inset
        focus-visible:ring-[var(--focus-ring)]
        disabled:cursor-not-allowed
        disabled:opacity-50
      "
    >
      {shown ? (
        <EyeOffIcon />
      ) : (
        <EyeIcon />
      )}
    </button>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"
      />

      <circle
        cx="12"
        cy="12"
        r="2.5"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3l18 18"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.58 10.58a2 2 0 002.83 2.83"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.88 4.24A10.8 10.8 0 0112 4c5.5 0 9 5 9 8a9.7 9.7 0 01-2.05 3.73"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.61 6.61C4.43 8.04 3 10.25 3 12c0 3 3.5 8 9 8 1.73 0 3.23-.49 4.5-1.24"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 10l3 3 7-7"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        d="M6 6l8 8M14 6l-8 8"
      />
    </svg>
  );
}

function DotIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-2 w-2"
      aria-hidden="true"
    >
      <circle
        cx="10"
        cy="10"
        r="3"
      />
    </svg>
  );
}

function isRecoverySessionError(
  message:
    string,
) {
  const normalized =
    message
      .trim()
      .toLowerCase();

  return (
    normalized.includes(
      "session",
    ) ||
    normalized.includes(
      "jwt",
    ) ||
    normalized.includes(
      "token",
    )
  );
}

function normalizeUpdateError(
  message:
    string,
) {
  const normalized =
    message
      .trim()
      .toLowerCase();

  if (
    normalized.includes(
      "same password",
    )
  ) {
    return "Choose a password that is different from your current password.";
  }

  if (
    normalized.includes(
      "password",
    ) &&
    normalized.includes(
      "weak",
    )
  ) {
    return "That password does not meet the account security requirements.";
  }

  return "Unable to update your password. Please try again.";
}
"use client";

import Link from "next/link";

import {
  type FormEvent,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

export default function UpdatePasswordForm() {
  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const passwordsMatch =
    !confirmPassword ||
    password ===
      confirmPassword;

  const passwordValidationMessage =
    getPasswordValidationMessage(
      password,
    );

  const canSubmit =
    Boolean(
      password &&
        confirmPassword &&
        passwordsMatch &&
        !passwordValidationMessage &&
        !isSubmitting,
    );

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage(
      "",
    );

    setSuccessMessage(
      "",
    );

    const validationMessage =
      getPasswordValidationMessage(
        password,
      );

    if (
      validationMessage
    ) {
      setErrorMessage(
        validationMessage,
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setErrorMessage(
        "Passwords do not match.",
      );

      return;
    }

    setIsSubmitting(
      true,
    );

    try {
      const supabase =
        createClient();

            const {
        data: userData,
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError
      ) {
        setErrorMessage(
          userError.message ||
            "Unable to verify your password recovery session.",
        );

        return;
      }

      if (
        !userData.user
      ) {
        setErrorMessage(
          "Your password recovery session has expired or is invalid. Please request a new password reset link.",
        );

        return;
      }

      const {
        error,
      } =
        await supabase.auth.updateUser({
          password,
        });

      if (
        error
      ) {
        setErrorMessage(
          error.message ||
            "Unable to update your password.",
        );

        return;
      }

      setPassword(
        "",
      );

      setConfirmPassword(
        "",
      );

      setSuccessMessage(
        "Your password has been updated successfully.",
      );
    } catch (
      error
    ) {
      console.error(
        "Unable to update CASE Budget password.",
        error,
      );

      setErrorMessage(
        "Something went wrong while updating your password. Please try again.",
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  if (
    successMessage
  ) {
    return (
      <div className="space-y-6">
        <div
          className={[
            "rounded-xl",
            "border",
            "border-[color-mix(in_srgb,var(--success)_25%,transparent)]",
            "bg-[color-mix(in_srgb,var(--success)_8%,transparent)]",
            "px-4",
            "py-3",
          ].join(
            " ",
          )}
          role="status"
        >
          <p className="text-sm font-semibold text-[var(--success)]">
            {
              successMessage
            }
          </p>
        </div>

        <Link
          href="/sign-in"
          className={[
            "flex",
            "min-h-12",
            "w-full",
            "items-center",
            "justify-center",
            "rounded-xl",
            "bg-[var(--primary)]",
            "px-4",
            "py-3",
            "text-sm",
            "font-bold",
            "text-white",
            "outline-none",
            "transition",
            "hover:opacity-90",
            "focus-visible:ring-2",
            "focus-visible:ring-[var(--primary)]",
            "focus-visible:ring-offset-2",
            "focus-visible:ring-offset-[var(--surface-default)]",
          ].join(
            " ",
          )}
        >
          Continue to sign
          in
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-5"
      noValidate
    >
      {errorMessage ? (
        <div
          className={[
            "rounded-xl",
            "border",
            "border-red-500/20",
            "bg-red-500/5",
            "px-4",
            "py-3",
          ].join(
            " ",
          )}
          role="alert"
        >
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            {
              errorMessage
            }
          </p>
        </div>
      ) : null}

      <PasswordInput
        id="password"
        name="password"
        label="New password"
        value={
          password
        }
        placeholder="Enter a new password"
        showPassword={
          showPassword
        }
        disabled={
          isSubmitting
        }
        onChange={
          setPassword
        }
        onToggleVisibility={() =>
          setShowPassword(
            (
              currentValue,
            ) =>
              !currentValue,
          )
        }
      />

      <PasswordRequirements
        password={
          password
        }
      />

      <PasswordInput
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm new password"
        value={
          confirmPassword
        }
        placeholder="Enter your new password again"
        showPassword={
          showConfirmPassword
        }
        disabled={
          isSubmitting
        }
        error={
          passwordsMatch
            ? undefined
            : "Passwords do not match."
        }
        onChange={
          setConfirmPassword
        }
        onToggleVisibility={() =>
          setShowConfirmPassword(
            (
              currentValue,
            ) =>
              !currentValue,
          )
        }
      />

      <button
        type="submit"
        disabled={
          !canSubmit
        }
        className={[
          "flex",
          "min-h-12",
          "w-full",
          "items-center",
          "justify-center",
          "rounded-xl",
          "px-4",
          "py-3",
          "text-sm",
          "font-bold",
          "outline-none",
          "transition",
          "focus-visible:ring-2",
          "focus-visible:ring-offset-2",
          "focus-visible:ring-offset-[var(--surface-default)]",
          canSubmit
            ? [
                "bg-[var(--primary)]",
                "text-white",
                "hover:opacity-90",
                "focus-visible:ring-[var(--primary)]",
              ].join(
                " ",
              )
            : [
                "cursor-not-allowed",
                "bg-[var(--surface-muted)]",
                "text-[var(--text-muted)]",
              ].join(
                " ",
              ),
        ].join(
          " ",
        )}
      >
        {isSubmitting
          ? "Updating password..."
          : "Update password"}
      </button>

      <div className="text-center">
        <Link
          href="/sign-in"
          className={[
            "text-sm",
            "font-semibold",
            "text-[var(--text-muted)]",
            "transition",
            "hover:text-[var(--text-primary)]",
          ].join(
            " ",
          )}
        >
          Back to sign
          in
        </Link>
      </div>
    </form>
  );
}

type PasswordInputProps = {
  id:
    string;

  name:
    string;

  label:
    string;

  value:
    string;

  placeholder:
    string;

  showPassword:
    boolean;

  disabled:
    boolean;

  error?:
    string;

  onChange:
    (
      value:
        string,
    ) =>
      void;

  onToggleVisibility:
    () =>
      void;
};

function PasswordInput({
  id,
  name,
  label,
  value,
  placeholder,
  showPassword,
  disabled,
  error,
  onChange,
  onToggleVisibility,
}: PasswordInputProps) {
  const errorId =
    error
      ? `${id}-error`
      : undefined;

  return (
    <div>
      <label
        htmlFor={
          id
        }
        className="text-sm font-bold text-[var(--text-primary)]"
      >
        {
          label
        }
      </label>

      <div className="relative mt-2">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-[var(--text-muted)]">
          <LockIcon />
        </span>

        <input
          id={
            id
          }
          name={
            name
          }
          type={
            showPassword
              ? "text"
              : "password"
          }
          value={
            value
          }
          onChange={(
            event,
          ) =>
            onChange(
              event.target
                .value,
            )
          }
          autoComplete="new-password"
          placeholder={
            placeholder
          }
          disabled={
            disabled
          }
          required
          aria-invalid={
            Boolean(
              error,
            )
          }
          aria-describedby={
            errorId
          }
          className={[
            "min-h-12",
            "w-full",
            "rounded-xl",
            "border",
            "bg-[var(--surface-default)]",
            "pl-11",
            "pr-11",
            "text-sm",
            "text-[var(--text-primary)]",
            "outline-none",
            "transition",
            "placeholder:text-[var(--text-muted)]",
            "focus:ring-2",
            error
              ? [
                  "border-red-500/50",
                  "focus:border-red-500",
                  "focus:ring-red-500/15",
                ].join(
                  " ",
                )
              : [
                  "border-[var(--border-default)]",
                  "focus:border-[var(--primary)]",
                  "focus:ring-[color-mix(in_srgb,var(--primary)_12%,transparent)]",
                ].join(
                  " ",
                ),
            disabled
              ? "cursor-not-allowed opacity-60"
              : "",
          ].join(
            " ",
          )}
        />

        <button
          type="button"
          onClick={
            onToggleVisibility
          }
          disabled={
            disabled
          }
          aria-label={
            showPassword
              ? "Hide password"
              : "Show password"
          }
          aria-pressed={
            showPassword
          }
          className={[
            "absolute",
            "inset-y-0",
            "right-0",
            "inline-flex",
            "w-11",
            "items-center",
            "justify-center",
            "rounded-r-xl",
            "text-[var(--text-muted)]",
            "outline-none",
            "transition",
            "hover:text-[var(--text-primary)]",
            "focus-visible:ring-2",
            "focus-visible:ring-inset",
            "focus-visible:ring-[var(--primary)]",
            disabled
              ? "cursor-not-allowed opacity-50"
              : "",
          ].join(
            " ",
          )}
        >
          {showPassword ? (
            <EyeOffIcon />
          ) : (
            <EyeIcon />
          )}
        </button>
      </div>

      {error ? (
        <p
          id={
            errorId
          }
          className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400"
        >
          {
            error
          }
        </p>
      ) : null}
    </div>
  );
}

function PasswordRequirements({
  password,
}: {
  password:
    string;
}) {
  const requirements = [
    {
      label:
        "At least 8 characters",
      met:
        password.length >=
        8,
    },
    {
      label:
        "One uppercase letter",
      met:
        /[A-Z]/.test(
          password,
        ),
    },
    {
      label:
        "One lowercase letter",
      met:
        /[a-z]/.test(
          password,
        ),
    },
    {
      label:
        "One number",
      met:
        /\d/.test(
          password,
        ),
    },
  ];

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-primary)]">
        Password
        requirements
      </p>

      <ul className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        {requirements.map(
          (
            requirement,
          ) => (
            <li
              key={
                requirement.label
              }
              className={[
                "flex",
                "items-center",
                "gap-2",
                requirement.met
                  ? "text-[var(--success)]"
                  : "text-[var(--text-muted)]",
              ].join(
                " ",
              )}
            >
              <CheckMiniIcon />

              {
                requirement.label
              }
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function getPasswordValidationMessage(
  password:
    string,
) {
  if (
    !password
  ) {
    return "Password is required.";
  }

  if (
    password.length <
    8
  ) {
    return "Password must be at least 8 characters long.";
  }

  if (
    !/[A-Z]/.test(
      password,
    )
  ) {
    return "Password must include at least one uppercase letter.";
  }

  if (
    !/[a-z]/.test(
      password,
    )
  ) {
    return "Password must include at least one lowercase letter.";
  }

  if (
    !/\d/.test(
      password,
    )
  ) {
    return "Password must include at least one number.";
  }

  return "";
}

function LockIcon() {
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
      <rect
        width="18"
        height="11"
        x="3"
        y="11"
        rx="2"
        ry="2"
      />

      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
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
      <path d="M2.062 12.348a1 1 0 0 1 0-.696C3.51 8.238 7.04 6 12 6s8.49 2.238 9.938 5.652a1 1 0 0 1 0 .696C20.49 15.762 16.96 18 12 18s-8.49-2.238-9.938-5.652" />

      <circle
        cx="12"
        cy="12"
        r="3"
      />
    </svg>
  );
}

function EyeOffIcon() {
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
      <path d="m2 2 20 20" />

      <path d="M6.713 6.713C4.644 7.84 3.136 9.596 2.062 11.652a1 1 0 0 0 0 .696C3.51 15.762 7.04 18 12 18c1.595 0 3.002-.231 4.238-.64" />

      <path d="M10.73 10.73a2 2 0 0 0 2.54 2.54" />

      <path d="M14.592 5.174C13.78 5.06 12.917 5 12 5c4.96 0 8.49 2.238 9.938 5.652a1 1 0 0 1 0 .696c-.594 1.4-1.42 2.6-2.438 3.572" />
    </svg>
  );
}

function CheckMiniIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}
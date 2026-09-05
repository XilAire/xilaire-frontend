"use client";

import Link from "next/link";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  supabaseCaseUniversity,
} from "@/lib/supabase/client";

type SignInFormProps = {
  redirectTo:
    string;

  status?:
    string | null;

  passwordStatus?:
    string | null;

  authErrorCode?:
    string | null;
};

export default function SignInForm({
  redirectTo,
  status = null,
  passwordStatus = null,
  authErrorCode = null,
}: SignInFormProps) {
  const router =
    useRouter();

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    showPassword,
    setShowPassword,
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

  const passwordUpdated =
    passwordStatus ===
    "updated";

  const signedOut =
    status ===
    "signed_out";

  const authError =
    getAuthErrorMessage(
      authErrorCode,
    );

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

    setIsSubmitting(
      true,
    );

    try {
      const {
        error,
      } =
        await supabaseCaseUniversity.auth.signInWithPassword(
          {
            email:
              email.trim(),

            password,
          },
        );

      if (
        error
      ) {
        setErrorMessage(
          "The email or password you entered is incorrect.",
        );

        return;
      }

      router.replace(
        redirectTo,
      );

      router.refresh();
    } catch (
      error
    ) {
      console.error(
        "Unable to sign in to CASE University",
        error,
      );

      setErrorMessage(
        "Unable to sign in right now. Please try again.",
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
      {passwordUpdated ? (
        <SuccessMessage
          title="Password updated"
          message="Your password has been updated successfully. Sign in with your new password."
        />
      ) : null}

      {signedOut ? (
        <SuccessMessage
          title="Signed out"
          message="You have been signed out of CASE University successfully."
        />
      ) : null}

      {authError ? (
        <div
          role="alert"
          className="
            rounded-xl
            border
            border-amber-200
            bg-amber-50
            px-4
            py-3

            dark:border-amber-900/60
            dark:bg-amber-950/30
          "
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
              <AlertIcon />
            </span>

            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                Sign-in link unavailable
              </p>

              <p className="mt-1 text-sm leading-5 text-amber-700 dark:text-amber-300">
                {authError}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-semibold text-[var(--text-primary)]"
        >
          Email
        </label>

        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={
            email
          }
          onChange={(
            event,
          ) =>
            setEmail(
              event.target.value,
            )
          }
          disabled={
            isSubmitting
          }
          placeholder="you@example.com"
          className="
            mt-2
            block
            w-full
            rounded-xl
            border
            border-[var(--border-default)]
            bg-[var(--surface-muted)]
            px-4
            py-3
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
      </div>

      <div>
        <div className="flex items-center justify-between gap-4">
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-[var(--text-primary)]"
          >
            Password
          </label>

          <Link
            href="/auth/forgot-password"
            className="
              text-sm
              font-semibold
              text-[var(--primary)]
              transition
              hover:text-[var(--primary-hover)]
            "
          >
            Forgot password?
          </Link>
        </div>

        <div className="relative mt-2">
          <input
            id="password"
            name="password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            autoComplete="current-password"
            required
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
            placeholder="Enter your password"
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

          <button
            type="button"
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
            aria-label={
              showPassword
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
            {showPassword ? (
              <EyeOffIcon />
            ) : (
              <EyeIcon />
            )}
          </button>
        </div>
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

      <button
        type="submit"
        disabled={
          isSubmitting
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
          disabled:opacity-60
          sm:text-base
        "
      >
        {isSubmitting
          ? "Signing in..."
          : "Sign in"}
      </button>
    </form>
  );
}

function SuccessMessage({
  title,
  message,
}: {
  title:
    string;

  message:
    string;
}) {
  return (
    <div
      role="status"
      className="
        rounded-xl
        border
        border-emerald-200
        bg-emerald-50
        px-4
        py-3

        dark:border-emerald-900/60
        dark:bg-emerald-950/30
      "
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
          <CheckIcon />
        </span>

        <div>
          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
            {title}
          </p>

          <p className="mt-1 text-sm leading-5 text-emerald-700 dark:text-emerald-300">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

function getAuthErrorMessage(
  error:
    string | null,
) {
  switch (
    error
  ) {
    case "auth_link_invalid":
      return "This authentication link is invalid, expired, or has already been used. Request a new password reset link and try again.";

    case "auth_callback_failed":
      return "We could not complete the authentication request. Please request a new password reset link and try again.";

    default:
      return null;
  }
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

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v4"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 17h.01"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.3 4.4L2.8 17.2A1.9 1.9 0 004.4 20h15.2a1.9 1.9 0 001.6-2.8L13.7 4.4a1.97 1.97 0 00-3.4 0z"
      />
    </svg>
  );
}
"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  requestPasswordResetAction,
} from "@/app/actions/password-recovery";

export default function ForgotPasswordForm() {
  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    submitted,
    setSubmitted,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<string | null>(
      null,
    );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
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
      const result =
        await requestPasswordResetAction(
          email,
        );

      if (
        !result.success
      ) {
        setErrorMessage(
          result.message,
        );

        return;
      }

      setSubmitted(
        true,
      );
    } catch (
      error
    ) {
      console.error(
        "Unable to request CASE University password reset",
        error,
      );

      setErrorMessage(
        "Unable to process the password reset request right now. Please try again.",
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  if (
    submitted
  ) {
    return (
      <div className="space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16v12H4z"
            />

            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 7l8 6 8-6"
            />
          </svg>
        </div>

        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">
            Check your email
          </h3>

          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            If an account exists for that email address, a password reset link has been sent.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSubmitted(
              false,
            );

            setErrorMessage(
              null,
            );
          }}
          className="text-sm font-semibold text-[var(--primary)] transition hover:text-[var(--primary-hover)]"
        >
          Send another reset email
        </button>
      </div>
    );
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
          htmlFor="reset-email"
          className="block text-sm font-semibold text-[var(--text-primary)]"
        >
          Email
        </label>

        <input
          id="reset-email"
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
          {errorMessage}
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
          ? "Sending reset link..."
          : "Send reset link"}
      </button>
    </form>
  );
}
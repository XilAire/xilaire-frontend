"use client";

import {
  useState,
} from "react";

import {
  continuePasswordRecoveryAction,
} from "@/app/actions/password-recovery";

type RecoveryContinueButtonProps = {
  tokenHash:
    string;
};

export default function RecoveryContinueButton({
  tokenHash,
}: RecoveryContinueButtonProps) {
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

  async function handleContinue() {
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
        await continuePasswordRecoveryAction(
          tokenHash,
        );

      if (
        !result.success
      ) {
        setErrorMessage(
          result.message,
        );

        setIsSubmitting(
          false,
        );
      }
    } catch (
      error
    ) {
      /*
       * A successful Next.js redirect is implemented
       * internally as a thrown redirect signal.
       */
      if (
        isNextRedirectError(
          error,
        )
      ) {
        return;
      }

      console.error(
        "Unable to continue CASE University password recovery",
        error,
      );

      setErrorMessage(
        "Unable to continue the password reset right now. Request a new reset link and try again.",
      );

      setIsSubmitting(
        false,
      );
    }
  }

  return (
    <div className="space-y-4">
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
        type="button"
        onClick={
          handleContinue
        }
        disabled={
          isSubmitting
        }
        className="
          flex
          w-full
          items-center
          justify-center
          gap-2
          rounded-xl
          bg-[var(--primary)]
          px-4
          py-3
          text-sm
          font-bold
          text-[var(--primary-foreground)]
          shadow-[var(--shadow-primary)]
          outline-none
          transition
          hover:bg-[var(--primary-hover)]
          focus-visible:ring-2
          focus-visible:ring-[var(--focus-ring)]
          focus-visible:ring-offset-2
          focus-visible:ring-offset-[var(--surface-default)]
          disabled:cursor-not-allowed
          disabled:opacity-60
          sm:text-base
        "
      >
        {isSubmitting ? (
          <>
            <LoadingIcon />

            Verifying reset...
          </>
        ) : (
          <>
            Continue password reset

            <ArrowRightIcon />
          </>
        )}
      </button>

      <p
        className="
          text-center
          text-xs
          leading-5
          text-[var(--text-muted)]
        "
      >
        This step securely verifies your recovery request before allowing a password change.
      </p>
    </div>
  );
}

function isNextRedirectError(
  error:
    unknown,
) {
  if (
    typeof error !==
      "object" ||
    error ===
      null
  ) {
    return false;
  }

  const digest =
    "digest" in error
      ? (
          error as {
            digest?: unknown;
          }
        ).digest
      : undefined;

  return (
    typeof digest ===
      "string" &&
    digest.startsWith(
      "NEXT_REDIRECT",
    )
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12h14"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m13 6 6 6-6 6"
      />
    </svg>
  );
}

function LoadingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4 animate-spin"
      aria-hidden="true"
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
        d="M21 12a9 9 0 00-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
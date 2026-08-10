"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useFormStatus,
} from "react-dom";

import {
  verifyMfaChallengeAction,
} from "@/actions/auth/mfa";

import AuthTransitionOverlay from "@/components/auth/AuthTransitionOverlay";

import {
  initialMfaChallengeActionState,
  normalizeMfaVerificationCode,
  type MfaChallengeActionFieldErrors,
} from "@/types/auth/mfa";

const DEFAULT_AUTHENTICATED_ROUTE =
  "/dashboard";

export type MfaChallengeFormProps = {
  factorId:
    string;

  friendlyName?:
    string | null;

  redirectTo?:
    string;
};

export default function MfaChallengeForm({
  factorId,
  friendlyName,
  redirectTo =
    DEFAULT_AUTHENTICATED_ROUTE,
}: MfaChallengeFormProps) {
  const [
    code,
    setCode,
  ] = useState("");

  const [
    isCompletingVerification,
    setIsCompletingVerification,
  ] = useState(false);

  const [
    state,
    formAction,
  ] = useActionState(
    verifyMfaChallengeAction,
    {
      ...initialMfaChallengeActionState,

      factorId,
    },
  );

  const verified =
    state?.verified ===
      true &&
    state?.success ===
      true;

  const actionMessage =
    typeof state?.message ===
    "string"
      ? state.message
      : "";

  const fieldErrors:
    MfaChallengeActionFieldErrors =
      state?.fieldErrors ??
      {};

  const normalizedCode =
    useMemo(
      () =>
        normalizeMfaVerificationCode(
          code,
        ),
      [code],
    );

  const isCodeComplete =
    normalizedCode.length ===
    6;

  const safeRedirectTo =
    useMemo(
      () =>
        getSafeRedirectPath(
          redirectTo,
        ) ??
        DEFAULT_AUTHENTICATED_ROUTE,
      [redirectTo],
    );

  useEffect(
    () => {
      if (
        !verified
      ) {
        return;
      }

      setIsCompletingVerification(
        true,
      );

      /*
       * MFA verification changes the Supabase session from
       * AAL1 to AAL2.
       *
       * Use a full document navigation so the next request is
       * evaluated by the CASE Budget server/proxy with the newly
       * elevated authentication session.
       */
      window.location.replace(
        safeRedirectTo,
      );
    },
    [
      safeRedirectTo,
      verified,
    ],
  );

  return (
    <>
      <AuthTransitionOverlay
        open={
          isCompletingVerification ||
          verified
        }
        title="Verification complete"
        message="CASE Budget is securely opening your protected financial workspace."
        statusText="Finishing secure sign-in"
      />

      <section className="space-y-6">
        <header>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
            <ShieldCheckIcon />
          </div>

          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
            Multi-factor authentication
          </p>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Verify your identity
          </h1>

          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            Enter the current six-digit
            code from your authenticator
            app to continue to CASE
            Budget.
          </p>
        </header>

        {friendlyName ? (
          <AuthenticatorCard
            friendlyName={
              friendlyName
            }
          />
        ) : null}

        {!verified &&
        actionMessage ? (
          <AuthMessage
            message={
              actionMessage
            }
          />
        ) : null}

        <form
          action={formAction}
          className="space-y-5"
          noValidate
        >
          <input
            type="hidden"
            name="factorId"
            value={factorId}
          />

          {state?.challengeId ? (
            <input
              type="hidden"
              name="challengeId"
              value={
                state.challengeId
              }
            />
          ) : null}

          <div>
            <label
              htmlFor="mfa-code"
              className="text-sm font-bold text-[var(--text-primary)]"
            >
              Authenticator code
            </label>

            <div className="relative mt-2">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-[var(--text-muted)]">
                <KeyIcon />
              </span>

              <input
                id="mfa-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={7}
                value={
                  formatVerificationCode(
                    code,
                  )
                }
                onChange={(
                  event,
                ) => {
                  const nextCode =
                    normalizeMfaVerificationCode(
                      event.target.value,
                    ).slice(
                      0,
                      6,
                    );

                  setCode(
                    nextCode,
                  );
                }}
                placeholder="123 456"
                aria-invalid={
                  Boolean(
                    fieldErrors.code,
                  )
                }
                aria-describedby={
                  fieldErrors.code
                    ? "mfa-code-error"
                    : "mfa-code-description"
                }
                className={getCodeInputClassName(
                  Boolean(
                    fieldErrors.code,
                  ),
                )}
              />
            </div>

            <p
              id="mfa-code-description"
              className="mt-2 text-xs leading-5 text-[var(--text-muted)]"
            >
              Open your authenticator app
              and enter the current code
              shown for CASE Budget.
            </p>

            {fieldErrors.code ? (
              <FieldError
                id="mfa-code-error"
                message={
                  fieldErrors.code
                }
              />
            ) : null}
          </div>

          <VerifyButton
            codeComplete={
              isCodeComplete
            }
          />
        </form>

        <SecurityNotice />

        <footer className="border-t border-[var(--border-subtle)] pt-5">
          <p className="text-center text-xs leading-5 text-[var(--text-muted)]">
            Having trouble with your
            authenticator?{" "}
            <Link
              href="/support"
              className="rounded font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              Contact support
            </Link>
          </p>
        </footer>
      </section>
    </>
  );
}

function VerifyButton({
  codeComplete,
}: {
  codeComplete:
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
        pending ||
        !codeComplete
      }
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <LoadingSpinner />

          Verifying...
        </>
      ) : (
        <>
          Verify and continue

          <ArrowRightIcon />
        </>
      )}
    </button>
  );
}

function AuthenticatorCard({
  friendlyName,
}: {
  friendlyName:
    string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-default)] text-[var(--primary)]">
          <AuthenticatorIcon />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Authenticator
          </p>

          <p className="mt-1 truncate text-sm font-bold text-[var(--text-primary)]">
            {friendlyName}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-1.5 text-xs font-bold text-[var(--success)]">
          <span className="h-2 w-2 rounded-full bg-[var(--success)]" />

          Active
        </div>
      </div>
    </div>
  );
}

function SecurityNotice() {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-[var(--primary)]">
          <LockIcon />
        </span>

        <p className="text-xs leading-5 text-[var(--text-muted)]">
          Your authenticator code is
          used only to verify this secure
          sign-in. CASE Budget does not
          store the six-digit code.
        </p>
      </div>
    </div>
  );
}

function AuthMessage({
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

function FieldError({
  id,
  message,
}: {
  id:
    string;

  message:
    string;
}) {
  return (
    <p
      id={id}
      role="alert"
      className="mt-2 text-xs font-medium text-[var(--danger)]"
    >
      {message}
    </p>
  );
}

function getCodeInputClassName(
  hasError:
    boolean,
) {
  return [
    "min-h-14 w-full rounded-xl border bg-[var(--surface-muted)] py-3 pl-12 pr-4 text-center text-xl font-bold tracking-[0.28em] text-[var(--text-primary)] outline-none transition placeholder:text-base placeholder:font-medium placeholder:tracking-[0.18em] placeholder:text-[var(--text-muted)]",
    hasError
      ? "border-[var(--danger)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--danger)_20%,transparent)]"
      : "border-[var(--border-subtle)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]",
  ].join(
    " ",
  );
}

function formatVerificationCode(
  value:
    string,
) {
  const normalizedValue =
    normalizeMfaVerificationCode(
      value,
    ).slice(
      0,
      6,
    );

  if (
    normalizedValue.length <=
    3
  ) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(
    0,
    3,
  )} ${normalizedValue.slice(
    3,
  )}`;
}

function getSafeRedirectPath(
  value:
    string | null | undefined,
) {
  if (
    !value
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  if (
    !normalizedValue.startsWith(
      "/",
    ) ||
    normalizedValue.startsWith(
      "//",
    ) ||
    normalizedValue.includes(
      "\\",
    )
  ) {
    return null;
  }

  return normalizedValue;
}

function LoadingSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />

      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-90"
      />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="15"
        r="4"
      />

      <path d="m11 12 8-8" />
      <path d="m17 6 2 2" />
      <path d="m15 8 2 2" />
    </svg>
  );
}

function AuthenticatorIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="6"
        y="2"
        width="12"
        height="20"
        rx="2"
      />

      <path d="M10 6h4" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function LockIcon() {
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
      <rect
        x="4"
        y="10"
        width="16"
        height="10"
        rx="2"
      />

      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function ArrowRightIcon() {
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
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
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
"use client";

import Link from "next/link";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
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

import {
  initialMfaChallengeActionState,
} from "@/types/auth/mfa";

const DEFAULT_AUTHENTICATED_ROUTE =
  "/dashboard";

type MfaChallengeFormProps = {
  factorId:
    string;

  friendlyName?:
    string | null;

  redirectTo?:
    string | null;

  title?:
    string;

  description?:
    string;
};

export default function MfaChallengeForm({
  factorId,
  friendlyName,
  redirectTo,
  title =
    "Verify your identity",
  description =
    "Enter the current six-digit code from your authenticator app to continue.",
}: MfaChallengeFormProps) {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const [
    code,
    setCode,
  ] = useState("");

  const initialState =
    useMemo(
      () => ({
        ...initialMfaChallengeActionState,

        factorId:
          factorId ||
          null,
      }),
      [
        factorId,
      ],
    );

  const [
    state,
    formAction,
  ] = useActionState(
    verifyMfaChallengeAction,
    initialState,
  );

  const normalizedCode =
    useMemo(
      () =>
        code
          .replace(
            /\D/g,
            "",
          )
          .slice(
            0,
            6,
          ),
      [
        code,
      ],
    );

  const nextPath =
    useMemo(
      () =>
        getSafeNextPath(
          redirectTo ??
            searchParams.get(
              "redirectTo",
            ) ??
            searchParams.get(
              "next",
            ),
        ) ??
        DEFAULT_AUTHENTICATED_ROUTE,
      [
        redirectTo,
        searchParams,
      ],
    );

  const actionSuccess =
    state?.success ===
    true;

  const verified =
    state?.verified ===
    true;

  const actionMessage =
    typeof state?.message ===
    "string"
      ? state.message
      : "";

  const codeError =
    state?.fieldErrors
      ?.code;

  const canSubmit =
    normalizedCode.length ===
    6;

  useEffect(
    () => {
      if (
        !actionSuccess ||
        !verified
      ) {
        return;
      }

      const timeout =
        window.setTimeout(
          () => {
            router.replace(
              nextPath,
            );

            router.refresh();
          },
          650,
        );

      return () => {
        window.clearTimeout(
          timeout,
        );
      };
    },
    [
      actionSuccess,
      nextPath,
      router,
      verified,
    ],
  );

  if (
    !factorId
  ) {
    return (
      <MfaChallengeUnavailable />
    );
  }

  if (
    actionSuccess &&
    verified
  ) {
    return (
      <MfaChallengeSuccess
        destination={
          nextPath
        }
      />
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
          Security verification
        </p>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {title}
        </h1>

        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          {description}
        </p>
      </div>

      <SecurityLevelCard />

      {friendlyName ? (
        <AuthenticatorCard
          friendlyName={
            friendlyName
          }
        />
      ) : null}

      {actionMessage &&
      !actionSuccess ? (
        <AuthMessage
          type="error"
          message={
            actionMessage
          }
        />
      ) : null}

      <form
        action={
          formAction
        }
        className="space-y-5"
        noValidate
      >
        <input
          type="hidden"
          name="factorId"
          value={
            factorId
          }
        />

        <input
          type="hidden"
          name="challengeId"
          value={
            state?.challengeId ??
            ""
          }
        />

        <div>
          <label
            htmlFor="code"
            className="text-sm font-bold text-[var(--text-primary)]"
          >
            Authentication code
          </label>

          <div className="relative mt-2">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-[var(--text-muted)]">
              <AuthenticatorIcon />
            </span>

            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={7}
              autoFocus
              value={
                formatVerificationCode(
                  normalizedCode,
                )
              }
              onChange={(
                event,
              ) => {
                const nextCode =
                  event.target.value
                    .replace(
                      /\D/g,
                      "",
                    )
                    .slice(
                      0,
                      6,
                    );

                setCode(
                  nextCode,
                );
              }}
              onPaste={(
                event,
              ) => {
                const pastedValue =
                  event.clipboardData
                    .getData(
                      "text",
                    )
                    .replace(
                      /\D/g,
                      "",
                    )
                    .slice(
                      0,
                      6,
                    );

                if (
                  !pastedValue
                ) {
                  return;
                }

                event.preventDefault();

                setCode(
                  pastedValue,
                );
              }}
              aria-invalid={
                Boolean(
                  codeError,
                )
              }
              aria-describedby={
                codeError
                  ? "mfa-challenge-code-error mfa-challenge-code-description"
                  : "mfa-challenge-code-description"
              }
              placeholder="123 456"
              className={getCodeInputClassName(
                Boolean(
                  codeError,
                ),
              )}
            />
          </div>

          <p
            id="mfa-challenge-code-description"
            className="mt-2 text-xs leading-5 text-[var(--text-muted)]"
          >
            Enter the current six-digit code generated by your authenticator
            app.
          </p>

          {codeError ? (
            <FieldError
              id="mfa-challenge-code-error"
              message={
                codeError
              }
            />
          ) : null}
        </div>

        <VerifyButton
          disabled={
            !canSubmit
          }
        />
      </form>

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 text-[var(--primary)]">
            <ClockIcon />
          </span>

          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Codes change automatically
            </p>

            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              Authenticator codes normally refresh about every 30 seconds.
              If a code is rejected near the end of its timer, wait for the
              next code and try again.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Link
          href="/dashboard"
          className="rounded text-sm font-bold text-[var(--text-muted)] outline-none transition hover:text-[var(--text-primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          Return to dashboard
        </Link>
      </div>
    </section>
  );
}

function SecurityLevelCard() {
  return (
    <div className="rounded-2xl border border-[color-mix(in_srgb,var(--primary)_18%,transparent)] bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
          <ShieldIcon />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--text-primary)]">
            Additional verification required
          </p>

          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Your password has already been verified. Complete MFA to raise this
            session to the security level required for sensitive CASE Budget
            features.
          </p>
        </div>
      </div>
    </div>
  );
}

function AuthenticatorCard({
  friendlyName,
}: {
  friendlyName:
    string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-[var(--primary)]">
          <AuthenticatorIcon />
        </span>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Authenticator
          </p>

          <p className="mt-1 truncate text-sm font-bold text-[var(--text-primary)]">
            {friendlyName}
          </p>
        </div>
      </div>
    </div>
  );
}

function MfaChallengeSuccess({
  destination,
}: {
  destination:
    string;
}) {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[color-mix(in_srgb,var(--success)_25%,transparent)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)] p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]">
            <ShieldCheckIcon />
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Identity verified
            </h2>

            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Multi-factor authentication was completed successfully. Your
              current CASE Budget session is now protected at AAL2.
            </p>
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)]"
        role="status"
        aria-live="polite"
      >
        <LoadingSpinner />

        Continuing securely...
      </div>

      <noscript>
        <Link
          href={
            destination
          }
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white"
        >
          Continue
        </Link>
      </noscript>
    </section>
  );
}

function MfaChallengeUnavailable() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[color-mix(in_srgb,var(--danger)_25%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]">
            <AlertIcon />
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Authenticator unavailable
            </h2>

            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              CASE Budget could not determine which authenticator should be
              used for this verification request.
            </p>
          </div>
        </div>
      </div>

      <Link
        href="/dashboard"
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
      >
        Return to dashboard
      </Link>
    </section>
  );
}

function VerifyButton({
  disabled,
}: {
  disabled:
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
        disabled
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
          Verify identity

          <ShieldCheckIcon />
        </>
      )}
    </button>
  );
}

function AuthMessage({
  type,
  message,
}: {
  type:
    | "error"
    | "success";

  message:
    string;
}) {
  const isError =
    type ===
    "error";

  return (
    <div
      role={
        isError
          ? "alert"
          : "status"
      }
      className={[
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-5",
        isError
          ? "border-[color-mix(in_srgb,var(--danger)_25%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] text-[var(--danger)]"
          : "border-[color-mix(in_srgb,var(--success)_25%,transparent)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)] text-[var(--success)]",
      ].join(
        " ",
      )}
    >
      <span className="mt-0.5 shrink-0">
        {isError ? (
          <AlertIcon />
        ) : (
          <ShieldCheckIcon />
        )}
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
      id={
        id
      }
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
    "min-h-14 w-full rounded-xl border bg-[var(--surface-muted)] py-3 pl-11 pr-4 text-center text-xl font-bold tracking-[0.25em] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] placeholder:tracking-[0.2em]",
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
  if (
    value.length <=
    3
  ) {
    return value;
  }

  return `${value.slice(
    0,
    3,
  )} ${value.slice(
    3,
    6,
  )}`;
}

function getSafeNextPath(
  value:
    string | null,
) {
  if (
    !value
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  if (
    !normalizedValue ||
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

  try {
    const parsedUrl =
      new URL(
        normalizedValue,
        "http://case-budget.local",
      );

    if (
      parsedUrl.origin !==
      "http://case-budget.local"
    ) {
      return null;
    }

    return `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return null;
  }
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

      <path d="M9 11h.01" />
      <path d="M12 11h.01" />
      <path d="M15 11h.01" />

      <path d="M9 14h.01" />
      <path d="M12 14h.01" />
      <path d="M15 14h.01" />

      <path d="M11 18h2" />
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
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6Z" />

      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function ShieldCheckIcon() {
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

      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function AlertIcon() {
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
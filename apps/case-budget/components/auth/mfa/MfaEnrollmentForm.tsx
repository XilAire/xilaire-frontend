"use client";

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
  enrollTotpAction,
  verifyTotpEnrollmentAction,
} from "@/actions/auth/mfa";

import AuthTransitionOverlay from "@/components/auth/AuthTransitionOverlay";

import {
  initialMfaEnrollmentActionState,
  type MfaEnrollmentActionState,
} from "@/types/auth/mfa";

export default function MfaEnrollmentForm() {
  const [
    enrollmentState,
    enrollmentAction,
  ] = useActionState(
    enrollTotpAction,
    initialMfaEnrollmentActionState,
  );

  const [
    verificationState,
    verificationAction,
  ] = useActionState(
    verifyTotpEnrollmentAction,
    enrollmentState,
  );

  const activeState =
    getActiveState({
      enrollmentState,
      verificationState,
    });

  const enrollment =
    activeState.enrollment;

  const challenge =
    activeState.challenge;

  const verified =
    activeState.verified;

  const [
    copiedSecret,
    setCopiedSecret,
  ] = useState(false);

  const [
    code,
    setCode,
  ] = useState("");

  const [
    isCompletingEnrollment,
    setIsCompletingEnrollment,
  ] = useState(false);

  const normalizedCode =
    useMemo(
      () =>
        code.replace(
          /\D/g,
          "",
        ),
      [code],
    );

  const isVerificationCodeComplete =
    normalizedCode.length ===
    6;

  useEffect(() => {
    if (
      !copiedSecret
    ) {
      return;
    }

    const timeout =
      window.setTimeout(
        () => {
          setCopiedSecret(
            false,
          );
        },
        2000,
      );

    return () => {
      window.clearTimeout(
        timeout,
      );
    };
  }, [
    copiedSecret,
  ]);

  useEffect(
    () => {
      if (
        !verified
      ) {
        return;
      }

      setIsCompletingEnrollment(
        true,
      );

      /*
       * TOTP enrollment verification elevates the current Supabase
       * session to AAL2.
       *
       * Perform a full document reload so the server/proxy immediately
       * evaluates the newly elevated session.
       *
       * When this component is rendered on /mfa, the server page will
       * detect AAL2 and redirect to the requested authenticated route.
       *
       * When the same component is rendered inside Security settings,
       * the page reloads and renders the verified-factor state.
       */
      window.location.replace(
        window.location.href,
      );
    },
    [
      verified,
    ],
  );

  if (
    verified
  ) {
    return (
      <>
        <AuthTransitionOverlay
          open={
            isCompletingEnrollment ||
            verified
          }
          title="MFA enabled"
          message="CASE Budget is securely applying your new multi-factor authentication protection."
          statusText="Updating your secure session"
        />

        <MfaEnrollmentSuccess />
      </>
    );
  }

  if (
    !enrollment
  ) {
    return (
      <EnrollmentStartStep
        state={
          enrollmentState
        }
        action={
          enrollmentAction
        }
      />
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
          Multi-factor authentication
        </p>

        <h2 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Scan the authenticator QR code
        </h2>

        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          Open your authenticator app and scan the QR code below.
          Then enter the current six-digit code to finish enabling MFA.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5">
        <div className="flex flex-col items-center">
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-white p-4 shadow-sm">
            <QrCodeImage
              qrCode={
                enrollment.qrCode
              }
            />
          </div>

          <p className="mt-4 text-center text-xs leading-5 text-[var(--text-muted)]">
            Scan this code with Microsoft Authenticator, Google Authenticator,
            1Password, Authy, or another compatible TOTP app.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Can&apos;t scan the QR code?
            </p>

            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              Enter this setup key manually in your authenticator app.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              copySecret({
                secret:
                  enrollment.secret,

                onCopied() {
                  setCopiedSecret(
                    true,
                  );
                },
              })
            }
            className="shrink-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            {copiedSecret
              ? "Copied"
              : "Copy"}
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3">
          <code className="break-all text-sm font-semibold tracking-[0.08em] text-[var(--text-primary)]">
            {enrollment.secret}
          </code>
        </div>

        <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
          Treat this setup key like a password. Do not share it or save it in
          screenshots, notes, tickets, or email.
        </p>
      </div>

      {activeState.message &&
      !activeState.success ? (
        <AuthMessage
          type="error"
          message={
            activeState.message
          }
        />
      ) : null}

      <form
        action={
          verificationAction
        }
        className="space-y-5"
        noValidate
      >
        <input
          type="hidden"
          name="factorId"
          value={
            enrollment.factorId
          }
        />

        <input
          type="hidden"
          name="challengeId"
          value={
            challenge
              ?.challengeId ??
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

          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={7}
            value={
              formatVerificationCode(
                normalizedCode,
              )
            }
            onChange={(
              event,
            ) => {
              const nextValue =
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
                nextValue,
              );
            }}
            aria-invalid={
              Boolean(
                activeState
                  .fieldErrors
                  .code,
              )
            }
            aria-describedby={
              activeState
                .fieldErrors
                .code
                ? "mfa-code-error"
                : "mfa-code-description"
            }
            placeholder="123 456"
            className={getInputClassName(
              Boolean(
                activeState
                  .fieldErrors
                  .code,
              ),
            )}
          />

          <p
            id="mfa-code-description"
            className="mt-2 text-xs leading-5 text-[var(--text-muted)]"
          >
            Enter the current six-digit code shown in your authenticator app.
          </p>

          {activeState
            .fieldErrors
            .code ? (
            <FieldError
              id="mfa-code-error"
              message={
                activeState
                  .fieldErrors
                  .code
              }
            />
          ) : null}
        </div>

        <VerificationButton
          disabled={
            !isVerificationCodeComplete
          }
        />
      </form>

      <div className="rounded-xl border border-[color-mix(in_srgb,var(--primary)_18%,transparent)] bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 text-[var(--primary)]">
            <ShieldIcon />
          </span>

          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Why CASE Budget uses MFA
            </p>

            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              MFA adds another layer of protection to sensitive financial
              actions such as connecting financial accounts and changing
              security settings.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function EnrollmentStartStep({
  state,
  action,
}: {
  state:
    MfaEnrollmentActionState;

  action:
    (
      payload:
        FormData,
    ) => void;
}) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
          Multi-factor authentication
        </p>

        <h2 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Protect your CASE Budget account
        </h2>

        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          Add an authenticator app to strengthen your account and protect
          sensitive financial features.
        </p>
      </div>

      {state.message &&
      !state.success ? (
        <AuthMessage
          type="error"
          message={
            state.message
          }
        />
      ) : null}

      <form
        action={action}
        className="space-y-5"
        noValidate
      >
        <div>
          <label
            htmlFor="friendlyName"
            className="text-sm font-bold text-[var(--text-primary)]"
          >
            Authenticator name
          </label>

          <input
            id="friendlyName"
            name="friendlyName"
            type="text"
            autoComplete="off"
            maxLength={100}
            placeholder="My authenticator"
            aria-invalid={
              Boolean(
                state
                  .fieldErrors
                  .friendlyName,
              )
            }
            aria-describedby={
              state
                .fieldErrors
                .friendlyName
                ? "friendly-name-error"
                : "friendly-name-description"
            }
            className={getInputClassName(
              Boolean(
                state
                  .fieldErrors
                  .friendlyName,
              ),
            )}
          />

          <p
            id="friendly-name-description"
            className="mt-2 text-xs leading-5 text-[var(--text-muted)]"
          >
            Optional. This helps you recognize the authenticator later.
          </p>

          {state
            .fieldErrors
            .friendlyName ? (
            <FieldError
              id="friendly-name-error"
              message={
                state
                  .fieldErrors
                  .friendlyName
              }
            />
          ) : null}
        </div>

        <EnrollmentButton />
      </form>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 text-[var(--primary)]">
            <AuthenticatorIcon />
          </span>

          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              You&apos;ll need an authenticator app
            </p>

            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              CASE Budget uses time-based one-time passwords (TOTP). Any
              compatible authenticator app can generate the six-digit codes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function MfaEnrollmentSuccess() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[color-mix(in_srgb,var(--success)_25%,transparent)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)] p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]">
            <ShieldCheckIcon />
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Multi-factor authentication enabled
            </h2>

            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Your authenticator has been verified and your current CASE
              Budget session is protected at AAL2.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
        <p className="text-sm font-bold text-[var(--text-primary)]">
          Keep your authenticator available
        </p>

        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          You may be asked for a new verification code when signing in again
          or before performing sensitive financial actions.
        </p>
      </div>
    </section>
  );
}

function EnrollmentButton() {
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
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <LoadingSpinner />

          Starting setup...
        </>
      ) : (
        <>
          Set up authenticator

          <ArrowRightIcon />
        </>
      )}
    </button>
  );
}

function VerificationButton({
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
          Verify and enable MFA

          <ShieldCheckIcon />
        </>
      )}
    </button>
  );
}

function QrCodeImage({
  qrCode,
}: {
  qrCode:
    string;
}) {
  return (
    <img
      src={
        qrCode
      }
      alt="QR code for CASE Budget authenticator enrollment"
      width={220}
      height={220}
      className="h-[220px] w-[220px] object-contain"
    />
  );
}

async function copySecret({
  secret,
  onCopied,
}: {
  secret:
    string;

  onCopied:
    () => void;
}) {
  try {
    await navigator.clipboard.writeText(
      secret,
    );

    onCopied();
  } catch {
    /*
     * Clipboard access may be unavailable in some browser
     * contexts. The setup key remains visible for manual copy.
     */
  }
}

function getActiveState({
  enrollmentState,
  verificationState,
}: {
  enrollmentState:
    MfaEnrollmentActionState;

  verificationState:
    MfaEnrollmentActionState;
}) {
  if (
    verificationState.verified
  ) {
    return verificationState;
  }

  if (
    verificationState.enrollment
  ) {
    return verificationState;
  }

  return enrollmentState;
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

function getInputClassName(
  hasError:
    boolean,
) {
  return [
    "mt-2 min-h-12 w-full rounded-xl border bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)]",
    hasError
      ? "border-[var(--danger)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--danger)_20%,transparent)]"
      : "border-[var(--border-subtle)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]",
  ].join(
    " ",
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

function AuthenticatorIcon() {
  return (
    <svg
      width="20"
      height="20"
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

"use client";

import Link from "next/link";

import CaseBudgetLogo from "@/components/branding/CaseBudgetLogo";
import {
  useActionState,
} from "react";
import {
  useFormStatus,
} from "react-dom";

import {
  resetPasswordAction,
} from "@/actions/auth/reset-password";

import {
  initialResetPasswordActionState,
} from "@/types/auth/reset-password-action";

import type {
  ResetPasswordActionFieldErrors,
} from "@/types/auth/reset-password-action";

export default function ForgotPasswordPage() {
  const [
    state,
    formAction,
  ] = useActionState(
    resetPasswordAction,
    initialResetPasswordActionState,
  );

  const actionSuccess =
    state?.success === true;

  const actionMessage =
    typeof state?.message ===
    "string"
      ? state.message
      : "";

  const fieldErrors:
    ResetPasswordActionFieldErrors =
      state?.fieldErrors ?? {};

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(460px,0.82fr)]">
        <AuthBrandPanel />

        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10 xl:px-14">
          <div className="w-full max-w-md">
            <MobileBrand />

            <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-xl shadow-black/5 sm:p-8">
              {actionSuccess ? (
                <ResetEmailSentState
                  message={
                    actionMessage
                  }
                />
              ) : (
                <>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
                      Password recovery
                    </p>

                    <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                      Reset your password
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                      Enter the email
                      address associated
                      with your CASE
                      Budget account. We
                      will send you a
                      secure password
                      reset link.
                    </p>
                  </div>

                  {actionMessage ? (
                    <AuthMessage
                      type="error"
                      message={
                        actionMessage
                      }
                    />
                  ) : null}

                  <form
                    action={formAction}
                    className="mt-7 space-y-5"
                    noValidate
                  >
                    <div>
                      <label
                        htmlFor="email"
                        className="text-sm font-bold text-[var(--text-primary)]"
                      >
                        Email address
                      </label>

                      <div className="relative mt-2">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-[var(--text-muted)]">
                          <EmailIcon />
                        </span>

                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          autoCapitalize="none"
                          spellCheck={false}
                          aria-invalid={
                            Boolean(
                              fieldErrors.email,
                            )
                          }
                          aria-describedby={
                            fieldErrors.email
                              ? "email-error"
                              : "email-description"
                          }
                          className={getInputClassName(
                            Boolean(
                              fieldErrors.email,
                            ),
                          )}
                          placeholder="you@example.com"
                        />
                      </div>

                      <p
                        id="email-description"
                        className="mt-2 text-xs leading-5 text-[var(--text-muted)]"
                      >
                        For your security,
                        we will not confirm
                        whether an account
                        exists for the
                        address entered.
                      </p>

                      {fieldErrors.email ? (
                        <FieldError
                          id="email-error"
                          message={
                            fieldErrors.email
                          }
                        />
                      ) : null}
                    </div>

                    <ResetPasswordButton />
                  </form>

                  <div className="mt-7 border-t border-[var(--border-subtle)] pt-6">
                    <Link
                      href="/sign-in"
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    >
                      <ArrowLeftIcon />

                      Back to sign in
                    </Link>
                  </div>
                </>
              )}
            </div>

            <AuthFooter />
          </div>
        </section>
      </div>
    </main>
  );
}

function ResetPasswordButton() {
  const {
    pending,
  } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <LoadingSpinner />

          Sending reset link...
        </>
      ) : (
        <>
          Send reset link

          <ArrowRightIcon />
        </>
      )}
    </button>
  );
}

function ResetEmailSentState({
  message,
}: {
  message: string;
}) {
  return (
    <div>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]">
        <EmailCheckIcon />
      </div>

      <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[var(--success)]">
        Check your email
      </p>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
        Password reset link
        sent
      </h1>

      <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
        {message ||
          "If an account exists for that email address, a password reset email has been sent."}
      </p>

      <div className="mt-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
            <InformationIcon />
          </div>

          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Didn&apos;t receive
              the email?
            </p>

            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              Check your spam or
              junk folder. Delivery
              may take a few
              minutes. Reset links
              expire for security,
              so request another one
              if the link is no
              longer valid.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-7 space-y-3">
        <Link
          href="/sign-in"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
        >
          Return to sign in

          <ArrowRightIcon />
        </Link>

        <Link
          href="/forgot-password"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          Send another reset
          link
        </Link>
      </div>
    </div>
  );
}

function AuthBrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-[var(--primary)] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
      <div
        aria-hidden="true"
        className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="absolute -bottom-28 -left-24 h-96 w-96 rounded-full bg-black/10 blur-3xl"
      />

      <div className="relative z-10">
        <BrandMark />

        <div className="mt-16 max-w-xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/70">
            Secure account
            recovery
          </p>

          <h2 className="mt-5 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Get back to your
            financial plan securely.
          </h2>

          <p className="mt-6 max-w-lg text-base leading-7 text-white/80 xl:text-lg">
            CASE Budget protects
            your financial workspace
            with secure recovery
            links, session controls,
            and optional
            multi-factor
            authentication.
          </p>
        </div>

        <div className="mt-10 space-y-4">
          <SecurityFeature
            icon={
              <LinkIcon />
            }
            title="Single-use recovery flow"
            description="Your password-reset link creates a protected recovery session."
          />

          <SecurityFeature
            icon={
              <ShieldIcon />
            }
            title="Account information stays private"
            description="We never reveal whether an email address is registered."
          />

          <SecurityFeature
            icon={
              <ClockIcon />
            }
            title="Time-limited access"
            description="Recovery links expire automatically to reduce security risk."
          />
        </div>
      </div>

      <p className="relative z-10 mt-12 text-xs font-medium text-white/60">
        © 2026 XilAire
        Technologies. All rights
        reserved.
      </p>
    </aside>
  );
}

type SecurityFeatureProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

function SecurityFeature({
  icon,
  title,
  description,
}: SecurityFeatureProps) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-bold">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-white/70">
          {description}
        </p>
      </div>
    </div>
  );
}

function MobileBrand() {
  return (
    <div className="mb-7 lg:hidden">
      <BrandMark
        compact
      />
    </div>
  );
}

function BrandMark({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="CASE Budget home"
      className={[
        "inline-flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2",
        compact
          ? "text-[var(--text-primary)] focus-visible:ring-[var(--primary)]"
          : "text-white focus-visible:ring-white",
      ].join(" ")}
    >
      <CaseBudgetLogo
        variant={
          compact
            ? "auto"
            : "light"
        }
        size={
          compact
            ? "sm"
            : "md"
        }
        alt="CASE Budget"
      />

      <span>
        <span className="block text-lg font-black tracking-tight">
          CASE Budget
        </span>

        <span
          className={[
            "block text-[10px] font-bold uppercase tracking-[0.16em]",
            compact
              ? "text-[var(--text-muted)]"
              : "text-white/65",
          ].join(" ")}
        >
          XilAire Technologies
        </span>
      </span>
    </Link>
  );
}

function AuthFooter() {
  return (
    <footer className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[var(--text-muted)]">
      <Link
        href="/legal/privacy"
        className="outline-none transition hover:text-[var(--text-primary)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        Privacy
      </Link>

      <Link
        href="/legal/terms"
        className="outline-none transition hover:text-[var(--text-primary)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        Terms
      </Link>

      <Link
        href="/support"
        className="outline-none transition hover:text-[var(--text-primary)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        Support
      </Link>
    </footer>
  );
}

function AuthMessage({
  type,
  message,
}: {
  type:
    | "error"
    | "success";
  message: string;
}) {
  const isError =
    type === "error";

  return (
    <div
      role={
        isError
          ? "alert"
          : "status"
      }
      className={[
        "mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-5",
        isError
          ? "border-[color-mix(in_srgb,var(--danger)_25%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] text-[var(--danger)]"
          : "border-[color-mix(in_srgb,var(--success)_25%,transparent)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)] text-[var(--success)]",
      ].join(" ")}
    >
      <span className="mt-0.5 shrink-0">
        {isError ? (
          <AlertIcon />
        ) : (
          <CheckIcon />
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
  id: string;
  message: string;
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

function getInputClassName(
  hasError: boolean,
) {
  return [
    "min-h-12 w-full rounded-xl border bg-[var(--surface-muted)] py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)]",
    hasError
      ? "border-[var(--danger)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--danger)_20%,transparent)]"
      : "border-[var(--border-subtle)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]",
  ].join(" ");
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

function EmailIcon() {
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
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />

      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function EmailCheckIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />

      <path d="m3 7 9 6 9-6" />
      <path d="m15 16 1.5 1.5L20 14" />
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

function ArrowLeftIcon() {
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
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
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

function CheckIcon() {
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

      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function InformationIcon() {
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

      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function LinkIcon() {
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
      <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
    </svg>
  );
}

function ShieldIcon() {
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
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6Z" />

      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ClockIcon() {
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
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path d="M12 7v5l3 2" />
    </svg>
  );
}
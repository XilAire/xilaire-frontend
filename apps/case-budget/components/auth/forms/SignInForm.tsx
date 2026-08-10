"use client";

import Link from "next/link";
import {
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
  signInAction,
} from "@/actions/auth/sign-in";

import AuthTransitionOverlay from "@/components/auth/AuthTransitionOverlay";

import {
  initialSignInActionState,
  type SignInActionFieldErrors,
} from "@/types/auth/sign-in-action";

const DEFAULT_AUTHENTICATED_ROUTE =
  "/dashboard";

export default function SignInPage() {
  const searchParams =
    useSearchParams();

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    isCompletingSignIn,
    setIsCompletingSignIn,
  ] = useState(false);

  const [
    state,
    formAction,
  ] = useActionState(
    signInAction,
    initialSignInActionState,
  );

  /*
   * Normalize the action state so the component remains
   * safe during development hot reloads, hydration, and
   * any legacy action response that may not include every
   * expected property.
   */
  const actionSuccess =
    state?.success === true;

  const actionMessage =
    typeof state?.message ===
    "string"
      ? state.message
      : "";

  const fieldErrors:
    SignInActionFieldErrors =
      state?.fieldErrors ?? {};

  const nextPath =
    useMemo(
      () =>
        getSafeNextPath(
          searchParams.get(
            "redirectTo",
          ) ??
            searchParams.get(
              "next",
            ),
        ),
      [searchParams],
    );

  const callbackMessage =
    useMemo(
      () =>
        sanitizeMessage(
          searchParams.get(
            "message",
          ),
        ),
      [searchParams],
    );

  const confirmed =
    searchParams.get(
      "confirmed",
    ) === "true";

  /*
   * Password authentication changes the Supabase session cookies.
   *
   * Once signInAction succeeds, show the shared CASE Budget
   * authentication transition and perform a full document navigation.
   *
   * A full navigation guarantees the next request reaches the server
   * with the newly established session state. The server/proxy
   * authentication layer can then make the authoritative MFA and route
   * decisions.
   *
   * This intentionally avoids performing another client-side MFA
   * server action followed by router.replace() and router.refresh()
   * immediately after authentication.
   */
  useEffect(
    () => {
      if (
        !actionSuccess
      ) {
        return;
      }

      setIsCompletingSignIn(
        true,
      );

      const destination =
        nextPath ??
        DEFAULT_AUTHENTICATED_ROUTE;

      window.location.replace(
        destination,
      );
    },
    [
      actionSuccess,
      nextPath,
    ],
  );

  return (
    <>
      <AuthTransitionOverlay
        open={
          isCompletingSignIn ||
          actionSuccess
        }
        title="Signing you in"
        message="CASE Budget is securely opening your financial workspace."
        statusText="Preparing your workspace"
      />

      <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
        <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(460px,0.82fr)]">
          <BrandPanel />

          <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10 xl:px-14">
            <div className="w-full max-w-md">
              <div className="mb-7 lg:hidden">
                <BrandMark
                  compact
                />
              </div>

              <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-xl shadow-black/5 sm:p-8">
                <header>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
                    Welcome back
                  </p>

                  <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                    Sign in to CASE
                    Budget
                  </h1>

                  <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                    Access your budgets,
                    transactions, bills,
                    savings goals, debt
                    plan, and financial
                    workspace.
                  </p>
                </header>

                {confirmed &&
                callbackMessage ? (
                  <AuthMessage
                    type="success"
                    message={
                      callbackMessage
                    }
                  />
                ) : null}

                {!confirmed &&
                callbackMessage ? (
                  <AuthMessage
                    type="error"
                    message={
                      callbackMessage
                    }
                  />
                ) : null}

                {!actionSuccess &&
                actionMessage ? (
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
                        placeholder="you@example.com"
                        aria-invalid={
                          Boolean(
                            fieldErrors.email,
                          )
                        }
                        aria-describedby={
                          fieldErrors.email
                            ? "email-error"
                            : undefined
                        }
                        className={getInputClassName(
                          Boolean(
                            fieldErrors.email,
                          ),
                          "pl-11 pr-4",
                        )}
                      />
                    </div>

                    {fieldErrors.email ? (
                      <FieldError
                        id="email-error"
                        message={
                          fieldErrors.email
                        }
                      />
                    ) : null}
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <label
                        htmlFor="password"
                        className="text-sm font-bold text-[var(--text-primary)]"
                      >
                        Password
                      </label>

                      <Link
                        href="/forgot-password"
                        className="rounded text-sm font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                      >
                        Forgot password?
                      </Link>
                    </div>

                    <div className="relative mt-2">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-[var(--text-muted)]">
                        <LockIcon />
                      </span>

                      <input
                        id="password"
                        name="password"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        aria-invalid={
                          Boolean(
                            fieldErrors.password,
                          )
                        }
                        aria-describedby={
                          fieldErrors.password
                            ? "password-error"
                            : undefined
                        }
                        className={getInputClassName(
                          Boolean(
                            fieldErrors.password,
                          ),
                          "pl-11 pr-11",
                        )}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (
                              currentValue,
                            ) =>
                              !currentValue,
                          )
                        }
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        aria-pressed={
                          showPassword
                        }
                        className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-xl text-[var(--text-muted)] outline-none transition hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]"
                      >
                        {showPassword ? (
                          <EyeOffIcon />
                        ) : (
                          <EyeIcon />
                        )}
                      </button>
                    </div>

                    {fieldErrors.password ? (
                      <FieldError
                        id="password-error"
                        message={
                          fieldErrors.password
                        }
                      />
                    ) : null}
                  </div>

                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      name="rememberMe"
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-[var(--border-default)] text-[var(--primary)] focus:ring-[var(--primary)]"
                    />

                    <span className="text-sm leading-5 text-[var(--text-muted)]">
                      Keep me signed in on
                      this device
                    </span>
                  </label>

                  <SubmitButton />
                </form>

                <div className="mt-7 border-t border-[var(--border-subtle)] pt-6 text-center">
                  <p className="text-sm text-[var(--text-muted)]">
                    New to CASE
                    Budget?{" "}
                    <Link
                      href="/sign-up"
                      className="rounded font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    >
                      Create an account
                    </Link>
                  </p>
                </div>
              </div>

              <footer className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[var(--text-muted)]">
                <Link
                  href="/privacy"
                  className="rounded outline-none transition hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                >
                  Privacy
                </Link>

                <Link
                  href="/terms"
                  className="rounded outline-none transition hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                >
                  Terms
                </Link>

                <Link
                  href="/support"
                  className="rounded outline-none transition hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                >
                  Support
                </Link>
              </footer>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function SubmitButton() {
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

          Signing in...
        </>
      ) : (
        <>
          Sign in

          <ArrowRightIcon />
        </>
      )}
    </button>
  );
}

function BrandPanel() {
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
            Personal finance,
            organized
          </p>

          <h2 className="mt-5 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Take control of every
            dollar. Build wealth with
            confidence.
          </h2>

          <p className="mt-6 max-w-lg text-base leading-7 text-white/80 xl:text-lg">
            Plan your budget, track
            spending, manage bills, pay
            down debt, and build a
            complete picture of your
            financial life.
          </p>
        </div>

        <div className="mt-10 grid max-w-xl gap-4 sm:grid-cols-2">
          <FeatureCard
            title="Zero-based budgeting"
            description="Give every available dollar a clear purpose."
          />

          <FeatureCard
            title="Secure workspaces"
            description="Manage personal, household, and business finances."
          />

          <FeatureCard
            title="Bill management"
            description="Track upcoming payments and overdue obligations."
          />

          <FeatureCard
            title="Wealth visibility"
            description="See debt, savings, investments, and net worth together."
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

function FeatureCard({
  title,
  description,
}: {
  title:
    string;

  description:
    string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
        <CheckIcon />
      </div>

      <p className="mt-4 text-sm font-bold">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-white/70">
        {description}
      </p>
    </div>
  );
}

function BrandMark({
  compact = false,
}: {
  compact?:
    boolean;
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
      <span
        className={[
          "flex items-center justify-center rounded-xl font-black",
          compact
            ? "h-11 w-11 bg-[var(--primary)] text-white"
            : "h-12 w-12 bg-white text-[var(--primary)]",
        ].join(" ")}
      >
        CB
      </span>

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

function getInputClassName(
  hasError:
    boolean,
  spacingClassName:
    string,
) {
  return [
    "min-h-12 w-full rounded-xl border bg-[var(--surface-muted)] py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)]",
    spacingClassName,
    hasError
      ? "border-[var(--danger)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--danger)_20%,transparent)]"
      : "border-[var(--border-subtle)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]",
  ].join(
    " ",
  );
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

function sanitizeMessage(
  value:
    string | null,
) {
  if (
    !value
  ) {
    return null;
  }

  const normalizedValue =
    value
      .replace(
        /[\r\n\t]+/g,
        " ",
      )
      .trim()
      .slice(
        0,
        500,
      );

  return (
    normalizedValue ||
    null
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
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />

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
      <path d="m3 3 18 18" />

      <path d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6" />

      <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c6.5 0 10 8 10 8a16.3 16.3 0 0 1-2.1 3.3" />

      <path d="M6.6 6.6C3.7 8.5 2 12 2 12s3.5 8 10 8a10.7 10.7 0 0 0 4.1-.8" />
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

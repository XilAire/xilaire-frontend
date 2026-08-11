"use client";

import Link from "next/link";

import CaseBudgetLogo from "@/components/branding/CaseBudgetLogo";
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
  signUpAction,
} from "@/actions/auth/sign-up";

import AuthTransitionOverlay from "@/components/auth/AuthTransitionOverlay";

import {
  initialSignUpActionState,
  type SignUpActionFieldErrors,
} from "@/types/auth/sign-up-action";

const DEFAULT_AUTHENTICATED_ROUTE =
  "/dashboard";

export default function SignUpForm() {
  const searchParams =
    useSearchParams();

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    isCompletingSignUp,
    setIsCompletingSignUp,
  ] = useState(false);

  const [
    state,
    formAction,
  ] = useActionState(
    signUpAction,
    initialSignUpActionState,
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

  const requiresEmailConfirmation =
    state
      ?.requiresEmailConfirmation ===
    true;

  const fieldErrors:
    SignUpActionFieldErrors =
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

  useEffect(() => {
    if (
      !actionSuccess ||
      requiresEmailConfirmation
    ) {
      return;
    }

    setIsCompletingSignUp(
      true,
    );

    const destination =
      nextPath ??
      DEFAULT_AUTHENTICATED_ROUTE;

    window.location.replace(
      destination,
    );
  }, [
    actionSuccess,
    nextPath,
    requiresEmailConfirmation,
  ]);

  return (
    <>
      <AuthTransitionOverlay
        open={
          isCompletingSignUp ||
          (
            actionSuccess &&
            !requiresEmailConfirmation
          )
        }
        title="Creating your workspace"
        message="CASE Budget is securely preparing your new financial workspace."
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
                  Create your account
                </p>

                <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                  Start with CASE
                  Budget
                </h1>

                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                  Create your financial
                  workspace and start
                  organizing your budget,
                  bills, savings, debt,
                  and long-term goals.
                </p>
              </header>

              {actionSuccess &&
              requiresEmailConfirmation ? (
                <EmailConfirmationState
                  message={
                    actionMessage
                  }
                />
              ) : (
                <>
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
                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormField
                        id="firstName"
                        name="firstName"
                        label="First name"
                        placeholder="First name"
                        autoComplete="given-name"
                        error={
                          fieldErrors.firstName
                        }
                      />

                      <FormField
                        id="lastName"
                        name="lastName"
                        label="Last name"
                        placeholder="Last name"
                        autoComplete="family-name"
                        error={
                          fieldErrors.lastName
                        }
                      />
                    </div>

                    <FormField
                      id="displayName"
                      name="displayName"
                      label="Display name"
                      placeholder="How your name should appear"
                      autoComplete="name"
                      description="Optional. We will use your first and last name when left blank."
                      error={
                        fieldErrors.displayName
                      }
                    />

                    <FormField
                      id="workspaceName"
                      name="workspaceName"
                      label="Personal workspace name"
                      placeholder="My Personal Budget"
                      description="Optional. You can rename your workspace later."
                      error={
                        fieldErrors.workspaceName
                      }
                    />

                    <EmailField
                      error={
                        fieldErrors.email
                      }
                    />

                    <PasswordField
                      id="password"
                      name="password"
                      label="Password"
                      autoComplete="new-password"
                      placeholder="Create a secure password"
                      showPassword={
                        showPassword
                      }
                      onToggleVisibility={() =>
                        setShowPassword(
                          (
                            currentValue,
                          ) =>
                            !currentValue,
                        )
                      }
                      error={
                        fieldErrors.password
                      }
                    />

                    <PasswordRequirements />

                    <PasswordField
                      id="confirmPassword"
                      name="confirmPassword"
                      label="Confirm password"
                      autoComplete="new-password"
                      placeholder="Enter your password again"
                      showPassword={
                        showConfirmPassword
                      }
                      onToggleVisibility={() =>
                        setShowConfirmPassword(
                          (
                            currentValue,
                          ) =>
                            !currentValue,
                        )
                      }
                      error={
                        fieldErrors.confirmPassword
                      }
                    />

                    <div>
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          name="termsAccepted"
                          type="checkbox"
                          aria-invalid={
                            Boolean(
                              fieldErrors.termsAccepted,
                            )
                          }
                          aria-describedby={
                            fieldErrors.termsAccepted
                              ? "terms-accepted-error"
                              : undefined
                          }
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border-default)] text-[var(--primary)] focus:ring-[var(--primary)]"
                        />

                        <span className="text-sm leading-5 text-[var(--text-muted)]">
                          I agree to the{" "}
                          <Link
                            href="/legal/terms"
                            target="_blank"
                            rel="noreferrer"
                            className="rounded font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                          >
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link
                            href="/legal/privacy"
                            target="_blank"
                            rel="noreferrer"
                            className="rounded font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                          >
                            Privacy Policy
                          </Link>
                          .
                        </span>
                      </label>

                      {fieldErrors.termsAccepted ? (
                        <FieldError
                          id="terms-accepted-error"
                          message={
                            fieldErrors.termsAccepted
                          }
                        />
                      ) : null}
                    </div>

                    <SubmitButton />
                  </form>

                  <div className="mt-7 border-t border-[var(--border-subtle)] pt-6 text-center">
                    <p className="text-sm text-[var(--text-muted)]">
                      Already have a CASE
                      Budget account?{" "}
                      <Link
                        href={
                          buildSignInHref(
                            nextPath,
                          )
                        }
                        className="rounded font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                      >
                        Sign in
                      </Link>
                    </p>
                  </div>
                </>
              )}
            </div>

            <footer className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[var(--text-muted)]">
              <Link
                href="/legal/privacy"
                className="rounded outline-none transition hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Privacy
              </Link>

              <Link
                href="/legal/terms"
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

type FormFieldProps = {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  autoComplete?: string;
  description?: string;
  error?: string;
};

function FormField({
  id,
  name,
  label,
  placeholder,
  autoComplete,
  description,
  error,
}: FormFieldProps) {
  const descriptionId =
    description
      ? `${id}-description`
      : undefined;

  const errorId =
    error
      ? `${id}-error`
      : undefined;

  const describedBy = [
    descriptionId,
    errorId,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label
        htmlFor={id}
        className="text-sm font-bold text-[var(--text-primary)]"
      >
        {label}
      </label>

      <input
        id={id}
        name={name}
        type="text"
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={
          Boolean(
            error,
          )
        }
        aria-describedby={
          describedBy ||
          undefined
        }
        className={getInputClassName(
          Boolean(
            error,
          ),
          "px-4",
        )}
      />

      {description ? (
        <p
          id={descriptionId}
          className="mt-2 text-xs leading-5 text-[var(--text-muted)]"
        >
          {description}
        </p>
      ) : null}

      {error ? (
        <FieldError
          id={
            errorId ??
            `${id}-error`
          }
          message={
            error
          }
        />
      ) : null}
    </div>
  );
}

type EmailFieldProps = {
  error?: string;
};

function EmailField({
  error,
}: EmailFieldProps) {
  return (
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
              error,
            )
          }
          aria-describedby={
            error
              ? "email-error"
              : undefined
          }
          className={getInputClassName(
            Boolean(
              error,
            ),
            "pl-11 pr-4",
          )}
        />
      </div>

      {error ? (
        <FieldError
          id="email-error"
          message={
            error
          }
        />
      ) : null}
    </div>
  );
}

type PasswordFieldProps = {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  placeholder: string;
  showPassword: boolean;
  onToggleVisibility: () => void;
  error?: string;
};

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  placeholder,
  showPassword,
  onToggleVisibility,
  error,
}: PasswordFieldProps) {
  const errorId =
    error
      ? `${id}-error`
      : undefined;

  return (
    <div>
      <label
        htmlFor={id}
        className="text-sm font-bold text-[var(--text-primary)]"
      >
        {label}
      </label>

      <div className="relative mt-2">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-[var(--text-muted)]">
          <LockIcon />
        </span>

        <input
          id={id}
          name={name}
          type={
            showPassword
              ? "text"
              : "password"
          }
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={
            Boolean(
              error,
            )
          }
          aria-describedby={
            errorId
          }
          className={getInputClassName(
            Boolean(
              error,
            ),
            "pl-11 pr-11",
          )}
        />

        <button
          type="button"
          onClick={
            onToggleVisibility
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

      {error ? (
        <FieldError
          id={
            errorId ??
            `${id}-error`
          }
          message={
            error
          }
        />
      ) : null}
    </div>
  );
}

function PasswordRequirements() {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <ShieldIcon />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-primary)]">
            Password requirements
          </p>

          <ul className="mt-2 grid gap-1 text-xs leading-5 text-[var(--text-muted)] sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <CheckMiniIcon />

              At least 8 characters
            </li>

            <li className="flex items-center gap-2">
              <CheckMiniIcon />

              One uppercase letter
            </li>

            <li className="flex items-center gap-2">
              <CheckMiniIcon />

              One lowercase letter
            </li>

            <li className="flex items-center gap-2">
              <CheckMiniIcon />

              One number
            </li>
          </ul>
        </div>
      </div>
    </div>
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

          Creating account...
        </>
      ) : (
        <>
          Create account

          <ArrowRightIcon />
        </>
      )}
    </button>
  );
}

function EmailConfirmationState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="mt-7">
      <div className="rounded-2xl border border-[color-mix(in_srgb,var(--success)_25%,transparent)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)] p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]">
            <EmailCheckIcon />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Check your email
            </h2>

            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              {message ||
                "Your CASE Budget account was created. Open the confirmation email to activate your account."}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <Link
          href="/sign-in"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
        >
          Continue to sign in
        </Link>

        <p className="text-center text-xs leading-5 text-[var(--text-muted)]">
          The confirmation email may take a few
          minutes to arrive. Check your spam or junk
          folder if you do not see it.
        </p>
      </div>
    </div>
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
  title: string;
  description: string;
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
  spacingClassName: string,
) {
  return [
    "min-h-12 w-full rounded-xl border bg-[var(--surface-muted)] py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)]",
    spacingClassName,
    hasError
      ? "border-[var(--danger)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--danger)_20%,transparent)]"
      : "border-[var(--border-subtle)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]",
  ].join(" ");
}

function getSafeNextPath(
  value: string | null,
) {
  if (!value) {
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

function buildSignInHref(
  nextPath: string | null,
) {
  if (!nextPath) {
    return "/sign-in";
  }

  const searchParams =
    new URLSearchParams();

  searchParams.set(
    "redirectTo",
    nextPath,
  );

  return `/sign-in?${searchParams.toString()}`;
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
      className="shrink-0 text-[var(--success)]"
    >
      <path d="m6 12 4 4 8-8" />
    </svg>
  );
}

function ShieldIcon() {
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
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6Z" />

      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function EmailCheckIcon() {
  return (
    <svg
      width="21"
      height="21"
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
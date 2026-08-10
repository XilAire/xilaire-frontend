"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
} from "react";
import {
  useFormStatus,
} from "react-dom";
import {
  useRouter,
} from "next/navigation";

import {
  unenrollMfaFactorAction,
  type MfaUnenrollActionState,
} from "@/actions/auth/mfa";

type MfaFactorManagerFactor = {
  id:
    string;

  friendlyName:
    string | null;

  createdAt:
    string;

  status:
    "verified" | "unverified";
};

type MfaFactorManagerProps = {
  verifiedFactors:
    MfaFactorManagerFactor[];

  unverifiedFactors:
    MfaFactorManagerFactor[];

  isAal2:
    boolean;
};

const INITIAL_UNENROLL_STATE:
  MfaUnenrollActionState = {
    success:
      false,

    message:
      "",

    factorId:
      null,
  };

export default function MfaFactorManager({
  verifiedFactors,
  unverifiedFactors,
  isAal2,
}: MfaFactorManagerProps) {
  const hasFactors =
    verifiedFactors.length >
      0 ||
    unverifiedFactors.length >
      0;

  if (
    !hasFactors
  ) {
    return null;
  }

  return (
    <div className="space-y-6">
      {unverifiedFactors.length >
      0 ? (
        <FactorSection
          title="Incomplete authenticator setup"
          description="These authenticators were started but never successfully verified. Remove any setup you no longer use before starting a new enrollment."
        >
          <div className="space-y-3">
            {unverifiedFactors.map(
              (
                factor,
              ) => (
                <MfaFactorRow
                  key={
                    factor.id
                  }
                  factor={
                    factor
                  }
                  canRemove
                />
              ),
            )}
          </div>
        </FactorSection>
      ) : null}

      {verifiedFactors.length >
      0 ? (
        <FactorSection
          title="Verified authenticators"
          description="These authenticators are currently protecting your CASE Budget account."
        >
          <div className="space-y-3">
            {verifiedFactors.map(
              (
                factor,
              ) => (
                <MfaFactorRow
                  key={
                    factor.id
                  }
                  factor={
                    factor
                  }
                  canRemove={
                    isAal2
                  }
                />
              ),
            )}
          </div>

          {!isAal2 ? (
            <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--warning)_22%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-[var(--warning)]">
                  <ShieldIcon />
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    Verification required to disable MFA
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                    Verify your identity with your existing authenticator before
                    removing a verified MFA factor.
                  </p>

                  <Link
                    href="/mfa?redirectTo=/dashboard/settings/security"
                    className="mt-3 inline-flex min-h-9 items-center justify-center rounded-lg bg-[var(--primary)] px-4 text-xs font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                  >
                    Verify identity
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </FactorSection>
      ) : null}
    </div>
  );
}

function FactorSection({
  title,
  description,
  children,
}: {
  title:
    string;

  description:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">
          {title}
        </h3>

        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </p>
      </div>

      {children}
    </div>
  );
}

function MfaFactorRow({
  factor,
  canRemove,
}: {
  factor:
    MfaFactorManagerFactor;

  canRemove:
    boolean;
}) {
  const router =
    useRouter();

  const [
    state,
    formAction,
  ] = useActionState(
    unenrollMfaFactorAction,
    INITIAL_UNENROLL_STATE,
  );

  useEffect(() => {
    if (
      !state.success
    ) {
      return;
    }

    router.refresh();
  }, [
    router,
    state.success,
  ]);

  const isVerified =
    factor.status ===
    "verified";

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              isVerified
                ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
                : "bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)]",
            ].join(
              " ",
            )}
          >
            <AuthenticatorIcon />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                {factor.friendlyName ||
                  "CASE Budget Authenticator"}
              </p>

              <FactorStatusBadge
                status={
                  factor.status
                }
              />
            </div>

            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              {isVerified
                ? "Added"
                : "Setup started"}{" "}
              {formatDate(
                factor.createdAt,
              )}
            </p>

            <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
              Factor ID:{" "}
              <span className="font-mono">
                {formatFactorId(
                  factor.id,
                )}
              </span>
            </p>
          </div>
        </div>

        {canRemove ? (
          <form
            action={
              formAction
            }
            className="shrink-0"
          >
            <input
              type="hidden"
              name="factorId"
              value={
                factor.id
              }
            />

            <RemoveFactorButton
              isVerified={
                isVerified
              }
            />
          </form>
        ) : (
          <span className="shrink-0 text-xs font-medium text-[var(--text-muted)]">
            AAL2 required
          </span>
        )}
      </div>

      {state.message ? (
        <div
          role={
            state.success
              ? "status"
              : "alert"
          }
          className={[
            "mt-4 rounded-lg border px-3 py-2 text-xs leading-5",
            state.success
              ? "border-[color-mix(in_srgb,var(--success)_25%,transparent)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)] text-[var(--success)]"
              : "border-[color-mix(in_srgb,var(--danger)_25%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] text-[var(--danger)]",
          ].join(
            " ",
          )}
        >
          {state.message}
        </div>
      ) : null}
    </div>
  );
}

function RemoveFactorButton({
  isVerified,
}: {
  isVerified:
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
        pending
      }
      className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[color-mix(in_srgb,var(--danger)_6%,transparent)] px-4 text-xs font-bold text-[var(--danger)] outline-none transition hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {pending ? (
        <>
          <LoadingSpinner />

          Removing...
        </>
      ) : (
        <>
          <TrashIcon />

          {isVerified
            ? "Remove MFA"
            : "Remove setup"}
        </>
      )}
    </button>
  );
}

function FactorStatusBadge({
  status,
}: {
  status:
    "verified" | "unverified";
}) {
  const verified =
    status ===
    "verified";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]",
        verified
          ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
          : "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]",
      ].join(
        " ",
      )}
    >
      {verified ? (
        <CheckIcon />
      ) : (
        <ClockIcon />
      )}

      {verified
        ? "Verified"
        : "Incomplete"}
    </span>
  );
}

function formatDate(
  value:
    string,
) {
  if (
    !value
  ) {
    return "recently";
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "recently";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",
    },
  ).format(
    date,
  );
}

function formatFactorId(
  factorId:
    string,
) {
  if (
    factorId.length <=
    16
  ) {
    return factorId;
  }

  return `${factorId.slice(
    0,
    8,
  )}…${factorId.slice(
    -8,
  )}`;
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

      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 12 4 4 8-8" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="11"
      height="11"
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

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}
import {
  redirect,
} from "next/navigation";

import MfaEnrollmentForm from "@/components/auth/mfa/MfaEnrollmentForm";
import MfaFactorManager from "@/components/auth/mfa/MfaFactorManager";

import {
  getMfaStatus,
} from "@/lib/auth/mfa-service";

export default async function SecuritySettingsPage() {
  const statusResult =
    await getMfaStatus();

  if (
    !statusResult.success
  ) {
    if (
      statusResult.error.code ===
      "not_authenticated"
    ) {
      redirect(
        "/sign-in?redirectTo=/dashboard/settings/security",
      );
    }

    return (
      <SecuritySettingsError
        message={
          statusResult.error.message
        }
      />
    );
  }

  const status =
    statusResult.data;

  const hasVerifiedFactors =
    status.verifiedFactors.length >
    0;

  const hasUnverifiedFactors =
    status.unverifiedFactors.length >
    0;

  const hasAnyFactors =
    hasVerifiedFactors ||
    hasUnverifiedFactors;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <SecurityHeader />

      <SecurityStatusCard
        isAal2={
          status.isAal2
        }
        hasVerifiedFactor={
          status.hasVerifiedFactor
        }
        verifiedFactorCount={
          status.verifiedFactors.length
        }
        unverifiedFactorCount={
          status.unverifiedFactors.length
        }
      />

      {hasAnyFactors ? (
        <SecuritySection
          title="Multi-factor authentication"
          description={
            hasVerifiedFactors
              ? "Manage the authenticators protecting your CASE Budget account."
              : "An authenticator setup is waiting to be completed or removed."
          }
        >
          <MfaFactorManager
            verifiedFactors={
              status.verifiedFactors.map(
                (
                  factor,
                ) => ({
                  id:
                    factor.id,

                  friendlyName:
                    factor.friendlyName,

                  createdAt:
                    factor.createdAt,

                  status:
                    "verified" as const,
                }),
              )
            }
            unverifiedFactors={
              status.unverifiedFactors.map(
                (
                  factor,
                ) => ({
                  id:
                    factor.id,

                  friendlyName:
                    factor.friendlyName,

                  createdAt:
                    factor.createdAt,

                  status:
                    "unverified" as const,
                }),
              )
            }
            isAal2={
              status.isAal2
            }
          />
        </SecuritySection>
      ) : (
        <SecuritySection
          title="Multi-factor authentication"
          description="Add an authenticator app to protect sensitive CASE Budget features."
        >
          <MfaEnrollmentForm />
        </SecuritySection>
      )}

      {hasVerifiedFactors ? (
        <SecuritySection
          title="MFA protection"
          description="Your CASE Budget account is protected by multi-factor authentication."
        >
          <MfaProtectionNotice />
        </SecuritySection>
      ) : null}
    </div>
  );
}

function SecurityHeader() {
  return (
    <header>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
        Account security
      </p>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
        Security
      </h1>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
        Manage authentication and security controls for your CASE Budget
        account. Sensitive financial actions can require additional identity
        verification.
      </p>
    </header>
  );
}

function SecurityStatusCard({
  isAal2,
  hasVerifiedFactor,
  verifiedFactorCount,
  unverifiedFactorCount,
}: {
  isAal2:
    boolean;

  hasVerifiedFactor:
    boolean;

  verifiedFactorCount:
    number;

  unverifiedFactorCount:
    number;
}) {
  const hasIncompleteSetup =
    unverifiedFactorCount >
    0;

  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            Account protection
          </p>

          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            {hasVerifiedFactor
              ? "A verified authenticator is protecting this account."
              : hasIncompleteSetup
                ? "Authenticator setup has started but has not been completed."
                : "Multi-factor authentication has not been enabled yet."}
          </p>
        </div>

        <SecurityBadge
          enabled={
            hasVerifiedFactor
          }
          hasIncompleteSetup={
            hasIncompleteSetup
          }
        />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatusMetric
          label="MFA"
          value={
            hasVerifiedFactor
              ? "Enabled"
              : "Not enabled"
          }
        />

        <StatusMetric
          label="Current session"
          value={
            isAal2
              ? "AAL2"
              : "AAL1"
          }
        />

        <StatusMetric
          label="Verified authenticators"
          value={
            String(
              verifiedFactorCount,
            )
          }
        />

        <StatusMetric
          label="Incomplete setups"
          value={
            String(
              unverifiedFactorCount,
            )
          }
        />
      </div>
    </section>
  );
}

function SecuritySection({
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
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 sm:p-6">
      <div className="mb-6 border-b border-[var(--border-subtle)] pb-5">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">
          {title}
        </h2>

        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}

function MfaProtectionNotice() {
  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--primary)_18%,transparent)] bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-[var(--primary)]">
          <ShieldIcon />
        </span>

        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            MFA is active
          </p>

          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            CASE Budget can require AAL2 verification before sensitive actions
            such as connecting or managing financial accounts.
          </p>
        </div>
      </div>
    </div>
  );
}

function SecurityBadge({
  enabled,
  hasIncompleteSetup,
}: {
  enabled:
    boolean;

  hasIncompleteSetup:
    boolean;
}) {
  return (
    <span
      className={[
        "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold",
        enabled
          ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
          : "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]",
      ].join(
        " ",
      )}
    >
      {enabled ? (
        <CheckIcon />
      ) : (
        <AlertIcon />
      )}

      {enabled
        ? "Protected"
        : hasIncompleteSetup
          ? "Setup incomplete"
          : "Action recommended"}
    </span>
  );
}

function StatusMetric({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-2 text-base font-bold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function SecuritySettingsError({
  message,
}: {
  message:
    string;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <section className="rounded-2xl border border-[color-mix(in_srgb,var(--danger)_25%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]">
            <AlertIcon />
          </div>

          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">
              Security settings unavailable
            </h1>

            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              {message}
            </p>
          </div>
        </div>
      </section>
    </div>
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

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 12 4 4 8-8" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="16"
      height="16"
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
import Link from "next/link";

import AdminUserRoleManager from "@/components/admin/users/AdminUserRoleManager";

import type {
  UniversityAdminContext,
} from "@/lib/university/admin-permissions";

import type {
  AdminUniversityUserDetails,
} from "@/lib/university/admin-users";

type AdminUserDetailsProps = {
  user: AdminUniversityUserDetails;
  viewer: UniversityAdminContext;
};

function formatDateTime(
  value: string | null,
): string {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
    },
  ).format(date);
}

function formatPercent(
  value: number,
): string {
  return `${Math.max(
    0,
    Math.min(
      100,
      value,
    ),
  ).toFixed(
    value % 1 === 0
      ? 0
      : 1,
  )}%`;
}

function titleCase(
  value: string | null,
): string {
  if (!value) {
    return "Not available";
  }

  return value
    .replace(
      /[_-]+/g,
      " ",
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="
        overflow-hidden
        rounded-2xl
        border
        border-[var(--border-default)]
        bg-[var(--surface-default)]
        shadow-[var(--shadow-sm)]
      "
    >
      <div
        className="
          border-b
          border-[var(--border-subtle)]
          px-5
          py-4
        "
      >
        <h2
          className="
            text-lg
            font-black
            text-[var(--text-primary)]
          "
        >
          {title}
        </h2>

        {description ? (
          <p
            className="
              mt-1
              text-xs
              leading-5
              text-[var(--text-muted)]
            "
          >
            {description}
          </p>
        ) : null}
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  );
}

function DetailGrid({
  items,
}: {
  items: Array<{
    label: string;
    value: React.ReactNode;
  }>;
}) {
  return (
    <dl
      className="
        grid
        gap-4
        sm:grid-cols-2
        xl:grid-cols-3
      "
    >
      {items.map(
        (item) => (
          <div
            key={item.label}
            className="
              min-w-0
              rounded-xl
              bg-[var(--surface-muted)]
              p-3.5
            "
          >
            <dt
              className="
                text-[10px]
                font-extrabold
                uppercase
                tracking-[0.1em]
                text-[var(--text-muted)]
              "
            >
              {item.label}
            </dt>

            <dd
              className="
                mt-1.5
                min-w-0
                break-words
                text-sm
                font-semibold
                text-[var(--text-primary)]
              "
            >
              {item.value}
            </dd>
          </div>
        ),
      )}
    </dl>
  );
}

function PlanBadge({
  plan,
}: {
  plan:
    AdminUniversityUserDetails["plan"];
}) {
  const classes =
    plan === "pro"
      ? `
        border-[var(--achievement-border)]
        bg-[var(--achievement-soft)]
        text-[var(--achievement)]
      `
      : plan === "plus"
        ? `
          border-[var(--primary-border)]
          bg-[var(--primary-soft)]
          text-[var(--primary)]
        `
        : `
          border-[var(--border-default)]
          bg-[var(--surface-muted)]
          text-[var(--text-secondary)]
        `;

  return (
    <span
      className={`
        inline-flex
        rounded-full
        border
        px-3
        py-1
        text-xs
        font-extrabold
        uppercase
        tracking-[0.08em]
        ${classes}
      `}
    >
      {plan}
    </span>
  );
}

export default function AdminUserDetails({
  user,
  viewer,
}: AdminUserDetailsProps) {
  const currentSubscription =
    user.subscriptions.find(
      (subscription) =>
        subscription.status ===
          "active" ||
        subscription.status ===
          "trialing" ||
        subscription.status ===
          "past_due",
    ) ??
    null;

  return (
    <div
      className="
        mx-auto
        w-full
        max-w-[1600px]
        space-y-5
        px-4
        py-6
        sm:px-6
        sm:py-8
        lg:px-8
      "
    >
      <div
        className="
          flex
          flex-col
          gap-4
          lg:flex-row
          lg:items-start
          lg:justify-between
        "
      >
        <div className="min-w-0">
          <Link
            href="/admin/users"
            className="
              text-sm
              font-bold
              text-[var(--primary)]
              hover:underline
            "
          >
            ← Back to Users
          </Link>

          <p
            className="
              mt-5
              text-xs
              font-extrabold
              uppercase
              tracking-[0.16em]
              text-[var(--primary)]
            "
          >
            User Administration
          </p>

          <h1
            className="
              mt-2
              break-words
              text-3xl
              font-black
              tracking-[-0.03em]
              text-[var(--text-primary)]
              sm:text-4xl
            "
          >
            {user.fullName ??
              user.email ??
              "CASE University User"}
          </h1>

          <p
            className="
              mt-2
              break-all
              font-mono
              text-xs
              text-[var(--text-muted)]
            "
          >
            {user.id}
          </p>
        </div>

        <div
          className="
            flex
            flex-wrap
            items-center
            gap-2
          "
        >
          <PlanBadge
            plan={user.plan}
          />

          <span
            className="
              inline-flex
              rounded-full
              bg-[var(--surface-muted)]
              px-3
              py-1
              text-xs
              font-extrabold
              uppercase
              tracking-[0.08em]
              text-[var(--text-secondary)]
            "
          >
            {titleCase(
              user.status,
            )}
          </span>
        </div>
      </div>

      <Section
        title="Account"
        description="Supabase authentication is the authoritative account record."
      >
        <DetailGrid
          items={[
            {
              label:
                "Full Name",
              value:
                user.fullName ??
                "Not provided",
            },
            {
              label:
                "Email",
              value:
                user.email ??
                "Not provided",
            },
            {
              label:
                "Registration",
              value:
                formatDateTime(
                  user.createdAt,
                ),
            },
            {
              label:
                "Last Sign-In",
              value:
                formatDateTime(
                  user.lastSignInAt,
                ),
            },
            {
              label:
                "Email Confirmed",
              value:
                formatDateTime(
                  user.emailConfirmedAt,
                ),
            },
            {
              label:
                "Administrative Role",
              value:
                `${titleCase(
                  user.roleName,
                )} · Rank ${user.roleRank}`,
            },
            {
              label:
                "Profile Status",
              value:
                titleCase(
                  user.profileStatus,
                ),
            },
          ]}
        />
      </Section>

      <Section
        title="Subscription"
        description="Read-only view of the current CASE University Stripe environment and stored subscription history."
      >
        <DetailGrid
          items={[
            {
              label:
                "Effective Billing Tier",
              value:
                <PlanBadge
                  plan={
                    user.plan
                  }
                />,
            },
            {
              label:
                "Billing Status",
              value:
                titleCase(
                  user.billingStatus,
                ),
            },
            {
              label:
                "Plan",
              value:
                currentSubscription
                  ?.planName ??
                "Free",
            },
            {
              label:
                "Billing Interval",
              value:
                titleCase(
                  currentSubscription
                    ?.billingInterval ??
                    currentSubscription
                      ?.planInterval ??
                    null,
                ),
            },
            {
              label:
                "Current Period End",
              value:
                formatDateTime(
                  currentSubscription
                    ?.currentPeriodEnd ??
                    null,
                ),
            },
            {
              label:
                "Cancel At Period End",
              value:
                currentSubscription
                  ? currentSubscription
                      .cancelAtPeriodEnd
                    ? "Yes"
                    : "No"
                  : "Not applicable",
            },
          ]}
        />

        {user.subscriptions.length >
        0 ? (
          <div
            className="
              mt-5
              overflow-x-auto
              rounded-xl
              border
              border-[var(--border-default)]
            "
          >
            <table
              className="
                w-full
                min-w-[900px]
              "
            >
              <thead className="bg-[var(--surface-muted)]">
                <tr>
                  {[
                    "Plan",
                    "Status",
                    "Mode",
                    "Period End",
                    "Stripe Subscription",
                  ].map(
                    (label) => (
                      <th
                        key={label}
                        className="
                          px-3
                          py-2.5
                          text-left
                          text-[10px]
                          font-extrabold
                          uppercase
                          tracking-[0.1em]
                          text-[var(--text-muted)]
                        "
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {user.subscriptions.map(
                  (subscription) => (
                    <tr
                      key={
                        subscription.id
                      }
                      className="
                        border-t
                        border-[var(--border-subtle)]
                      "
                    >
                      <td className="px-3 py-3 text-sm font-semibold text-[var(--text-primary)]">
                        {subscription.planName ??
                          subscription.planKey ??
                          "Unknown Plan"}
                      </td>

                      <td className="px-3 py-3 text-sm text-[var(--text-secondary)]">
                        {titleCase(
                          subscription.status,
                        )}
                      </td>

                      <td className="px-3 py-3 text-sm text-[var(--text-secondary)]">
                        {titleCase(
                          subscription.stripeMode,
                        )}
                      </td>

                      <td className="px-3 py-3 text-sm text-[var(--text-secondary)]">
                        {formatDateTime(
                          subscription.currentPeriodEnd,
                        )}
                      </td>

                      <td
                        className="
                          max-w-[260px]
                          truncate
                          px-3
                          py-3
                          font-mono
                          text-xs
                          text-[var(--text-muted)]
                        "
                        title={
                          subscription.stripeSubscriptionId ??
                          undefined
                        }
                      >
                        {subscription.stripeSubscriptionId ??
                          "—"}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <p
            className="
              mt-5
              rounded-xl
              bg-[var(--surface-muted)]
              p-4
              text-sm
              text-[var(--text-secondary)]
            "
          >
            No CASE University subscription records
            exist for the configured Stripe mode.
          </p>
        )}
      </Section>

      <Section
        title="Learning"
        description="Enrollment and lesson-progress data for this user."
      >
        <DetailGrid
          items={[
            {
              label:
                "Enrolled Courses",
              value:
                user.enrollments
                  .length,
            },
            {
              label:
                "Completed Courses",
              value:
                user.enrollments.filter(
                  (
                    enrollment,
                  ) =>
                    enrollment.status ===
                    "completed",
                ).length,
            },
            {
              label:
                "Lesson Progress Records",
              value:
                user.lessonProgressCount,
            },
            {
              label:
                "Completed Lessons",
              value:
                user.completedLessonCount,
            },
            {
              label:
                "Last Learning Activity",
              value:
                formatDateTime(
                  user.lastLearningActivityAt,
                ),
            },
            {
              label:
                "Certificates",
              value:
                user.certificates
                  .length,
            },
          ]}
        />

        {user.enrollments.length >
        0 ? (
          <div
            className="
              mt-5
              space-y-3
            "
          >
            {user.enrollments.map(
              (enrollment) => (
                <div
                  key={enrollment.id}
                  className="
                    rounded-xl
                    border
                    border-[var(--border-default)]
                    p-4
                  "
                >
                  <div
                    className="
                      flex
                      flex-col
                      gap-3
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                    "
                  >
                    <div>
                      <p
                        className="
                          font-black
                          text-[var(--text-primary)]
                        "
                      >
                        {enrollment.courseTitle}
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          text-[var(--text-muted)]
                        "
                      >
                        {titleCase(
                          enrollment.status,
                        )}{" "}
                        · Last activity{" "}
                        {formatDateTime(
                          enrollment.lastActivityAt,
                        )}
                      </p>
                    </div>

                    <p
                      className="
                        text-sm
                        font-black
                        text-[var(--primary)]
                      "
                    >
                      {formatPercent(
                        enrollment.progressPercent,
                      )}
                    </p>
                  </div>

                  <div
                    className="
                      mt-3
                      h-2
                      overflow-hidden
                      rounded-full
                      bg-[var(--surface-muted)]
                    "
                  >
                    <div
                      className="
                        h-full
                        rounded-full
                        bg-[var(--primary)]
                      "
                      style={{
                        width:
                          formatPercent(
                            enrollment.progressPercent,
                          ),
                      }}
                    />
                  </div>
                </div>
              ),
            )}
          </div>
        ) : (
          <p
            className="
              mt-5
              rounded-xl
              bg-[var(--surface-muted)]
              p-4
              text-sm
              text-[var(--text-secondary)]
            "
          >
            This user has no CASE University course
            enrollments.
          </p>
        )}
      </Section>

      <Section
        title="Certificates"
        description="Certificates already issued to this user."
      >
        {user.certificates.length >
        0 ? (
          <div
            className="
              grid
              gap-3
              lg:grid-cols-2
            "
          >
            {user.certificates.map(
              (certificate) => (
                <div
                  key={certificate.id}
                  className="
                    rounded-xl
                    border
                    border-[var(--border-default)]
                    p-4
                  "
                >
                  <p
                    className="
                      font-black
                      text-[var(--text-primary)]
                    "
                  >
                    {certificate.courseTitle}
                  </p>

                  <p
                    className="
                      mt-2
                      break-all
                      font-mono
                      text-xs
                      text-[var(--text-muted)]
                    "
                  >
                    {certificate.certificateNumber}
                  </p>

                  <p
                    className="
                      mt-2
                      text-xs
                      text-[var(--text-secondary)]
                    "
                  >
                    Issued{" "}
                    {formatDateTime(
                      certificate.issuedAt,
                    )}
                  </p>

                  <Link
                    href={`/verify/${encodeURIComponent(
                      certificate.certificateNumber,
                    )}`}
                    className="
                      mt-3
                      inline-flex
                      text-sm
                      font-bold
                      text-[var(--primary)]
                      hover:underline
                    "
                  >
                    Open verification
                  </Link>
                </div>
              ),
            )}
          </div>
        ) : (
          <p
            className="
              rounded-xl
              bg-[var(--surface-muted)]
              p-4
              text-sm
              text-[var(--text-secondary)]
            "
          >
            No certificates have been issued to this
            user.
          </p>
        )}
      </Section>


      <Section
        title="Administration"
        description="Role authority is enforced server-side using the CASE role hierarchy."
      >
        <AdminUserRoleManager
          userId={user.id}
          currentRoleName={
            user.roleName
          }
          currentRoleRank={
            user.roleRank
          }
          viewer={viewer}
        />
      </Section>

      <Section
        title="Security"
        description="Read-only authentication and account-security signals."
      >
        <DetailGrid
          items={[
            {
              label:
                "MFA",
              value:
                user.mfaEnabled
                  ? "Verified factor present"
                  : "No verified factor detected",
            },
            {
              label:
                "Phone Confirmed",
              value:
                formatDateTime(
                  user.phoneConfirmedAt,
                ),
            },
            {
              label:
                "Ban / Disabled Until",
              value:
                formatDateTime(
                  user.bannedUntil,
                ),
            },
            {
              label:
                "Account Status",
              value:
                titleCase(
                  user.status,
                ),
            },
          ]}
        />

        <p
          className="
            mt-4
            rounded-xl
            border
            border-[var(--border-default)]
            bg-[var(--surface-muted)]
            p-4
            text-xs
            leading-5
            text-[var(--text-secondary)]
          "
        >
          Administrative mutations are intentionally
          not included in this first pass. User
          suspension, subscription changes, progress
          changes, certificate actions, and security
          actions should be implemented as separately
          authorized server mutations with audit
          logging.
        </p>
      </Section>
    </div>
  );
}

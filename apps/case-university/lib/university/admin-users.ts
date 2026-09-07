import "server-only";

import type { User } from "@supabase/supabase-js";

import {
  requireUniversityAdminCapability,
} from "@/lib/university/admin-permissions";
import { createSupabaseServerServiceClient } from "@/lib/supabase/serverService";
import {
  getUniversityStripeMode,
  type UniversityStripeMode,
} from "@/lib/university/stripe-mode";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const AUTH_PAGE_SIZE = 1000;
const IN_FILTER_CHUNK_SIZE = 200;

const CURRENT_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

const TIER_ELIGIBLE_STATUSES = new Set([
  "active",
  "trialing",
]);

const DISABLED_PROFILE_STATUSES = new Set([
  "disabled",
  "suspended",
  "inactive",
  "blocked",
]);

export type AdminUniversityPlan =
  | "free"
  | "plus"
  | "pro";

export type AdminUniversityPlanFilter =
  | "all"
  | AdminUniversityPlan;


export type AdminUniversityRoleFilter =
  | "all"
  | "user"
  | "admin"
  | "super_admin"
  | "master_admin";

export type AdminUniversityUserStatus =
  | "active"
  | "never_signed_in"
  | "disabled";

export type AdminUniversityUserStatusFilter =
  | "all"
  | AdminUniversityUserStatus;

export type AdminUsersQuery = {
  search?: string;
  plan?: AdminUniversityPlanFilter;
  role?: AdminUniversityRoleFilter;
  status?: AdminUniversityUserStatusFilter;
  page?: number;
  pageSize?: number;
};

export type AdminUniversityUserRow = {
  id: string;
  email: string | null;
  fullName: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  status: AdminUniversityUserStatus;
  profileStatus: string | null;
  roleId: string | null;
  roleName: string;
  roleRank: number;
  plan: AdminUniversityPlan;
  billingStatus: string | null;
  courseCount: number;
  completedCourseCount: number;
  certificateCount: number;
  lastLearningActivityAt: string | null;
};

export type AdminUniversityUsersStats = {
  totalUsers: number;
  activeUsers: number;
  neverSignedInUsers: number;
  disabledUsers: number;
  freeUsers: number;
  plusUsers: number;
  proUsers: number;
  adminUsers: number;
  superAdminUsers: number;
  masterAdminUsers: number;
};

export type AdminUniversityUsersResult = {
  users: AdminUniversityUserRow[];
  stats: AdminUniversityUsersStats;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  filters: {
    search: string;
    plan: AdminUniversityPlanFilter;
    role: AdminUniversityRoleFilter;
    status: AdminUniversityUserStatusFilter;
  };
};

export type AdminUniversityUserSubscription = {
  id: string;
  planId: string | null;
  planKey: string | null;
  planName: string | null;
  planPriceDisplay: string | null;
  planInterval: string | null;
  billingInterval: string | null;
  stripeMode: string | null;
  status: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminUniversityUserEnrollment = {
  id: string;
  courseId: string;
  courseSlug: string | null;
  courseTitle: string;
  status: string | null;
  progressPercent: number;
  enrolledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string | null;
};

export type AdminUniversityUserCertificate = {
  id: string;
  courseId: string;
  courseSlug: string | null;
  courseTitle: string;
  certificateNumber: string;
  issuedAt: string | null;
};

export type AdminUniversityUserDetails = {
  id: string;
  email: string | null;
  fullName: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  phoneConfirmedAt: string | null;
  profileStatus: string | null;
  roleId: string | null;
  roleName: string;
  roleRank: number;
  status: AdminUniversityUserStatus;
  plan: AdminUniversityPlan;
  billingStatus: string | null;
  bannedUntil: string | null;
  mfaEnabled: boolean;
  lessonProgressCount: number;
  completedLessonCount: number;
  lastLearningActivityAt: string | null;
  subscriptions: AdminUniversityUserSubscription[];
  enrollments: AdminUniversityUserEnrollment[];
  certificates: AdminUniversityUserCertificate[];
};

type AuthUserWithAdminFields = User & {
  banned_until?: string | null;
  factors?: Array<{
    status?: string | null;
  }> | null;
};

type ProfileRoleRelation = {
  name: string | null;
  rank: number | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  status: string | null;
  role_id: string | null;
  roles:
    | ProfileRoleRelation
    | ProfileRoleRelation[]
    | null;
};

type PlanRelation = {
  id?: string | null;
  key?: string | null;
  name?: string | null;
  interval?: string | null;
  price_display?: string | null;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  plan_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_mode: string | null;
  status: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  canceled_at: string | null;
  billing_interval: string | null;
  created_at: string | null;
  updated_at: string | null;
  plans: PlanRelation | PlanRelation[] | null;
};

type EnrollmentRow = {
  id: string;
  user_id: string;
  course_id: string;
  status: string | null;
  progress_percent: number | string | null;
  enrolled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_activity_at: string | null;
  university_courses:
    | {
        id?: string | null;
        slug?: string | null;
        title?: string | null;
      }
    | Array<{
        id?: string | null;
        slug?: string | null;
        title?: string | null;
      }>
    | null;
};

type CertificateRow = {
  id: string;
  user_id: string;
  course_id: string;
  certificate_number: string;
  issued_at: string | null;
  university_courses:
    | {
        id?: string | null;
        slug?: string | null;
        title?: string | null;
      }
    | Array<{
        id?: string | null;
        slug?: string | null;
        title?: string | null;
      }>
    | null;
};

type LearningSummary = {
  courseCount: number;
  completedCourseCount: number;
  certificateCount: number;
  lastLearningActivityAt: string | null;
};

export class UniversityAdminAccessError extends Error {
  constructor() {
    super(
      "You do not have permission to manage CASE University.",
    );

    this.name =
      "UniversityAdminAccessError";
  }
}

export async function canCurrentUserManageUniversity(): Promise<boolean> {
  try {
    await requireUniversityAdminCapability(
      "canViewUsers",
    );

    return true;
  } catch {
    return false;
  }
}

export async function requireUniversityAdminAccess(): Promise<void> {
  await requireUniversityAdminCapability(
    "canViewUsers",
  );
}

export function normalizeAdminUsersQuery(
  query: AdminUsersQuery,
): Required<AdminUsersQuery> {
  const search =
    String(
      query.search ?? "",
    )
      .trim()
      .slice(0, 200);

  const plan =
    query.plan === "free" ||
    query.plan === "plus" ||
    query.plan === "pro"
      ? query.plan
      : "all";

  const role =
    query.role === "user" ||
    query.role === "admin" ||
    query.role === "super_admin" ||
    query.role === "master_admin"
      ? query.role
      : "all";

  const status =
    query.status === "active" ||
    query.status ===
      "never_signed_in" ||
    query.status === "disabled"
      ? query.status
      : "all";

  const requestedPage =
    Number(
      query.page ?? 1,
    );

  const requestedPageSize =
    Number(
      query.pageSize ??
        DEFAULT_PAGE_SIZE,
    );

  const page =
    Number.isFinite(
      requestedPage,
    )
      ? Math.max(
          1,
          Math.floor(
            requestedPage,
          ),
        )
      : 1;

  const pageSize =
    Number.isFinite(
      requestedPageSize,
    )
      ? Math.min(
          MAX_PAGE_SIZE,
          Math.max(
            1,
            Math.floor(
              requestedPageSize,
            ),
          ),
        )
      : DEFAULT_PAGE_SIZE;

  return {
    search,
    plan,
    role,
    status,
    page,
    pageSize,
  };
}

function chunkValues<T>(
  values: T[],
  size = IN_FILTER_CHUNK_SIZE,
): T[][] {
  const chunks: T[][] = [];

  for (
    let index = 0;
    index < values.length;
    index += size
  ) {
    chunks.push(
      values.slice(
        index,
        index + size,
      ),
    );
  }

  return chunks;
}

async function listAllAuthUsers(): Promise<AuthUserWithAdminFields[]> {
  const service =
    createSupabaseServerServiceClient();

  const users:
    AuthUserWithAdminFields[] =
    [];

  let page = 1;

  while (true) {
    const {
      data,
      error,
    } =
      await service.auth.admin.listUsers(
        {
          page,
          perPage:
            AUTH_PAGE_SIZE,
        },
      );

    if (error) {
      throw new Error(
        `[CASE University Admin] Unable to list authentication users: ${error.message}`,
      );
    }

    const batch =
      (data.users ??
        []) as AuthUserWithAdminFields[];

    users.push(
      ...batch,
    );

    if (
      batch.length <
      AUTH_PAGE_SIZE
    ) {
      break;
    }

    page += 1;
  }

  return users;
}

async function loadProfiles(
  userIds: string[],
): Promise<Map<string, ProfileRow>> {
  const result =
    new Map<
      string,
      ProfileRow
    >();

  if (
    userIds.length === 0
  ) {
    return result;
  }

  const service =
    createSupabaseServerServiceClient();

  for (
    const ids of chunkValues(
      userIds,
    )
  ) {
    const {
      data,
      error,
    } =
      await service
        .from(
          "profiles",
        )
        .select(
          `
            id,
            email,
            full_name,
            status,
            role_id,
            roles:roles!profiles_role_id_fkey (
              name,
              rank
            )
          `,
        )
        .in(
          "id",
          ids,
        );

    if (error) {
      throw new Error(
        `[CASE University Admin] Unable to load user profiles: ${error.message}`,
      );
    }

    for (
      const row of
        (data ??
          []) as ProfileRow[]
    ) {
      result.set(
        row.id,
        row,
      );
    }
  }

  return result;
}


function normalizeProfileRole(
  profile: ProfileRow | null,
): {
  roleId: string | null;
  roleName: string;
  roleRank: number;
} {
  const relation =
    profile
      ? getSingleRelation(
          profile.roles,
        )
      : null;

  const roleRank =
    Number(
      relation?.rank ??
        1,
    );

  const normalizedRank =
    Number.isFinite(
      roleRank,
    )
      ? Math.max(
          1,
          Math.floor(
            roleRank,
          ),
        )
      : 1;

  let fallbackName =
    "user";

  if (
    normalizedRank >= 4
  ) {
    fallbackName =
      "master_admin";
  } else if (
    normalizedRank === 3
  ) {
    fallbackName =
      "super_admin";
  } else if (
    normalizedRank === 2
  ) {
    fallbackName =
      "admin";
  }

  return {
    roleId:
      profile?.role_id ??
      null,

    roleName:
      String(
        relation?.name ??
          fallbackName,
      )
        .trim()
        .toLowerCase() ||
      fallbackName,

    roleRank:
      normalizedRank,
  };
}

async function loadSubscriptions(
  userIds: string[],
  stripeMode: UniversityStripeMode,
): Promise<Map<string, SubscriptionRow[]>> {
  const result =
    new Map<
      string,
      SubscriptionRow[]
    >();

  if (
    userIds.length === 0
  ) {
    return result;
  }

  const service =
    createSupabaseServerServiceClient();

  for (
    const ids of chunkValues(
      userIds,
    )
  ) {
    const {
      data,
      error,
    } =
      await service
        .from(
          "subscriptions",
        )
        .select(
          `
            id,
            user_id,
            plan_id,
            stripe_customer_id,
            stripe_subscription_id,
            stripe_mode,
            status,
            current_period_start,
            current_period_end,
            cancel_at_period_end,
            canceled_at,
            billing_interval,
            created_at,
            updated_at,
            plans!subscriptions_plan_id_fkey (
              id,
              key,
              name,
              interval,
              price_display
            )
          `,
        )
        .in(
          "user_id",
          ids,
        )
        .eq(
          "stripe_mode",
          stripeMode,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        );

    if (error) {
      throw new Error(
        `[CASE University Admin] Unable to load University subscriptions: ${error.message}`,
      );
    }

    for (
      const row of
        (data ??
          []) as unknown as SubscriptionRow[]
    ) {
      const current =
        result.get(
          row.user_id,
        ) ?? [];

      current.push(
        row,
      );

      result.set(
        row.user_id,
        current,
      );
    }
  }

  return result;
}

function getSingleRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined,
): T | null {
  if (
    Array.isArray(
      value,
    )
  ) {
    return (
      value[0] ??
      null
    );
  }

  return value ?? null;
}

function tierFromPlanKey(
  planKey:
    string | null | undefined,
): AdminUniversityPlan {
  if (
    planKey?.startsWith(
      "university_pro_",
    )
  ) {
    return "pro";
  }

  if (
    planKey?.startsWith(
      "university_plus_",
    )
  ) {
    return "plus";
  }

  return "free";
}

function chooseCurrentUniversitySubscription(
  subscriptions:
    SubscriptionRow[],
): SubscriptionRow | null {
  return (
    subscriptions.find(
      (subscription) =>
        CURRENT_SUBSCRIPTION_STATUSES.has(
          String(
            subscription.status ??
              "",
          ).toLowerCase(),
        ),
    ) ??
    null
  );
}

function getBillingPresentation(
  subscriptions:
    SubscriptionRow[],
): {
  plan: AdminUniversityPlan;
  billingStatus:
    string | null;
} {
  const current =
    chooseCurrentUniversitySubscription(
      subscriptions,
    );

  if (!current) {
    return {
      plan: "free",
      billingStatus:
        null,
    };
  }

  const status =
    String(
      current.status ?? "",
    ).toLowerCase();

  const planRelation =
    getSingleRelation(
      current.plans,
    );

  return {
    plan:
      TIER_ELIGIBLE_STATUSES.has(
        status,
      )
        ? tierFromPlanKey(
            planRelation?.key,
          )
        : "free",

    billingStatus:
      current.status,
  };
}

function isBanActive(
  bannedUntil:
    string | null | undefined,
): boolean {
  if (!bannedUntil) {
    return false;
  }

  const timestamp =
    Date.parse(
      bannedUntil,
    );

  return (
    Number.isFinite(
      timestamp,
    ) &&
    timestamp >
      Date.now()
  );
}

function getAccountStatus({
  authUser,
  profile,
}: {
  authUser:
    AuthUserWithAdminFields;
  profile:
    ProfileRow | null;
}): AdminUniversityUserStatus {
  const profileStatus =
    String(
      profile?.status ?? "",
    )
      .trim()
      .toLowerCase();

  if (
    isBanActive(
      authUser.banned_until,
    ) ||
    DISABLED_PROFILE_STATUSES.has(
      profileStatus,
    )
  ) {
    return "disabled";
  }

  if (
    !authUser.last_sign_in_at
  ) {
    return "never_signed_in";
  }

  return "active";
}

function compareIsoDescending(
  a:
    string | null | undefined,
  b:
    string | null | undefined,
): number {
  const aTime =
    a
      ? Date.parse(a)
      : 0;

  const bTime =
    b
      ? Date.parse(b)
      : 0;

  return bTime - aTime;
}

function matchesSearch({
  authUser,
  profile,
  search,
}: {
  authUser:
    AuthUserWithAdminFields;
  profile:
    ProfileRow | null;
  search:
    string;
}): boolean {
  if (!search) {
    return true;
  }

  const haystack = [
    authUser.id,
    authUser.email,
    profile?.email,
    profile?.full_name,
    normalizeProfileRole(
      profile,
    ).roleName,
  ]
    .filter(
      Boolean,
    )
    .join(" ")
    .toLowerCase();

  return haystack.includes(
    search.toLowerCase(),
  );
}

async function loadLearningSummaries(
  userIds: string[],
): Promise<Map<string, LearningSummary>> {
  const result =
    new Map<
      string,
      LearningSummary
    >();

  for (
    const userId of
      userIds
  ) {
    result.set(
      userId,
      {
        courseCount: 0,
        completedCourseCount:
          0,
        certificateCount:
          0,
        lastLearningActivityAt:
          null,
      },
    );
  }

  if (
    userIds.length === 0
  ) {
    return result;
  }

  const service =
    createSupabaseServerServiceClient();

  for (
    const ids of chunkValues(
      userIds,
    )
  ) {
    const [
      enrollmentsResult,
      certificatesResult,
    ] =
      await Promise.all([
        service
          .from(
            "university_enrollments",
          )
          .select(
            `
              user_id,
              status,
              last_activity_at
            `,
          )
          .in(
            "user_id",
            ids,
          ),

        service
          .from(
            "university_certificates",
          )
          .select(
            "user_id",
          )
          .in(
            "user_id",
            ids,
          ),
      ]);

    if (
      enrollmentsResult.error
    ) {
      throw new Error(
        `[CASE University Admin] Unable to load enrollment summaries: ${enrollmentsResult.error.message}`,
      );
    }

    if (
      certificatesResult.error
    ) {
      throw new Error(
        `[CASE University Admin] Unable to load certificate summaries: ${certificatesResult.error.message}`,
      );
    }

    for (
      const enrollment of
        (enrollmentsResult.data ??
          []) as Array<{
          user_id: string;
          status:
            string | null;
          last_activity_at:
            string | null;
        }>
    ) {
      const summary =
        result.get(
          enrollment.user_id,
        );

      if (!summary) {
        continue;
      }

      summary.courseCount +=
        1;

      if (
        enrollment.status ===
        "completed"
      ) {
        summary.completedCourseCount +=
          1;
      }

      if (
        compareIsoDescending(
          summary.lastLearningActivityAt,
          enrollment.last_activity_at,
        ) > 0
      ) {
        summary.lastLearningActivityAt =
          enrollment.last_activity_at;
      }
    }

    for (
      const certificate of
        (certificatesResult.data ??
          []) as Array<{
          user_id: string;
        }>
    ) {
      const summary =
        result.get(
          certificate.user_id,
        );

      if (summary) {
        summary.certificateCount +=
          1;
      }
    }
  }

  return result;
}

export async function getAdminUniversityUsers(
  query: AdminUsersQuery = {},
): Promise<AdminUniversityUsersResult> {
  await requireUniversityAdminAccess();

  const normalized =
    normalizeAdminUsersQuery(
      query,
    );

  const stripeMode =
    getUniversityStripeMode();

  const authUsers =
    await listAllAuthUsers();

  const userIds =
    authUsers.map(
      (user) =>
        user.id,
    );

  const [
    profiles,
    subscriptions,
  ] =
    await Promise.all([
      loadProfiles(
        userIds,
      ),
      loadSubscriptions(
        userIds,
        stripeMode,
      ),
    ]);

  const baseRows =
    authUsers
      .map(
        (authUser) => {
          const profile =
            profiles.get(
              authUser.id,
            ) ??
            null;

          const billing =
            getBillingPresentation(
              subscriptions.get(
                authUser.id,
              ) ?? [],
            );

          const profileRole =
            normalizeProfileRole(
              profile,
            );

          return {
            authUser,
            profile,
            status:
              getAccountStatus({
                authUser,
                profile,
              }),
            plan:
              billing.plan,
            billingStatus:
              billing.billingStatus,

            roleId:
              profileRole.roleId,

            roleName:
              profileRole.roleName,

            roleRank:
              profileRole.roleRank,
          };
        },
      )
      .sort(
        (left, right) =>
          compareIsoDescending(
            left.authUser
              .created_at,
            right.authUser
              .created_at,
          ),
      );

  const stats:
    AdminUniversityUsersStats =
    {
      totalUsers:
        baseRows.length,

      activeUsers:
        baseRows.filter(
          (row) =>
            row.status ===
            "active",
        ).length,

      neverSignedInUsers:
        baseRows.filter(
          (row) =>
            row.status ===
            "never_signed_in",
        ).length,

      disabledUsers:
        baseRows.filter(
          (row) =>
            row.status ===
            "disabled",
        ).length,

      freeUsers:
        baseRows.filter(
          (row) =>
            row.plan ===
            "free",
        ).length,

      plusUsers:
        baseRows.filter(
          (row) =>
            row.plan ===
            "plus",
        ).length,

      proUsers:
        baseRows.filter(
          (row) =>
            row.plan ===
            "pro",
        ).length,

      adminUsers:
        baseRows.filter(
          (row) =>
            row.roleRank ===
            2,
        ).length,

      superAdminUsers:
        baseRows.filter(
          (row) =>
            row.roleRank ===
            3,
        ).length,

      masterAdminUsers:
        baseRows.filter(
          (row) =>
            row.roleRank >=
            4,
        ).length,
    };

  const filteredRows =
    baseRows.filter(
      (row) => {
        if (
          normalized.plan !==
            "all" &&
          row.plan !==
            normalized.plan
        ) {
          return false;
        }

        if (
          normalized.role !==
            "all" &&
          row.roleName !==
            normalized.role
        ) {
          return false;
        }

        if (
          normalized.status !==
            "all" &&
          row.status !==
            normalized.status
        ) {
          return false;
        }

        return matchesSearch(
          {
            authUser:
              row.authUser,

            profile:
              row.profile,

            search:
              normalized.search,
          },
        );
      },
    );

  const totalItems =
    filteredRows.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalItems /
          normalized.pageSize,
      ),
    );

  const page =
    Math.min(
      normalized.page,
      totalPages,
    );

  const startIndex =
    (page - 1) *
    normalized.pageSize;

  const pagedRows =
    filteredRows.slice(
      startIndex,
      startIndex +
        normalized.pageSize,
    );

  const learningSummaries =
    await loadLearningSummaries(
      pagedRows.map(
        (row) =>
          row.authUser.id,
      ),
    );

  const users:
    AdminUniversityUserRow[] =
    pagedRows.map(
      (row) => {
        const learning =
          learningSummaries.get(
            row.authUser.id,
          ) ?? {
            courseCount: 0,
            completedCourseCount:
              0,
            certificateCount: 0,
            lastLearningActivityAt:
              null,
          };

        return {
          id:
            row.authUser.id,

          email:
            row.authUser.email ??
            row.profile?.email ??
            null,

          fullName:
            row.profile
              ?.full_name ??
            null,

          createdAt:
            row.authUser
              .created_at,

          lastSignInAt:
            row.authUser
              .last_sign_in_at ??
            null,

          emailConfirmedAt:
            row.authUser
              .email_confirmed_at ??
            null,

          status:
            row.status,

          profileStatus:
            row.profile
              ?.status ??
            null,

          roleId:
            row.roleId,

          roleName:
            row.roleName,

          roleRank:
            row.roleRank,

          plan:
            row.plan,

          billingStatus:
            row.billingStatus,

          courseCount:
            learning.courseCount,

          completedCourseCount:
            learning.completedCourseCount,

          certificateCount:
            learning.certificateCount,

          lastLearningActivityAt:
            learning.lastLearningActivityAt,
        };
      },
    );

  return {
    users,
    stats,
    pagination: {
      page,
      pageSize:
        normalized.pageSize,
      totalItems,
      totalPages,
    },
    filters: {
      search:
        normalized.search,
      plan:
        normalized.plan,
      role:
        normalized.role,
      status:
        normalized.status,
    },
  };
}

function mapSubscription(
  row: SubscriptionRow,
): AdminUniversityUserSubscription {
  const plan =
    getSingleRelation(
      row.plans,
    );

  return {
    id:
      row.id,

    planId:
      row.plan_id,

    planKey:
      plan?.key ??
      null,

    planName:
      plan?.name ??
      null,

    planPriceDisplay:
      plan?.price_display ??
      null,

    planInterval:
      plan?.interval ??
      null,

    billingInterval:
      row.billing_interval,

    stripeMode:
      row.stripe_mode,

    status:
      row.status,

    stripeCustomerId:
      row.stripe_customer_id,

    stripeSubscriptionId:
      row.stripe_subscription_id,

    currentPeriodStart:
      row.current_period_start,

    currentPeriodEnd:
      row.current_period_end,

    cancelAtPeriodEnd:
      Boolean(
        row.cancel_at_period_end,
      ),

    canceledAt:
      row.canceled_at,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}

function normalizeNumber(
  value:
    number | string | null,
): number {
  const parsed =
    Number(
      value ?? 0,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}

export async function getAdminUniversityUserById(
  userId: string,
): Promise<AdminUniversityUserDetails | null> {
  await requireUniversityAdminAccess();

  const normalizedUserId =
    String(
      userId ?? "",
    ).trim();

  if (
    !normalizedUserId
  ) {
    return null;
  }

  const service =
    createSupabaseServerServiceClient();

  const {
    data:
      authUserResult,
    error:
      authUserError,
  } =
    await service.auth.admin.getUserById(
      normalizedUserId,
    );

  if (
    authUserError
  ) {
    if (
      authUserError.status ===
      404
    ) {
      return null;
    }

    throw new Error(
      `[CASE University Admin] Unable to load authentication user: ${authUserError.message}`,
    );
  }

  const authUser =
    authUserResult.user as
      | AuthUserWithAdminFields
      | null;

  if (!authUser) {
    return null;
  }

  const stripeMode =
    getUniversityStripeMode();

  const [
    profileResult,
    subscriptionMap,
    enrollmentsResult,
    certificatesResult,
    lessonProgressCountResult,
    completedLessonCountResult,
  ] =
    await Promise.all([
      service
        .from(
          "profiles",
        )
        .select(
          `
            id,
            email,
            full_name,
            status,
            role_id,
            roles:roles!profiles_role_id_fkey (
              name,
              rank
            )
          `,
        )
        .eq(
          "id",
          normalizedUserId,
        )
        .maybeSingle(),

      loadSubscriptions(
        [
          normalizedUserId,
        ],
        stripeMode,
      ),

      service
        .from(
          "university_enrollments",
        )
        .select(
          `
            id,
            user_id,
            course_id,
            status,
            progress_percent,
            enrolled_at,
            started_at,
            completed_at,
            last_activity_at,
            university_courses (
              id,
              slug,
              title
            )
          `,
        )
        .eq(
          "user_id",
          normalizedUserId,
        )
        .order(
          "last_activity_at",
          {
            ascending:
              false,
            nullsFirst:
              false,
          },
        ),

      service
        .from(
          "university_certificates",
        )
        .select(
          `
            id,
            user_id,
            course_id,
            certificate_number,
            issued_at,
            university_courses (
              id,
              slug,
              title
            )
          `,
        )
        .eq(
          "user_id",
          normalizedUserId,
        )
        .order(
          "issued_at",
          {
            ascending:
              false,
          },
        ),

      service
        .from(
          "university_lesson_progress",
        )
        .select(
          "id",
          {
            count:
              "exact",
            head:
              true,
          },
        )
        .eq(
          "user_id",
          normalizedUserId,
        ),

      service
        .from(
          "university_lesson_progress",
        )
        .select(
          "id",
          {
            count:
              "exact",
            head:
              true,
          },
        )
        .eq(
          "user_id",
          normalizedUserId,
        )
        .eq(
          "status",
          "completed",
        )
        .eq(
          "progress_percent",
          100,
        ),
    ]);

  if (
    profileResult.error
  ) {
    throw new Error(
      `[CASE University Admin] Unable to load the user profile: ${profileResult.error.message}`,
    );
  }

  if (
    enrollmentsResult.error
  ) {
    throw new Error(
      `[CASE University Admin] Unable to load the user's enrollments: ${enrollmentsResult.error.message}`,
    );
  }

  if (
    certificatesResult.error
  ) {
    throw new Error(
      `[CASE University Admin] Unable to load the user's certificates: ${certificatesResult.error.message}`,
    );
  }

  if (
    lessonProgressCountResult.error
  ) {
    throw new Error(
      `[CASE University Admin] Unable to count lesson progress: ${lessonProgressCountResult.error.message}`,
    );
  }

  if (
    completedLessonCountResult.error
  ) {
    throw new Error(
      `[CASE University Admin] Unable to count completed lessons: ${completedLessonCountResult.error.message}`,
    );
  }

  const profile =
    (profileResult.data ??
      null) as unknown as ProfileRow | null;

  const profileRole =
    normalizeProfileRole(
      profile,
    );

  const rawSubscriptions =
    subscriptionMap.get(
      normalizedUserId,
    ) ?? [];

  const billing =
    getBillingPresentation(
      rawSubscriptions,
    );

  const enrollments =
    (
      enrollmentsResult.data ??
      []
    ) as unknown as EnrollmentRow[];

  const certificates =
    (
      certificatesResult.data ??
      []
    ) as unknown as CertificateRow[];

  const mappedEnrollments:
    AdminUniversityUserEnrollment[] =
    enrollments.map(
      (row) => {
        const course =
          getSingleRelation(
            row.university_courses,
          );

        return {
          id:
            row.id,

          courseId:
            row.course_id,

          courseSlug:
            course?.slug ??
            null,

          courseTitle:
            course?.title ??
            "Untitled Course",

          status:
            row.status,

          progressPercent:
            normalizeNumber(
              row.progress_percent,
            ),

          enrolledAt:
            row.enrolled_at,

          startedAt:
            row.started_at,

          completedAt:
            row.completed_at,

          lastActivityAt:
            row.last_activity_at,
        };
      },
    );

  const mappedCertificates:
    AdminUniversityUserCertificate[] =
    certificates.map(
      (row) => {
        const course =
          getSingleRelation(
            row.university_courses,
          );

        return {
          id:
            row.id,

          courseId:
            row.course_id,

          courseSlug:
            course?.slug ??
            null,

          courseTitle:
            course?.title ??
            "Untitled Course",

          certificateNumber:
            row.certificate_number,

          issuedAt:
            row.issued_at,
        };
      },
    );

  const lastLearningActivityAt =
    mappedEnrollments
      .map(
        (enrollment) =>
          enrollment.lastActivityAt,
      )
      .filter(
        (
          value,
        ): value is string =>
          Boolean(
            value,
          ),
      )
      .sort(
        (a, b) =>
          compareIsoDescending(
            a,
            b,
          ),
      )[0] ??
    null;

  const mfaEnabled =
    Boolean(
      authUser.factors?.some(
        (factor) =>
          factor.status ===
          "verified",
      ),
    );

  return {
    id:
      authUser.id,

    email:
      authUser.email ??
      profile?.email ??
      null,

    fullName:
      profile?.full_name ??
      null,

    createdAt:
      authUser.created_at,

    lastSignInAt:
      authUser.last_sign_in_at ??
      null,

    emailConfirmedAt:
      authUser.email_confirmed_at ??
      null,

    phoneConfirmedAt:
      authUser.phone_confirmed_at ??
      null,

    profileStatus:
      profile?.status ??
      null,

    roleId:
      profileRole.roleId,

    roleName:
      profileRole.roleName,

    roleRank:
      profileRole.roleRank,

    status:
      getAccountStatus({
        authUser,
        profile,
      }),

    plan:
      billing.plan,

    billingStatus:
      billing.billingStatus,

    bannedUntil:
      authUser.banned_until ??
      null,

    mfaEnabled,

    lessonProgressCount:
      lessonProgressCountResult.count ??
      0,

    completedLessonCount:
      completedLessonCountResult.count ??
      0,

    lastLearningActivityAt,

    subscriptions:
      rawSubscriptions.map(
        mapSubscription,
      ),

    enrollments:
      mappedEnrollments,

    certificates:
      mappedCertificates,
  };
}

import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  createSupabaseServerServiceClient,
} from "@/lib/supabase/serverService";

import {
  getUniversityStripeMode,
} from "@/lib/university/stripe-mode";

export type UniversityCertificate = {
  id: string;
  user_id: string;
  course_id: string;
  certificate_number: string;
  issued_at: string;
  created_at: string;
  updated_at: string;
};

export type UniversityCertificateEligibility = {
  eligible: boolean;
  alreadyIssued: boolean;
  certificate: UniversityCertificate | null;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  reason:
    | "eligible"
    | "already_issued"
    | "course_not_found"
    | "course_has_no_lessons"
    | "course_incomplete";
};

export type UniversityCertificateWithCourse = {
  certificate: UniversityCertificate;
  course: {
    id: string;
    slug: string;
    title: string;
    short_description: string | null;
    difficulty: string | null;
    estimated_minutes: number | null;
  } | null;
};

type CourseRecord = {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  difficulty: string | null;
  estimated_minutes: number | null;
};

type LessonRecord = {
  id: string;
};

type LessonProgressRecord = {
  lesson_id: string;
  status: string;
  progress_percent: number | string | null;
};

type CertificateWithCourseRecord = {
  id: string;
  user_id: string;
  course_id: string;
  certificate_number: string;
  issued_at: string;
  created_at: string;
  updated_at: string;
  university_courses:
    | CourseRecord
    | CourseRecord[]
    | null;
};

function normalizeNumber(
  value:
    | number
    | string
    | null
    | undefined,
) {
  const numericValue =
    Number(value ?? 0);

  if (
    !Number.isFinite(
      numericValue,
    )
  ) {
    return 0;
  }

  return numericValue;
}

function normalizeProgressPercent(
  value:
    | number
    | string
    | null
    | undefined,
) {
  return Math.min(
    100,
    Math.max(
      0,
      normalizeNumber(value),
    ),
  );
}

function normalizeCertificate(
  record: UniversityCertificate,
): UniversityCertificate {
  return {
    id: record.id,
    user_id: record.user_id,
    course_id: record.course_id,
    certificate_number:
      record.certificate_number,
    issued_at:
      record.issued_at,
    created_at:
      record.created_at,
    updated_at:
      record.updated_at,
  };
}

function normalizeCourseRelation(
  relation:
    | CourseRecord
    | CourseRecord[]
    | null,
): CourseRecord | null {
  if (!relation) {
    return null;
  }

  if (
    Array.isArray(
      relation,
    )
  ) {
    return (
      relation[0] ??
      null
    );
  }

  return relation;
}

async function getAuthenticatedUser() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: {
      user,
    },
    error,
  } =
    await supabase.auth.getUser();

  if (
    error ||
    !user
  ) {
    throw new Error(
      "Authentication is required to access CASE University certificates.",
    );
  }

  return {
    supabase,
    user,
  };
}

async function getCertificateForUser(
  userId: string,
  courseId: string,
) {
  const supabase =
    await createSupabaseServerClient();

  const {
    data,
    error,
  } =
    await supabase
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
          created_at,
          updated_at
        `,
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "course_id",
        courseId,
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load certificate: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return normalizeCertificate(
    data as UniversityCertificate,
  );
}

async function getCourseLessonCompletion(
  userId: string,
  courseId: string,
) {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: course,
    error: courseError,
  } =
    await supabase
      .from(
        "university_courses",
      )
      .select(
        "id",
      )
      .eq(
        "id",
        courseId,
      )
      .maybeSingle();

  if (courseError) {
    throw new Error(
      `Unable to verify course: ${courseError.message}`,
    );
  }

  if (!course) {
    return {
      courseExists: false,
      totalLessons: 0,
      completedLessons: 0,
      progressPercent: 0,
    };
  }

  /*
   * university_lessons is intentionally not directly readable by the
   * authenticated role. The caller's user identity is already established,
   * so lesson inventory for completion/certificate calculations is read
   * through the server-only service client without weakening lesson RLS.
   */
  const serviceSupabase =
    createSupabaseServerServiceClient();

  const {
    data: lessons,
    error: lessonsError,
  } =
    await serviceSupabase
      .from(
        "university_lessons",
      )
      .select(
        "id",
      )
      .eq(
        "course_id",
        courseId,
      );

  if (lessonsError) {
    throw new Error(
      `Unable to load course lessons: ${lessonsError.message}`,
    );
  }

  const lessonRecords =
    (lessons ??
      []) as LessonRecord[];

  const totalLessons =
    lessonRecords.length;

  if (
    totalLessons === 0
  ) {
    return {
      courseExists: true,
      totalLessons: 0,
      completedLessons: 0,
      progressPercent: 0,
    };
  }

  const lessonIds =
    lessonRecords.map(
      (lesson) =>
        lesson.id,
    );

  const {
    data: progressRecords,
    error: progressError,
  } =
    await supabase
      .from(
        "university_lesson_progress",
      )
      .select(
        `
          lesson_id,
          status,
          progress_percent
        `,
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "course_id",
        courseId,
      )
      .in(
        "lesson_id",
        lessonIds,
      );

  if (progressError) {
    throw new Error(
      `Unable to verify lesson completion: ${progressError.message}`,
    );
  }

  const completedLessonIds =
    new Set(
      (
        (progressRecords ??
          []) as LessonProgressRecord[]
      )
        .filter(
          (
            progress,
          ) =>
            progress.status ===
              "completed" ||
            normalizeProgressPercent(
              progress.progress_percent,
            ) >=
              100,
        )
        .map(
          (
            progress,
          ) =>
            progress.lesson_id,
        ),
    );

  const completedLessons =
    lessonIds.filter(
      (lessonId) =>
        completedLessonIds.has(
          lessonId,
        ),
    ).length;

  const progressPercent =
    Math.min(
      100,
      Math.max(
        0,
        Number(
          (
            (
              completedLessons /
              totalLessons
            ) *
            100
          ).toFixed(2),
        ),
      ),
    );

  return {
    courseExists: true,
    totalLessons,
    completedLessons,
    progressPercent,
  };
}

export async function getCurrentUserCertificate(
  courseId: string,
): Promise<UniversityCertificate | null> {
  const {
    user,
  } =
    await getAuthenticatedUser();

  return getCertificateForUser(
    user.id,
    courseId,
  );
}

export async function getCurrentUserCertificateEligibility(
  courseId: string,
): Promise<UniversityCertificateEligibility> {
  const {
    user,
  } =
    await getAuthenticatedUser();

  const existingCertificate =
    await getCertificateForUser(
      user.id,
      courseId,
    );

  if (
    existingCertificate
  ) {
    return {
      eligible: true,
      alreadyIssued: true,
      certificate:
        existingCertificate,
      totalLessons: 0,
      completedLessons: 0,
      progressPercent: 100,
      reason:
        "already_issued",
    };
  }

  const completion =
    await getCourseLessonCompletion(
      user.id,
      courseId,
    );

  if (
    !completion.courseExists
  ) {
    return {
      eligible: false,
      alreadyIssued: false,
      certificate: null,
      totalLessons: 0,
      completedLessons: 0,
      progressPercent: 0,
      reason:
        "course_not_found",
    };
  }

  if (
    completion.totalLessons ===
    0
  ) {
    return {
      eligible: false,
      alreadyIssued: false,
      certificate: null,
      totalLessons: 0,
      completedLessons: 0,
      progressPercent: 0,
      reason:
        "course_has_no_lessons",
    };
  }

  const eligible =
    completion.completedLessons ===
    completion.totalLessons;

  return {
    eligible,
    alreadyIssued: false,
    certificate: null,
    totalLessons:
      completion.totalLessons,
    completedLessons:
      completion.completedLessons,
    progressPercent:
      completion.progressPercent,
    reason: eligible
      ? "eligible"
      : "course_incomplete",
  };
}

export async function issueCurrentUserCertificate(
  courseId: string,
): Promise<UniversityCertificate> {
  const {
    user,
  } =
    await getAuthenticatedUser();

  /*
   * Fast idempotency check.
   *
   * Existing earned certificates remain available even if the
   * learner later changes subscription tiers. This application
   * check also avoids an unnecessary privileged RPC call.
   */
  const existingCertificate =
    await getCertificateForUser(
      user.id,
      courseId,
    );

  if (
    existingCertificate
  ) {
    return existingCertificate;
  }

  /*
   * SECURITY BOUNDARY:
   *
   * The real end user has already been authenticated through
   * the normal cookie/session-aware Supabase client.
   *
   * Only that verified user.id is passed to the privileged
   * service-role RPC. No browser-supplied user ID is trusted.
   *
   * Stripe mode comes exclusively from the trusted server
   * environment through getUniversityStripeMode().
   *
   * The database RPC performs the authoritative checks:
   * - validates the verified user and course
   * - validates the trusted Stripe environment
   * - preserves already-earned certificates
   * - requires mode-aware course access
   * - requires the course_certificates entitlement
   * - requires authoritative completion of every course lesson
   * - inserts at most one certificate per user/course
   * - safely handles simultaneous issuance requests
   */
  const stripeMode =
    getUniversityStripeMode();

  const serviceSupabase =
    createSupabaseServerServiceClient();

  const {
    data,
    error,
  } =
    await serviceSupabase.rpc(
      "issue_university_user_certificate",
      {
        p_user_id:
          user.id,

        p_course_id:
          courseId,

        p_stripe_mode:
          stripeMode,
      },
    );

  if (error) {
    throw new Error(
      `Unable to issue certificate: ${error.message}`,
    );
  }

  const rpcRecord =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!rpcRecord) {
    /*
     * A concurrent request may have completed issuance after
     * the RPC returned. Re-query once before treating the
     * operation as a failure.
     */
    const certificateAfterRpc =
      await getCertificateForUser(
        user.id,
        courseId,
      );

    if (
      certificateAfterRpc
    ) {
      return certificateAfterRpc;
    }

    throw new Error(
      "Certificate issuance completed without returning a certificate record.",
    );
  }

  return normalizeCertificate(
    rpcRecord as UniversityCertificate,
  );
}

export async function getCurrentUserCertificates(): Promise<
  UniversityCertificateWithCourse[]
> {
  const {
    supabase,
    user,
  } =
    await getAuthenticatedUser();

  const {
    data,
    error,
  } =
    await supabase
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
          created_at,
          updated_at,
          university_courses (
            id,
            slug,
            title,
            short_description,
            difficulty,
            estimated_minutes
          )
        `,
      )
      .eq(
        "user_id",
        user.id,
      )
      .order(
        "issued_at",
        {
          ascending: false,
        },
      );

  if (error) {
    throw new Error(
      `Unable to load certificates: ${error.message}`,
    );
  }

  const records =
    (data ??
      []) as unknown as CertificateWithCourseRecord[];

  return records.map(
    (
      record,
    ) => {
      const course =
        normalizeCourseRelation(
          record.university_courses,
        );

      return {
        certificate:
          normalizeCertificate({
            id: record.id,
            user_id:
              record.user_id,
            course_id:
              record.course_id,
            certificate_number:
              record.certificate_number,
            issued_at:
              record.issued_at,
            created_at:
              record.created_at,
            updated_at:
              record.updated_at,
          }),

        course: course
          ? {
              id: course.id,
              slug:
                course.slug,
              title:
                course.title,
              short_description:
                course.short_description,
              difficulty:
                course.difficulty,
              estimated_minutes:
                course.estimated_minutes,
            }
          : null,
      };
    },
  );
}
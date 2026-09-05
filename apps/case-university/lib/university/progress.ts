import "server-only";

import {
  createSupabaseServerClient,
} from "@/lib/supabase/server";

import {
  createSupabaseServerServiceClient,
} from "@/lib/supabase/serverService";

import {
  getUniversityStripeMode,
} from "@/lib/university/stripe-mode";

export type UniversityEnrollmentStatus =
  | "active"
  | "completed";

export type UniversityLessonProgressStatus =
  | "not_started"
  | "in_progress"
  | "completed";

export type UniversityEnrollment = {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  progress_percent: number;
  enrolled_at: string;
  started_at: string | null;
  completed_at: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UniversityLessonProgress = {
  id: string;
  user_id: string;
  course_id: string;
  module_id: string;
  lesson_id: string;
  status: string;
  progress_percent: number;
  started_at: string | null;
  completed_at: string | null;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UniversityCourseProgressSummary = {
  enrollment: UniversityEnrollment | null;
  total_lessons: number;
  started_lessons: number;
  completed_lessons: number;
  progress_percent: number;
};

export type StartLessonInput = {
  courseId: string;
  moduleId: string;
  lessonId: string;
};

export type CompleteLessonInput = {
  courseId: string;
  moduleId: string;
  lessonId: string;
};

function normalizeNumericValue(
  value: unknown,
) {
  if (
    typeof value ===
    "number"
  ) {
    return Number.isFinite(
      value,
    )
      ? value
      : 0;
  }

  if (
    typeof value ===
    "string"
  ) {
    const parsed =
      Number(
        value,
      );

    return Number.isFinite(
      parsed,
    )
      ? parsed
      : 0;
  }

  return 0;
}

function normalizeEnrollment(
  enrollment: UniversityEnrollment,
): UniversityEnrollment {
  return {
    ...enrollment,

    progress_percent:
      normalizeNumericValue(
        enrollment.progress_percent,
      ),
  };
}

function normalizeLessonProgress(
  progress: UniversityLessonProgress,
): UniversityLessonProgress {
  return {
    ...progress,

    progress_percent:
      normalizeNumericValue(
        progress.progress_percent,
      ),
  };
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
      "You must be signed in to access CASE University progress.",
    );
  }

  return {
    supabase,
    user,
  };
}

async function getEnrollmentForUser(
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
      .order(
        "created_at",
        {
          ascending:
            true,
        },
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load course enrollment: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return normalizeEnrollment(
    data as UniversityEnrollment,
  );
}

async function getLessonProgressForUser(
  userId: string,
  lessonId: string,
) {
  const supabase =
    await createSupabaseServerClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "university_lesson_progress",
      )
      .select(
        `
          id,
          user_id,
          course_id,
          module_id,
          lesson_id,
          status,
          progress_percent,
          started_at,
          completed_at,
          last_viewed_at,
          created_at,
          updated_at
        `,
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "lesson_id",
        lessonId,
      )
      .order(
        "created_at",
        {
          ascending:
            true,
        },
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load lesson progress: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return normalizeLessonProgress(
    data as UniversityLessonProgress,
  );
}

async function callEnrollmentRpc(
  courseId: string,
) {
  /*
   * SECURITY BOUNDARY:
   *
   * First authenticate the real end user using the normal
   * cookie/session-aware Supabase client.
   *
   * Only that verified user.id is passed into the privileged
   * service-role RPC. No browser-supplied user ID is trusted.
   */
  const {
    user,
  } =
    await getAuthenticatedUser();

  const stripeMode =
    getUniversityStripeMode();

  const serviceSupabase =
    createSupabaseServerServiceClient();

  const {
    data,
    error,
  } =
    await serviceSupabase.rpc(
      "enroll_university_user_in_course",
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
      `Unable to create course enrollment: ${error.message}`,
    );
  }

  if (
    !data ||
    typeof data !==
      "object"
  ) {
    throw new Error(
      "Unable to create course enrollment: the database returned an invalid enrollment.",
    );
  }

  return normalizeEnrollment(
    data as UniversityEnrollment,
  );
}

async function callLessonProgressRpc({
  courseId,
  moduleId,
  lessonId,
  status,
}: {
  courseId: string;
  moduleId: string;
  lessonId: string;
  status: UniversityLessonProgressStatus;
}) {
  /*
   * SECURITY BOUNDARY:
   *
   * Authenticate the real end user using the normal
   * cookie/session-aware Supabase client.
   *
   * Only the verified user.id is passed into the privileged
   * service-role RPC.
   *
   * Stripe mode comes exclusively from the server environment
   * through getUniversityStripeMode().
   *
   * The browser cannot choose either p_user_id or p_stripe_mode.
   */
  const {
    user,
  } =
    await getAuthenticatedUser();

  const stripeMode =
    getUniversityStripeMode();

  const serviceSupabase =
    createSupabaseServerServiceClient();

  const {
    data,
    error,
  } =
    await serviceSupabase.rpc(
      "update_university_user_lesson_progress",
      {
        p_user_id:
          user.id,

        p_course_id:
          courseId,

        p_module_id:
          moduleId,

        p_lesson_id:
          lessonId,

        p_status:
          status,

        p_stripe_mode:
          stripeMode,
      },
    );

  if (error) {
    throw new Error(
      `Unable to update lesson progress: ${error.message}`,
    );
  }

  if (
    !data ||
    typeof data !==
      "object"
  ) {
    throw new Error(
      "Unable to update lesson progress: the database returned an invalid progress record.",
    );
  }

  return normalizeLessonProgress(
    data as UniversityLessonProgress,
  );
}

export async function getCurrentUserCourseEnrollment(
  courseId: string,
) {
  const {
    user,
  } =
    await getAuthenticatedUser();

  return getEnrollmentForUser(
    user.id,
    courseId,
  );
}

export async function ensureCurrentUserCourseEnrollment(
  courseId: string,
) {
  const {
    user,
  } =
    await getAuthenticatedUser();

  const existingEnrollment =
    await getEnrollmentForUser(
      user.id,
      courseId,
    );

  if (
    existingEnrollment
  ) {
    return existingEnrollment;
  }

  return callEnrollmentRpc(
    courseId,
  );
}

export async function getCurrentUserLessonProgress(
  lessonId: string,
) {
  const {
    user,
  } =
    await getAuthenticatedUser();

  return getLessonProgressForUser(
    user.id,
    lessonId,
  );
}

export async function getCurrentUserCourseLessonProgress(
  courseId: string,
) {
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
        "university_lesson_progress",
      )
      .select(
        `
          id,
          user_id,
          course_id,
          module_id,
          lesson_id,
          status,
          progress_percent,
          started_at,
          completed_at,
          last_viewed_at,
          created_at,
          updated_at
        `,
      )
      .eq(
        "user_id",
        user.id,
      )
      .eq(
        "course_id",
        courseId,
      )
      .order(
        "created_at",
        {
          ascending:
            true,
        },
      );

  if (error) {
    throw new Error(
      `Unable to load course lesson progress: ${error.message}`,
    );
  }

  return (
    data ??
    []
  ).map(
    (
      progress,
    ) =>
      normalizeLessonProgress(
        progress as UniversityLessonProgress,
      ),
  );
}

export async function getCurrentUserCourseProgressSummary(
  courseId: string,
): Promise<UniversityCourseProgressSummary> {
  const {
    supabase,
    user,
  } =
    await getAuthenticatedUser();

  const enrollment =
    await getEnrollmentForUser(
      user.id,
      courseId,
    );

  /*
   * Full lesson rows are intentionally not readable through the authenticated
   * role. The current user has already been verified above, so this server-only
   * summary may use the service client to count course lessons without
   * weakening university_lessons RLS/table grants.
   */
  const serviceSupabase =
    createSupabaseServerServiceClient();

  const {
    count:
      totalLessons,

    error:
      totalLessonsError,
  } =
    await serviceSupabase
      .from(
        "university_lessons",
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
        "course_id",
        courseId,
      );

  if (
    totalLessonsError
  ) {
    throw new Error(
      `Unable to load total lessons: ${totalLessonsError.message}`,
    );
  }

  const {
    count:
      startedLessons,

    error:
      startedLessonsError,
  } =
    await supabase
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
        user.id,
      )
      .eq(
        "course_id",
        courseId,
      )
      .in(
        "status",
        [
          "in_progress",
          "completed",
        ],
      );

  if (
    startedLessonsError
  ) {
    throw new Error(
      `Unable to load started lessons: ${startedLessonsError.message}`,
    );
  }

  const {
    count:
      completedLessons,

    error:
      completedLessonsError,
  } =
    await supabase
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
        user.id,
      )
      .eq(
        "course_id",
        courseId,
      )
      .eq(
        "status",
        "completed",
      );

  if (
    completedLessonsError
  ) {
    throw new Error(
      `Unable to load completed lessons: ${completedLessonsError.message}`,
    );
  }

  const total =
    totalLessons ??
    0;

  const completed =
    completedLessons ??
    0;

  const calculatedProgress =
    total > 0
      ? Number(
          (
            (completed /
              total) *
            100
          ).toFixed(
            2,
          ),
        )
      : 0;

  return {
    enrollment,

    total_lessons:
      total,

    started_lessons:
      startedLessons ??
      0,

    completed_lessons:
      completed,

    progress_percent:
      enrollment
        ? normalizeNumericValue(
            enrollment.progress_percent,
          )
        : calculatedProgress,
  };
}

export async function startCurrentUserLesson({
  courseId,
  moduleId,
  lessonId,
}: StartLessonInput) {
  const {
    user,
  } =
    await getAuthenticatedUser();

  const existingProgress =
    await getLessonProgressForUser(
      user.id,
      lessonId,
    );

  /*
   * Never downgrade a completed lesson merely
   * because the learner opens it again.
   */
  const nextStatus:
    UniversityLessonProgressStatus =
      existingProgress?.status ===
      "completed"
        ? "completed"
        : "in_progress";

  const lessonProgress =
    await callLessonProgressRpc({
      courseId,
      moduleId,
      lessonId,
      status:
        nextStatus,
    });

  const enrollment =
    await getEnrollmentForUser(
      user.id,
      courseId,
    );

  if (!enrollment) {
    throw new Error(
      "Lesson progress was updated, but the course enrollment could not be loaded.",
    );
  }

  return {
    lessonProgress,
    enrollment,
  };
}

export async function completeCurrentUserLesson({
  courseId,
  moduleId,
  lessonId,
}: CompleteLessonInput) {
  const {
    user,
  } =
    await getAuthenticatedUser();

  const lessonProgress =
    await callLessonProgressRpc({
      courseId,
      moduleId,
      lessonId,
      status:
        "completed",
    });

  const enrollment =
    await getEnrollmentForUser(
      user.id,
      courseId,
    );

  if (!enrollment) {
    throw new Error(
      "Lesson was completed, but the course enrollment could not be loaded.",
    );
  }

  return {
    lessonProgress,
    enrollment,
  };
}

export async function synchronizeCurrentUserCourseProgress(
  courseId: string,
) {
  /*
   * Course progress is now authoritative inside
   * update_current_university_lesson_progress().
   *
   * This helper remains exported so existing
   * callers do not break. It no longer performs
   * direct UPDATE operations.
   */
  const {
    user,
  } =
    await getAuthenticatedUser();

  const enrollment =
    await getEnrollmentForUser(
      user.id,
      courseId,
    );

  if (enrollment) {
    return enrollment;
  }

  return callEnrollmentRpc(
    courseId,
  );
}


// ============================================================================
// CASE UNIVERSITY - CONSOLIDATED PROGRESS DASHBOARD
// ============================================================================

export type UniversityProgressDashboardOverview = {
  total_courses: number;
  started_courses: number;
  completed_courses: number;
  total_lessons: number;
  started_lessons: number;
  completed_lessons: number;
  overall_progress_percent: number;
  certificates_earned: number;
};

export type UniversityProgressDashboardStreak = {
  current_streak_days: number;
  longest_streak_days: number;
  total_learning_days: number;
  last_learning_date: string | null;
};

export type UniversityProgressDashboardAssessments = {
  attempt_count: number;
  passed_attempt_count: number;
  average_score: number;
  best_score: number;
};

export type UniversityProgressDashboardPractice = {
  attempt_count: number;
  average_score: number;
  best_score: number;
  questions_answered: number;
  correct_answers: number;
  accuracy_percent: number;
};

export type UniversityProgressDashboardCourse = {
  course_id: string;
  slug: string;
  title: string;
  difficulty: string | null;
  estimated_minutes: number | null;
  status: string;
  progress_percent: number;
  enrolled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_activity_at: string | null;
  total_lessons: number;
  completed_lessons: number;
};

export type UniversityProgressDashboardRecentActivityType =
  | "lesson_completed"
  | "assessment_completed"
  | "practice_completed"
  | "certificate_earned";

export type UniversityProgressDashboardRecentActivity = {
  activity_type: UniversityProgressDashboardRecentActivityType;
  occurred_at: string;
  course_id: string | null;
  course_slug: string | null;
  course_title: string | null;
  lesson_id: string | null;
  lesson_slug: string | null;
  lesson_title: string | null;
  score: number | null;
};

export type UniversityProgressDashboard = {
  overview: UniversityProgressDashboardOverview;
  streak: UniversityProgressDashboardStreak;
  assessments: UniversityProgressDashboardAssessments;
  practice: UniversityProgressDashboardPractice;
  courses: UniversityProgressDashboardCourse[];
  recent_activity: UniversityProgressDashboardRecentActivity[];
};

function normalizeDashboardNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeProgressDashboard(
  dashboard: UniversityProgressDashboard,
): UniversityProgressDashboard {
  return {
    overview: {
      total_courses: normalizeDashboardNumber(
        dashboard.overview?.total_courses,
      ),
      started_courses: normalizeDashboardNumber(
        dashboard.overview?.started_courses,
      ),
      completed_courses: normalizeDashboardNumber(
        dashboard.overview?.completed_courses,
      ),
      total_lessons: normalizeDashboardNumber(
        dashboard.overview?.total_lessons,
      ),
      started_lessons: normalizeDashboardNumber(
        dashboard.overview?.started_lessons,
      ),
      completed_lessons: normalizeDashboardNumber(
        dashboard.overview?.completed_lessons,
      ),
      overall_progress_percent: normalizeDashboardNumber(
        dashboard.overview?.overall_progress_percent,
      ),
      certificates_earned: normalizeDashboardNumber(
        dashboard.overview?.certificates_earned,
      ),
    },

    streak: {
      current_streak_days: normalizeDashboardNumber(
        dashboard.streak?.current_streak_days,
      ),
      longest_streak_days: normalizeDashboardNumber(
        dashboard.streak?.longest_streak_days,
      ),
      total_learning_days: normalizeDashboardNumber(
        dashboard.streak?.total_learning_days,
      ),
      last_learning_date:
        dashboard.streak?.last_learning_date ?? null,
    },

    assessments: {
      attempt_count: normalizeDashboardNumber(
        dashboard.assessments?.attempt_count,
      ),
      passed_attempt_count: normalizeDashboardNumber(
        dashboard.assessments?.passed_attempt_count,
      ),
      average_score: normalizeDashboardNumber(
        dashboard.assessments?.average_score,
      ),
      best_score: normalizeDashboardNumber(
        dashboard.assessments?.best_score,
      ),
    },

    practice: {
      attempt_count: normalizeDashboardNumber(
        dashboard.practice?.attempt_count,
      ),
      average_score: normalizeDashboardNumber(
        dashboard.practice?.average_score,
      ),
      best_score: normalizeDashboardNumber(
        dashboard.practice?.best_score,
      ),
      questions_answered: normalizeDashboardNumber(
        dashboard.practice?.questions_answered,
      ),
      correct_answers: normalizeDashboardNumber(
        dashboard.practice?.correct_answers,
      ),
      accuracy_percent: normalizeDashboardNumber(
        dashboard.practice?.accuracy_percent,
      ),
    },

    courses: (dashboard.courses ?? []).map((course) => ({
      ...course,
      estimated_minutes:
        course.estimated_minutes === null
          ? null
          : normalizeDashboardNumber(course.estimated_minutes),
      progress_percent: normalizeDashboardNumber(
        course.progress_percent,
      ),
      total_lessons: normalizeDashboardNumber(
        course.total_lessons,
      ),
      completed_lessons: normalizeDashboardNumber(
        course.completed_lessons,
      ),
    })),

    recent_activity: dashboard.recent_activity ?? [],
  };
}

export async function getCurrentUserProgressDashboard(): Promise<UniversityProgressDashboard> {
  const {
    user,
  } =
    await getAuthenticatedUser();

  const stripeMode =
    getUniversityStripeMode();

  const serviceSupabase =
    createSupabaseServerServiceClient();

  const {
    data,
    error,
  } =
    await serviceSupabase.rpc(
      "get_university_user_progress_dashboard",
      {
        p_user_id:
          user.id,

        p_stripe_mode:
          stripeMode,
      },
    );

  if (error) {
    throw new Error(
      `Unable to load CASE University progress dashboard: ${error.message}`,
    );
  }

  if (
    !data ||
    typeof data !==
      "object"
  ) {
    throw new Error(
      "Unable to load CASE University progress dashboard: invalid database response.",
    );
  }

  return normalizeProgressDashboard(
    data as UniversityProgressDashboard,
  );
}

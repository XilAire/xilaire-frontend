import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createSupabaseServerServiceClient,
} from "@/lib/supabase/serverService";
import {
  canAccessUniversityLesson,
} from "@/lib/university/entitlements";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";

import type {
  UniversityCourse,
  UniversityCourseSummary,
  UniversityCourseWithModules,
  UniversityLesson,
  UniversityModule,
  UniversityModuleWithLessons,
} from "@/types/university";

type PublicCourseRow = Omit<
  UniversityCourse,
  "created_by" | "created_at" | "updated_at"
>;

type PublicModuleRow = Omit<
  UniversityModule,
  "created_at" | "updated_at"
>;

const PUBLIC_COURSE_SELECT = `
  id,
  slug,
  title,
  short_description,
  description,
  status,
  difficulty,
  estimated_minutes,
  sort_order,
  thumbnail_url,
  is_featured,
  published_at
`;

const PUBLIC_MODULE_SELECT = `
  id,
  course_id,
  slug,
  title,
  description,
  status,
  sort_order,
  estimated_minutes
`;

type PublishedLessonMetadataRow = {
  id: string;
  course_id: string;
  module_id: string;
  slug: string;
  title: string;
  short_description: string | null;
  lesson_type: string;
  sort_order: number;
  estimated_minutes: number;
  is_preview: boolean;
};


type SequentialModuleRow = {
  id: string;
  sort_order: number;
};

type SequentialLessonRow = {
  id: string;
  module_id: string;
  sort_order: number;
};

async function canCurrentUserAccessSequentialLesson({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId: string;
}): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const serviceSupabase =
    createSupabaseServerServiceClient();

  const [
    { data: modules, error: modulesError },
    { data: lessons, error: lessonsError },
  ] = await Promise.all([
    serviceSupabase
      .from("university_modules")
      .select("id, sort_order")
      .eq("course_id", courseId)
      .eq("status", "published")
      .order("sort_order", { ascending: true }),

    serviceSupabase
      .from("university_lessons")
      .select("id, module_id, sort_order")
      .eq("course_id", courseId)
      .eq("status", "published"),
  ]);

  if (modulesError || lessonsError) {
    console.error(
      "Unable to resolve CASE University sequential lesson order",
      {
        course_id: courseId,
        lesson_id: lessonId,
        modules_error: modulesError,
        lessons_error: lessonsError,
      },
    );

    throw new Error(
      "Unable to resolve CASE University lesson sequence.",
    );
  }

  const moduleRows =
    (modules ?? []) as SequentialModuleRow[];
  const lessonRows =
    (lessons ?? []) as SequentialLessonRow[];

  const orderedLessonIds = moduleRows.flatMap(
    (module) =>
      lessonRows
        .filter(
          (lesson) => lesson.module_id === module.id,
        )
        .sort(
          (a, b) => a.sort_order - b.sort_order,
        )
        .map((lesson) => lesson.id),
  );

  const currentLessonIndex =
    orderedLessonIds.indexOf(lessonId);

  if (currentLessonIndex < 0) {
    return false;
  }

  /*
   * The first published lesson is the learner entry point after
   * the normal entitlement/preview authorization succeeds.
   */
  if (currentLessonIndex === 0) {
    return true;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return false;
  }

  const previousLessonId =
    orderedLessonIds[currentLessonIndex - 1];

  const {
    data: previousProgress,
    error: previousProgressError,
  } = await serviceSupabase
    .from("university_lesson_progress")
    .select("status, progress_percent")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .eq("lesson_id", previousLessonId)
    .maybeSingle();

  if (previousProgressError) {
    console.error(
      "Unable to verify CASE University prerequisite lesson completion",
      {
        user_id: user.id,
        course_id: courseId,
        lesson_id: lessonId,
        prerequisite_lesson_id: previousLessonId,
        error: previousProgressError,
      },
    );

    throw new Error(
      "Unable to verify CASE University lesson prerequisite.",
    );
  }

  return (
    previousProgress?.status === "completed" &&
    Number(previousProgress?.progress_percent ?? 0) >= 100
  );
}

function normalizePublicCourse(
  course: PublicCourseRow,
): UniversityCourse {
  return {
    ...course,
    created_by: null,
    created_at: "",
    updated_at: "",
  };
}

function normalizePublicModule(
  module: PublicModuleRow,
): UniversityModule {
  return {
    ...module,
    created_at: "",
    updated_at: "",
  };
}

function sortLessons(
  lessons: UniversityLesson[] | null | undefined,
): UniversityLesson[] {
  return [...(lessons ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
}

function sortModules(
  modules:
    | (UniversityModule & {
        lessons?: UniversityLesson[] | null;
      })[]
    | null
    | undefined,
): UniversityModuleWithLessons[] {
  return [...(modules ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((module) => ({
      ...module,
      lessons: sortLessons(module.lessons),
    }));
}

export async function getUniversityCourses(): Promise<
  UniversityCourse[]
> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("university_courses")
    .select(PUBLIC_COURSE_SELECT)
    .order("sort_order", {
      ascending: true,
    });

  if (error) {
    console.error("Unable to load CASE University courses", {
      error,
    });

    throw new Error("Unable to load CASE University courses.");
  }

  return ((data ?? []) as PublicCourseRow[]).map(
    normalizePublicCourse,
  );
}

export async function getPublishedUniversityCourses(): Promise<
  UniversityCourse[]
> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("university_courses")
    .select(PUBLIC_COURSE_SELECT)
    .eq("status", "published")
    .order("sort_order", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Unable to load published CASE University courses",
      {
        error,
      },
    );

    throw new Error(
      "Unable to load published CASE University courses.",
    );
  }

  return ((data ?? []) as PublicCourseRow[]).map(
    normalizePublicCourse,
  );
}

export async function getFeaturedUniversityCourses(): Promise<
  UniversityCourse[]
> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("university_courses")
    .select(PUBLIC_COURSE_SELECT)
    .eq("status", "published")
    .eq("is_featured", true)
    .order("sort_order", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Unable to load featured CASE University courses",
      {
        error,
      },
    );

    throw new Error(
      "Unable to load featured CASE University courses.",
    );
  }

  return ((data ?? []) as PublicCourseRow[]).map(
    normalizePublicCourse,
  );
}

export async function getUniversityCourseBySlug(
  courseSlug: string,
): Promise<UniversityCourse | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("university_courses")
    .select(PUBLIC_COURSE_SELECT)
    .eq("slug", courseSlug)
    .maybeSingle();

  if (error) {
    console.error("Unable to load CASE University course", {
      course_slug: courseSlug,
      error,
    });

    throw new Error("Unable to load CASE University course.");
  }

  return data
    ? normalizePublicCourse(
        data as PublicCourseRow,
      )
    : null;
}

export async function getPublishedUniversityCourseBySlug(
  courseSlug: string,
): Promise<UniversityCourse | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("university_courses")
    .select(PUBLIC_COURSE_SELECT)
    .eq("slug", courseSlug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to load published CASE University course",
      {
        course_slug: courseSlug,
        error,
      },
    );

    throw new Error(
      "Unable to load published CASE University course.",
    );
  }

  return data
    ? normalizePublicCourse(
        data as PublicCourseRow,
      )
    : null;
}

async function getStrictPublishedUniversityCourseWithModules(
  courseSlug: string,
): Promise<UniversityCourseWithModules | null> {
  const supabase = await createSupabaseServerClient();

  /*
   * Published course/module structure is safe catalog data.
   * Lesson rows are intentionally NOT joined here because direct
   * anon/authenticated SELECT access to university_lessons is denied.
   */
  const [
    { data, error },
    {
      data: publishedLessonMetadata,
      error: lessonMetadataError,
    },
  ] = await Promise.all([
    supabase
      .from("university_courses")
      .select(
        `
        ${PUBLIC_COURSE_SELECT},
        modules:university_modules!inner (
          ${PUBLIC_MODULE_SELECT}
        )
        `,
      )
      .eq("slug", courseSlug)
      .eq("status", "published")
      .eq("modules.status", "published")
      .maybeSingle(),

    supabase.rpc(
      "get_published_university_lesson_metadata",
    ),
  ]);

  if (error) {
    console.error(
      "Unable to load published CASE University course hierarchy",
      {
        course_slug: courseSlug,
        error,
      },
    );

    throw new Error(
      "Unable to load published CASE University course hierarchy.",
    );
  }

  if (lessonMetadataError) {
    console.error(
      "Unable to load published CASE University lesson metadata",
      {
        course_slug: courseSlug,
        error: lessonMetadataError,
      },
    );

    throw new Error(
      "Unable to load published CASE University lesson metadata.",
    );
  }

  if (!data) {
    return null;
  }

  const rawCourse = data as PublicCourseRow & {
    modules: PublicModuleRow[] | null;
  };

  const course = {
    ...normalizePublicCourse(rawCourse),
    modules: (rawCourse.modules ?? []).map(
      normalizePublicModule,
    ),
  };

  const lessonMetadataRows =
    (publishedLessonMetadata ??
      []) as PublishedLessonMetadataRow[];

  /*
   * Course navigation still consumes UniversityLesson-shaped values.
   * These objects intentionally contain no protected lesson content.
   * Full content is fetched only by getUniversityLessonBySlug()
   * after the trusted entitlement check succeeds.
   */
  const safeLessons: UniversityLesson[] =
    lessonMetadataRows
      .filter(
        (lesson) =>
          lesson.course_id === course.id,
      )
      .map(
        (lesson) =>
          ({
            id: lesson.id,
            course_id: lesson.course_id,
            module_id: lesson.module_id,
            slug: lesson.slug,
            title: lesson.title,
            short_description:
              lesson.short_description,
            content: {},
            status: "published",
            lesson_type: lesson.lesson_type,
            sort_order: lesson.sort_order,
            estimated_minutes:
              lesson.estimated_minutes,
            video_url: null,
            is_preview: lesson.is_preview,
            published_at: null,
            created_at: "",
            updated_at: "",
          }) as UniversityLesson,
      );

  const modules: UniversityModuleWithLessons[] =
    [...(course.modules ?? [])]
      .sort(
        (a, b) =>
          a.sort_order - b.sort_order,
      )
      .map((module) => ({
        ...module,
        lessons: safeLessons
          .filter(
            (lesson) =>
              lesson.module_id === module.id,
          )
          .sort(
            (a, b) =>
              a.sort_order - b.sort_order,
          ),
      }));

  return {
    ...course,
    modules,
  };
}


export async function getPublishedUniversityCourseWithModules(
  courseSlug: string,
): Promise<UniversityCourseWithModules | null> {
  const publishedCourse =
    await getStrictPublishedUniversityCourseWithModules(
      courseSlug,
    );

  if (publishedCourse) {
    return publishedCourse;
  }

  /*
   * Keep unpublished curriculum invisible to normal learners and
   * anonymous visitors, while allowing an authenticated University
   * administrator to use the existing learner lesson route as a
   * secure draft-preview surface.
   */
  const currentUserRole =
    await resolveCurrentUserRole();

  const canPreviewDraftCurriculum =
    currentUserRole?.role_name === "master_admin" ||
    Number(currentUserRole?.role_rank ?? 0) >= 4;

  if (!canPreviewDraftCurriculum) {
    return null;
  }

  return getAdminPreviewUniversityCourseWithModules(
    courseSlug,
  );
}


async function getAdminPreviewUniversityCourseWithModules(
  courseSlug: string,
): Promise<UniversityCourseWithModules | null> {
  const serviceSupabase =
    createSupabaseServerServiceClient();

  const { data: course, error: courseError } =
    await serviceSupabase
      .from("university_courses")
      .select("*")
      .eq("slug", courseSlug)
      .maybeSingle();

  if (courseError) {
    console.error(
      "Unable to load CASE University admin-preview course",
      {
        course_slug: courseSlug,
        error: courseError,
      },
    );

    throw new Error(
      "Unable to load CASE University admin-preview course.",
    );
  }

  if (!course) {
    return null;
  }

  const [
    { data: modules, error: modulesError },
    { data: lessons, error: lessonsError },
  ] = await Promise.all([
    serviceSupabase
      .from("university_modules")
      .select("*")
      .eq("course_id", course.id)
      .order("sort_order", {
        ascending: true,
      }),

    serviceSupabase
      .from("university_lessons")
      .select(`
        id,
        course_id,
        module_id,
        slug,
        title,
        short_description,
        content,
        status,
        lesson_type,
        sort_order,
        estimated_minutes,
        video_url,
        is_preview,
        published_at,
        created_at,
        updated_at
      `)
      .eq("course_id", course.id)
      .order("sort_order", {
        ascending: true,
      }),
  ]);

  if (modulesError) {
    console.error(
      "Unable to load CASE University admin-preview modules",
      {
        course_slug: courseSlug,
        error: modulesError,
      },
    );

    throw new Error(
      "Unable to load CASE University admin-preview modules.",
    );
  }

  if (lessonsError) {
    console.error(
      "Unable to load CASE University admin-preview lessons",
      {
        course_slug: courseSlug,
        error: lessonsError,
      },
    );

    throw new Error(
      "Unable to load CASE University admin-preview lessons.",
    );
  }

  const moduleRows =
    (modules ?? []) as UniversityModule[];

  const lessonRows =
    (lessons ?? []) as UniversityLesson[];

  return {
    ...(course as UniversityCourse),
    modules: moduleRows.map((module) => ({
      ...module,
      lessons: lessonRows
        .filter(
          (lesson) =>
            lesson.module_id === module.id,
        )
        .sort(
          (a, b) =>
            a.sort_order - b.sort_order,
        ),
    })),
  };
}

export async function getUniversityCourseForLearnerOrAdminPreview(
  courseSlug: string,
): Promise<UniversityCourseWithModules | null> {
  return getPublishedUniversityCourseWithModules(
    courseSlug,
  );
}

export async function getUniversityCourseSummaries(): Promise<
  UniversityCourseSummary[]
> {
  const supabase = await createSupabaseServerClient();

  const { data: courses, error: coursesError } =
    await supabase
      .from("university_courses")
      .select(PUBLIC_COURSE_SELECT)
      .order("sort_order", {
        ascending: true,
      });

  if (coursesError) {
    console.error(
      "Unable to load CASE University course summaries",
      {
        error: coursesError,
      },
    );

    throw new Error(
      "Unable to load CASE University course summaries.",
    );
  }

  const courseRows =
    ((courses ?? []) as PublicCourseRow[]).map(
      normalizePublicCourse,
    );

  if (courseRows.length === 0) {
    return [];
  }

  const courseIds = courseRows.map((course) => course.id);

  const [{ data: modules, error: modulesError }, { data: lessons, error: lessonsError }] =
    await Promise.all([
      supabase
        .from("university_modules")
        .select("id, course_id")
        .in("course_id", courseIds),

      supabase
        .rpc(
          "get_published_university_lesson_metadata",
        ),
    ]);

  if (modulesError) {
    console.error(
      "Unable to count CASE University modules",
      {
        error: modulesError,
      },
    );

    throw new Error(
      "Unable to count CASE University modules.",
    );
  }

  if (lessonsError) {
    console.error(
      "Unable to count CASE University lessons",
      {
        error: lessonsError,
      },
    );

    throw new Error(
      "Unable to count CASE University lessons.",
    );
  }

  const moduleCounts = new Map<string, number>();
  const lessonCounts = new Map<string, number>();

  for (const module of modules ?? []) {
    moduleCounts.set(
      module.course_id,
      (moduleCounts.get(module.course_id) ?? 0) + 1,
    );
  }

  const lessonMetadataRows =
    (lessons ?? []) as PublishedLessonMetadataRow[];

  for (const lesson of lessonMetadataRows) {
    if (!courseIds.includes(lesson.course_id)) {
      continue;
    }

    lessonCounts.set(
      lesson.course_id,
      (lessonCounts.get(lesson.course_id) ?? 0) + 1,
    );
  }

  return courseRows.map((course) => ({
    ...course,
    module_count: moduleCounts.get(course.id) ?? 0,
    lesson_count: lessonCounts.get(course.id) ?? 0,
  }));
}

export async function getUniversityLessonBySlug(
  courseSlug: string,
  lessonSlug: string,
): Promise<UniversityLesson | null> {
  /*
   * Administrators may securely preview unpublished curriculum.
   * The role check is performed on the server before the service-role
   * client is allowed to resolve or read a draft lesson.
   */
  const currentUserRole =
    await resolveCurrentUserRole();

  const canPreviewDraftCurriculum =
    currentUserRole?.role_name === "master_admin" ||
    Number(currentUserRole?.role_rank ?? 0) >= 4;

  if (canPreviewDraftCurriculum) {
    const serviceSupabase =
      createSupabaseServerServiceClient();

    const {
      data: adminPreviewCourse,
      error: adminPreviewCourseError,
    } = await serviceSupabase
      .from("university_courses")
      .select("id")
      .eq("slug", courseSlug)
      .maybeSingle();

    if (adminPreviewCourseError) {
      console.error(
        "Unable to resolve CASE University admin-preview course for lesson",
        {
          course_slug: courseSlug,
          lesson_slug: lessonSlug,
          error: adminPreviewCourseError,
        },
      );

      throw new Error(
        "Unable to resolve CASE University admin-preview course.",
      );
    }

    if (!adminPreviewCourse) {
      return null;
    }

    const {
      data: adminPreviewLesson,
      error: adminPreviewLessonError,
    } = await serviceSupabase
      .from("university_lessons")
      .select("*")
      .eq(
        "course_id",
        adminPreviewCourse.id,
      )
      .eq("slug", lessonSlug)
      .maybeSingle();

    if (adminPreviewLessonError) {
      console.error(
        "Unable to load CASE University admin-preview lesson",
        {
          course_slug: courseSlug,
          lesson_slug: lessonSlug,
          error: adminPreviewLessonError,
        },
      );

      throw new Error(
        "Unable to load CASE University admin-preview lesson.",
      );
    }

    return (
      (adminPreviewLesson as UniversityLesson | null) ??
      null
    );
  }

  const supabase = await createSupabaseServerClient();

  const { data: course, error: courseError } = await supabase
    .from("university_courses")
    .select("id")
    .eq("slug", courseSlug)
    .maybeSingle();

  if (courseError) {
    console.error(
      "Unable to resolve CASE University course for lesson",
      {
        course_slug: courseSlug,
        lesson_slug: lessonSlug,
        error: courseError,
      },
    );

    throw new Error(
      "Unable to resolve CASE University course.",
    );
  }

  if (!course) {
    return null;
  }

  /*
   * Only authorization metadata is read through the user-scoped
   * client. Full lesson content is fetched with the service client
   * only after the authenticated learner's entitlement is resolved
   * on the trusted server boundary.
   */
  const {
    data: publishedLessonMetadata,
    error: lessonMetadataError,
  } = await supabase.rpc(
    "get_published_university_lesson_metadata",
  );

  if (lessonMetadataError) {
    console.error(
      "Unable to resolve CASE University lesson authorization metadata",
      {
        course_slug: courseSlug,
        lesson_slug: lessonSlug,
        error: lessonMetadataError,
      },
    );

    throw new Error(
      "Unable to resolve CASE University lesson.",
    );
  }

  const lessonMetadataRows =
    (publishedLessonMetadata ??
      []) as PublishedLessonMetadataRow[];

  const lessonMetadata =
    lessonMetadataRows.find(
      (lesson) =>
        lesson.course_id === course.id &&
        lesson.slug === lessonSlug,
    ) ?? null;

  if (!lessonMetadata) {
    return null;
  }

  const canAccessLesson =
    await canAccessUniversityLesson({
      courseSlug,
      isPreview:
        lessonMetadata.is_preview === true,
    });

  if (!canAccessLesson) {
    return null;
  }

  /*
   * Entitlement/preview access does not bypass curriculum order.
   * Enforce the same prerequisite rule as the trusted progress RPC
   * before protected lesson content is returned.
   *
   * Administrators already returned through the admin-preview branch
   * above, so master_admin / rank >= 4 intentionally bypasses this gate.
   */
  const canAccessSequentialLesson =
    await canCurrentUserAccessSequentialLesson({
      courseId: course.id,
      lessonId: lessonMetadata.id,
    });

  if (!canAccessSequentialLesson) {
    return null;
  }

  const serviceSupabase =
    createSupabaseServerServiceClient();

  const { data: lesson, error: lessonError } =
    await serviceSupabase
      .from("university_lessons")
      .select("*")
      .eq("id", lessonMetadata.id)
      .maybeSingle();

  if (lessonError) {
    console.error("Unable to load CASE University lesson", {
      course_slug: courseSlug,
      lesson_slug: lessonSlug,
      error: lessonError,
    });

    throw new Error("Unable to load CASE University lesson.");
  }

  return (lesson as UniversityLesson | null) ?? null;
}

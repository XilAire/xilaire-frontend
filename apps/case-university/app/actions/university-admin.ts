"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import {
  isLessonContentPublishable,
  normalizeLessonContent,
} from "@/lib/university/lesson-content";

type UpdateCourseSettingsInput = {
  courseId: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  difficulty: string;
  estimatedMinutes: number | null;
  sortOrder: number;
  thumbnailUrl: string;
  isFeatured: boolean;
};

type UpdateCourseSettingsResult = {
  success: boolean;
  message: string;
};

const ALLOWED_DIFFICULTIES = new Set([
  "beginner",
  "intermediate",
  "advanced",
]);

export async function updateUniversityCourseSettingsAction(
  input: UpdateCourseSettingsInput,
): Promise<UpdateCourseSettingsResult> {
  const role =
    await resolveCurrentUserRole();

  if (
    !role ||
    role.role_rank < 4
  ) {
    return {
      success: false,
      message:
        "You do not have permission to manage CASE University courses.",
    };
  }

  const courseId =
    input.courseId.trim();

  const title =
    input.title.trim();

  const slug =
    normalizeSlug(
      input.slug,
    );

  const shortDescription =
    normalizeOptionalText(
      input.shortDescription,
    );

  const description =
    normalizeOptionalText(
      input.description,
    );

  const difficulty =
    input.difficulty
      .trim()
      .toLowerCase();

  const thumbnailUrl =
    normalizeOptionalText(
      input.thumbnailUrl,
    );

  const estimatedMinutes =
    normalizeOptionalPositiveInteger(
      input.estimatedMinutes,
    );

  const sortOrder =
    normalizeNonNegativeInteger(
      input.sortOrder,
    );

  if (!courseId) {
    return {
      success: false,
      message:
        "The course identifier is missing.",
    };
  }

  if (!title) {
    return {
      success: false,
      message:
        "Course title is required.",
    };
  }

  if (!slug) {
    return {
      success: false,
      message:
        "Course slug is required.",
    };
  }

  if (
    !ALLOWED_DIFFICULTIES.has(
      difficulty,
    )
  ) {
    return {
      success: false,
      message:
        "Select a valid course difficulty.",
    };
  }

  if (
    input.estimatedMinutes !== null &&
    input.estimatedMinutes !== undefined &&
    estimatedMinutes === null
  ) {
    return {
      success: false,
      message:
        "Estimated minutes must be a positive whole number.",
    };
  }

  if (
    sortOrder === null
  ) {
    return {
      success: false,
      message:
        "Sort order must be zero or a positive whole number.",
    };
  }

  if (
    thumbnailUrl &&
    !isValidHttpUrl(
      thumbnailUrl,
    )
  ) {
    return {
      success: false,
      message:
        "Thumbnail URL must be a valid http or https URL.",
    };
  }

  try {
    const admin =
      createAdminClient();

    const {
      data:
        existingCourse,
      error:
        existingCourseError,
    } =
      await admin
        .from(
          "university_courses",
        )
        .select(
          `
            id,
            slug,
            status
          `,
        )
        .eq(
          "id",
          courseId,
        )
        .maybeSingle();

    if (
      existingCourseError
    ) {
      console.error(
        "[CASE University Admin] Unable to verify course before update.",
        existingCourseError,
      );

      return {
        success: false,
        message:
          "Unable to verify this course right now.",
      };
    }

    if (
      !existingCourse
    ) {
      return {
        success: false,
        message:
          "The requested course could not be found.",
      };
    }

    const {
      data:
        conflictingCourse,
      error:
        slugCheckError,
    } =
      await admin
        .from(
          "university_courses",
        )
        .select(
          "id",
        )
        .eq(
          "slug",
          slug,
        )
        .neq(
          "id",
          courseId,
        )
        .maybeSingle();

    if (
      slugCheckError
    ) {
      console.error(
        "[CASE University Admin] Unable to validate course slug.",
        slugCheckError,
      );

      return {
        success: false,
        message:
          "Unable to validate the course slug right now.",
      };
    }

    if (
      conflictingCourse
    ) {
      return {
        success: false,
        message:
          "Another course already uses that slug.",
      };
    }

    if (
      existingCourse.status === "published" &&
      !description &&
      !shortDescription
    ) {
      return {
        success: false,
        message:
          "A published course must keep a course description. Add a description before saving.",
      };
    }

    if (
      existingCourse.status === "published" &&
      estimatedMinutes === null
    ) {
      return {
        success: false,
        message:
          "A published course must keep an estimated duration. Add a duration before saving.",
      };
    }

    const {
      error:
        updateError,
    } =
      await admin
        .from(
          "university_courses",
        )
        .update({
          title,
          slug,
          short_description:
            shortDescription,
          description,
          difficulty,
          estimated_minutes:
            estimatedMinutes,
          sort_order:
            sortOrder,
          thumbnail_url:
            thumbnailUrl,
          is_featured:
            Boolean(
              input.isFeatured,
            ),
          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          courseId,
        );

    if (
      updateError
    ) {
      console.error(
        "[CASE University Admin] Course settings update failed.",
        updateError,
      );

      return {
        success: false,
        message:
          "Unable to save the course settings right now.",
      };
    }

    revalidatePath(
      "/admin/courses",
    );

    revalidatePath(
      `/admin/courses/${courseId}`,
    );

    revalidatePath(
      `/courses/${existingCourse.slug}`,
    );

    if (
      existingCourse.slug !==
      slug
    ) {
      revalidatePath(
        `/courses/${slug}`,
      );
    }

    revalidatePath(
      "/courses",
    );

    return {
      success: true,
      message:
        "Course settings saved successfully.",
    };
  } catch (
    error
  ) {
    console.error(
      "[CASE University Admin] Unexpected course settings update failure.",
      error,
    );

    return {
      success: false,
      message:
        "Unable to save the course settings right now.",
    };
  }
}

function createAdminClient() {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL_CASE_UNIVERSITY
      ?.trim();

  const serviceRoleKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY_CASE_UNIVERSITY
      ?.trim();

  if (!supabaseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL_CASE_UNIVERSITY.",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY_CASE_UNIVERSITY.",
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

function normalizeSlug(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

function normalizeOptionalText(
  value: string,
) {
  const normalized =
    value.trim();

  return normalized ||
    null;
}

function normalizeOptionalPositiveInteger(
  value:
    number |
    null |
    undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    !Number.isInteger(
      value,
    ) ||
    value <= 0
  ) {
    return null;
  }

  return value;
}

function normalizeNonNegativeInteger(
  value: number,
) {
  if (
    !Number.isInteger(
      value,
    ) ||
    value < 0
  ) {
    return null;
  }

  return value;
}

function isValidHttpUrl(
  value: string,
) {
  try {
    const url =
      new URL(
        value,
      );

    return (
      url.protocol ===
        "http:" ||
      url.protocol ===
        "https:"
    );
  } catch {
    return false;
  }
}

type UpdateModuleSettingsInput = {
  courseId: string;
  moduleId: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  estimatedMinutes: number | null;
  sortOrder: number;
};

type UpdateModuleSettingsResult = {
  success: boolean;
  message: string;
};

const ALLOWED_MODULE_STATUSES = new Set([
  "draft",
  "published",
  "archived",
]);

export async function updateUniversityModuleSettingsAction(
  input: UpdateModuleSettingsInput,
): Promise<UpdateModuleSettingsResult> {
  const role = await resolveCurrentUserRole();

  if (!role || role.role_rank < 4) {
    return {
      success: false,
      message:
        "You do not have permission to manage CASE University modules.",
    };
  }

  const courseId = input.courseId.trim();
  const moduleId = input.moduleId.trim();
  const title = input.title.trim();
  const slug = normalizeSlug(input.slug);
  const description = normalizeOptionalText(input.description);
  const status = input.status.trim().toLowerCase();
  const estimatedMinutes =
    normalizeOptionalPositiveInteger(input.estimatedMinutes);
  const sortOrder = normalizeNonNegativeInteger(input.sortOrder);

  if (!courseId || !moduleId) {
    return {
      success: false,
      message: "The course or module identifier is missing.",
    };
  }

  if (!title) {
    return {
      success: false,
      message: "Module title is required.",
    };
  }

  if (!slug) {
    return {
      success: false,
      message: "Module slug is required.",
    };
  }

  if (!ALLOWED_MODULE_STATUSES.has(status)) {
    return {
      success: false,
      message: "Select a valid module status.",
    };
  }

  if (
    input.estimatedMinutes !== null &&
    input.estimatedMinutes !== undefined &&
    estimatedMinutes === null
  ) {
    return {
      success: false,
      message:
        "Estimated minutes must be a positive whole number.",
    };
  }

  if (sortOrder === null) {
    return {
      success: false,
      message:
        "Sort order must be zero or a positive whole number.",
    };
  }

  try {
    const admin = createAdminClient();

    const { data: course, error: courseError } = await admin
      .from("university_courses")
      .select("id, slug")
      .eq("id", courseId)
      .maybeSingle();

    if (courseError) {
      console.error(
        "[CASE University Admin] Unable to verify module course.",
        courseError,
      );

      return {
        success: false,
        message: "Unable to verify this course right now.",
      };
    }

    if (!course) {
      return {
        success: false,
        message: "The requested course could not be found.",
      };
    }

    const { data: existingModule, error: moduleError } = await admin
      .from("university_modules")
      .select("id, course_id, slug, status")
      .eq("id", moduleId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (moduleError) {
      console.error(
        "[CASE University Admin] Unable to verify module before update.",
        moduleError,
      );

      return {
        success: false,
        message: "Unable to verify this module right now.",
      };
    }

    if (!existingModule) {
      return {
        success: false,
        message:
          "The requested module could not be found in this course.",
      };
    }

    const { data: conflictingModule, error: slugError } = await admin
      .from("university_modules")
      .select("id")
      .eq("course_id", courseId)
      .eq("slug", slug)
      .neq("id", moduleId)
      .maybeSingle();

    if (slugError) {
      console.error(
        "[CASE University Admin] Unable to validate module slug.",
        slugError,
      );

      return {
        success: false,
        message:
          "Unable to validate the module slug right now.",
      };
    }

    if (conflictingModule) {
      return {
        success: false,
        message:
          "Another module in this course already uses that slug.",
      };
    }

    if (status !== existingModule.status) {
      return {
        success: false,
        message:
          "Use the dedicated Publish, Unpublish, Archive, or Restore controls to change module lifecycle status.",
      };
    }

    if (
      existingModule.status === "published" &&
      estimatedMinutes === null
    ) {
      return {
        success: false,
        message:
          "A published module must keep an estimated duration. Add a duration before saving.",
      };
    }

    const now = new Date().toISOString();

    const { error: updateError } = await admin
      .from("university_modules")
      .update({
        title,
        slug,
        description,
        estimated_minutes: estimatedMinutes,
        sort_order: sortOrder,
        updated_at: now,
      })
      .eq("id", moduleId)
      .eq("course_id", courseId);

    if (updateError) {
      console.error(
        "[CASE University Admin] Module settings update failed.",
        updateError,
      );

      return {
        success: false,
        message:
          "Unable to save the module settings right now.",
      };
    }

    revalidatePath("/admin/courses");
    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(
      `/admin/courses/${courseId}/modules/${moduleId}`,
    );
    revalidatePath("/courses");
    revalidatePath(`/courses/${course.slug}`);

    return {
      success: true,
      message: "Module settings saved successfully.",
    };
  } catch (error) {
    console.error(
      "[CASE University Admin] Unexpected module settings update failure.",
      error,
    );

    return {
      success: false,
      message:
        "Unable to save the module settings right now.",
    };
  }
}

type UpdateLessonSettingsInput = {
  courseId: string;
  moduleId: string;
  lessonId: string;
  title: string;
  slug: string;
  shortDescription: string;
  lessonType: string;
  status: string;
  estimatedMinutes: number | null;
  sortOrder: number;
  videoUrl: string;
  isPreview: boolean;
  contentJson: string;
};

type UpdateLessonSettingsResult = {
  success: boolean;
  message: string;
};

const ALLOWED_LESSON_STATUSES = new Set([
  "draft",
  "published",
  "archived",
]);

export async function updateUniversityLessonSettingsAction(
  input: UpdateLessonSettingsInput,
): Promise<UpdateLessonSettingsResult> {
  const role = await resolveCurrentUserRole();

  if (!role || role.role_rank < 4) {
    return {
      success: false,
      message:
        "You do not have permission to manage CASE University lessons.",
    };
  }

  const courseId = input.courseId.trim();
  const moduleId = input.moduleId.trim();
  const lessonId = input.lessonId.trim();
  const title = input.title.trim();
  const slug = normalizeSlug(input.slug);
  const shortDescription = normalizeOptionalText(
    input.shortDescription,
  );
  const lessonType = input.lessonType.trim().toLowerCase();
  const status = input.status.trim().toLowerCase();
  const estimatedMinutes =
    normalizeOptionalPositiveInteger(input.estimatedMinutes);
  const sortOrder = normalizeNonNegativeInteger(input.sortOrder);
  const videoUrl = normalizeOptionalText(input.videoUrl);

  if (!courseId || !moduleId || !lessonId) {
    return {
      success: false,
      message:
        "The course, module, or lesson identifier is missing.",
    };
  }

  if (!title) {
    return {
      success: false,
      message: "Lesson title is required.",
    };
  }

  if (!slug) {
    return {
      success: false,
      message: "Lesson slug is required.",
    };
  }

  if (!lessonType) {
    return {
      success: false,
      message: "Lesson type is required.",
    };
  }

  if (!ALLOWED_LESSON_STATUSES.has(status)) {
    return {
      success: false,
      message: "Select a valid lesson status.",
    };
  }

  if (
    input.estimatedMinutes !== null &&
    input.estimatedMinutes !== undefined &&
    estimatedMinutes === null
  ) {
    return {
      success: false,
      message:
        "Estimated minutes must be a positive whole number.",
    };
  }

  if (sortOrder === null) {
    return {
      success: false,
      message:
        "Sort order must be zero or a positive whole number.",
    };
  }

  if (videoUrl && !isValidHttpUrl(videoUrl)) {
    return {
      success: false,
      message:
        "Video URL must be a valid http or https URL.",
    };
  }

  let content: unknown;

  try {
    content = JSON.parse(input.contentJson);
  } catch {
    return {
      success: false,
      message:
        "Lesson content must contain valid JSON.",
    };
  }

  if (
    content === null ||
    Array.isArray(content) ||
    typeof content !== "object"
  ) {
    return {
      success: false,
      message:
        "Lesson content must be a JSON object.",
    };
  }

  content = normalizeLessonContent(content);

  try {
    const admin = createAdminClient();

    const { data: course, error: courseError } = await admin
      .from("university_courses")
      .select("id, slug")
      .eq("id", courseId)
      .maybeSingle();

    if (courseError) {
      console.error(
        "[CASE University Admin] Unable to verify lesson course.",
        courseError,
      );

      return {
        success: false,
        message: "Unable to verify this course right now.",
      };
    }

    if (!course) {
      return {
        success: false,
        message: "The requested course could not be found.",
      };
    }

    const { data: module, error: moduleError } = await admin
      .from("university_modules")
      .select("id")
      .eq("id", moduleId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (moduleError) {
      console.error(
        "[CASE University Admin] Unable to verify lesson module.",
        moduleError,
      );

      return {
        success: false,
        message: "Unable to verify this module right now.",
      };
    }

    if (!module) {
      return {
        success: false,
        message:
          "The requested module could not be found in this course.",
      };
    }

    const { data: existingLesson, error: lessonError } = await admin
      .from("university_lessons")
      .select("id, course_id, module_id, slug, status, published_at")
      .eq("id", lessonId)
      .eq("course_id", courseId)
      .eq("module_id", moduleId)
      .maybeSingle();

    if (lessonError) {
      console.error(
        "[CASE University Admin] Unable to verify lesson before update.",
        lessonError,
      );

      return {
        success: false,
        message: "Unable to verify this lesson right now.",
      };
    }

    if (!existingLesson) {
      return {
        success: false,
        message:
          "The requested lesson could not be found in this module.",
      };
    }

    const { data: conflictingLesson, error: slugError } = await admin
      .from("university_lessons")
      .select("id")
      .eq("course_id", courseId)
      .eq("module_id", moduleId)
      .eq("slug", slug)
      .neq("id", lessonId)
      .maybeSingle();

    if (slugError) {
      console.error(
        "[CASE University Admin] Unable to validate lesson slug.",
        slugError,
      );

      return {
        success: false,
        message:
          "Unable to validate the lesson slug right now.",
      };
    }

    if (conflictingLesson) {
      return {
        success: false,
        message:
          "Another lesson in this module already uses that slug.",
      };
    }

    if (status !== existingLesson.status) {
      return {
        success: false,
        message:
          "Use the dedicated Publish, Unpublish, Archive, or Restore controls to change lesson lifecycle status.",
      };
    }

    if (
      existingLesson.status === "published" &&
      estimatedMinutes === null
    ) {
      return {
        success: false,
        message:
          "A published lesson must keep an estimated duration. Add a duration before saving.",
      };
    }

    if (
      existingLesson.status === "published" &&
      !isLessonContentPublishable(content)
    ) {
      return {
        success: false,
        message:
          "A published lesson must keep meaningful lesson content. Add content before saving.",
      };
    }

    const now = new Date().toISOString();

    const { error: updateError } = await admin
      .from("university_lessons")
      .update({
        title,
        slug,
        short_description: shortDescription,
        content,
        lesson_type: lessonType,
        sort_order: sortOrder,
        estimated_minutes: estimatedMinutes,
        video_url: videoUrl,
        is_preview: Boolean(input.isPreview),
        updated_at: now,
      })
      .eq("id", lessonId)
      .eq("course_id", courseId)
      .eq("module_id", moduleId);

    if (updateError) {
      console.error(
        "[CASE University Admin] Lesson settings update failed.",
        updateError,
      );

      return {
        success: false,
        message:
          "Unable to save the lesson settings right now.",
      };
    }

    revalidatePath("/admin/courses");
    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(
      `/admin/courses/${courseId}/modules/${moduleId}`,
    );
    revalidatePath(
      `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`,
    );
    revalidatePath("/courses");
    revalidatePath(`/courses/${course.slug}`);

    return {
      success: true,
      message: "Lesson settings saved successfully.",
    };
  } catch (error) {
    console.error(
      "[CASE University Admin] Unexpected lesson settings update failure.",
      error,
    );

    return {
      success: false,
      message:
        "Unable to save the lesson settings right now.",
    };
  }
}

type PublishEntityResult = {
  success: boolean;
  message: string;
};

async function requireUniversityAdmin() {
  const role = await resolveCurrentUserRole();

  return Boolean(
    role &&
      role.role_rank >= 4,
  );
}

function normalizeUniversityPublishError(
  message: string,
  entityType: "course" | "module" | "lesson",
  publish: boolean,
) {
  const normalized =
    message.trim();

  const safePrefixes = [
    "Invalid curriculum entity type.",
    "Course ID is required.",
    "Module ID and lesson ID are required.",
    "Module ID is required.",
    "The requested course could not be found.",
    "The requested module could not be found in this course.",
    "The requested lesson could not be found in this module.",
    "Add a lesson title and slug before publishing.",
    "Add an estimated lesson duration before publishing.",
    "Add meaningful lesson content before publishing.",
    "A published lesson assessment is incomplete or invalid.",
    "Add a module title and slug before publishing.",
    "Add an estimated module duration before publishing.",
    "Add at least one lesson before publishing this module.",
    "Publish all ",
    "Add a course title and slug before publishing.",
    "Add a course description before publishing.",
    "Add an estimated course duration before publishing.",
    "Add at least one module before publishing this course.",
    "Every module must contain at least one lesson before publishing.",
    "Add lessons before publishing this course.",
    "One or more published lesson assessments are incomplete or invalid.",
  ];

  if (
    safePrefixes.some((prefix) =>
      normalized.startsWith(prefix),
    )
  ) {
    return normalized;
  }

  const action =
    publish
      ? "publish"
      : "unpublish";

  return `Unable to ${action} this ${entityType} right now.`;
}

async function setUniversityCurriculumPublishState({
  entityType,
  courseId,
  moduleId,
  lessonId,
  publish,
}: {
  entityType: "course" | "module" | "lesson";
  courseId: string;
  moduleId?: string;
  lessonId?: string;
  publish: boolean;
}): Promise<PublishEntityResult> {
  if (!(await requireUniversityAdmin())) {
    return {
      success: false,
      message:
        `You do not have permission to ${publish ? "publish" : "unpublish"} CASE University ${entityType}s.`,
    };
  }

  const normalizedCourseId =
    courseId.trim();

  const normalizedModuleId =
    moduleId?.trim() || null;

  const normalizedLessonId =
    lessonId?.trim() || null;

  if (!normalizedCourseId) {
    return {
      success: false,
      message:
        "The course identifier is missing.",
    };
  }

  if (
    entityType === "module" &&
    !normalizedModuleId
  ) {
    return {
      success: false,
      message:
        "The course or module identifier is missing.",
    };
  }

  if (
    entityType === "lesson" &&
    (
      !normalizedModuleId ||
      !normalizedLessonId
    )
  ) {
    return {
      success: false,
      message:
        "The course, module, or lesson identifier is missing.",
    };
  }

  try {
    const admin =
      createAdminClient();

    const {
      data: course,
      error: courseError,
    } =
      await admin
        .from("university_courses")
        .select("id, slug")
        .eq("id", normalizedCourseId)
        .maybeSingle();

    if (
      courseError ||
      !course
    ) {
      console.error(
        "[CASE University Admin] Unable to verify course before publishing lifecycle change.",
        courseError,
      );

      return {
        success: false,
        message:
          "Unable to verify this course right now.",
      };
    }

    const {
      data,
      error,
    } =
      await admin.rpc(
        "set_university_curriculum_publish_state",
        {
          p_entity_type:
            entityType,

          p_course_id:
            normalizedCourseId,

          p_module_id:
            normalizedModuleId,

          p_lesson_id:
            normalizedLessonId,

          p_publish:
            publish,
        },
      );

    if (error) {
      console.error(
        "[CASE University Admin] Authoritative publishing RPC failed.",
        error,
      );

      return {
        success: false,
        message:
          normalizeUniversityPublishError(
            error.message,
            entityType,
            publish,
          ),
      };
    }

    const rpcResult =
      data as
        | {
            success?: boolean;
            message?: string;
            status?: string;
          }
        | null;

    if (
      !rpcResult ||
      rpcResult.success !== true
    ) {
      return {
        success: false,
        message:
          `Unable to ${publish ? "publish" : "unpublish"} this ${entityType} right now.`,
      };
    }

    revalidateUniversityAdminPaths({
      courseId:
        normalizedCourseId,

      moduleId:
        normalizedModuleId ??
        undefined,

      lessonId:
        normalizedLessonId ??
        undefined,

      courseSlug:
        course.slug,
    });

    return {
      success: true,
      message:
        rpcResult.message ??
        `${entityType.charAt(0).toUpperCase()}${entityType.slice(1)} ${publish ? "published" : "unpublished"} successfully.`,
    };
  } catch (error) {
    console.error(
      "[CASE University Admin] Unexpected authoritative publishing failure.",
      error,
    );

    return {
      success: false,
      message:
        `Unable to ${publish ? "publish" : "unpublish"} this ${entityType} right now.`,
    };
  }
}

export async function publishUniversityLessonAction(input: {
  courseId: string;
  moduleId: string;
  lessonId: string;
}): Promise<PublishEntityResult> {
  return setUniversityCurriculumPublishState({
    entityType: "lesson",
    courseId: input.courseId,
    moduleId: input.moduleId,
    lessonId: input.lessonId,
    publish: true,
  });
}

export async function unpublishUniversityLessonAction(input: {
  courseId: string;
  moduleId: string;
  lessonId: string;
}): Promise<PublishEntityResult> {
  return setUniversityCurriculumPublishState({
    entityType: "lesson",
    courseId: input.courseId,
    moduleId: input.moduleId,
    lessonId: input.lessonId,
    publish: false,
  });
}

export async function publishUniversityModuleAction(input: {
  courseId: string;
  moduleId: string;
}): Promise<PublishEntityResult> {
  return setUniversityCurriculumPublishState({
    entityType: "module",
    courseId: input.courseId,
    moduleId: input.moduleId,
    publish: true,
  });
}

export async function unpublishUniversityModuleAction(input: {
  courseId: string;
  moduleId: string;
}): Promise<PublishEntityResult> {
  return setUniversityCurriculumPublishState({
    entityType: "module",
    courseId: input.courseId,
    moduleId: input.moduleId,
    publish: false,
  });
}

export async function publishUniversityCourseAction(input: {
  courseId: string;
}): Promise<PublishEntityResult> {
  return setUniversityCurriculumPublishState({
    entityType: "course",
    courseId: input.courseId,
    publish: true,
  });
}

export async function unpublishUniversityCourseAction(input: {
  courseId: string;
}): Promise<PublishEntityResult> {
  return setUniversityCurriculumPublishState({
    entityType: "course",
    courseId: input.courseId,
    publish: false,
  });
}

function revalidateUniversityAdminPaths({
  courseId,
  moduleId,
  lessonId,
  courseSlug,
}: {
  courseId: string;
  moduleId?: string;
  lessonId?: string;
  courseSlug: string;
}) {
  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}`);

  if (moduleId) {
    revalidatePath(
      `/admin/courses/${courseId}/modules/${moduleId}`,
    );
  }

  if (moduleId && lessonId) {
    revalidatePath(
      `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`,
    );
  }

  revalidatePath("/courses");
  revalidatePath(`/courses/${courseSlug}`);
}

type CreateCourseInput = {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  difficulty: string;
  estimatedMinutes: number | null;
  thumbnailUrl: string;
  isFeatured: boolean;
};

type CreateModuleInput = {
  courseId: string;
  title: string;
  slug: string;
  description: string;
  estimatedMinutes: number | null;
};

type CreateLessonInput = {
  courseId: string;
  moduleId: string;
  title: string;
  slug: string;
  shortDescription: string;
  lessonType: string;
  estimatedMinutes: number | null;
  videoUrl: string;
  isPreview: boolean;
};

type CreateCurriculumResult = {
  success: boolean;
  message: string;
  id?: string;
};

export async function createUniversityCourseAction(
  input: CreateCourseInput,
): Promise<CreateCurriculumResult> {
  if (!(await requireUniversityAdmin())) {
    return {
      success: false,
      message:
        "You do not have permission to create CASE University courses.",
    };
  }

  const title = input.title.trim();
  const slug = normalizeSlug(input.slug || input.title);
  const shortDescription = normalizeOptionalText(input.shortDescription);
  const description = normalizeOptionalText(input.description);
  const difficulty = input.difficulty.trim().toLowerCase();
  const estimatedMinutes =
    normalizeOptionalPositiveInteger(input.estimatedMinutes);
  const thumbnailUrl = normalizeOptionalText(input.thumbnailUrl);

  if (!title || !slug) {
    return {
      success: false,
      message: "Course title and slug are required.",
    };
  }

  if (!ALLOWED_DIFFICULTIES.has(difficulty)) {
    return {
      success: false,
      message: "Select a valid course difficulty.",
    };
  }

  if (
    input.estimatedMinutes !== null &&
    input.estimatedMinutes !== undefined &&
    estimatedMinutes === null
  ) {
    return {
      success: false,
      message:
        "Estimated minutes must be a positive whole number.",
    };
  }

  if (thumbnailUrl && !isValidHttpUrl(thumbnailUrl)) {
    return {
      success: false,
      message:
        "Thumbnail URL must be a valid http or https URL.",
    };
  }

  try {
    const admin = createAdminClient();

    const { data: conflict, error: conflictError } = await admin
      .from("university_courses")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (conflictError) {
      console.error(
        "[CASE University Admin] Course slug validation failed.",
        conflictError,
      );
      return {
        success: false,
        message: "Unable to validate the course slug right now.",
      };
    }

    if (conflict) {
      return {
        success: false,
        message: "Another course already uses that slug.",
      };
    }

    const { data: lastCourse, error: orderError } = await admin
      .from("university_courses")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orderError) {
      console.error(
        "[CASE University Admin] Unable to determine course sort order.",
        orderError,
      );
      return {
        success: false,
        message: "Unable to determine the course order right now.",
      };
    }

    const sortOrder =
      typeof lastCourse?.sort_order === "number"
        ? lastCourse.sort_order + 1
        : 0;

    const now = new Date().toISOString();

    const { data: course, error: insertError } = await admin
      .from("university_courses")
      .insert({
        title,
        slug,
        short_description: shortDescription,
        description,
        status: "draft",
        difficulty,
        estimated_minutes: estimatedMinutes,
        sort_order: sortOrder,
        thumbnail_url: thumbnailUrl,
        is_featured: Boolean(input.isFeatured),
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (insertError || !course) {
      console.error(
        "[CASE University Admin] Course creation failed.",
        insertError,
      );
      return {
        success: false,
        message: "Unable to create the course right now.",
      };
    }

    revalidatePath("/admin/courses");
    revalidatePath("/courses");

    return {
      success: true,
      message: "Course created successfully.",
      id: course.id,
    };
  } catch (error) {
    console.error(
      "[CASE University Admin] Unexpected course creation failure.",
      error,
    );
    return {
      success: false,
      message: "Unable to create the course right now.",
    };
  }
}

export async function createUniversityModuleAction(
  input: CreateModuleInput,
): Promise<CreateCurriculumResult> {
  if (!(await requireUniversityAdmin())) {
    return {
      success: false,
      message:
        "You do not have permission to create CASE University modules.",
    };
  }

  const courseId = input.courseId.trim();
  const title = input.title.trim();
  const slug = normalizeSlug(input.slug || input.title);
  const description = normalizeOptionalText(input.description);
  const estimatedMinutes =
    normalizeOptionalPositiveInteger(input.estimatedMinutes);

  if (!courseId || !title || !slug) {
    return {
      success: false,
      message: "Course, module title, and slug are required.",
    };
  }

  if (
    input.estimatedMinutes !== null &&
    input.estimatedMinutes !== undefined &&
    estimatedMinutes === null
  ) {
    return {
      success: false,
      message:
        "Estimated minutes must be a positive whole number.",
    };
  }

  try {
    const admin = createAdminClient();

    const { data: course, error: courseError } = await admin
      .from("university_courses")
      .select("id, slug")
      .eq("id", courseId)
      .maybeSingle();

    if (courseError || !course) {
      return {
        success: false,
        message: "The requested course could not be found.",
      };
    }

    const { data: conflict, error: conflictError } = await admin
      .from("university_modules")
      .select("id")
      .eq("course_id", courseId)
      .eq("slug", slug)
      .maybeSingle();

    if (conflictError) {
      return {
        success: false,
        message: "Unable to validate the module slug right now.",
      };
    }

    if (conflict) {
      return {
        success: false,
        message:
          "Another module in this course already uses that slug.",
      };
    }

    const { data: lastModule, error: orderError } = await admin
      .from("university_modules")
      .select("sort_order")
      .eq("course_id", courseId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orderError) {
      return {
        success: false,
        message: "Unable to determine the module order right now.",
      };
    }

    const sortOrder =
      typeof lastModule?.sort_order === "number"
        ? lastModule.sort_order + 1
        : 0;

    const now = new Date().toISOString();

    const { data: module, error: insertError } = await admin
      .from("university_modules")
      .insert({
        course_id: courseId,
        title,
        slug,
        description,
        status: "draft",
        sort_order: sortOrder,
        estimated_minutes: estimatedMinutes,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (insertError || !module) {
      console.error(
        "[CASE University Admin] Module creation failed.",
        insertError,
      );
      return {
        success: false,
        message: "Unable to create the module right now.",
      };
    }

    revalidatePath("/admin/courses");
    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath("/courses");
    revalidatePath(`/courses/${course.slug}`);

    return {
      success: true,
      message: "Module created successfully.",
      id: module.id,
    };
  } catch (error) {
    console.error(
      "[CASE University Admin] Unexpected module creation failure.",
      error,
    );
    return {
      success: false,
      message: "Unable to create the module right now.",
    };
  }
}

export async function createUniversityLessonAction(
  input: CreateLessonInput,
): Promise<CreateCurriculumResult> {
  if (!(await requireUniversityAdmin())) {
    return {
      success: false,
      message:
        "You do not have permission to create CASE University lessons.",
    };
  }

  const courseId = input.courseId.trim();
  const moduleId = input.moduleId.trim();
  const title = input.title.trim();
  const slug = normalizeSlug(input.slug || input.title);
  const shortDescription = normalizeOptionalText(input.shortDescription);
  const lessonType = input.lessonType.trim().toLowerCase();
  const estimatedMinutes =
    normalizeOptionalPositiveInteger(input.estimatedMinutes);
  const videoUrl = normalizeOptionalText(input.videoUrl);

  if (!courseId || !moduleId || !title || !slug) {
    return {
      success: false,
      message:
        "Course, module, lesson title, and slug are required.",
    };
  }

  if (!lessonType) {
    return {
      success: false,
      message: "Lesson type is required.",
    };
  }

  if (
    input.estimatedMinutes !== null &&
    input.estimatedMinutes !== undefined &&
    estimatedMinutes === null
  ) {
    return {
      success: false,
      message:
        "Estimated minutes must be a positive whole number.",
    };
  }

  if (videoUrl && !isValidHttpUrl(videoUrl)) {
    return {
      success: false,
      message: "Video URL must be a valid http or https URL.",
    };
  }

  try {
    const admin = createAdminClient();

    const { data: course, error: courseError } = await admin
      .from("university_courses")
      .select("id, slug")
      .eq("id", courseId)
      .maybeSingle();

    if (courseError || !course) {
      return {
        success: false,
        message: "The requested course could not be found.",
      };
    }

    const { data: module, error: moduleError } = await admin
      .from("university_modules")
      .select("id")
      .eq("id", moduleId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (moduleError || !module) {
      return {
        success: false,
        message:
          "The requested module could not be found in this course.",
      };
    }

    const { data: conflict, error: conflictError } = await admin
      .from("university_lessons")
      .select("id")
      .eq("course_id", courseId)
      .eq("module_id", moduleId)
      .eq("slug", slug)
      .maybeSingle();

    if (conflictError) {
      return {
        success: false,
        message: "Unable to validate the lesson slug right now.",
      };
    }

    if (conflict) {
      return {
        success: false,
        message:
          "Another lesson in this module already uses that slug.",
      };
    }

    const { data: lastLesson, error: orderError } = await admin
      .from("university_lessons")
      .select("sort_order")
      .eq("course_id", courseId)
      .eq("module_id", moduleId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orderError) {
      return {
        success: false,
        message: "Unable to determine the lesson order right now.",
      };
    }

    const sortOrder =
      typeof lastLesson?.sort_order === "number"
        ? lastLesson.sort_order + 1
        : 0;

    const now = new Date().toISOString();

    const { data: lesson, error: insertError } = await admin
      .from("university_lessons")
      .insert({
        course_id: courseId,
        module_id: moduleId,
        title,
        slug,
        short_description: shortDescription,
        content: {},
        status: "draft",
        lesson_type: lessonType,
        sort_order: sortOrder,
        estimated_minutes: estimatedMinutes,
        video_url: videoUrl,
        is_preview: Boolean(input.isPreview),
        published_at: null,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (insertError || !lesson) {
      console.error(
        "[CASE University Admin] Lesson creation failed.",
        insertError,
      );
      return {
        success: false,
        message: "Unable to create the lesson right now.",
      };
    }

    revalidatePath("/admin/courses");
    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(
      `/admin/courses/${courseId}/modules/${moduleId}`,
    );
    revalidatePath("/courses");
    revalidatePath(`/courses/${course.slug}`);

    return {
      success: true,
      message: "Lesson created successfully.",
      id: lesson.id,
    };
  } catch (error) {
    console.error(
      "[CASE University Admin] Unexpected lesson creation failure.",
      error,
    );
    return {
      success: false,
      message: "Unable to create the lesson right now.",
    };
  }
}

type CurriculumEntityType = "course" | "module" | "lesson";
type MoveDirection = "up" | "down";

type CurriculumLifecycleInput = {
  entityType: CurriculumEntityType;
  entityId: string;
  courseId: string;
  moduleId?: string;
};

type CurriculumLifecycleResult = {
  success: boolean;
  message: string;
  deleted?: boolean;
};

export async function moveUniversityCurriculumItemAction(
  input: CurriculumLifecycleInput & {
    direction: MoveDirection;
  },
): Promise<CurriculumLifecycleResult> {
  if (!(await requireUniversityAdmin())) {
    return {
      success: false,
      message:
        "You do not have permission to reorder CASE University curriculum.",
    };
  }

  const entityId = input.entityId.trim();
  const courseId = input.courseId.trim();
  const moduleId = input.moduleId?.trim();

  if (!entityId || !courseId) {
    return {
      success: false,
      message: "The curriculum identifier is missing.",
    };
  }

  if (
    input.entityType === "lesson" &&
    !moduleId
  ) {
    return {
      success: false,
      message: "The lesson module identifier is missing.",
    };
  }

  try {
    const admin = createAdminClient();
    const config = getCurriculumTableConfig(input.entityType);

    let currentQuery = admin
      .from(config.table)
      .select("id, sort_order")
      .eq("id", entityId);

    if (input.entityType === "module") {
      currentQuery = currentQuery.eq("course_id", courseId);
    }

    if (input.entityType === "lesson") {
      currentQuery = currentQuery
        .eq("course_id", courseId)
        .eq("module_id", moduleId!);
    }

    const { data: current, error: currentError } =
      await currentQuery.maybeSingle();

    if (currentError || !current) {
      console.error(
        "[CASE University Admin] Unable to load curriculum item for reorder.",
        currentError,
      );

      return {
        success: false,
        message: "Unable to find this curriculum item.",
      };
    }

    let neighborsQuery = admin
      .from(config.table)
      .select("id, sort_order");

    if (input.entityType === "module") {
      neighborsQuery = neighborsQuery.eq("course_id", courseId);
    }

    if (input.entityType === "lesson") {
      neighborsQuery = neighborsQuery
        .eq("course_id", courseId)
        .eq("module_id", moduleId!);
    }

    neighborsQuery =
      input.direction === "up"
        ? neighborsQuery
            .lt("sort_order", current.sort_order)
            .order("sort_order", { ascending: false })
        : neighborsQuery
            .gt("sort_order", current.sort_order)
            .order("sort_order", { ascending: true });

    const { data: neighbor, error: neighborError } =
      await neighborsQuery.limit(1).maybeSingle();

    if (neighborError) {
      console.error(
        "[CASE University Admin] Unable to load neighboring curriculum item.",
        neighborError,
      );

      return {
        success: false,
        message: "Unable to reorder this item right now.",
      };
    }

    if (!neighbor) {
      return {
        success: true,
        message:
          input.direction === "up"
            ? "This item is already first."
            : "This item is already last.",
      };
    }

    const now = new Date().toISOString();

    const { error: firstUpdateError } = await admin
      .from(config.table)
      .update({
        sort_order: neighbor.sort_order,
        updated_at: now,
      })
      .eq("id", current.id);

    if (firstUpdateError) {
      console.error(
        "[CASE University Admin] Unable to reorder current curriculum item.",
        firstUpdateError,
      );

      return {
        success: false,
        message: "Unable to reorder this item right now.",
      };
    }

    const { error: secondUpdateError } = await admin
      .from(config.table)
      .update({
        sort_order: current.sort_order,
        updated_at: now,
      })
      .eq("id", neighbor.id);

    if (secondUpdateError) {
      await admin
        .from(config.table)
        .update({
          sort_order: current.sort_order,
          updated_at: new Date().toISOString(),
        })
        .eq("id", current.id);

      console.error(
        "[CASE University Admin] Unable to reorder neighboring curriculum item.",
        secondUpdateError,
      );

      return {
        success: false,
        message: "Unable to reorder this item right now.",
      };
    }

    await revalidateCurriculumLifecyclePaths(admin, {
      courseId,
      moduleId,
      lessonId:
        input.entityType === "lesson" ? entityId : undefined,
    });

    return {
      success: true,
      message:
        input.direction === "up"
          ? "Item moved up successfully."
          : "Item moved down successfully.",
    };
  } catch (error) {
    console.error(
      "[CASE University Admin] Unexpected curriculum reorder failure.",
      error,
    );

    return {
      success: false,
      message: "Unable to reorder this item right now.",
    };
  }
}

export async function archiveUniversityCurriculumItemAction(
  input: CurriculumLifecycleInput,
): Promise<CurriculumLifecycleResult> {
  if (!(await requireUniversityAdmin())) {
    return {
      success: false,
      message:
        "You do not have permission to archive CASE University curriculum.",
    };
  }

  return setUniversityCurriculumLifecycleStatus(
    input,
    "archived",
  );
}

export async function restoreUniversityCurriculumItemAction(
  input: CurriculumLifecycleInput,
): Promise<CurriculumLifecycleResult> {
  if (!(await requireUniversityAdmin())) {
    return {
      success: false,
      message:
        "You do not have permission to restore CASE University curriculum.",
    };
  }

  return setUniversityCurriculumLifecycleStatus(
    input,
    "draft",
  );
}

export async function deleteUniversityCurriculumItemAction(
  input: CurriculumLifecycleInput,
): Promise<CurriculumLifecycleResult> {
  if (!(await requireUniversityAdmin())) {
    return {
      success: false,
      message:
        "You do not have permission to delete CASE University curriculum.",
    };
  }

  const entityId = input.entityId.trim();
  const courseId = input.courseId.trim();
  const moduleId = input.moduleId?.trim();

  if (!entityId || !courseId) {
    return {
      success: false,
      message: "The curriculum identifier is missing.",
    };
  }

  if (
    input.entityType === "lesson" &&
    !moduleId
  ) {
    return {
      success: false,
      message: "The lesson module identifier is missing.",
    };
  }

  try {
    const admin = createAdminClient();
    const config = getCurriculumTableConfig(input.entityType);

    let itemQuery = admin
      .from(config.table)
      .select("id, status")
      .eq("id", entityId);

    if (input.entityType === "module") {
      itemQuery = itemQuery.eq("course_id", courseId);
    }

    if (input.entityType === "lesson") {
      itemQuery = itemQuery
        .eq("course_id", courseId)
        .eq("module_id", moduleId!);
    }

    const { data: item, error: itemError } =
      await itemQuery.maybeSingle();

    if (itemError || !item) {
      return {
        success: false,
        message: "Unable to find this curriculum item.",
      };
    }

    if (item.status !== "draft") {
      return {
        success: false,
        message:
          "Only draft curriculum can be permanently deleted. Restore archived items to Draft first, and unpublish published items first.",
      };
    }

    if (input.entityType === "course") {
      const [
        modulesResult,
        enrollmentsResult,
        progressResult,
        certificatesResult,
      ] = await Promise.all([
        admin
          .from("university_modules")
          .select("id", { count: "exact", head: true })
          .eq("course_id", courseId),
        admin
          .from("university_enrollments")
          .select("id", { count: "exact", head: true })
          .eq("course_id", courseId),
        admin
          .from("university_lesson_progress")
          .select("id", { count: "exact", head: true })
          .eq("course_id", courseId),
        admin
          .from("university_certificates")
          .select("id", { count: "exact", head: true })
          .eq("course_id", courseId),
      ]);

      const dependencyError =
        modulesResult.error ||
        enrollmentsResult.error ||
        progressResult.error ||
        certificatesResult.error;

      if (dependencyError) {
        console.error(
          "[CASE University Admin] Unable to verify course deletion dependencies.",
          dependencyError,
        );

        return {
          success: false,
          message:
            "Unable to verify whether this course can be deleted.",
        };
      }

      if ((modulesResult.count ?? 0) > 0) {
        return {
          success: false,
          message:
            "This course still contains modules. Remove its curriculum before permanently deleting the course.",
        };
      }

      if (
        (enrollmentsResult.count ?? 0) > 0 ||
        (progressResult.count ?? 0) > 0 ||
        (certificatesResult.count ?? 0) > 0
      ) {
        return {
          success: false,
          message:
            "This course has learner history or certificates and cannot be permanently deleted. Archive it instead.",
        };
      }
    }

    if (input.entityType === "module") {
      const { count, error } = await admin
        .from("university_lessons")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId)
        .eq("module_id", entityId);

      if (error) {
        return {
          success: false,
          message:
            "Unable to verify whether this module can be deleted.",
        };
      }

      if ((count ?? 0) > 0) {
        return {
          success: false,
          message:
            "This module still contains lessons. Remove its lessons before permanently deleting the module.",
        };
      }
    }

    if (input.entityType === "lesson") {
      const { count, error } = await admin
        .from("university_lesson_progress")
        .select("id", { count: "exact", head: true })
        .eq("lesson_id", entityId);

      if (error) {
        return {
          success: false,
          message:
            "Unable to verify whether this lesson can be deleted.",
        };
      }

      if ((count ?? 0) > 0) {
        return {
          success: false,
          message:
            "This lesson has learner progress and cannot be permanently deleted. Archive it instead.",
        };
      }
    }

    const { error: deleteError } = await admin
      .from(config.table)
      .delete()
      .eq("id", entityId);

    if (deleteError) {
      console.error(
        "[CASE University Admin] Curriculum deletion failed.",
        deleteError,
      );

      return {
        success: false,
        message:
          "Unable to permanently delete this item right now.",
      };
    }

    await revalidateCurriculumLifecyclePaths(admin, {
      courseId,
      moduleId,
    });

    return {
      success: true,
      message: "Draft item permanently deleted.",
      deleted: true,
    };
  } catch (error) {
    console.error(
      "[CASE University Admin] Unexpected curriculum deletion failure.",
      error,
    );

    return {
      success: false,
      message:
        "Unable to permanently delete this item right now.",
    };
  }
}

async function setUniversityCurriculumLifecycleStatus(
  input: CurriculumLifecycleInput,
  status: "archived" | "draft",
): Promise<CurriculumLifecycleResult> {
  const entityId = input.entityId.trim();
  const courseId = input.courseId.trim();
  const moduleId = input.moduleId?.trim();

  if (!entityId || !courseId) {
    return {
      success: false,
      message: "The curriculum identifier is missing.",
    };
  }

  if (
    input.entityType === "lesson" &&
    !moduleId
  ) {
    return {
      success: false,
      message: "The lesson module identifier is missing.",
    };
  }

  try {
    const admin = createAdminClient();
    const config = getCurriculumTableConfig(input.entityType);
    const now = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: now,
    };

    if (
      input.entityType === "course" ||
      input.entityType === "lesson"
    ) {
      updatePayload.published_at = null;
    }

    let updateQuery = admin
      .from(config.table)
      .update(updatePayload)
      .eq("id", entityId);

    if (input.entityType === "module") {
      updateQuery = updateQuery.eq("course_id", courseId);
    }

    if (input.entityType === "lesson") {
      updateQuery = updateQuery
        .eq("course_id", courseId)
        .eq("module_id", moduleId!);
    }

    const { error: updateError } = await updateQuery;

    if (updateError) {
      console.error(
        "[CASE University Admin] Curriculum lifecycle status update failed.",
        updateError,
      );

      return {
        success: false,
        message:
          "Unable to update this curriculum item right now.",
      };
    }

    if (status === "archived") {
      if (input.entityType === "lesson") {
        await admin
          .from("university_modules")
          .update({
            status: "draft",
            updated_at: now,
          })
          .eq("id", moduleId!)
          .eq("course_id", courseId)
          .eq("status", "published");
      }

      if (
        input.entityType === "lesson" ||
        input.entityType === "module"
      ) {
        await admin
          .from("university_courses")
          .update({
            status: "draft",
            published_at: null,
            updated_at: now,
          })
          .eq("id", courseId)
          .eq("status", "published");
      }
    }

    await revalidateCurriculumLifecyclePaths(admin, {
      courseId,
      moduleId,
      lessonId:
        input.entityType === "lesson" ? entityId : undefined,
    });

    return {
      success: true,
      message:
        status === "archived"
          ? "Item archived successfully."
          : "Item restored to Draft successfully.",
    };
  } catch (error) {
    console.error(
      "[CASE University Admin] Unexpected curriculum lifecycle update failure.",
      error,
    );

    return {
      success: false,
      message:
        "Unable to update this curriculum item right now.",
    };
  }
}

function getCurriculumTableConfig(
  entityType: CurriculumEntityType,
) {
  if (entityType === "course") {
    return {
      table: "university_courses",
    } as const;
  }

  if (entityType === "module") {
    return {
      table: "university_modules",
    } as const;
  }

  return {
    table: "university_lessons",
  } as const;
}

async function revalidateCurriculumLifecyclePaths(
  admin: ReturnType<typeof createAdminClient>,
  {
    courseId,
    moduleId,
    lessonId,
  }: {
    courseId: string;
    moduleId?: string;
    lessonId?: string;
  },
) {
  const { data: course } = await admin
    .from("university_courses")
    .select("slug")
    .eq("id", courseId)
    .maybeSingle();

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}`);

  if (moduleId) {
    revalidatePath(
      `/admin/courses/${courseId}/modules/${moduleId}`,
    );
  }

  if (moduleId && lessonId) {
    revalidatePath(
      `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`,
    );
  }

  revalidatePath("/courses");

  if (course?.slug) {
    revalidatePath(`/courses/${course.slug}`);
  }
}

import "server-only";

import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createSupabaseServerServiceClient,
} from "@/lib/supabase/serverService";
import { getUniversityLessonBySlug } from "@/lib/university/courses";

export const UNIVERSITY_LESSON_RESOURCE_BUCKET =
  "university-lesson-resources";

export const UNIVERSITY_LESSON_RESOURCE_SIGNED_URL_TTL_SECONDS =
  60;

export type UniversityLessonResourceType =
  | "worksheet"
  | "checklist"
  | "template"
  | "reference";

export type UniversityLessonResourceStatus =
  | "draft"
  | "published"
  | "archived";

export type UniversityLessonResource = {
  id: string;
  course_id: string;
  module_id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  resource_type: UniversityLessonResourceType;
  storage_bucket: string;
  storage_path: string;
  original_file_name: string;
  mime_type: string;
  file_size_bytes: number;
  checksum_sha256: string | null;
  version_number: number;
  status: UniversityLessonResourceStatus;
  sort_order: number;
  is_downloadable: boolean;
  metadata: Record<string, unknown>;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UniversityLessonResourceDownload = {
  resource: UniversityLessonResource;
  signedUrl: string;
  expiresInSeconds: number;
};

type UniversityLessonResourceRow = {
  id: string;
  course_id: string;
  module_id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  resource_type: string;
  storage_bucket: string;
  storage_path: string;
  original_file_name: string;
  mime_type: string;
  file_size_bytes: number | string;
  checksum_sha256: string | null;
  version_number: number;
  status: string;
  sort_order: number;
  is_downloadable: boolean;
  metadata: unknown;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type AuthorizedLessonResourceContext = {
  courseId: string;
  moduleId: string;
  lessonId: string;
  canPreviewDraftResources: boolean;
};

const UNIVERSITY_LESSON_RESOURCE_SELECT = `
  id,
  course_id,
  module_id,
  lesson_id,
  title,
  description,
  resource_type,
  storage_bucket,
  storage_path,
  original_file_name,
  mime_type,
  file_size_bytes,
  checksum_sha256,
  version_number,
  status,
  sort_order,
  is_downloadable,
  metadata,
  published_at,
  created_at,
  updated_at
`;

function normalizeResourceMetadata(
  value: unknown,
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeUniversityLessonResource(
  row: UniversityLessonResourceRow,
): UniversityLessonResource {
  const fileSize = Number(row.file_size_bytes ?? 0);

  return {
    id: row.id,
    course_id: row.course_id,
    module_id: row.module_id,
    lesson_id: row.lesson_id,
    title: row.title,
    description: row.description,
    resource_type:
      row.resource_type as UniversityLessonResourceType,
    storage_bucket: row.storage_bucket,
    storage_path: row.storage_path,
    original_file_name: row.original_file_name,
    mime_type: row.mime_type,
    file_size_bytes: Number.isFinite(fileSize)
      ? fileSize
      : 0,
    checksum_sha256: row.checksum_sha256,
    version_number: row.version_number,
    status:
      row.status as UniversityLessonResourceStatus,
    sort_order: row.sort_order,
    is_downloadable: row.is_downloadable,
    metadata: normalizeResourceMetadata(
      row.metadata,
    ),
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getAuthorizedLessonResourceContext({
  courseSlug,
  lessonSlug,
}: {
  courseSlug: string;
  lessonSlug: string;
}): Promise<AuthorizedLessonResourceContext | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: {
      user,
    },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  /*
   * This is the existing trusted lesson-content boundary. It rejects
   * unpublished curriculum for learners, validates the course plan or
   * preview entitlement, enforces the previous-lesson prerequisite, and
   * intentionally allows University administrators to preview curriculum.
   */
  const [
    lesson,
    currentUserRole,
  ] = await Promise.all([
    getUniversityLessonBySlug(
      courseSlug,
      lessonSlug,
    ),
    resolveCurrentUserRole(),
  ]);

  if (!lesson) {
    return null;
  }

  const canPreviewDraftResources =
    currentUserRole?.role_name ===
      "master_admin" ||
    Number(
      currentUserRole?.role_rank ?? 0,
    ) >= 4;

  return {
    courseId: lesson.course_id,
    moduleId: lesson.module_id,
    lessonId: lesson.id,
    canPreviewDraftResources,
  };
}

export async function getAuthorizedUniversityLessonResources({
  courseSlug,
  lessonSlug,
}: {
  courseSlug: string;
  lessonSlug: string;
}): Promise<UniversityLessonResource[]> {
  const context =
    await getAuthorizedLessonResourceContext({
      courseSlug,
      lessonSlug,
    });

  if (!context) {
    return [];
  }

  const serviceSupabase =
    createSupabaseServerServiceClient();

  let query = serviceSupabase
    .from("university_lesson_resources")
    .select(
      UNIVERSITY_LESSON_RESOURCE_SELECT,
    )
    .eq("course_id", context.courseId)
    .eq("module_id", context.moduleId)
    .eq("lesson_id", context.lessonId)
    .eq("is_downloadable", true);

  query = context.canPreviewDraftResources
    ? query.neq("status", "archived")
    : query.eq("status", "published");

  const {
    data,
    error,
  } = await query
    .order("sort_order", {
      ascending: true,
    })
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Unable to load CASE University lesson resources",
      {
        course_slug: courseSlug,
        lesson_slug: lessonSlug,
        lesson_id: context.lessonId,
        error,
      },
    );

    throw new Error(
      "Unable to load CASE University lesson resources.",
    );
  }

  return (
    (data ?? []) as UniversityLessonResourceRow[]
  ).map(
    normalizeUniversityLessonResource,
  );
}

export async function createAuthorizedUniversityLessonResourceDownload({
  courseSlug,
  lessonSlug,
  resourceId,
}: {
  courseSlug: string;
  lessonSlug: string;
  resourceId: string;
}): Promise<UniversityLessonResourceDownload | null> {
  const context =
    await getAuthorizedLessonResourceContext({
      courseSlug,
      lessonSlug,
    });

  if (!context) {
    return null;
  }

  const serviceSupabase =
    createSupabaseServerServiceClient();

  let query = serviceSupabase
    .from("university_lesson_resources")
    .select(
      UNIVERSITY_LESSON_RESOURCE_SELECT,
    )
    .eq("id", resourceId)
    .eq("course_id", context.courseId)
    .eq("module_id", context.moduleId)
    .eq("lesson_id", context.lessonId)
    .eq("is_downloadable", true);

  query = context.canPreviewDraftResources
    ? query.neq("status", "archived")
    : query.eq("status", "published");

  const {
    data,
    error,
  } = await query.maybeSingle();

  if (error) {
    console.error(
      "Unable to resolve CASE University lesson resource",
      {
        course_slug: courseSlug,
        lesson_slug: lessonSlug,
        lesson_id: context.lessonId,
        resource_id: resourceId,
        error,
      },
    );

    throw new Error(
      "Unable to resolve CASE University lesson resource.",
    );
  }

  if (!data) {
    return null;
  }

  const resource =
    normalizeUniversityLessonResource(
      data as UniversityLessonResourceRow,
    );

  if (
    resource.storage_bucket !==
    UNIVERSITY_LESSON_RESOURCE_BUCKET
  ) {
    console.error(
      "CASE University lesson resource referenced an unexpected Storage bucket",
      {
        resource_id: resource.id,
        storage_bucket:
          resource.storage_bucket,
      },
    );

    throw new Error(
      "Unable to create CASE University resource download.",
    );
  }

  const {
    data: signedUrlData,
    error: signedUrlError,
  } = await serviceSupabase.storage
    .from(
      UNIVERSITY_LESSON_RESOURCE_BUCKET,
    )
    .createSignedUrl(
      resource.storage_path,
      UNIVERSITY_LESSON_RESOURCE_SIGNED_URL_TTL_SECONDS,
      {
        download:
          resource.original_file_name,
      },
    );

  if (
    signedUrlError ||
    !signedUrlData?.signedUrl
  ) {
    console.error(
      "Unable to sign CASE University lesson resource download",
      {
        resource_id: resource.id,
        storage_bucket:
          resource.storage_bucket,
        storage_path:
          resource.storage_path,
        error: signedUrlError,
      },
    );

    throw new Error(
      "Unable to create CASE University resource download.",
    );
  }

  return {
    resource,
    signedUrl: signedUrlData.signedUrl,
    expiresInSeconds:
      UNIVERSITY_LESSON_RESOURCE_SIGNED_URL_TTL_SECONDS,
  };
}

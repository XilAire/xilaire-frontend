import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import ModuleSettingsForm from "@/components/admin/courses/ModuleSettingsForm";
import PublishingControls from "@/components/admin/courses/PublishingControls";
import CreateLessonForm from "@/components/admin/courses/CreateLessonForm";
import CurriculumItemControls from "@/components/admin/courses/CurriculumItemControls";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { createSupabaseServerServiceClient } from "@/lib/supabase/serverService";

type AdminModulePageProps = {
  params: Promise<{
    courseId: string;
    moduleId: string;
  }>;
};

type CourseRow = {
  id: string;
  slug: string;
  title: string;
};

type ModuleRow = {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  sort_order: number;
  estimated_minutes: number | null;
  created_at: string;
  updated_at: string;
};

type LessonRow = {
  id: string;
  course_id: string;
  module_id: string;
  slug: string;
  title: string;
  short_description: string | null;
  status: string;
  lesson_type: string;
  sort_order: number;
  estimated_minutes: number | null;
  video_url: string | null;
  is_preview: boolean;
  published_at: string | null;
};

export default async function AdminModulePage({
  params,
}: AdminModulePageProps) {
  const role = await resolveCurrentUserRole();

  if (!role || role.role_rank < 4) {
    redirect("/dashboard");
  }

  const { courseId, moduleId } = await params;
  /*
   * The server-side administrator authorization check above is the trust
   * boundary for this page. All curriculum administration reads use the
   * server-only service client so public/authenticated catalog grants can
   * remain limited to intentionally exposed learner-facing columns.
   */
  const admin = createSupabaseServerServiceClient();

  const [courseResult, moduleResult, lessonsResult] =
    await Promise.all([
      admin
        .from("university_courses")
        .select("id, slug, title")
        .eq("id", courseId)
        .maybeSingle(),

      admin
        .from("university_modules")
        .select(`
          id,
          course_id,
          slug,
          title,
          description,
          status,
          sort_order,
          estimated_minutes,
          created_at,
          updated_at
        `)
        .eq("id", moduleId)
        .eq("course_id", courseId)
        .maybeSingle(),

      admin
        .from("university_lessons")
        .select(`
          id,
          course_id,
          module_id,
          slug,
          title,
          short_description,
          status,
          lesson_type,
          sort_order,
          estimated_minutes,
          video_url,
          is_preview,
          published_at
        `)
        .eq("course_id", courseId)
        .eq("module_id", moduleId)
        .order("sort_order", { ascending: true }),
    ]);

  if (courseResult.error) {
    console.error(
      "[CASE University Admin] Unable to load module course.",
      courseResult.error,
    );
    throw new Error("Unable to load the requested course.");
  }

  if (moduleResult.error) {
    console.error(
      "[CASE University Admin] Unable to load module.",
      moduleResult.error,
    );
    throw new Error("Unable to load the requested module.");
  }

  if (lessonsResult.error) {
    console.error(
      "[CASE University Admin] Unable to load module lessons.",
      lessonsResult.error,
    );
    throw new Error("Unable to load the module lessons.");
  }

  if (!courseResult.data || !moduleResult.data) {
    notFound();
  }

  const course = courseResult.data as CourseRow;
  const module = moduleResult.data as ModuleRow;
  const lessons = (lessonsResult.data ?? []) as LessonRow[];

  const publishedLessons = lessons.filter(
    (lesson) => lesson.status === "published",
  ).length;

  const previewLessons = lessons.filter(
    (lesson) => lesson.is_preview,
  ).length;

  const estimatedLessonMinutes = lessons.reduce(
    (total, lesson) => total + (lesson.estimated_minutes ?? 0),
    0,
  );

  return (
    <div className="min-h-full bg-[var(--background)]">
      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-6 lg:px-10">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]"
        >
          <Link
            href="/admin/courses"
            className="transition hover:text-[var(--primary)]"
          >
            Course management
          </Link>

          <span aria-hidden="true">/</span>

          <Link
            href={`/admin/courses/${course.id}`}
            className="transition hover:text-[var(--primary)]"
          >
            {course.title}
          </Link>

          <span aria-hidden="true">/</span>

          <span className="font-semibold text-[var(--text-primary)]">
            {module.title}
          </span>
        </nav>

        <div className="mt-7 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={module.status} />

              <span className="rounded-full bg-[var(--surface-secondary)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                Module {module.sort_order}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              {module.title}
            </h1>

            <p className="mt-2 text-sm text-[var(--text-muted)]">
              /courses/{course.slug}/modules/{module.slug}
            </p>

            {module.description ? (
              <p className="mt-5 max-w-4xl text-base leading-7 text-[var(--text-secondary)]">
                {module.description}
              </p>
            ) : null}
          </div>

          <Link
            href={`/admin/courses/${course.id}`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-5 text-sm font-semibold text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition hover:border-[var(--border-strong)]"
          >
            Back to course
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Lessons"
            value={lessons.length.toString()}
            detail={`${publishedLessons} published`}
          />
          <StatCard
            label="Preview lessons"
            value={previewLessons.toString()}
            detail="Available without full course access"
          />
          <StatCard
            label="Module duration"
            value={formatMinutes(module.estimated_minutes)}
            detail="Configured module estimate"
          />
          <StatCard
            label="Lesson time"
            value={formatMinutes(estimatedLessonMinutes)}
            detail="Combined lesson estimates"
          />
        </div>

        <div className="mt-8">
          <CreateLessonForm
            courseId={course.id}
            moduleId={module.id}
          />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-[var(--shadow-sm)]">
            <div className="border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Lessons
              </h2>

              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Lessons in this module, ordered for the learner.
              </p>
            </div>

            {lessons.length === 0 ? (
              <div className="px-5 py-12 text-center sm:px-6">
                <p className="font-semibold text-[var(--text-primary)]">
                  No lessons yet
                </p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Lesson management is the next administration layer.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {lessons.map((lesson, index) => (
                  <article
                    key={lesson.id}
                    className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-[var(--primary-soft)] px-2 text-xs font-bold text-[var(--primary)]">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <h3 className="font-bold text-[var(--text-primary)]">
                          <Link
                            href={`/admin/courses/${course.id}/modules/${module.id}/lessons/${lesson.id}`}
                            className="transition hover:text-[var(--primary)]"
                          >
                            {lesson.title}
                          </Link>
                        </h3>

                        <StatusBadge status={lesson.status} />

                        {lesson.is_preview ? (
                          <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--primary)]">
                            Preview
                          </span>
                        ) : null}
                      </div>

                      {lesson.short_description ? (
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                          {lesson.short_description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                        <MetadataPill>
                          {formatLabel(lesson.lesson_type)}
                        </MetadataPill>

                        <MetadataPill>
                          {formatMinutes(lesson.estimated_minutes)}
                        </MetadataPill>
                      </div>

                      <CurriculumItemControls
                        entityType="lesson"
                        entityId={lesson.id}
                        courseId={course.id}
                        moduleId={module.id}
                        status={lesson.status}
                        canMoveUp={index > 0}
                        canMoveDown={index < lessons.length - 1}
                        compact
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <section className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-sm)]">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Module lifecycle
              </h2>

              <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                Reorder, archive, restore, or permanently remove an empty Draft module.
              </p>

              <div className="mt-5">
                <CurriculumItemControls
                  entityType="module"
                  entityId={module.id}
                  courseId={course.id}
                  status={module.status}
                  deleteRedirectTo={`/admin/courses/${course.id}`}
                />
              </div>
            </section>

            <section className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-sm)]">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Publishing
              </h2>

              <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                Publish this module only after every lesson in it has been published.
              </p>

              <div className="mt-5">
                <PublishingControls
                  entityType="module"
                  status={module.status}
                  courseId={course.id}
                  moduleId={module.id}
                  compact
                />
              </div>
            </section>

            <ModuleSettingsForm module={module} />
          </aside>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-sm)]">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
        {detail}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  const className =
    normalized === "published"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
      : normalized === "archived"
        ? "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {formatLabel(status)}
    </span>
  );
}

function MetadataPill({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-full bg-[var(--surface-secondary)] px-3 py-1.5 font-semibold text-[var(--text-secondary)]">
      {children}
    </span>
  );
}

function formatMinutes(minutes: number | null) {
  if (!minutes || minutes <= 0) {
    return "—";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder === 0
    ? `${hours}h`
    : `${hours}h ${remainder}m`;
}

function formatLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

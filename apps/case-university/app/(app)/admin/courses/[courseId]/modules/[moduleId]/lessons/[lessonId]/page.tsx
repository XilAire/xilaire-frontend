import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import LessonSettingsForm from "@/components/admin/courses/LessonSettingsForm";
import LessonAssessmentBuilder from "@/components/admin/courses/LessonAssessmentBuilder";
import PublishingControls from "@/components/admin/courses/PublishingControls";
import CurriculumItemControls from "@/components/admin/courses/CurriculumItemControls";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { getAdminLessonAssessment } from "@/lib/university/admin-assessments";
import { createSupabaseServerServiceClient } from "@/lib/supabase/serverService";

type AdminLessonPageProps = {
  params: Promise<{
    courseId: string;
    moduleId: string;
    lessonId: string;
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
};

type LessonRow = {
  id: string;
  course_id: string;
  module_id: string;
  slug: string;
  title: string;
  short_description: string | null;
  content: unknown;
  status: string;
  lesson_type: string;
  sort_order: number;
  estimated_minutes: number | null;
  video_url: string | null;
  is_preview: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export default async function AdminLessonPage({
  params,
}: AdminLessonPageProps) {
  const role = await resolveCurrentUserRole();

  if (!role || role.role_rank < 4) {
    redirect("/dashboard");
  }

  const { courseId, moduleId, lessonId } = await params;
  /*
   * The server-side administrator authorization check above is the trust
   * boundary for this page. All curriculum administration reads use the
   * server-only service client so public/authenticated catalog grants can
   * remain limited to intentionally exposed learner-facing columns.
   */
  const admin = createSupabaseServerServiceClient();

  const [courseResult, moduleResult, lessonResult] =
    await Promise.all([
      admin
        .from("university_courses")
        .select("id, slug, title")
        .eq("id", courseId)
        .maybeSingle(),

      admin
        .from("university_modules")
        .select("id, course_id, slug, title")
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
        .eq("id", lessonId)
        .eq("course_id", courseId)
        .eq("module_id", moduleId)
        .maybeSingle(),
    ]);

  if (courseResult.error) {
    console.error(
      "[CASE University Admin] Unable to load lesson course.",
      courseResult.error,
    );
    throw new Error("Unable to load the requested course.");
  }

  if (moduleResult.error) {
    console.error(
      "[CASE University Admin] Unable to load lesson module.",
      moduleResult.error,
    );
    throw new Error("Unable to load the requested module.");
  }

  if (lessonResult.error) {
    console.error(
      "[CASE University Admin] Unable to load lesson.",
      lessonResult.error,
    );
    throw new Error("Unable to load the requested lesson.");
  }

  if (
    !courseResult.data ||
    !moduleResult.data ||
    !lessonResult.data
  ) {
    notFound();
  }

  const course = courseResult.data as CourseRow;
  const module = moduleResult.data as ModuleRow;
  const lesson = lessonResult.data as LessonRow;

  const initialAssessment =
    await getAdminLessonAssessment({
      courseId: course.id,
      moduleId: module.id,
      lessonId: lesson.id,
    });

  return (
    <div className="min-h-full bg-[var(--background)]">
      <div className="mx-auto w-full max-w-[1500px] px-5 py-8 sm:px-6 lg:px-10">
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

          <Link
            href={`/admin/courses/${course.id}/modules/${module.id}`}
            className="transition hover:text-[var(--primary)]"
          >
            {module.title}
          </Link>

          <span aria-hidden="true">/</span>

          <span className="font-semibold text-[var(--text-primary)]">
            {lesson.title}
          </span>
        </nav>

        <header className="mt-7 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={lesson.status} />

              <span className="rounded-full bg-[var(--surface-secondary)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                {formatLabel(lesson.lesson_type)}
              </span>

              {lesson.is_preview ? (
                <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                  Preview
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              {lesson.title}
            </h1>

            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Module: {module.title} · Lesson order {lesson.sort_order}
            </p>

            {lesson.short_description ? (
              <p className="mt-5 max-w-4xl text-base leading-7 text-[var(--text-secondary)]">
                {lesson.short_description}
              </p>
            ) : null}
          </div>

          <Link
            href={`/admin/courses/${course.id}/modules/${module.id}`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-5 text-sm font-semibold text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition hover:border-[var(--border-strong)]"
          >
            Back to module
          </Link>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Status"
            value={formatLabel(lesson.status)}
            helper={
              lesson.published_at
                ? `Published ${formatDate(lesson.published_at)}`
                : "Not currently published"
            }
          />

          <MetricCard
            label="Lesson type"
            value={formatLabel(lesson.lesson_type)}
            helper="Current content classification"
          />

          <MetricCard
            label="Duration"
            value={formatMinutes(lesson.estimated_minutes)}
            helper="Estimated learning time"
          />

          <MetricCard
            label="Updated"
            value={formatDate(lesson.updated_at)}
            helper="Last saved lesson revision"
          />
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <LessonSettingsForm lesson={lesson} />

            <LessonAssessmentBuilder
              courseId={course.id}
              moduleId={module.id}
              lessonId={lesson.id}
              initialAssessment={initialAssessment}
            />
          </div>

          <aside className="space-y-6 xl:order-last">
            <section className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-sm)]">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Lesson lifecycle
              </h2>

              <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                Reorder, archive, restore, or permanently remove an unused Draft lesson.
              </p>

              <div className="mt-5">
                <CurriculumItemControls
                  entityType="lesson"
                  entityId={lesson.id}
                  courseId={course.id}
                  moduleId={module.id}
                  status={lesson.status}
                  deleteRedirectTo={`/admin/courses/${course.id}/modules/${module.id}`}
                />
              </div>
            </section>

            <section className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-sm)]">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Publishing
              </h2>

              <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                A lesson must have a title, slug, duration, and non-empty content before it can be published.
              </p>

              <div className="mt-5">
                <PublishingControls
                  entityType="lesson"
                  status={lesson.status}
                  courseId={course.id}
                  moduleId={module.id}
                  lessonId={lesson.id}
                  compact
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-sm)]">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-3 text-xl font-bold text-[var(--text-primary)]">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
        {helper}
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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

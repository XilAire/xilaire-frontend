import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import CurriculumItemControls from "@/components/admin/courses/CurriculumItemControls";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { createSupabaseServerServiceClient } from "@/lib/supabase/serverService";

type PageProps = {
  params: Promise<{ courseId: string }> | { courseId: string };
};

type CourseRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string | null;
  difficulty: string | null;
  estimated_minutes: number | null;
  sort_order: number | null;
  updated_at: string | null;
};

type ModuleRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  status: string | null;
  sort_order: number | null;
};

type LessonRow = {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  slug: string;
  status: string | null;
  estimated_minutes: number | null;
  sort_order: number | null;
};

export default async function AdminCoursePage({ params }: PageProps) {
  const role = await resolveCurrentUserRole();

  if (!role || role.role_rank < 4) {
    redirect("/dashboard");
  }

  const { courseId } = await Promise.resolve(params);
  const admin = createSupabaseServerServiceClient();

  const [courseResult, modulesResult, lessonsResult] = await Promise.all([
    admin
      .from("university_courses")
      .select(
        "id,title,slug,description,status,difficulty,estimated_minutes,sort_order,updated_at",
      )
      .eq("id", courseId)
      .maybeSingle(),
    admin
      .from("university_modules")
      .select("id,course_id,title,description,status,sort_order")
      .eq("course_id", courseId)
      .order("sort_order", { ascending: true }),
    admin
      .from("university_lessons")
      .select(
        "id,course_id,module_id,title,slug,status,estimated_minutes,sort_order",
      )
      .eq("course_id", courseId)
      .order("sort_order", { ascending: true }),
  ]);

  if (courseResult.error) {
    console.error("[CASE University Admin] Unable to load course.", courseResult.error);
    throw new Error("Unable to load the requested course.");
  }

  if (!courseResult.data) {
    notFound();
  }

  if (modulesResult.error) {
    console.error("[CASE University Admin] Unable to load modules.", modulesResult.error);
  }

  if (lessonsResult.error) {
    console.error("[CASE University Admin] Unable to load lessons.", lessonsResult.error);
  }

  const course = courseResult.data as CourseRow;
  const modules = (modulesResult.data ?? []) as ModuleRow[];
  const lessons = (lessonsResult.data ?? []) as LessonRow[];
  const unassignedLessons = lessons.filter((lesson) => !lesson.module_id);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="space-y-8">
        <header>
          <Link
            href="/admin/courses"
            className="text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]"
          >
            ← Back to course management
          </Link>

          <div className="mt-5 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
                Course manager
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                  {course.title}
                </h1>
                <StatusBadge status={course.status ?? "draft"} />
              </div>
              <p className="mt-2 text-sm font-medium text-[var(--text-muted)]">
                /courses/{course.slug}
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                {course.description || "No course description has been added."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/courses/${course.slug}`}
                className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-default)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
              >
                Preview course
              </Link>
              <CurriculumItemControls
                entityType="course"
                entityId={course.id}
                courseId={course.id}
                status={course.status ?? "draft"}
                canMoveUp={false}
                canMoveDown={false}
              />
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Modules" value={String(modules.length)} />
          <MetricCard label="Lessons" value={String(lessons.length)} />
          <MetricCard label="Duration" value={formatDuration(course.estimated_minutes ?? 0)} />
          <MetricCard label="Difficulty" value={course.difficulty || "Not set"} />
        </section>

        <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-[var(--shadow-sm)]">
          <div className="border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Course curriculum</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Review, reorder, publish, and open the lessons in this course.
            </p>
          </div>

          {modules.length === 0 && lessons.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h3 className="text-base font-bold text-[var(--text-primary)]">No curriculum found</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                This course does not have any modules or lessons yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {modules.map((module, moduleIndex) => {
                const moduleLessons = lessons.filter(
                  (lesson) => lesson.module_id === module.id,
                );

                return (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    lessons={moduleLessons}
                    courseId={course.id}
                    canMoveUp={moduleIndex > 0}
                    canMoveDown={moduleIndex < modules.length - 1}
                  />
                );
              })}

              {unassignedLessons.length > 0 ? (
                <div className="px-5 py-5 sm:px-6">
                  <h3 className="font-bold text-[var(--text-primary)]">Unassigned lessons</h3>
                  <LessonList
                    lessons={unassignedLessons}
                    courseId={course.id}
                  />
                </div>
              ) : null}
            </div>
          )}
        </section>

        <p className="text-xs text-[var(--text-muted)]">
          Last updated {formatDate(course.updated_at)}
        </p>
      </div>
    </div>
  );
}

function ModuleCard({
  module,
  lessons,
  courseId,
  canMoveUp,
  canMoveDown,
}: {
  module: ModuleRow;
  lessons: LessonRow[];
  courseId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  return (
    <article className="px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-[var(--text-primary)]">{module.title}</h3>
            <StatusBadge status={module.status ?? "draft"} />
          </div>
          {module.description ? (
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {module.description}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
          </p>
        </div>

        <CurriculumItemControls
          entityType="module"
          entityId={module.id}
          courseId={courseId}
          status={module.status ?? "draft"}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          compact
        />
      </div>

      <LessonList
        lessons={lessons}
        courseId={courseId}
        moduleId={module.id}
      />
    </article>
  );
}

function LessonList({
  lessons,
  courseId,
  moduleId,
}: {
  lessons: LessonRow[];
  courseId: string;
  moduleId?: string;
}) {
  if (lessons.length === 0) {
    return <p className="mt-4 text-sm italic text-[var(--text-muted)]">No lessons in this module.</p>;
  }

  return (
    <div className="mt-4 space-y-3">
      {lessons.map((lesson, index) => (
        <div
          key={lesson.id}
          className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[var(--text-muted)]">{index + 1}</span>
              <h4 className="font-semibold text-[var(--text-primary)]">{lesson.title}</h4>
              <StatusBadge status={lesson.status ?? "draft"} />
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {lesson.estimated_minutes ? `${lesson.estimated_minutes} min` : "Duration not set"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {moduleId ? (
              <>
                <Link
                  href={`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)]"
                >
                  Manage lesson
                </Link>
                <CurriculumItemControls
                  entityType="lesson"
                  entityId={lesson.id}
                  courseId={courseId}
                  moduleId={moduleId}
                  status={lesson.status ?? "draft"}
                  canMoveUp={index > 0}
                  canMoveDown={index < lessons.length - 1}
                  compact
                />
              </>
            ) : (
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Assign this lesson to a module before publishing.
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)]">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const published = status === "published";
  return (
    <span
      className={
        published
          ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
          : "inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
      }
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}

function formatDuration(minutes: number) {
  if (minutes <= 0) return "Not set";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

function formatDate(value: string | null) {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

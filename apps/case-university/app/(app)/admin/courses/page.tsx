import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerServiceClient } from "@/lib/supabase/serverService";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import CreateCourseForm from "@/components/admin/courses/CreateCourseForm";
import CurriculumItemControls from "@/components/admin/courses/CurriculumItemControls";

type CourseRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string | null;
  difficulty: string | null;
  estimated_minutes: number | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type ModuleRow = {
  id: string;
  course_id: string;
};

type LessonRow = {
  id: string;
  course_id: string;
};

type CourseSummary = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  difficulty: string | null;
  estimatedMinutes: number;
  moduleCount: number;
  lessonCount: number;
  sortOrder: number;
  updatedAt: string | null;
};

export default async function AdminCoursesPage() {
  const role =
    await resolveCurrentUserRole();

  if (
    !role ||
    role.role_rank < 4
  ) {
    redirect(
      "/dashboard",
    );
  }

  /*
   * The server-side administrator authorization check above is the trust
   * boundary for this page. All curriculum administration reads use the
   * server-only service client so public/authenticated catalog grants can
   * remain limited to intentionally exposed learner-facing columns.
   */
  const admin =
    createSupabaseServerServiceClient();

  const [
    coursesResult,
    modulesResult,
    lessonsResult,
  ] =
    await Promise.all([
      admin
        .from(
          "university_courses",
        )
        .select(
          `
            id,
            title,
            slug,
            description,
            status,
            difficulty,
            estimated_minutes,
            sort_order,
            created_at,
            updated_at
          `,
        )
        .order(
          "sort_order",
          {
            ascending: true,
          },
        ),

      admin
        .from(
          "university_modules",
        )
        .select(
          `
            id,
            course_id
          `,
        ),

      admin
        .from(
          "university_lessons",
        )
        .select(
          `
            id,
            course_id
          `,
        ),
    ]);

  if (
    coursesResult.error
  ) {
    console.error(
      "[CASE University Admin] Unable to load courses.",
      coursesResult.error,
    );
  }

  if (
    modulesResult.error
  ) {
    console.error(
      "[CASE University Admin] Unable to load course modules.",
      modulesResult.error,
    );
  }

  if (
    lessonsResult.error
  ) {
    console.error(
      "[CASE University Admin] Unable to load course lessons.",
      lessonsResult.error,
    );
  }

  const courses =
    (
      coursesResult.data ??
      []
    ) as CourseRow[];

  const modules =
    (
      modulesResult.data ??
      []
    ) as ModuleRow[];

  const lessons =
    (
      lessonsResult.data ??
      []
    ) as LessonRow[];

  const summaries =
    buildCourseSummaries(
      courses,
      modules,
      lessons,
    );

  const publishedCount =
    summaries.filter(
      (
        course,
      ) =>
        course.status ===
        "published",
    ).length;

  const draftCount =
    summaries.filter(
      (
        course,
      ) =>
        course.status !==
        "published",
    ).length;

  const totalLessons =
    summaries.reduce(
      (
        total,
        course,
      ) =>
        total +
        course.lessonCount,
      0,
    );

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="space-y-8">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
              Administration
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              Course management
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              Review curriculum structure, publishing status, lesson counts,
              and course readiness before releasing content to learners.
            </p>
          </div>

          <Link
            href="/courses"
            className="
              inline-flex
              w-fit
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-[var(--border-default)]
              bg-[var(--surface-default)]
              px-4
              py-2.5
              text-sm
              font-semibold
              text-[var(--text-primary)]
              shadow-[var(--shadow-xs)]
              transition
              hover:border-[var(--border-strong)]
              hover:bg-[var(--surface-hover)]
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-[var(--focus-ring)]
            "
          >
            <EyeIcon />

            View learner catalog
          </Link>
        </header>

        <CreateCourseForm />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total courses"
            value={
              String(
                summaries.length,
              )
            }
            helper="University curriculum"
          />

          <MetricCard
            label="Published"
            value={
              String(
                publishedCount,
              )
            }
            helper="Visible as released content"
          />

          <MetricCard
            label="Draft"
            value={
              String(
                draftCount,
              )
            }
            helper="Still being prepared"
          />

          <MetricCard
            label="Lessons"
            value={
              String(
                totalLessons,
              )
            }
            helper="Across all courses"
          />
        </section>

        <section
          className="
            overflow-hidden
            rounded-2xl
            border
            border-[var(--border-subtle)]
            bg-[var(--surface-default)]
            shadow-[var(--shadow-sm)]
          "
        >
          <div className="border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Curriculum
                </h2>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Current CASE University course inventory.
                </p>
              </div>

              <span
                className="
                  inline-flex
                  w-fit
                  items-center
                  rounded-full
                  bg-[var(--surface-muted)]
                  px-3
                  py-1
                  text-xs
                  font-bold
                  text-[var(--text-secondary)]
                "
              >
                {
                  summaries.length
                }{" "}
                courses
              </span>
            </div>
          </div>

          {summaries.length ===
          0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {summaries.map(
                (
                  course,
                  index,
                ) => (
                  <CourseRowCard
                    key={
                      course.id
                    }
                    course={
                      course
                    }
                    canMoveUp={index > 0}
                    canMoveDown={index < summaries.length - 1}
                  />
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function CourseRowCard({
  course,
  canMoveUp,
  canMoveDown,
}: {
  course: CourseSummary;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const readiness =
    getCourseReadiness(
      course,
    );

  return (
    <article className="px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">
              {
                course.title
              }
            </h3>

            <StatusBadge
              status={
                course.status
              }
            />

            <ReadinessBadge
              readiness={
                readiness
              }
            />
          </div>

          <p className="mt-1 text-xs font-medium text-[var(--text-muted)]">
            /courses/
            {
              course.slug
            }
          </p>

          {course.description ? (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              {
                course.description
              }
            </p>
          ) : (
            <p className="mt-3 text-sm italic text-[var(--text-muted)]">
              No course description has been added.
            </p>
          )}
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[500px]">
          <CourseStat
            label="Modules"
            value={
              String(
                course.moduleCount,
              )
            }
          />

          <CourseStat
            label="Lessons"
            value={
              String(
                course.lessonCount,
              )
            }
          />

          <CourseStat
            label="Duration"
            value={
              formatDuration(
                course.estimatedMinutes,
              )
            }
          />

          <CourseStat
            label="Order"
            value={
              String(
                course.sortOrder,
              )
            }
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] pt-4">
        <Link
          href={`/admin/courses/${course.id}`}
          className="
            inline-flex
            items-center
            gap-2
            rounded-lg
            bg-[var(--primary)]
            px-3
            py-2
            text-sm
            font-semibold
            text-[var(--primary-foreground)]
            transition
            hover:bg-[var(--primary-hover)]
            focus:outline-none
            focus-visible:ring-2
            focus-visible:ring-[var(--focus-ring)]
          "
        >
          Manage course
        </Link>

        <Link
          href={
            `/courses/${course.slug}`
          }
          className="
            inline-flex
            items-center
            gap-2
            rounded-lg
            px-3
            py-2
            text-sm
            font-semibold
            text-[var(--primary)]
            transition
            hover:bg-[var(--primary-soft)]
            hover:text-[var(--primary-hover)]
            focus:outline-none
            focus-visible:ring-2
            focus-visible:ring-[var(--focus-ring)]
          "
        >
          <EyeIcon />

          Preview course
        </Link>

        <CurriculumItemControls
          entityType="course"
          entityId={course.id}
          courseId={course.id}
          status={course.status}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          compact
        />

        <span className="text-xs text-[var(--text-muted)]">
          Last updated{" "}
          {
            formatDate(
              course.updatedAt,
            )
          }
        </span>
      </div>
    </article>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label:
    string;

  value:
    string;

  helper:
    string;
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-[var(--border-subtle)]
        bg-[var(--surface-default)]
        p-5
        shadow-[var(--shadow-xs)]
      "
    >
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {
          label
        }
      </p>

      <p className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
        {
          value
        }
      </p>

      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
        {
          helper
        }
      </p>
    </div>
  );
}

function CourseStat({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-[var(--border-subtle)]
        bg-[var(--surface-muted)]
        px-3
        py-3
      "
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--text-muted)]">
        {
          label
        }
      </p>

      <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
        {
          value
        }
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status:
    string;
}) {
  const isPublished =
    status ===
    "published";

  return (
    <span
      className={
        isPublished
          ? "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
          : "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
      }
    >
      {
        isPublished
          ? "Published"
          : "Draft"
      }
    </span>
  );
}

function ReadinessBadge({
  readiness,
}: {
  readiness:
    "ready" |
    "review";
}) {
  const ready =
    readiness ===
    "ready";

  return (
    <span
      className={
        ready
          ? "inline-flex items-center rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-bold text-[var(--primary)]"
          : "inline-flex items-center rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)]"
      }
    >
      {
        ready
          ? "Structure ready"
          : "Needs review"
      }
    </span>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-16 text-center">
      <div
        className="
          mx-auto
          flex
          h-12
          w-12
          items-center
          justify-center
          rounded-xl
          bg-[var(--primary-soft)]
          text-[var(--primary)]
        "
      >
        <BookIcon />
      </div>

      <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">
        No courses found
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        CASE University does not currently have any curriculum records available.
      </p>
    </div>
  );
}

function buildCourseSummaries(
  courses:
    CourseRow[],
  modules:
    ModuleRow[],
  lessons:
    LessonRow[],
): CourseSummary[] {
  const moduleCounts =
    new Map<
      string,
      number
    >();

  const lessonCounts =
    new Map<
      string,
      number
    >();

  for (
    const module
    of modules
  ) {
    moduleCounts.set(
      module.course_id,
      (
        moduleCounts.get(
          module.course_id,
        ) ??
        0
      ) +
        1,
    );
  }

  for (
    const lesson
    of lessons
  ) {
    lessonCounts.set(
      lesson.course_id,
      (
        lessonCounts.get(
          lesson.course_id,
        ) ??
        0
      ) +
        1,
    );
  }

  return courses.map(
    (
      course,
    ) => ({
      id:
        course.id,

      title:
        course.title,

      slug:
        course.slug,

      description:
        course.description,

      status:
        course.status ??
        "draft",

      difficulty:
        course.difficulty,

      estimatedMinutes:
        course.estimated_minutes ??
        0,

      moduleCount:
        moduleCounts.get(
          course.id,
        ) ??
        0,

      lessonCount:
        lessonCounts.get(
          course.id,
        ) ??
        0,

      sortOrder:
        course.sort_order ??
        0,

      updatedAt:
        course.updated_at,
    }),
  );
}

function getCourseReadiness(
  course:
    CourseSummary,
) {
  if (
    course.moduleCount >
      0 &&
    course.lessonCount >
      0 &&
    course.title.trim() &&
    course.slug.trim()
  ) {
    return "ready" as const;
  }

  return "review" as const;
}

function formatDuration(
  minutes:
    number,
) {
  if (
    minutes <=
    0
  ) {
    return "—";
  }

  const hours =
    Math.floor(
      minutes /
        60,
    );

  const remainingMinutes =
    minutes %
    60;

  if (
    hours ===
    0
  ) {
    return `${remainingMinutes}m`;
  }

  if (
    remainingMinutes ===
    0
  ) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function formatDate(
  value:
    string | null,
) {
  if (
    !value
  ) {
    return "unknown";
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "unknown";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",
    },
  ).format(
    date,
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"
      />

      <circle
        cx="12"
        cy="12"
        r="2.5"
      />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 5.5A2.5 2.5 0 016.5 3H11v16H6.5A2.5 2.5 0 004 21.5v-16z"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 5.5A2.5 2.5 0 0017.5 3H13v16h4.5a2.5 2.5 0 012.5 2.5v-16z"
      />
    </svg>
  );
}
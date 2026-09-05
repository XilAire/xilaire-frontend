import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentUserProgressDashboard,
  type UniversityProgressDashboardRecentActivity,
} from "@/lib/university/progress";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function ArrowRightIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function BookOpenIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 5.5A2.5 2.5 0 0 1 4.5 3H11v16H4.5A2.5 2.5 0 0 0 2 21.5v-16Z" />
      <path d="M22 5.5A2.5 2.5 0 0 0 19.5 3H13v16h6.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4v1a4 4 0 0 0 4 4" />
      <path d="M17 6h3v1a4 4 0 0 1-4 4" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22c4 0 7-3 7-7 0-5-3-7-5-10-1 3-3 4-4 6-1-2-1-4 0-7-4 3-5 7-5 10 0 5 3 8 7 8Z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19V9" />
      <path d="M10 19V5" />
      <path d="M16 19v-7" />
      <path d="M22 19V3" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.5 4.5A3 3 0 0 0 6 7.5v.4A3.5 3.5 0 0 0 5 14.7V16a3 3 0 0 0 4.5 2.6" />
      <path d="M14.5 4.5A3 3 0 0 1 18 7.5v.4a3.5 3.5 0 0 1 1 6.8V16a3 3 0 0 1-4.5 2.6" />
      <path d="M12 3v18" />
      <path d="M9 9h3" />
      <path d="M12 15h3" />
    </svg>
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatPercent(value: number) {
  const rounded =
    Math.abs(value - Math.round(value)) < 0.01
      ? Math.round(value)
      : Number(value.toFixed(1));

  return `${rounded}%`;
}

function activityTitle(
  activity: UniversityProgressDashboardRecentActivity,
) {
  switch (activity.activity_type) {
    case "lesson_completed":
      return activity.lesson_title
        ? `Completed ${activity.lesson_title}`
        : "Lesson completed";

    case "assessment_completed":
      return activity.lesson_title
        ? `Assessment: ${activity.lesson_title}`
        : "Assessment completed";

    case "practice_completed":
      return "Practice session completed";

    case "certificate_earned":
      return activity.course_title
        ? `Certificate earned: ${activity.course_title}`
        : "Certificate earned";

    default:
      return "Learning activity";
  }
}

function activityDetail(
  activity: UniversityProgressDashboardRecentActivity,
) {
  if (
    activity.activity_type === "assessment_completed" ||
    activity.activity_type === "practice_completed"
  ) {
    return activity.score === null
      ? null
      : `${activity.score}%`;
  }

  return activity.course_title;
}

function activityHref(
  activity: UniversityProgressDashboardRecentActivity,
) {
  if (
    activity.activity_type === "lesson_completed" &&
    activity.course_slug &&
    activity.lesson_slug
  ) {
    return `/courses/${activity.course_slug}/lessons/${activity.lesson_slug}`;
  }

  if (
    activity.activity_type === "certificate_earned"
  ) {
    return "/certificates";
  }

  if (
    activity.activity_type === "practice_completed"
  ) {
    return "/practice";
  }

  if (
    activity.activity_type === "assessment_completed" &&
    activity.course_slug &&
    activity.lesson_slug
  ) {
    return `/courses/${activity.course_slug}/lessons/${activity.lesson_slug}`;
  }

  return null;
}

export default async function ProgressPage() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/auth/signin?redirect=/progress",
    );
  }

  const dashboard =
    await getCurrentUserProgressDashboard();

  const {
    overview,
    streak,
    assessments,
    practice,
    courses,
    recent_activity: recentActivity,
  } = dashboard;

  const activeCourses =
    courses.filter(
      (course) =>
        course.status !== "completed" &&
        (
          course.started_at !== null ||
          course.progress_percent > 0
        ),
    );

  const completedCourses =
    courses.filter(
      (course) =>
        course.status === "completed" ||
        course.progress_percent >= 100,
    );

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--primary)]">
            CASE University
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Progress
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            Track course completion, assessment results, Practice performance, learning streaks, and earned achievements from your authoritative CASE University activity.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/practice"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-5 py-2.5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:border-[var(--primary-border)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            Practice
            <ArrowRightIcon />
          </Link>

          <Link
            href="/learning"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-primary)] outline-none transition hover:bg-[var(--primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            My Learning
            <ArrowRightIcon />
          </Link>
        </div>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={<BookOpenIcon />}
          value={`${overview.completed_lessons}/${overview.total_lessons}`}
          label="Lessons completed"
        />

        <MetricCard
          icon={<CheckIcon />}
          value={formatPercent(overview.overall_progress_percent)}
          label="Overall progress"
        />

        <MetricCard
          icon={<FlameIcon />}
          value={String(streak.current_streak_days)}
          label="Current streak"
          detail={streak.current_streak_days === 1 ? "learning day" : "learning days"}
        />

        <MetricCard
          icon={<ChartIcon />}
          value={formatPercent(practice.accuracy_percent)}
          label="Practice accuracy"
        />

        <MetricCard
          icon={<TrophyIcon />}
          value={String(overview.certificates_earned)}
          label="Certificates earned"
          achievement
        />
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-[var(--shadow-xs)]">
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">
                Overall
              </p>

              <h2 className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                Learning completion
              </h2>
            </div>

            <span className="text-2xl font-black text-[var(--primary)]">
              {formatPercent(overview.overall_progress_percent)}
            </span>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--border-subtle)]">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    overview.overall_progress_percent,
                  ),
                )}%`,
              }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-[var(--text-muted)]">
            <span>
              {overview.completed_lessons} completed
            </span>

            <span>
              {overview.started_courses} started course
              {overview.started_courses === 1 ? "" : "s"} ·{" "}
              {overview.completed_courses} completed
            </span>

            <span>
              {overview.total_lessons} total accessible lessons
            </span>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-3">
        <PerformancePanel
          eyebrow="Assessments"
          title="Official assessments"
          value={formatPercent(assessments.average_score)}
          valueLabel="Average score"
          rows={[
            ["Attempts", String(assessments.attempt_count)],
            ["Passed attempts", String(assessments.passed_attempt_count)],
            ["Best score", formatPercent(assessments.best_score)],
          ]}
        />

        <PerformancePanel
          eyebrow="Practice"
          title="Practice performance"
          value={formatPercent(practice.accuracy_percent)}
          valueLabel="Question accuracy"
          rows={[
            ["Attempts", String(practice.attempt_count)],
            ["Questions answered", String(practice.questions_answered)],
            ["Best session", formatPercent(practice.best_score)],
          ]}
        />

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)] sm:p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <FlameIcon />
          </div>

          <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--primary)]">
            Learning streak
          </p>

          <p className="mt-2 text-3xl font-black text-[var(--text-primary)]">
            {streak.current_streak_days} day
            {streak.current_streak_days === 1 ? "" : "s"}
          </p>

          <div className="mt-5 space-y-3">
            <StatRow
              label="Longest streak"
              value={`${streak.longest_streak_days} day${streak.longest_streak_days === 1 ? "" : "s"}`}
            />
            <StatRow
              label="Learning days"
              value={String(streak.total_learning_days)}
            />
            <StatRow
              label="Last learning day"
              value={formatDate(streak.last_learning_date)}
            />
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--primary)]">
              Courses
            </p>

            <h2 className="mt-2 text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">
              Course progress
            </h2>
          </div>

          <p className="text-xs font-semibold text-[var(--text-muted)]">
            {activeCourses.length} active · {completedCourses.length} completed
          </p>
        </div>

        {courses.length > 0 ? (
          <div className="mt-5 space-y-4">
            {courses.map((course) => {
              const completed =
                course.status === "completed" ||
                course.progress_percent >= 100;

              const started =
                course.started_at !== null ||
                course.progress_percent > 0;

              return (
                <article
                  key={course.course_id}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)] sm:p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-[var(--text-primary)]">
                          {course.title}
                        </h3>

                        {completed ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--achievement-border)] bg-[var(--achievement-soft)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--achievement)]">
                            <CheckIcon />
                            Completed
                          </span>
                        ) : started ? (
                          <span className="rounded-full border border-[var(--primary-border)] bg-[var(--primary-soft)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--primary)]">
                            In progress
                          </span>
                        ) : (
                          <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                            Not started
                          </span>
                        )}
                      </div>

                      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                        <div
                          className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                course.progress_percent,
                              ),
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-[var(--text-muted)]">
                        <span>
                          {course.completed_lessons} of{" "}
                          {course.total_lessons} lessons completed
                        </span>

                        <span>
                          {formatPercent(course.progress_percent)}
                        </span>

                        <span>
                          Last activity:{" "}
                          {formatDateTime(course.last_activity_at)}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/courses/${course.slug}`}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-5 py-2.5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:border-[var(--primary-border)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                    >
                      {completed
                        ? "Review course"
                        : started
                          ? "Continue course"
                          : "View course"}

                      <ArrowRightIcon />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <BookOpenIcon />
            </div>

            <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
              No accessible courses yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
              Once a CASE University course is available to your plan, its progress will appear here.
            </p>

            <Link
              href="/courses"
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-primary)] outline-none transition hover:bg-[var(--primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              Browse courses
              <ArrowRightIcon />
            </Link>
          </div>
        )}
      </section>

      <section className="mt-10 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--primary)]">
              Activity
            </p>

            <h2 className="mt-2 text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">
              Recent learning activity
            </h2>
          </div>

          {recentActivity.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-6 text-sm leading-6 text-[var(--text-secondary)]">
              Completed lessons, assessments, Practice sessions, and certificates will appear here.
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-[var(--shadow-xs)]">
              <div className="divide-y divide-[var(--border-subtle)]">
                {recentActivity.slice(0, 10).map((activity, index) => {
                  const href =
                    activityHref(activity);

                  const content = (
                    <>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)]">
                          {activityTitle(activity)}
                        </p>

                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
                          <span>
                            {formatDateTime(activity.occurred_at)}
                          </span>

                          {activityDetail(activity) ? (
                            <span>
                              {activityDetail(activity)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {href ? (
                        <ArrowRightIcon />
                      ) : null}
                    </>
                  );

                  return href ? (
                    <Link
                      key={`${activity.activity_type}:${activity.occurred_at}:${index}`}
                      href={href}
                      className="flex items-center justify-between gap-4 p-5 transition hover:bg-[var(--surface-hover)]"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      key={`${activity.activity_type}:${activity.occurred_at}:${index}`}
                      className="flex items-center justify-between gap-4 p-5"
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)] sm:p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <BrainIcon />
          </div>

          <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--primary)]">
            Learning snapshot
          </p>

          <h2 className="mt-2 text-xl font-black tracking-tight text-[var(--text-primary)]">
            Keep building the habit.
          </h2>

          <div className="mt-5 space-y-3">
            <StatRow
              label="Accessible courses"
              value={String(overview.total_courses)}
            />
            <StatRow
              label="Started lessons"
              value={String(overview.started_lessons)}
            />
            <StatRow
              label="Official assessment attempts"
              value={String(assessments.attempt_count)}
            />
            <StatRow
              label="Practice attempts"
              value={String(practice.attempt_count)}
            />
            <StatRow
              label="Practice correct answers"
              value={`${practice.correct_answers}/${practice.questions_answered}`}
            />
          </div>

          <Link
            href="/learning"
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-primary)] outline-none transition hover:bg-[var(--primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            Continue learning
            <ArrowRightIcon />
          </Link>
        </aside>
      </section>
    </main>
  );
}

function MetricCard({
  icon,
  value,
  label,
  detail,
  achievement = false,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  detail?: string;
  achievement?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-5 shadow-[var(--shadow-xs)]",
        achievement
          ? "border-[var(--achievement-border)] bg-[var(--achievement-soft)]"
          : "border-[var(--border-subtle)] bg-[var(--surface-default)]",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-11 w-11 items-center justify-center rounded-xl",
          achievement
            ? "bg-[var(--surface-default)] text-[var(--achievement)]"
            : "bg-[var(--primary-soft)] text-[var(--primary)]",
        ].join(" ")}
      >
        {icon}
      </div>

      <p className="mt-4 text-2xl font-bold text-[var(--text-primary)]">
        {value}
      </p>

      <p className="mt-1 text-sm font-semibold text-[var(--text-secondary)]">
        {label}
      </p>

      {detail ? (
        <p className="mt-1 text-xs font-medium text-[var(--text-muted)]">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function PerformancePanel({
  eyebrow,
  title,
  value,
  valueLabel,
  rows,
}: {
  eyebrow: string;
  title: string;
  value: string;
  valueLabel: string;
  rows: [string, string][];
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)] sm:p-6">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--primary)]">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-lg font-black text-[var(--text-primary)]">
        {title}
      </h2>

      <p className="mt-4 text-3xl font-black text-[var(--text-primary)]">
        {value}
      </p>

      <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">
        {valueLabel}
      </p>

      <div className="mt-5 space-y-3">
        {rows.map(([label, rowValue]) => (
          <StatRow
            key={label}
            label={label}
            value={rowValue}
          />
        ))}
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-[var(--surface-muted)] px-4 py-3">
      <span className="text-xs font-semibold text-[var(--text-muted)]">
        {label}
      </span>

      <span className="text-sm font-black text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}

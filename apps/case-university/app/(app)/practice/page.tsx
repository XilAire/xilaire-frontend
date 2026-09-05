import Link from "next/link";
import { redirect } from "next/navigation";

import PracticeLauncher from "@/components/university/PracticeLauncher";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentUserPracticeCatalog,
  getCurrentUserPracticeHistory,
  getCurrentUserPracticePerformance,
  getCurrentUserPracticeWeakAreas,
} from "@/lib/university/practice";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function formatAccuracy(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

export default async function PracticePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin?redirect=/practice");
  }

  const [catalog, history, performance, weakAreas] = await Promise.all([
    getCurrentUserPracticeCatalog(),
    getCurrentUserPracticeHistory(12),
    getCurrentUserPracticePerformance(),
    getCurrentUserPracticeWeakAreas(10),
  ]);

  const summary = history.summary;

  // The weak-area RPC includes every historically weak question. The
  // missed-question creator performs the stricter "latest result is wrong"
  // check at creation time. Until a dedicated count RPC is added, use the
  // weak-question count as an upper bound in the launcher; the server remains
  // authoritative and will return a clear message if no current misses exist.
  const missedQuestionCount = weakAreas.weak_question_count;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-[var(--shadow-sm)]">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--primary)]">
              Practice
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
              Reinforce what you&apos;ve already learned.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              Practice published assessment questions from lessons you have reached, revisit missed questions, and focus on weak areas. Practice remains separate from lesson completion and certificate eligibility.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Metric label="Attempts" value={String(summary.attempt_count)} />
            <Metric label="Questions" value={String(summary.total_questions)} />
            <Metric
              label="Average"
              value={
                summary.average_score === null
                  ? "—"
                  : `${summary.average_score}%`
              }
            />
            <Metric
              label="Best"
              value={
                summary.best_score === null ? "—" : `${summary.best_score}%`
              }
            />
          </div>
        </div>
      </section>

      <section className="mt-8">
        <PracticeLauncher
          courses={catalog.courses}
          weakQuestionCount={weakAreas.weak_question_count}
          missedQuestionCount={missedQuestionCount}
        />
      </section>

      <section className="mt-8">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Performance
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)]">
            See where your practice is paying off.
          </h2>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <PerformanceCard
            label="Overall accuracy"
            value={formatAccuracy(performance.overall.accuracy)}
            detail={`${performance.overall.correct_answers}/${performance.overall.answered_questions} correct`}
          />
          <PerformanceCard
            label="Unique questions"
            value={String(performance.overall.unique_questions_practiced)}
            detail="Practiced so far"
          />
          <PerformanceCard
            label="Recent trend"
            value={
              performance.recent_trend.change === null
                ? "—"
                : `${performance.recent_trend.change > 0 ? "+" : ""}${performance.recent_trend.change}%`
            }
            detail={
              performance.recent_trend.previous_average === null
                ? "More attempts needed for comparison"
                : "Recent 5 vs. previous 5 attempts"
            }
          />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--primary)]">
                  By course
                </p>
                <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">
                  Course performance
                </h3>
              </div>
            </div>

            {performance.by_course.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                Complete Practice sessions to build course-level performance data.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-[var(--border-subtle)]">
                {performance.by_course.slice(0, 6).map((course) => (
                  <div
                    key={course.course_id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        {course.course_title}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {course.correct_answers}/{course.answered_questions} correct
                      </p>
                    </div>
                    <p className="text-lg font-black text-[var(--text-primary)]">
                      {formatAccuracy(course.accuracy)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)]">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--primary)]">
              Weak areas
            </p>
            <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">
              Modules to reinforce
            </h3>

            {weakAreas.weakest_modules.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                No weak areas have been identified yet. Keep practicing and this section will adapt to your results.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-[var(--border-subtle)]">
                {weakAreas.weakest_modules.slice(0, 6).map((module) => (
                  <div
                    key={`${module.course_id}:${module.module_id}`}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        {module.module_title}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {module.course_title} · {module.weak_question_count} weak question
                        {module.weak_question_count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="text-lg font-black text-[var(--text-primary)]">
                      {formatAccuracy(module.accuracy)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              History
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)]">
              Recent practice
            </h2>
          </div>
          <p className="text-xs font-semibold text-[var(--text-muted)]">
            Last practiced: {formatDateTime(summary.last_practiced_at)}
          </p>
        </div>

        {history.recent_attempts.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-6 text-sm leading-6 text-[var(--text-secondary)]">
            Your completed practice sessions will appear here.
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-[var(--shadow-xs)]">
            <div className="divide-y divide-[var(--border-subtle)]">
              {history.recent_attempts.map((attempt) => (
                <div
                  key={attempt.attempt_id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      {attempt.module_title ?? attempt.course_title}
                    </p>
                    {attempt.module_title &&
                    attempt.course_title !== "Mixed Practice" ? (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {attempt.course_title}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {formatDateTime(attempt.completed_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-black text-[var(--text-primary)]">
                        {attempt.score}%
                      </p>
                      <p className="text-xs font-semibold text-[var(--text-muted)]">
                        {attempt.correct_count}/{attempt.question_count} correct
                      </p>
                    </div>
                    <Link
                      href={`/practice/${attempt.session_id}`}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-4 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function PerformanceCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)]">
      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-xs font-semibold text-[var(--text-muted)]">
        {detail}
      </p>
    </div>
  );
}

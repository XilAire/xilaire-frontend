"use client";

import {
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { submitLessonAssessmentAction } from "@/app/actions/university-assessments";
import type {
  AssessmentAttemptSummary,
  AssessmentSubmissionResult,
  LearnerLessonAssessment,
} from "@/lib/university/assessments";

export default function LessonAssessment({
  assessment,
  initialAttemptSummary,
}: {
  assessment: LearnerLessonAssessment;
  initialAttemptSummary: AssessmentAttemptSummary;
}) {
  const router = useRouter();

  const [answers, setAnswers] =
    useState<Record<string, string>>({});

  const [result, setResult] =
    useState<AssessmentSubmissionResult | null>(
      null,
    );

  const [message, setMessage] =
    useState<string | null>(null);

  const [isPending, startTransition] =
    useTransition();

  const isComplete =
    assessment.questions.every(
      (question) =>
        Boolean(answers[question.id]),
    );

  const alreadyPassed =
    initialAttemptSummary.hasPassed ||
    Boolean(result?.passed);

  function submitAssessment() {
    setMessage(null);

    startTransition(async () => {
      const response =
        await submitLessonAssessmentAction(
          assessment.id,
          answers,
        );

      setMessage(response.message);

      if (!response.result) {
        return;
      }

      setResult(response.result);

      if (response.result.passed) {
        router.refresh();
      }
    });
  }

  function resetAttempt() {
    setAnswers({});
    setResult(null);
    setMessage(null);
  }

  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-[var(--shadow-sm)]">
      <header className="border-b border-[var(--border-subtle)] px-5 py-6 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">
              Lesson assessment
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
              {assessment.title}
            </h2>

            {assessment.instructions ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
                {assessment.instructions}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <StatPill>
              Pass {assessment.passing_score}%
            </StatPill>

            {assessment.is_required ? (
              <StatPill>Required</StatPill>
            ) : (
              <StatPill>Optional</StatPill>
            )}

            {alreadyPassed ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                ✓ Passed
              </span>
            ) : assessment.is_required ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                Completion locked
              </span>
            ) : null}
          </div>
        </div>

        {initialAttemptSummary.attemptCount >
        0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <AttemptMetric
              label="Attempts"
              value={String(
                initialAttemptSummary.attemptCount,
              )}
            />

            <AttemptMetric
              label="Best score"
              value={
                initialAttemptSummary.bestScore ===
                null
                  ? "—"
                  : `${initialAttemptSummary.bestScore}%`
              }
            />

            <AttemptMetric
              label="Last score"
              value={
                initialAttemptSummary.lastScore ===
                null
                  ? "—"
                  : `${initialAttemptSummary.lastScore}%`
              }
            />
          </div>
        ) : null}
      </header>

      <div className="space-y-5 p-5 sm:p-7">
        {alreadyPassed && !result ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
              Assessment complete
            </p>

            <p className="mt-1 text-sm leading-6 text-emerald-700 dark:text-emerald-300">
              You have already passed this assessment.
              Lesson completion is now unlocked below.
            </p>
          </div>
        ) : (
          <>
            {assessment.questions.map(
              (question, questionIndex) => {
                const resultItem =
                  result?.results.find(
                    (item) =>
                      item.question_id ===
                      question.id,
                  );

                return (
                  <fieldset
                    key={question.id}
                    disabled={
                      isPending ||
                      Boolean(result)
                    }
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4 sm:p-5"
                  >
                    <legend className="px-1 text-sm font-bold leading-6 text-[var(--text-primary)]">
                      {questionIndex + 1}.{" "}
                      {question.prompt}
                    </legend>

                    <div className="mt-3 space-y-2">
                      {question.answers.map(
                        (answer, answerIndex) => (
                          <label
                            key={answer.id}
                            className={[
                              "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-6 transition",
                              answers[question.id] ===
                              answer.id
                                ? "border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--text-primary)]"
                                : "border-[var(--border-subtle)] bg-[var(--surface-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]",
                            ].join(" ")}
                          >
                            <input
                              type="radio"
                              name={question.id}
                              checked={
                                answers[
                                  question.id
                                ] === answer.id
                              }
                              onChange={() =>
                                setAnswers(
                                  (current) => ({
                                    ...current,
                                    [question.id]:
                                      answer.id,
                                  }),
                                )
                              }
                              className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
                            />

                            <span>
                              <span className="mr-2 font-bold text-[var(--text-primary)]">
                                {String.fromCharCode(
                                  65 +
                                    answerIndex,
                                )}
                                .
                              </span>

                              {answer.answer_text}
                            </span>
                          </label>
                        ),
                      )}
                    </div>

                    {resultItem ? (
                      <div
                        className={[
                          "mt-4 rounded-xl border px-4 py-3 text-sm leading-6",
                          resultItem.correct
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                            : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200",
                        ].join(" ")}
                      >
                        <p className="font-bold">
                          {resultItem.correct
                            ? "Correct"
                            : "Incorrect"}
                        </p>

                        {resultItem.explanation ? (
                          <p className="mt-1">
                            {
                              resultItem.explanation
                            }
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </fieldset>
                );
              },
            )}

            {result ? (
              <div
                className={[
                  "rounded-2xl border p-5 sm:p-6",
                  result.passed
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30"
                    : "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30",
                ].join(" ")}
              >
                <p className="text-3xl font-black text-[var(--text-primary)]">
                  {result.score}%
                </p>

                <p className="mt-1 text-sm font-bold text-[var(--text-secondary)]">
                  {result.passed
                    ? "Assessment passed"
                    : "Not passed yet"}{" "}
                  · {result.correct_count}/
                  {result.question_count} correct
                </p>

                {!result.passed ? (
                  <div>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      Review the feedback above and retry when you are ready.
                    </p>

                    <button
                      type="button"
                      onClick={resetAttempt}
                      className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-xs font-bold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
                    >
                      Try again
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {message ? (
              <p className="text-sm text-[var(--text-muted)]">
                {message}
              </p>
            ) : null}

            {!result ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={submitAssessment}
                  disabled={
                    isPending ||
                    !isComplete
                  }
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-primary)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending
                    ? "Grading..."
                    : "Submit assessment"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function StatPill({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)]">
      {children}
    </span>
  );
}

function AttemptMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

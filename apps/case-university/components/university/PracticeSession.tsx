"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import {
  abandonPracticeSessionAction,
  submitPracticeSessionAction,
} from "@/app/actions/university-practice";
import type {
  UniversityPracticeSession,
  UniversityPracticeSubmissionResult,
} from "@/lib/university/practice";

export default function PracticeSession({
  session,
}: {
  session: UniversityPracticeSession;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<UniversityPracticeSubmissionResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const answeredCount = useMemo(
    () => session.questions.filter((question) => Boolean(answers[question.id])).length,
    [answers, session.questions],
  );

  const isComplete = answeredCount === session.questions.length;

  function handleSubmit() {
    if (!isComplete || isPending || result) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const response = await submitPracticeSessionAction(session.id, answers);

      setMessage(response.message);

      if (response.result) {
        setResult(response.result);
      }
    });
  }

  function handleAbandon() {
    if (isPending || result) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const response = await abandonPracticeSessionAction(session.id);
      setMessage(response.message);

      if (response.success) {
        window.location.href = "/practice";
      }
    });
  }

  if (session.status !== "active" && !result) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-6 shadow-[var(--shadow-xs)]">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--primary)]">
          Practice session
        </p>
        <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
          This session is {session.status}.
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Completed practice results are available from your Practice history.
        </p>
        <Link
          href="/practice"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--primary-foreground)]"
        >
          Back to Practice
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--primary)]">
              {session.scope_type === "module" ? "Module practice" : "Course practice"}
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
              {session.module_title ?? session.course_title}
            </h1>
            {session.module_title ? (
              <p className="mt-1 text-sm text-[var(--text-muted)]">{session.course_title}</p>
            ) : null}
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-right">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Answered</p>
            <p className="mt-1 text-xl font-black text-[var(--text-primary)]">
              {answeredCount}/{session.question_count}
            </p>
          </div>
        </div>
      </section>

      {session.questions.map((question, index) => {
        const resultItem = result?.results.find(
          (item) => item.session_question_id === question.id,
        );

        return (
          <fieldset
            key={question.id}
            disabled={isPending || Boolean(result)}
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)] sm:p-6"
          >
            <legend className="px-1 text-sm font-bold leading-6 text-[var(--text-primary)] sm:text-base">
              {index + 1}. {question.prompt}
            </legend>

            <p className="mt-2 text-xs font-semibold text-[var(--text-muted)]">
              {question.module_title} · {question.lesson_title}
            </p>

            <div className="mt-4 space-y-2">
              {question.answers.map((answer, answerIndex) => {
                const selected = answers[question.id] === answer.id;
                const isCorrectAnswer = resultItem?.correct_answer_id === answer.id;
                const isSelectedWrong = Boolean(resultItem) && selected && !isCorrectAnswer;

                return (
                  <label
                    key={answer.id}
                    className={[
                      "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-6 transition",
                      resultItem && isCorrectAnswer
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                        : isSelectedWrong
                          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
                          : selected
                            ? "border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--text-primary)]"
                            : "border-[var(--border-subtle)] bg-[var(--surface-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      checked={selected}
                      onChange={() =>
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: answer.id,
                        }))
                      }
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
                    />
                    <span>
                      <span className="mr-2 font-bold text-[var(--text-primary)]">
                        {String.fromCharCode(65 + answerIndex)}.
                      </span>
                      {answer.answer_text}
                    </span>
                  </label>
                );
              })}
            </div>

            {resultItem ? (
              <div
                className={[
                  "mt-4 rounded-xl border px-4 py-3 text-sm leading-6",
                  resultItem.correct
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                    : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200",
                ].join(" ")}
              >
                <p className="font-bold">{resultItem.correct ? "Correct" : "Review this concept"}</p>
                {resultItem.explanation ? <p className="mt-1">{resultItem.explanation}</p> : null}
              </div>
            ) : null}
          </fieldset>
        );
      })}

      {result ? (
        <section className="rounded-2xl border border-[var(--primary-border)] bg-[var(--primary-soft)] p-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--primary)]">Practice complete</p>
          <p className="mt-2 text-4xl font-black text-[var(--text-primary)]">{result.score}%</p>
          <p className="mt-2 text-sm font-semibold text-[var(--text-secondary)]">
            {result.correct_count} of {result.question_count} correct
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/practice"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--primary-foreground)]"
            >
              Practice again
            </Link>
            <Link
              href="/learning"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-5 text-sm font-bold text-[var(--text-primary)]"
            >
              Return to learning
            </Link>
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleAbandon}
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-5 text-sm font-bold text-[var(--text-secondary)] disabled:opacity-50"
          >
            Abandon session
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isComplete || isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Grading..." : "Submit practice"}
          </button>
        </section>
      )}

      {message ? <p className="text-sm text-[var(--text-muted)]">{message}</p> : null}
    </div>
  );
}

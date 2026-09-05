"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createMissedQuestionsPracticeSessionAction,
  createPracticeSessionAction,
  createWeakAreaPracticeSessionAction,
} from "@/app/actions/university-practice";
import type { UniversityPracticeCatalogCourse } from "@/lib/university/practice";

const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20];

type PracticeMode = "general" | "weak_areas" | "missed_questions";

export default function PracticeLauncher({
  courses,
  weakQuestionCount,
  missedQuestionCount,
}: {
  courses: UniversityPracticeCatalogCourse[];
  weakQuestionCount: number;
  missedQuestionCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<PracticeMode>("general");
  const [scopeType, setScopeType] = useState<"course" | "module">("course");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [moduleId, setModuleId] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [message, setMessage] = useState<string | null>(null);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === courseId) ?? null,
    [courses, courseId],
  );

  const selectedModule = useMemo(
    () => selectedCourse?.modules.find((module) => module.id === moduleId) ?? null,
    [selectedCourse, moduleId],
  );

  const generalAvailableQuestions =
    scopeType === "module"
      ? selectedModule?.available_questions ?? 0
      : selectedCourse?.available_questions ?? 0;

  const availableQuestions =
    mode === "weak_areas"
      ? weakQuestionCount
      : mode === "missed_questions"
        ? missedQuestionCount
        : generalAvailableQuestions;

  function handleCourseChange(nextCourseId: string) {
    setCourseId(nextCourseId);
    setModuleId("");
    setMessage(null);
  }

  function handleScopeChange(nextScope: "course" | "module") {
    setScopeType(nextScope);
    setModuleId("");
    setMessage(null);
  }

  function handleModeChange(nextMode: PracticeMode) {
    setMode(nextMode);
    setMessage(null);
  }

  function handleStart() {
    if (availableQuestions <= 0) {
      setMessage(
        mode === "general"
          ? "No eligible questions are available for this selection."
          : mode === "weak_areas"
            ? "Complete more practice and miss at least one question before Weak Areas becomes available."
            : "There are no currently missed questions to retry.",
      );
      return;
    }

    if (mode === "general" && !courseId) {
      setMessage("Choose a course first.");
      return;
    }

    if (mode === "general" && scopeType === "module" && !moduleId) {
      setMessage("Choose a module first.");
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const count = Math.min(
        questionCount,
        Math.max(1, availableQuestions),
      );

      const response =
        mode === "weak_areas"
          ? await createWeakAreaPracticeSessionAction(count)
          : mode === "missed_questions"
            ? await createMissedQuestionsPracticeSessionAction(count)
            : await createPracticeSessionAction({
                scopeType,
                courseId,
                moduleId: scopeType === "module" ? moduleId : null,
                questionCount: count,
              });

      if (!response.success || !response.sessionId) {
        setMessage(response.message);
        return;
      }

      router.push(`/practice/${response.sessionId}`);
    });
  }

  const modeDescription =
    mode === "weak_areas"
      ? "Prioritize questions you have struggled with across your reached material."
      : mode === "missed_questions"
        ? "Retry questions whose most recent Practice result was incorrect."
        : "Build a randomized session from a reached course or module.";

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)] sm:p-6">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--primary)]">
          Build a practice session
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)]">
          Choose what you want to reinforce.
        </h2>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <ModeButton
          active={mode === "general"}
          title="General Practice"
          description="Course or module"
          onClick={() => handleModeChange("general")}
        />
        <ModeButton
          active={mode === "weak_areas"}
          title="Weak Areas"
          description={`${weakQuestionCount} question${weakQuestionCount === 1 ? "" : "s"}`}
          onClick={() => handleModeChange("weak_areas")}
        />
        <ModeButton
          active={mode === "missed_questions"}
          title="Missed Questions"
          description={`${missedQuestionCount} available`}
          onClick={() => handleModeChange("missed_questions")}
        />
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
        {modeDescription}
      </p>

      {mode === "general" ? (
        courses.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              No general practice questions available yet
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Start or complete lessons with published assessments. Reached lessons become available here automatically.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-[var(--text-primary)]">
                Scope
              </span>
              <select
                value={scopeType}
                onChange={(event) =>
                  handleScopeChange(
                    event.target.value as "course" | "module",
                  )
                }
                className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-3 text-sm text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                <option value="course">Entire reached course</option>
                <option value="module">Specific reached module</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[var(--text-primary)]">
                Course
              </span>
              <select
                value={courseId}
                onChange={(event) => handleCourseChange(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-3 text-sm text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title} ({course.available_questions} questions)
                  </option>
                ))}
              </select>
            </label>

            {scopeType === "module" ? (
              <label className="block lg:col-span-2">
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  Module
                </span>
                <select
                  value={moduleId}
                  onChange={(event) => {
                    setModuleId(event.target.value);
                    setMessage(null);
                  }}
                  className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-3 text-sm text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  <option value="">Choose a module</option>
                  {(selectedCourse?.modules ?? []).map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.title} ({module.available_questions} questions)
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        )
      ) : null}

      <div className="mt-6">
        <p className="text-sm font-bold text-[var(--text-primary)]">
          Question count
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUESTION_COUNT_OPTIONS.map((count) => {
            const disabled = count > availableQuestions;
            return (
              <button
                key={count}
                type="button"
                disabled={disabled}
                onClick={() => setQuestionCount(count)}
                className={[
                  "min-h-10 rounded-xl border px-4 text-sm font-bold transition",
                  questionCount === count
                    ? "border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary)]"
                    : "border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]",
                  disabled ? "cursor-not-allowed opacity-40" : "",
                ].join(" ")}
              >
                {count}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          {availableQuestions} eligible question
          {availableQuestions === 1 ? "" : "s"} available for this mode.
        </p>
      </div>

      {message ? (
        <p
          role="alert"
          className="mt-5 text-sm font-semibold text-red-600 dark:text-red-400"
        >
          {message}
        </p>
      ) : null}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleStart}
          disabled={
            isPending ||
            availableQuestions <= 0 ||
            (mode === "general" &&
              (courses.length === 0 ||
                (scopeType === "module" && !moduleId)))
          }
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-primary)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Building session..." : "Start practice"}
        </button>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border p-4 text-left transition",
        active
          ? "border-[var(--primary-border)] bg-[var(--primary-soft)]"
          : "border-[var(--border-default)] bg-[var(--surface-default)] hover:bg-[var(--surface-hover)]",
      ].join(" ")}
    >
      <span
        className={[
          "block text-sm font-black",
          active ? "text-[var(--primary)]" : "text-[var(--text-primary)]",
        ].join(" ")}
      >
        {title}
      </span>
      <span className="mt-1 block text-xs font-semibold text-[var(--text-muted)]">
        {description}
      </span>
    </button>
  );
}

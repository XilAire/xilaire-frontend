"use client";

import {
  useEffect,
  useState,
  useTransition,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  completeLessonAction,
  completeLessonAndContinueAction,
  startLessonAction,
} from "@/app/actions/university-progress";

type LessonProgressControlsProps = {
  courseId: string;
  courseSlug: string;
  moduleId: string;
  lessonId: string;
  lessonSlug: string;

  isCompleted?: boolean;
  hasRequiredAssessment?: boolean;
  assessmentPassed?: boolean;

  nextLessonSlug?: string | null;
};

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

function SpinnerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.25"
      />

      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function LessonProgressControls({
  courseId,
  courseSlug,
  moduleId,
  lessonId,
  lessonSlug,
  isCompleted = false,
  hasRequiredAssessment = false,
  assessmentPassed = false,
  nextLessonSlug = null,
}: LessonProgressControlsProps) {
  const router =
    useRouter();

  const [
    completed,
    setCompleted,
  ] =
    useState(
      isCompleted,
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const completionLocked =
    !completed &&
    hasRequiredAssessment &&
    !assessmentPassed;

  useEffect(
    () => {
      setCompleted(
        isCompleted,
      );
    },
    [
      isCompleted,
    ],
  );

  useEffect(
    () => {
      if (
        completed
      ) {
        return;
      }

      let cancelled =
        false;

      async function recordLessonStart() {
        try {
          await startLessonAction({
            courseId,
            courseSlug,
            moduleId,
            lessonId,
            lessonSlug,
          });
        } catch (
          error
        ) {
          if (
            cancelled
          ) {
            return;
          }

          console.error(
            "Unable to start lesson progress.",
            error,
          );
        }
      }

      void recordLessonStart();

      return () => {
        cancelled =
          true;
      };
    },
    [
      completed,
      courseId,
      courseSlug,
      moduleId,
      lessonId,
      lessonSlug,
    ],
  );

  function handleMarkComplete() {
    if (
      completed ||
      isPending ||
      completionLocked
    ) {
      return;
    }

    setErrorMessage(
      null,
    );

    startTransition(
      async () => {
        try {
          const result =
            await completeLessonAction({
              courseId,
              courseSlug,
              moduleId,
              lessonId,
              lessonSlug,
              nextLessonSlug,
            });

          if (
            !result.success
          ) {
            setErrorMessage(
              result.message ||
                "Unable to complete this lesson.",
            );

            return;
          }

          setCompleted(
            true,
          );

          router.refresh();
        } catch (
          error
        ) {
          console.error(
            "Unable to complete lesson.",
            error,
          );

          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : "Unable to complete this lesson.",
          );
        }
      },
    );
  }

  function handleCompleteAndContinue() {
    if (
      isPending
    ) {
      return;
    }

    setErrorMessage(
      null,
    );

    startTransition(
      async () => {
        try {
          await completeLessonAndContinueAction({
            courseId,
            courseSlug,
            moduleId,
            lessonId,
            lessonSlug,
            nextLessonSlug,
          });
        } catch (
          error
        ) {
          /*
           * Next.js redirect() is implemented by
           * throwing a framework-controlled redirect
           * signal. Do not replace navigation here.
           *
           * A real server error will surface normally.
           */
          const digest =
            error &&
            typeof error ===
              "object" &&
            "digest" in
              error
              ? String(
                  error.digest,
                )
              : "";

          if (
            digest.startsWith(
              "NEXT_REDIRECT",
            )
          ) {
            return;
          }

          console.error(
            "Unable to complete lesson and continue.",
            error,
          );

          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : "Unable to complete this lesson.",
          );
        }
      },
    );
  }

  return (
    <div
      className="
        rounded-2xl
        border
        border-[var(--primary-border)]
        bg-[var(--primary-soft)]
        p-5
        sm:p-6
      "
    >
      <div
        className="
          flex
          flex-col
          gap-6
        "
      >
        <div
          className="
            flex
            min-w-0
            items-start
            gap-4
            sm:gap-5
          "
        >
          <div
            className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              completed
                ? "bg-[var(--achievement-soft)] text-[var(--achievement)]"
                : "bg-[var(--primary)] text-[var(--primary-foreground)]",
            ].join(
              " ",
            )}
          >
            <CheckIcon />
          </div>

          <div
            className="
              min-w-0
              flex-1
            "
          >
            <h2
              className="
                text-base
                font-bold
                text-[var(--text-primary)]
                sm:text-lg
              "
            >
              {completed
                ? "Lesson completed"
                : completionLocked
                  ? "Knowledge check required"
                  : "Ready to complete this lesson?"}
            </h2>

            <p
              className="
                mt-1
                max-w-3xl
                text-sm
                leading-6
                text-[var(--text-secondary)]
              "
            >
              {completed
                ? "Your progress has been saved to your CASE University learner record."
                : completionLocked
                  ? "Pass the required lesson assessment above to unlock lesson completion."
                  : "Mark this lesson complete when you are finished. Your course progress will update automatically."}
            </p>

            {completionLocked ? (
              <div
                className="
                  mt-4
                  inline-flex
                  max-w-full
                  items-center
                  rounded-full
                  border
                  border-[var(--achievement-border)]
                  bg-[var(--achievement-soft)]
                  px-3
                  py-1.5
                  text-xs
                  font-bold
                  leading-5
                  text-[var(--achievement)]
                "
              >
                Pass assessment to unlock completion
              </div>
            ) : null}

            {hasRequiredAssessment &&
            assessmentPassed &&
            !completed ? (
              <div
                className="
                  mt-4
                  inline-flex
                  max-w-full
                  items-center
                  gap-1.5
                  rounded-full
                  border
                  border-emerald-200
                  bg-emerald-50
                  px-3
                  py-1.5
                  text-xs
                  font-bold
                  leading-5
                  text-emerald-700
                  dark:border-emerald-900/60
                  dark:bg-emerald-950/30
                  dark:text-emerald-200
                "
              >
                <CheckIcon />
                Knowledge check passed
              </div>
            ) : null}

            {errorMessage ? (
              <p
                role="alert"
                className="
                  mt-4
                  text-sm
                  font-semibold
                  leading-6
                  text-red-600
                  dark:text-red-400
                "
              >
                {
                  errorMessage
                }
              </p>
            ) : null}
          </div>
        </div>

        <div
          className="
            flex
            flex-col
            gap-3
            border-t
            border-[var(--primary-border)]
            pt-5
            sm:flex-row
            sm:flex-wrap
            sm:items-center
            sm:justify-end
          "
        >
          {!completed ? (
            <button
              type="button"
              onClick={
                handleMarkComplete
              }
              disabled={
                isPending ||
                completionLocked
              }
              className="
                inline-flex
                min-h-11
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-[var(--primary-border)]
                bg-[var(--surface-default)]
                px-5
                py-2.5
                text-sm
                font-bold
                text-[var(--primary)]
                shadow-[var(--shadow-xs)]
                outline-none
                transition
                hover:bg-[var(--surface-hover)]
                focus-visible:ring-2
                focus-visible:ring-[var(--focus-ring)]
                disabled:cursor-not-allowed
                disabled:opacity-60
                sm:w-auto
              "
            >
              {isPending ? (
                <SpinnerIcon />
              ) : (
                <CheckIcon />
              )}

              {isPending
                ? "Saving..."
                : completionLocked
                  ? "Assessment required"
                  : "Mark complete"}
            </button>
          ) : (
            <div
              className="
                inline-flex
                min-h-11
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-[var(--achievement-border)]
                bg-[var(--achievement-soft)]
                px-5
                py-2.5
                text-sm
                font-bold
                text-[var(--achievement)]
                sm:w-auto
              "
            >
              <CheckIcon />

              Completed
            </div>
          )}

          {nextLessonSlug ? (
            <button
              type="button"
              onClick={
                handleCompleteAndContinue
              }
              disabled={
                isPending ||
                completionLocked
              }
              className="
                inline-flex
                min-h-11
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[var(--primary)]
                px-5
                py-2.5
                text-sm
                font-bold
                text-[var(--primary-foreground)]
                shadow-[var(--shadow-primary)]
                outline-none
                transition
                hover:bg-[var(--primary-hover)]
                focus-visible:ring-2
                focus-visible:ring-[var(--focus-ring)]
                focus-visible:ring-offset-2
                focus-visible:ring-offset-[var(--primary-soft)]
                disabled:cursor-not-allowed
                disabled:opacity-60
                sm:w-auto
              "
            >
              {isPending ? (
                <SpinnerIcon />
              ) : (
                <>
                  {completed
                    ? "Next lesson"
                    : "Complete & continue"}

                  <ArrowRightIcon />
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

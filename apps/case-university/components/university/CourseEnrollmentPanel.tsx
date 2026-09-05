import Link from "next/link";

import {
  beginCourseAction,
} from "@/app/actions/university-progress";

type CourseEnrollmentPanelProps = {
  courseId: string;
  courseSlug: string;

  firstLessonSlug?: string | null;
  resumeLessonSlug?: string | null;

  isAuthenticated: boolean;
  isEnrolled: boolean;
  isCompleted: boolean;

  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
};

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

function BookOpenIcon() {
  return (
    <svg
      width="20"
      height="20"
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

function TrophyIcon() {
  return (
    <svg
      width="20"
      height="20"
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

function normalizePercent(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      value,
    ),
  );
}

export default function CourseEnrollmentPanel({
  courseId,
  courseSlug,
  firstLessonSlug = null,
  resumeLessonSlug = null,
  isAuthenticated,
  isEnrolled,
  isCompleted,
  progressPercent,
  completedLessons,
  totalLessons,
}: CourseEnrollmentPanelProps) {
  const normalizedProgress =
    normalizePercent(
      progressPercent,
    );

  const displayedProgress =
    Math.round(
      normalizedProgress,
    );

  const continueLessonSlug =
    resumeLessonSlug ??
    firstLessonSlug;

  async function beginCourse() {
    "use server";

    await beginCourseAction({
      courseId,
      courseSlug,
      firstLessonSlug,
    });
  }

  if (
    !isAuthenticated
  ) {
    return (
      <aside
        className="
          rounded-2xl
          border
          border-[var(--border-subtle)]
          bg-[var(--surface-elevated)]
          p-5
          shadow-[var(--shadow-sm)]
        "
      >
        <div
          className="
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-2xl
            bg-[var(--primary-soft)]
            text-[var(--primary)]
          "
        >
          <BookOpenIcon />
        </div>

        <h2
          className="
            mt-5
            text-lg
            font-bold
            text-[var(--text-primary)]
          "
        >
          Start learning
        </h2>

        <p
          className="
            mt-2
            text-sm
            leading-6
            text-[var(--text-secondary)]
          "
        >
          Sign in to enroll, save lesson progress, and continue where you left off.
        </p>

        <Link
          href={`/auth/signin?redirect=/courses/${courseSlug}`}
          className="
            mt-5
            inline-flex
            min-h-11
            w-full
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-[var(--primary)]
            px-4
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
          "
        >
          Sign in to begin

          <ArrowRightIcon />
        </Link>
      </aside>
    );
  }

  if (
    isCompleted
  ) {
    return (
      <aside
        className="
          rounded-2xl
          border
          border-[var(--achievement-border)]
          bg-[var(--achievement-soft)]
          p-5
          shadow-[var(--shadow-sm)]
        "
      >
        <div
          className="
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-2xl
            bg-[var(--surface-default)]
            text-[var(--achievement)]
          "
        >
          <TrophyIcon />
        </div>

        <p
          className="
            mt-5
            text-xs
            font-extrabold
            uppercase
            tracking-[0.14em]
            text-[var(--achievement)]
          "
        >
          Course completed
        </p>

        <h2
          className="
            mt-1
            text-lg
            font-bold
            text-[var(--text-primary)]
          "
        >
          You completed this course
        </h2>

        <p
          className="
            mt-2
            text-sm
            leading-6
            text-[var(--text-secondary)]
          "
        >
          All {totalLessons} lessons have been completed and your progress has been saved.
        </p>

        <div
          className="
            mt-5
            flex
            items-center
            gap-2
            rounded-xl
            border
            border-[var(--achievement-border)]
            bg-[var(--surface-default)]
            px-4
            py-3
            text-sm
            font-bold
            text-[var(--achievement)]
          "
        >
          <CheckIcon />

          100% complete
        </div>

        {firstLessonSlug ? (
          <Link
            href={`/courses/${courseSlug}/lessons/${firstLessonSlug}`}
            className="
              mt-3
              inline-flex
              min-h-11
              w-full
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
              font-bold
              text-[var(--text-primary)]
              outline-none
              transition
              hover:border-[var(--border-strong)]
              hover:bg-[var(--surface-hover)]
              focus-visible:ring-2
              focus-visible:ring-[var(--focus-ring)]
            "
          >
            Review course

            <ArrowRightIcon />
          </Link>
        ) : null}
      </aside>
    );
  }

  if (
    isEnrolled
  ) {
    return (
      <aside
        className="
          rounded-2xl
          border
          border-[var(--primary-border)]
          bg-[var(--surface-elevated)]
          p-5
          shadow-[var(--shadow-sm)]
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            gap-4
          "
        >
          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-2xl
              bg-[var(--primary-soft)]
              text-[var(--primary)]
            "
          >
            <BookOpenIcon />
          </div>

          <span
            className="
              rounded-full
              border
              border-[var(--primary-border)]
              bg-[var(--primary-soft)]
              px-3
              py-1
              text-xs
              font-extrabold
              text-[var(--primary)]
            "
          >
            {displayedProgress}%
          </span>
        </div>

        <h2
          className="
            mt-5
            text-lg
            font-bold
            text-[var(--text-primary)]
          "
        >
          Continue learning
        </h2>

        <p
          className="
            mt-2
            text-sm
            leading-6
            text-[var(--text-secondary)]
          "
        >
          {completedLessons} of {totalLessons} lessons completed.
        </p>

        <div
          className="
            mt-5
            h-2.5
            overflow-hidden
            rounded-full
            bg-[var(--border-subtle)]
          "
          aria-label={`${displayedProgress}% course progress`}
        >
          <div
            className="
              h-full
              rounded-full
              bg-[var(--primary)]
              transition-[width]
              duration-300
            "
            style={{
              width:
                `${normalizedProgress}%`,
            }}
          />
        </div>

        {continueLessonSlug ? (
          <Link
            href={`/courses/${courseSlug}/lessons/${continueLessonSlug}`}
            className="
              mt-5
              inline-flex
              min-h-11
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-[var(--primary)]
              px-4
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
            "
          >
            Continue course

            <ArrowRightIcon />
          </Link>
        ) : null}

        <div
          className="
            mt-5
            border-t
            border-[var(--border-subtle)]
            pt-4
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-4
              text-xs
              font-semibold
              text-[var(--text-muted)]
            "
          >
            <span>
              Completed
            </span>

            <span>
              {completedLessons}/{totalLessons}
            </span>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="
        rounded-2xl
        border
        border-[var(--border-subtle)]
        bg-[var(--surface-elevated)]
        p-5
        shadow-[var(--shadow-sm)]
      "
    >
      <div
        className="
          flex
          h-12
          w-12
          items-center
          justify-center
          rounded-2xl
          bg-[var(--primary)]
          text-[var(--primary-foreground)]
          shadow-[var(--shadow-primary)]
        "
      >
        <BookOpenIcon />
      </div>

      <h2
        className="
          mt-5
          text-lg
          font-bold
          text-[var(--text-primary)]
        "
      >
        Start this course
      </h2>

      <p
        className="
          mt-2
          text-sm
          leading-6
          text-[var(--text-secondary)]
        "
      >
        Enroll in this course and CASE University will save your progress as you complete each lesson.
      </p>

      {firstLessonSlug ? (
        <form
          action={
            beginCourse
          }
        >
          <button
            type="submit"
            className="
              mt-5
              inline-flex
              min-h-11
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-[var(--primary)]
              px-4
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
              focus-visible:ring-offset-[var(--surface-elevated)]
            "
          >
            Begin course

            <ArrowRightIcon />
          </button>
        </form>
      ) : (
        <div
          className="
            mt-5
            rounded-xl
            border
            border-dashed
            border-[var(--border-default)]
            bg-[var(--surface-muted)]
            px-4
            py-3
            text-center
            text-sm
            font-semibold
            text-[var(--text-muted)]
          "
        >
          Lessons coming soon
        </div>
      )}

      <div
        className="
          mt-5
          border-t
          border-[var(--border-subtle)]
          pt-4
        "
      >
        <p
          className="
            text-xs
            font-extrabold
            uppercase
            tracking-[0.12em]
            text-[var(--text-muted)]
          "
        >
          Progress tracking
        </p>

        <p
          className="
            mt-2
            text-sm
            leading-6
            text-[var(--text-secondary)]
          "
        >
          Lesson completions and course progress are saved to your learner account.
        </p>
      </div>
    </aside>
  );
}
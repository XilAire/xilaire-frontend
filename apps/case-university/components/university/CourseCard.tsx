import Link from "next/link";

import type {
  UniversityCourse,
  UniversityCourseSummary,
} from "@/types/university";

type CourseCardCourse =
  | UniversityCourse
  | UniversityCourseSummary;

type CourseCardProps = {
  course: CourseCardCourse;
  href?: string;
  showCounts?: boolean;
};

function formatDifficulty(
  difficulty: UniversityCourse["difficulty"],
) {
  switch (difficulty) {
    case "beginner":
      return "Beginner";

    case "intermediate":
      return "Intermediate";

    case "advanced":
      return "Advanced";

    default:
      return difficulty;
  }
}

function formatDuration(
  minutes: number | null,
) {
  if (
    !minutes ||
    minutes <= 0
  ) {
    return null;
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  const remainingMinutes =
    minutes % 60;

  if (
    hours === 0
  ) {
    return `${remainingMinutes} min`;
  }

  if (
    remainingMinutes === 0
  ) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

function hasCourseCounts(
  course: CourseCardCourse,
): course is UniversityCourseSummary {
  return (
    "module_count" in course &&
    "lesson_count" in course
  );
}

function getDifficultyStyles(
  difficulty: UniversityCourse["difficulty"],
) {
  switch (difficulty) {
    case "beginner":
      return {
        color:
          "var(--difficulty-beginner)",

        background:
          "var(--difficulty-beginner-soft)",
      };

    case "intermediate":
      return {
        color:
          "var(--difficulty-intermediate)",

        background:
          "var(--difficulty-intermediate-soft)",
      };

    case "advanced":
      return {
        color:
          "var(--difficulty-advanced)",

        background:
          "var(--difficulty-advanced-soft)",
      };

    default:
      return {
        color:
          "var(--text-secondary)",

        background:
          "var(--surface-muted)",
      };
  }
}

function CourseArrowIcon() {
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

function BookIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

function LessonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 11l3 3L22 4" />

      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 2.8 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9L6.4 20l1.1-6.2L3 9.4l6.2-.9L12 2.8Z" />
    </svg>
  );
}

export default function CourseCard({
  course,
  href,
  showCounts = true,
}: CourseCardProps) {
  const courseHref =
    href ??
    `/courses/${course.slug}`;

  const duration =
    formatDuration(
      course.estimated_minutes,
    );

  const description =
    course.short_description ??
    course.description ??
    "Explore this CASE University course.";

  const difficultyStyles =
    getDifficultyStyles(
      course.difficulty,
    );

  return (
    <Link
      href={
        courseHref
      }
      className="
        group
        block
        h-full
        rounded-[var(--radius-xl)]
        focus:outline-none
        focus-visible:ring-2
        focus-visible:ring-[var(--focus-ring)]
        focus-visible:ring-offset-2
        focus-visible:ring-offset-[var(--background)]
      "
    >
      <article
        className="
          relative
          flex
          h-full
          min-h-[300px]
          flex-col
          overflow-hidden
          rounded-[var(--radius-xl)]
          border
          border-[var(--border-subtle)]
          bg-[var(--surface-default)]
          shadow-[var(--shadow-sm)]
          transition
          duration-200
          group-hover:-translate-y-1
          group-hover:border-[var(--primary-border)]
          group-hover:shadow-[var(--shadow-md)]
        "
      >
        <div
          className="
            h-1
            w-full
            bg-[var(--primary)]
            transition-all
            duration-200
            group-hover:h-1.5
          "
          aria-hidden="true"
        />

        <div
          className="
            flex
            flex-1
            flex-col
            p-5
            sm:p-6
          "
        >
          <div
            className="
              flex
              flex-wrap
              items-center
              gap-2
            "
          >
            <span
              className="
                inline-flex
                items-center
                rounded-full
                px-2.5
                py-1
                text-xs
                font-bold
              "
              style={
                difficultyStyles
              }
            >
              {formatDifficulty(
                course.difficulty,
              )}
            </span>

            {duration ? (
              <span
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-full
                  border
                  border-[var(--border-subtle)]
                  bg-[var(--surface-muted)]
                  px-2.5
                  py-1
                  text-xs
                  font-semibold
                  text-[var(--text-muted)]
                "
              >
                <ClockIcon />

                {duration}
              </span>
            ) : null}

            {course.is_featured ? (
              <span
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-full
                  border
                  border-[var(--achievement-border)]
                  bg-[var(--achievement-soft)]
                  px-2.5
                  py-1
                  text-xs
                  font-bold
                  text-[var(--achievement)]
                "
              >
                <StarIcon />

                Featured
              </span>
            ) : null}
          </div>

          <div className="mt-5">
            <h2
              className="
                text-xl
                font-bold
                tracking-tight
                text-[var(--text-primary)]
                transition-colors
                group-hover:text-[var(--primary)]
                sm:text-2xl
              "
            >
              {course.title}
            </h2>

            <p
              className="
                mt-3
                line-clamp-3
                text-sm
                leading-6
                text-[var(--text-secondary)]
                sm:text-base
              "
            >
              {description}
            </p>
          </div>

          <div
            className="
              mt-auto
              pt-6
            "
          >
            {showCounts &&
            hasCourseCounts(
              course,
            ) ? (
              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-x-5
                  gap-y-3
                  border-t
                  border-[var(--border-subtle)]
                  pt-4
                  text-sm
                  font-medium
                  text-[var(--text-muted)]
                "
              >
                <span
                  className="
                    inline-flex
                    items-center
                    gap-2
                  "
                >
                  <span
                    className="
                      text-[var(--primary)]
                    "
                  >
                    <BookIcon />
                  </span>

                  <span>
                    {
                      course.module_count
                    }{" "}
                    {course.module_count ===
                    1
                      ? "module"
                      : "modules"}
                  </span>
                </span>

                <span
                  className="
                    inline-flex
                    items-center
                    gap-2
                  "
                >
                  <span
                    className="
                      text-[var(--primary)]
                    "
                  >
                    <LessonIcon />
                  </span>

                  <span>
                    {
                      course.lesson_count
                    }{" "}
                    {course.lesson_count ===
                    1
                      ? "lesson"
                      : "lessons"}
                  </span>
                </span>
              </div>
            ) : null}

            <div
              className="
                mt-5
                flex
                items-center
                justify-between
                gap-4
              "
            >
              <span
                className="
                  text-sm
                  font-bold
                  text-[var(--primary)]
                "
              >
                View course
              </span>

              <span
                aria-hidden="true"
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-[var(--primary-soft)]
                  text-[var(--primary)]
                  transition
                  duration-200
                  group-hover:translate-x-1
                  group-hover:bg-[var(--primary)]
                  group-hover:text-[var(--primary-foreground)]
                "
              >
                <CourseArrowIcon />
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
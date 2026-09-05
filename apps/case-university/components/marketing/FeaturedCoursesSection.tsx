import Link from "next/link";

import {
  getUniversityCourseSummaries,
} from "@/lib/university/courses";

import type {
  UniversityCourseSummary,
} from "@/types/university";

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

function ClockIcon() {
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
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ModuleIcon() {
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
      <rect
        x="4"
        y="4"
        width="6"
        height="6"
        rx="1"
      />

      <rect
        x="14"
        y="4"
        width="6"
        height="6"
        rx="1"
      />

      <rect
        x="4"
        y="14"
        width="6"
        height="6"
        rx="1"
      />

      <rect
        x="14"
        y="14"
        width="6"
        height="6"
        rx="1"
      />
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
      <path d="M6 4h12" />
      <path d="M6 9h12" />
      <path d="M6 14h8" />
      <path d="M6 19h6" />
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
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
    </svg>
  );
}

function formatDifficulty(
  difficulty: UniversityCourseSummary["difficulty"],
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
    return "Self-paced";
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  const remainingMinutes =
    minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (
    remainingMinutes === 0
  ) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

function CourseCard({
  course,
}: {
  course: UniversityCourseSummary;
}) {
  const description =
    course.short_description ??
    course.description ??
    "Explore this CASE University course.";

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="
        group
        block
        h-full
        rounded-3xl
        outline-none
        focus-visible:ring-2
        focus-visible:ring-[var(--focus-ring)]
      "
    >
      <article
        className="
          relative
          flex
          h-full
          min-h-[390px]
          flex-col
          overflow-hidden
          rounded-3xl
          border
          border-[var(--border-default)]
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
          aria-hidden="true"
          className="
            absolute
            inset-x-0
            top-0
            h-1.5
            bg-[var(--primary)]
          "
        />

        <div
          aria-hidden="true"
          className="
            absolute
            -right-14
            -top-14
            h-40
            w-40
            rounded-full
            bg-[var(--primary-soft)]
            opacity-70
            transition-transform
            duration-300
            group-hover:scale-110
          "
        />

        <div
          className="
            relative
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
                rounded-full
                border
                border-[var(--primary-border)]
                bg-[var(--primary-soft)]
                px-3
                py-1
                text-[10px]
                font-extrabold
                uppercase
                tracking-[0.12em]
                text-[var(--primary)]
              "
            >
              {formatDifficulty(
                course.difficulty,
              )}
            </span>

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
                  px-3
                  py-1
                  text-[10px]
                  font-extrabold
                  uppercase
                  tracking-[0.12em]
                  text-[var(--achievement)]
                "
              >
                <StarIcon />

                Featured
              </span>
            ) : null}
          </div>

          <div className="mt-6">
            <h3
              className="
                text-2xl
                font-black
                tracking-tight
                text-[var(--text-primary)]
                transition
                group-hover:text-[var(--primary)]
              "
            >
              {course.title}
            </h3>

            <p
              className="
                mt-3
                line-clamp-4
                text-sm
                leading-6
                text-[var(--text-secondary)]
              "
            >
              {description}
            </p>
          </div>

          <div
            className="
              mt-6
              grid
              grid-cols-3
              gap-2
            "
          >
            <div
              className="
                rounded-xl
                bg-[var(--surface-muted)]
                px-2
                py-3
                text-center
              "
            >
              <span
                className="
                  flex
                  justify-center
                  text-[var(--primary)]
                "
              >
                <ClockIcon />
              </span>

              <p
                className="
                  mt-1.5
                  text-xs
                  font-bold
                  text-[var(--text-primary)]
                "
              >
                {formatDuration(
                  course.estimated_minutes,
                )}
              </p>
            </div>

            <div
              className="
                rounded-xl
                bg-[var(--surface-muted)]
                px-2
                py-3
                text-center
              "
            >
              <span
                className="
                  flex
                  justify-center
                  text-[var(--primary)]
                "
              >
                <ModuleIcon />
              </span>

              <p
                className="
                  mt-1.5
                  text-xs
                  font-bold
                  text-[var(--text-primary)]
                "
              >
                {course.module_count}{" "}
                {course.module_count === 1
                  ? "module"
                  : "modules"}
              </p>
            </div>

            <div
              className="
                rounded-xl
                bg-[var(--surface-muted)]
                px-2
                py-3
                text-center
              "
            >
              <span
                className="
                  flex
                  justify-center
                  text-[var(--primary)]
                "
              >
                <LessonIcon />
              </span>

              <p
                className="
                  mt-1.5
                  text-xs
                  font-bold
                  text-[var(--text-primary)]
                "
              >
                {course.lesson_count}{" "}
                {course.lesson_count === 1
                  ? "lesson"
                  : "lessons"}
              </p>
            </div>
          </div>

          <div
            className="
              mt-auto
              pt-7
            "
          >
            <div
              className="
                flex
                min-h-11
                items-center
                justify-between
                gap-4
                border-t
                border-[var(--border-subtle)]
                pt-5
              "
            >
              <span
                className="
                  text-sm
                  font-bold
                  text-[var(--primary)]
                "
              >
                Explore course
              </span>

              <span
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-xl
                  bg-[var(--primary-soft)]
                  text-[var(--primary)]
                  transition
                  group-hover:translate-x-1
                  group-hover:bg-[var(--primary)]
                  group-hover:text-[var(--primary-foreground)]
                "
              >
                <ArrowRightIcon />
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default async function FeaturedCoursesSection() {
  const courses =
    await getUniversityCourseSummaries();

  const featuredCourses =
    courses
      .filter(
        (course) =>
          course.is_featured,
      )
      .slice(0, 3);

  const displayCourses =
    featuredCourses.length > 0
      ? featuredCourses
      : courses.slice(0, 3);

  return (
    <section
      className="
        border-y
        border-[var(--border-subtle)]
        bg-[var(--background)]
        py-16
        sm:py-20
        lg:py-24
      "
    >
      <div
        className="
          mx-auto
          w-full
          max-w-[1600px]
          px-4
          sm:px-6
          lg:px-8
        "
      >
        <div
          className="
            flex
            flex-col
            gap-6
            lg:flex-row
            lg:items-end
            lg:justify-between
          "
        >
          <div
            className="
              max-w-3xl
            "
          >
            <p
              className="
                text-xs
                font-extrabold
                uppercase
                tracking-[0.18em]
                text-[var(--primary)]
              "
            >
              Featured Courses
            </p>

            <h2
              className="
                mt-3
                text-3xl
                font-black
                tracking-[-0.03em]
                text-[var(--text-primary)]
                sm:text-4xl
                lg:text-5xl
              "
            >
              Build skills that stack.
            </h2>

            <p
              className="
                mt-5
                max-w-2xl
                text-base
                leading-7
                text-[var(--text-secondary)]
                sm:text-lg
                sm:leading-8
              "
            >
              Each CASE University course builds on the knowledge
              from the stage before it, creating a structured
              progression from understanding investments to
              analyzing markets and managing advanced strategies.
            </p>
          </div>

          <Link
            href="/courses"
            className="
              inline-flex
              min-h-11
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
              font-bold
              text-[var(--text-primary)]
              outline-none
              transition
              hover:bg-[var(--surface-hover)]
              focus-visible:ring-2
              focus-visible:ring-[var(--focus-ring)]
            "
          >
            View All Courses

            <ArrowRightIcon />
          </Link>
        </div>

        {displayCourses.length > 0 ? (
          <div
            className="
              mt-10
              grid
              grid-cols-1
              gap-5
              md:grid-cols-2
              xl:grid-cols-3
              xl:gap-6
            "
          >
            {displayCourses.map(
              (course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                />
              ),
            )}
          </div>
        ) : (
          <div
            className="
              mt-10
              rounded-3xl
              border
              border-dashed
              border-[var(--border-default)]
              bg-[var(--surface-muted)]
              px-5
              py-12
              text-center
              sm:px-8
              sm:py-16
            "
          >
            <div
              className="
                mx-auto
                max-w-lg
              "
            >
              <h3
                className="
                  text-xl
                  font-black
                  tracking-tight
                  text-[var(--text-primary)]
                "
              >
                Courses are being prepared.
              </h3>

              <p
                className="
                  mt-2
                  text-sm
                  leading-6
                  text-[var(--text-secondary)]
                  sm:text-base
                "
              >
                CASE University courses will appear here as they
                become available.
              </p>
            </div>
          </div>
        )}

        <div
          className="
            mt-10
            flex
            flex-col
            items-center
            justify-between
            gap-5
            rounded-2xl
            border
            border-[var(--primary-border)]
            bg-[var(--primary-soft)]
            px-5
            py-5
            sm:flex-row
            sm:px-6
          "
        >
          <div>
            <p
              className="
                text-sm
                font-black
                text-[var(--text-primary)]
              "
            >
              Not sure where to begin?
            </p>

            <p
              className="
                mt-1
                text-sm
                leading-6
                text-[var(--text-secondary)]
              "
            >
              Start with Investing Foundations and build your way
              through the complete CASE University learning path.
            </p>
          </div>

          <Link
            href="/courses/investing-foundations"
            className="
              inline-flex
              min-h-11
              shrink-0
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
            Start With Foundations

            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}
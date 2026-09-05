import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUniversityCourseSummaries } from "@/lib/university/courses";
import { getCurrentUserCourseProgressSummary } from "@/lib/university/progress";

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

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

function normalizeProgress(
  value:
    | number
    | string
    | null
    | undefined,
) {
  const numericValue =
    Number(
      value ?? 0,
    );

  if (
    !Number.isFinite(
      numericValue,
    )
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      numericValue,
    ),
  );
}

export default async function MyLearningPage() {
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
      "/auth/signin?redirect=/learning",
    );
  }

  const courses =
    await getUniversityCourseSummaries();

  const courseProgressResults =
    await Promise.all(
      courses.map(
        async (
          course,
        ) => {
          const progress =
            await getCurrentUserCourseProgressSummary(
              course.id,
            );

          if (
            !progress.enrollment
          ) {
            return null;
          }

          const progressPercent =
            normalizeProgress(
              progress.progress_percent ??
                progress.enrollment.progress_percent,
            );

          return {
            course,
            progress,
            progressPercent,
            completed:
              progress.enrollment.status ===
                "completed" ||
              progressPercent >=
                100,
          };
        },
      ),
    );

  const enrolledCourses =
    courseProgressResults.filter(
      (
        item,
      ): item is NonNullable<
        typeof item
      > =>
        item !== null,
    );

  const activeCourses =
    enrolledCourses.filter(
      (item) =>
        !item.completed,
    );

  const completedCourses =
    enrolledCourses.filter(
      (item) =>
        item.completed,
    );

  const averageProgress =
    activeCourses.length >
    0
      ? Math.round(
          activeCourses.reduce(
            (
              total,
              item,
            ) =>
              total +
              item.progressPercent,
            0,
          ) /
            activeCourses.length,
        )
      : 0;

  return (
    <div
      className="
        mx-auto
        w-full
        max-w-[1600px]
        px-4
        py-6
        sm:px-6
        sm:py-8
        lg:px-8
        lg:py-10
      "
    >
      <header
        className="
          flex
          flex-col
          gap-5
          lg:flex-row
          lg:items-end
          lg:justify-between
        "
      >
        <div>
          <p
            className="
              text-xs
              font-extrabold
              uppercase
              tracking-[0.18em]
              text-[var(--primary)]
            "
          >
            CASE University
          </p>

          <h1
            className="
              mt-2
              text-2xl
              font-bold
              tracking-tight
              text-[var(--text-primary)]
              sm:text-3xl
            "
          >
            My Learning
          </h1>

          <p
            className="
              mt-2
              max-w-2xl
              text-sm
              leading-6
              text-[var(--text-secondary)]
              sm:text-base
            "
          >
            Continue your active courses and track everything you have completed.
          </p>
        </div>

        <Link
          href="/courses"
          className="
            inline-flex
            min-h-11
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
          "
        >
          Browse courses

          <ArrowRightIcon />
        </Link>
      </header>

      <section
        className="
          mt-8
          grid
          gap-4
          sm:grid-cols-3
        "
      >
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
          <div
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-xl
              bg-[var(--primary-soft)]
              text-[var(--primary)]
            "
          >
            <BookOpenIcon />
          </div>

          <p
            className="
              mt-4
              text-2xl
              font-bold
              text-[var(--text-primary)]
            "
          >
            {activeCourses.length}
          </p>

          <p
            className="
              mt-1
              text-sm
              font-semibold
              text-[var(--text-secondary)]
            "
          >
            Active courses
          </p>
        </div>

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
          <div
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-xl
              bg-[var(--primary-soft)]
              text-[var(--primary)]
            "
          >
            <ClockIcon />
          </div>

          <p
            className="
              mt-4
              text-2xl
              font-bold
              text-[var(--text-primary)]
            "
          >
            {averageProgress}%
          </p>

          <p
            className="
              mt-1
              text-sm
              font-semibold
              text-[var(--text-secondary)]
            "
          >
            Average progress
          </p>
        </div>

        <div
          className="
            rounded-2xl
            border
            border-[var(--achievement-border)]
            bg-[var(--achievement-soft)]
            p-5
            shadow-[var(--shadow-xs)]
          "
        >
          <div
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-xl
              bg-[var(--surface-default)]
              text-[var(--achievement)]
            "
          >
            <TrophyIcon />
          </div>

          <p
            className="
              mt-4
              text-2xl
              font-bold
              text-[var(--text-primary)]
            "
          >
            {
              completedCourses.length
            }
          </p>

          <p
            className="
              mt-1
              text-sm
              font-semibold
              text-[var(--text-secondary)]
            "
          >
            Courses completed
          </p>
        </div>
      </section>

      <section
        className="
          mt-10
        "
      >
        <div>
          <p
            className="
              text-xs
              font-extrabold
              uppercase
              tracking-[0.18em]
              text-[var(--primary)]
            "
          >
            Continue
          </p>

          <h2
            className="
              mt-2
              text-xl
              font-bold
              tracking-tight
              text-[var(--text-primary)]
              sm:text-2xl
            "
          >
            In progress
          </h2>
        </div>

        {activeCourses.length >
        0 ? (
          <div
            className="
              mt-5
              grid
              gap-5
              lg:grid-cols-2
            "
          >
            {activeCourses.map(
              ({
                course,
                progress,
                progressPercent,
              }) => {
                const completedLessons =
                  progress.completed_lessons;

                const totalLessons =
                  progress.total_lessons;

                return (
                  <article
                    key={
                      course.id
                    }
                    className="
                      rounded-2xl
                      border
                      border-[var(--border-subtle)]
                      bg-[var(--surface-default)]
                      p-5
                      shadow-[var(--shadow-xs)]
                      sm:p-6
                    "
                  >
                    <div
                      className="
                        flex
                        items-start
                        justify-between
                        gap-4
                      "
                    >
                      <div
                        className="
                          min-w-0
                        "
                      >
                        <p
                          className="
                            text-xs
                            font-extrabold
                            uppercase
                            tracking-[0.14em]
                            text-[var(--primary)]
                          "
                        >
                          In progress
                        </p>

                        <h3
                          className="
                            mt-2
                            text-lg
                            font-bold
                            text-[var(--text-primary)]
                            sm:text-xl
                          "
                        >
                          {
                            course.title
                          }
                        </h3>

                        {course.short_description ? (
                          <p
                            className="
                              mt-2
                              line-clamp-2
                              text-sm
                              leading-6
                              text-[var(--text-secondary)]
                            "
                          >
                            {
                              course.short_description
                            }
                          </p>
                        ) : null}
                      </div>

                      <span
                        className="
                          shrink-0
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
                        {Math.round(
                          progressPercent,
                        )}
                        %
                      </span>
                    </div>

                    <div
                      className="
                        mt-5
                        h-2.5
                        overflow-hidden
                        rounded-full
                        bg-[var(--border-subtle)]
                      "
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
                            `${progressPercent}%`,
                        }}
                      />
                    </div>

                    <div
                      className="
                        mt-3
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
                        {
                          completedLessons
                        }{" "}
                        of{" "}
                        {
                          totalLessons
                        }{" "}
                        lessons complete
                      </span>

                      <span>
                        {formatDuration(
                          course.estimated_minutes,
                        )}
                      </span>
                    </div>

                    <Link
                      href={`/courses/${course.slug}`}
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
                  </article>
                );
              },
            )}
          </div>
        ) : (
          <div
            className="
              mt-5
              rounded-2xl
              border
              border-dashed
              border-[var(--border-default)]
              bg-[var(--surface-muted)]
              px-6
              py-12
              text-center
            "
          >
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
              <BookOpenIcon />
            </div>

            <h3
              className="
                mt-4
                text-lg
                font-bold
                text-[var(--text-primary)]
              "
            >
              No active courses yet
            </h3>

            <p
              className="
                mx-auto
                mt-2
                max-w-md
                text-sm
                leading-6
                text-[var(--text-secondary)]
              "
            >
              Choose a course and begin learning. Your progress will appear here automatically.
            </p>

            <Link
              href="/courses"
              className="
                mt-5
                inline-flex
                min-h-11
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
              "
            >
              Browse courses

              <ArrowRightIcon />
            </Link>
          </div>
        )}
      </section>

      <section
        className="
          mt-10
        "
      >
        <div>
          <p
            className="
              text-xs
              font-extrabold
              uppercase
              tracking-[0.18em]
              text-[var(--achievement)]
            "
          >
            Achievements
          </p>

          <h2
            className="
              mt-2
              text-xl
              font-bold
              tracking-tight
              text-[var(--text-primary)]
              sm:text-2xl
            "
          >
            Completed courses
          </h2>
        </div>

        {completedCourses.length >
        0 ? (
          <div
            className="
              mt-5
              grid
              gap-5
              lg:grid-cols-2
            "
          >
            {completedCourses.map(
              ({
                course,
              }) => (
                <article
                  key={
                    course.id
                  }
                  className="
                    rounded-2xl
                    border
                    border-[var(--achievement-border)]
                    bg-[var(--achievement-soft)]
                    p-5
                    shadow-[var(--shadow-xs)]
                    sm:p-6
                  "
                >
                  <div
                    className="
                      flex
                      items-start
                      gap-4
                    "
                  >
                    <div
                      className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-[var(--surface-default)]
                        text-[var(--achievement)]
                      "
                    >
                      <CheckIcon />
                    </div>

                    <div
                      className="
                        min-w-0
                        flex-1
                      "
                    >
                      <p
                        className="
                          text-xs
                          font-extrabold
                          uppercase
                          tracking-[0.14em]
                          text-[var(--achievement)]
                        "
                      >
                        Completed
                      </p>

                      <h3
                        className="
                          mt-1
                          text-lg
                          font-bold
                          text-[var(--text-primary)]
                        "
                      >
                        {
                          course.title
                        }
                      </h3>
                    </div>
                  </div>

                  <Link
                    href={`/courses/${course.slug}`}
                    className="
                      mt-5
                      inline-flex
                      min-h-11
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-[var(--achievement-border)]
                      bg-[var(--surface-default)]
                      px-4
                      py-2.5
                      text-sm
                      font-bold
                      text-[var(--achievement)]
                      outline-none
                      transition
                      hover:bg-[var(--surface-hover)]
                      focus-visible:ring-2
                      focus-visible:ring-[var(--focus-ring)]
                    "
                  >
                    Review course

                    <ArrowRightIcon />
                  </Link>
                </article>
              ),
            )}
          </div>
        ) : (
          <div
            className="
              mt-5
              rounded-2xl
              border
              border-dashed
              border-[var(--border-default)]
              bg-[var(--surface-muted)]
              px-6
              py-10
              text-center
            "
          >
            <p
              className="
                text-sm
                font-semibold
                text-[var(--text-secondary)]
              "
            >
              Completed courses will appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
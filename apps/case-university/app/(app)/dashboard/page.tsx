import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUniversityCourseSummaries } from "@/lib/university/courses";

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

function BookIcon() {
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
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

function LessonsIcon() {
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
      <path d="M9 11 12 14 20 6" />
      <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

function ClockIcon() {
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
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
      <path d="M6 6H4v1a4 4 0 0 0 4 4" />
      <path d="M18 6h2v1a4 4 0 0 1-4 4" />
      <path d="M12 12v4" />
      <path d="M9 20h6" />
      <path d="M10 16h4" />
    </svg>
  );
}

function GraduationCapIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 10 9-5 9 5-9 5-9-5Z" />
      <path d="M7 12.5V16c0 1.8 2.2 3 5 3s5-1.2 5-3v-3.5" />
      <path d="M21 10v6" />
    </svg>
  );
}

function SparklesIcon() {
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
      <path d="m12 3 1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3-3.3-1.2 3.3-1.2L12 3Z" />
      <path d="m18 13 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13Z" />
      <path d="m6 14 .7 1.8 1.8.7-1.8.7L6 19l-.7-1.8-1.8-.7 1.8-.7L6 14Z" />
    </svg>
  );
}

function formatMinutes(minutes: number) {
  if (minutes <= 0) {
    return "0 min";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

function getFirstName(
  email: string | undefined,
) {
  if (!email) {
    return "Student";
  }

  const localPart =
    email.split("@")[0] ??
    "";

  if (!localPart) {
    return "Student";
  }

  const cleaned =
    localPart
      .replace(/[._-]+/g, " ")
      .trim();

  if (!cleaned) {
    return "Student";
  }

  return cleaned
    .split(" ")[0]
    .replace(
      /^./,
      (character) =>
        character.toUpperCase(),
    );
}

export default async function DashboardPage() {
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
      "/auth/signin?redirect=/dashboard",
    );
  }

  const courses =
    await getUniversityCourseSummaries();

  const totalCourses =
    courses.length;

  const totalLessons =
    courses.reduce(
      (
        total,
        course,
      ) =>
        total +
        course.lesson_count,
      0,
    );

  const totalModules =
    courses.reduce(
      (
        total,
        course,
      ) =>
        total +
        course.module_count,
      0,
    );

  const totalMinutes =
    courses.reduce(
      (
        total,
        course,
      ) =>
        total +
        (
          course.estimated_minutes ??
          0
        ),
      0,
    );

  const featuredCourses =
    courses
      .filter(
        (
          course,
        ) =>
          course.is_featured,
      )
      .slice(
        0,
        3,
      );

  const displayedCourses =
    featuredCourses.length > 0
      ? featuredCourses
      : courses.slice(
          0,
          3,
        );

  const firstName =
    getFirstName(
      user.email,
    );

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
      <section
        className="
          overflow-hidden
          rounded-[var(--radius-xl)]
          border
          border-[var(--primary-border)]
          bg-[var(--surface-default)]
          shadow-[var(--shadow-sm)]
        "
      >
        <div
          className="
            relative
            overflow-hidden
            px-5
            py-7
            sm:px-7
            sm:py-9
            lg:px-9
            lg:py-10
          "
        >
          <div
            className="
              pointer-events-none
              absolute
              -right-24
              -top-24
              h-72
              w-72
              rounded-full
              bg-[var(--primary-soft)]
              blur-3xl
            "
            aria-hidden="true"
          />

          <div
            className="
              pointer-events-none
              absolute
              -bottom-32
              right-20
              h-64
              w-64
              rounded-full
              bg-[var(--achievement-soft)]
              blur-3xl
            "
            aria-hidden="true"
          />

          <div
            className="
              relative
              z-10
              flex
              flex-col
              gap-7
              xl:flex-row
              xl:items-center
              xl:justify-between
            "
          >
            <div
              className="
                max-w-3xl
              "
            >
              <div
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-[var(--primary-border)]
                  bg-[var(--primary-soft)]
                  px-3
                  py-1.5
                  text-xs
                  font-extrabold
                  uppercase
                  tracking-[0.14em]
                  text-[var(--primary)]
                "
              >
                <SparklesIcon />
                Learning Dashboard
              </div>

              <h1
                className="
                  mt-5
                  text-3xl
                  font-bold
                  tracking-tight
                  text-[var(--text-primary)]
                  sm:text-4xl
                  lg:text-5xl
                "
              >
                Welcome back, {firstName}.
              </h1>

              <p
                className="
                  mt-4
                  max-w-2xl
                  text-sm
                  leading-6
                  text-[var(--text-secondary)]
                  sm:text-base
                  sm:leading-7
                "
              >
                Build your market knowledge from investing fundamentals through technical analysis and options trading.
              </p>

              <div
                className="
                  mt-6
                  flex
                  flex-col
                  gap-3
                  sm:flex-row
                "
              >
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
                    focus-visible:ring-offset-2
                    focus-visible:ring-offset-[var(--surface-default)]
                  "
                >
                  Browse courses
                  <ArrowRightIcon />
                </Link>

                <div
                  className="
                    inline-flex
                    min-h-11
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-[var(--border-default)]
                    bg-[var(--surface-muted)]
                    px-5
                    py-2.5
                    text-sm
                    font-semibold
                    text-[var(--text-secondary)]
                  "
                >
                  Progress tracking coming next
                </div>
              </div>
            </div>

            <div
              className="
                flex
                min-w-[220px]
                items-center
                gap-4
                rounded-2xl
                border
                border-[var(--achievement-border)]
                bg-[var(--achievement-soft)]
                p-5
              "
            >
              <div
                className="
                  flex
                  h-12
                  w-12
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-[var(--achievement)]
                  text-[var(--accent-foreground)]
                "
              >
                <GraduationCapIcon />
              </div>

              <div>
                <p
                  className="
                    text-xs
                    font-extrabold
                    uppercase
                    tracking-[0.12em]
                    text-[var(--achievement)]
                  "
                >
                  Your Path
                </p>

                <p
                  className="
                    mt-1
                    text-sm
                    font-bold
                    text-[var(--text-primary)]
                  "
                >
                  Learn → Practice → Master
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="
          mt-6
          grid
          grid-cols-2
          gap-4
          xl:grid-cols-4
        "
      >
        <DashboardStat
          label="Courses"
          value={String(
            totalCourses,
          )}
          icon={
            <BookIcon />
          }
        />

        <DashboardStat
          label="Modules"
          value={String(
            totalModules,
          )}
          icon={
            <GraduationCapIcon />
          }
        />

        <DashboardStat
          label="Lessons"
          value={String(
            totalLessons,
          )}
          icon={
            <LessonsIcon />
          }
        />

        <DashboardStat
          label="Curriculum"
          value={formatMinutes(
            totalMinutes,
          )}
          icon={
            <ClockIcon />
          }
        />
      </section>

      <div
        className="
          mt-8
          grid
          gap-6
          xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.75fr)]
        "
      >
        <section
          className="
            min-w-0
          "
        >
          <div
            className="
              mb-4
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:items-end
              sm:justify-between
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
                Curriculum
              </p>

              <h2
                className="
                  mt-1
                  text-xl
                  font-bold
                  tracking-tight
                  text-[var(--text-primary)]
                  sm:text-2xl
                "
              >
                Start learning
              </h2>

              <p
                className="
                  mt-1
                  text-sm
                  text-[var(--text-secondary)]
                "
              >
                Explore the core CASE University learning tracks.
              </p>
            </div>

            <Link
              href="/courses"
              className="
                inline-flex
                items-center
                gap-2
                text-sm
                font-bold
                text-[var(--primary)]
                outline-none
                transition
                hover:text-[var(--primary-hover)]
                focus-visible:ring-2
                focus-visible:ring-[var(--focus-ring)]
              "
            >
              View all courses
              <ArrowRightIcon />
            </Link>
          </div>

          <div
            className="
              grid
              gap-4
              md:grid-cols-2
              2xl:grid-cols-3
            "
          >
            {displayedCourses.map(
              (
                course,
              ) => (
                <Link
                  key={
                    course.id
                  }
                  href={`/courses/${course.slug}`}
                  className="
                    group
                    flex
                    min-h-[220px]
                    flex-col
                    rounded-2xl
                    border
                    border-[var(--border-subtle)]
                    bg-[var(--surface-default)]
                    p-5
                    shadow-[var(--shadow-xs)]
                    outline-none
                    transition
                    hover:-translate-y-0.5
                    hover:border-[var(--primary-border)]
                    hover:shadow-[var(--shadow-sm)]
                    focus-visible:ring-2
                    focus-visible:ring-[var(--focus-ring)]
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-3
                    "
                  >
                    <span
                      className="
                        rounded-full
                        bg-[var(--primary-soft)]
                        px-2.5
                        py-1
                        text-[10px]
                        font-extrabold
                        uppercase
                        tracking-[0.12em]
                        text-[var(--primary)]
                      "
                    >
                      {course.difficulty}
                    </span>

                    <span
                      className="
                        text-xs
                        font-semibold
                        text-[var(--text-muted)]
                      "
                    >
                      {formatMinutes(
                        course.estimated_minutes ??
                        0,
                      )}
                    </span>
                  </div>

                  <h3
                    className="
                      mt-5
                      text-lg
                      font-bold
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
                      mt-2
                      line-clamp-3
                      text-sm
                      leading-6
                      text-[var(--text-secondary)]
                    "
                  >
                    {course.short_description ??
                      course.description ??
                      "Explore this CASE University course."}
                  </p>

                  <div
                    className="
                      mt-auto
                      flex
                      items-center
                      justify-between
                      gap-3
                      border-t
                      border-[var(--border-subtle)]
                      pt-4
                      text-xs
                      font-semibold
                      text-[var(--text-muted)]
                    "
                  >
                    <span>
                      {
                        course.module_count
                      }{" "}
                      modules
                    </span>

                    <span>
                      {
                        course.lesson_count
                      }{" "}
                      lessons
                    </span>
                  </div>
                </Link>
              ),
            )}
          </div>
        </section>

        <aside
          className="
            space-y-6
          "
        >
          <section
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
                items-center
                gap-3
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
                  border
                  border-[var(--primary-border)]
                  bg-[var(--primary-soft)]
                  text-[var(--primary)]
                "
              >
                <TrophyIcon />
              </div>

              <div>
                <p
                  className="
                    text-xs
                    font-extrabold
                    uppercase
                    tracking-[0.14em]
                    text-[var(--primary)]
                  "
                >
                  Progress
                </p>

                <h2
                  className="
                    mt-0.5
                    text-lg
                    font-bold
                    text-[var(--text-primary)]
                  "
                >
                  Your learning journey
                </h2>
              </div>
            </div>

            <div
              className="
                mt-5
                rounded-xl
                border
                border-dashed
                border-[var(--border-default)]
                bg-[var(--surface-muted)]
                p-4
              "
            >
              <p
                className="
                  text-sm
                  font-semibold
                  text-[var(--text-primary)]
                "
              >
                Progress tracking is ready to wire.
              </p>

              <p
                className="
                  mt-2
                  text-sm
                  leading-6
                  text-[var(--text-secondary)]
                "
              >
                Enrollment and lesson progress will populate this section once the learner workflow is connected.
              </p>
            </div>
          </section>

          <section
            className="
              rounded-2xl
              border
              border-[var(--achievement-border)]
              bg-[var(--achievement-soft)]
              p-5
              sm:p-6
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
                bg-[var(--achievement)]
                text-[var(--accent-foreground)]
              "
            >
              <GraduationCapIcon />
            </div>

            <h2
              className="
                mt-4
                text-lg
                font-bold
                text-[var(--text-primary)]
              "
            >
              Certificates
            </h2>

            <p
              className="
                mt-2
                text-sm
                leading-6
                text-[var(--text-secondary)]
              "
            >
              Complete course requirements and assessments to earn CASE University certificates.
            </p>

            <div
              className="
                mt-4
                inline-flex
                rounded-full
                border
                border-[var(--achievement-border)]
                bg-[var(--surface-default)]
                px-3
                py-1
                text-xs
                font-bold
                text-[var(--achievement)]
              "
            >
              Coming soon
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function DashboardStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-[var(--border-subtle)]
        bg-[var(--surface-default)]
        p-4
        shadow-[var(--shadow-xs)]
        sm:p-5
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-3
        "
      >
        <div
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-[var(--primary-soft)]
            text-[var(--primary)]
          "
        >
          {icon}
        </div>
      </div>

      <p
        className="
          mt-4
          text-2xl
          font-bold
          tracking-tight
          text-[var(--text-primary)]
          sm:text-3xl
        "
      >
        {value}
      </p>

      <p
        className="
          mt-1
          text-xs
          font-semibold
          uppercase
          tracking-[0.1em]
          text-[var(--text-muted)]
        "
      >
        {label}
      </p>
    </div>
  );
}
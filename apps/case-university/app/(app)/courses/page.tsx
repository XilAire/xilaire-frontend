import CourseGrid from "@/components/university/CourseGrid";
import { getUniversityCourseSummaries } from "@/lib/university/courses";

export const dynamic = "force-dynamic";

function CoursesIcon() {
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

export default async function CoursesPage() {
  const courses =
    await getUniversityCourseSummaries();

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
          mb-8
          flex
          flex-col
          gap-5
          sm:mb-10
          lg:flex-row
          lg:items-end
          lg:justify-between
        "
      >
        <div className="min-w-0 max-w-3xl">
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

          <div
            className="
              mt-3
              flex
              items-start
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
              <CoursesIcon />
            </div>

            <div className="min-w-0">
              <h1
                className="
                  text-2xl
                  font-bold
                  tracking-tight
                  text-[var(--text-primary)]
                  sm:text-3xl
                  lg:text-4xl
                "
              >
                Courses
              </h1>

              <p
                className="
                  mt-2
                  max-w-3xl
                  text-sm
                  leading-6
                  text-[var(--text-secondary)]
                  sm:text-base
                "
              >
                Build your investing knowledge from the fundamentals through technical analysis and options trading.
              </p>
            </div>
          </div>
        </div>

        <div
          className="
            flex
            shrink-0
            items-center
            gap-3
          "
        >
          <div
            className="
              rounded-xl
              border
              border-[var(--border-subtle)]
              bg-[var(--surface-default)]
              px-4
              py-3
              shadow-[var(--shadow-xs)]
            "
          >
            <p
              className="
                text-[10px]
                font-extrabold
                uppercase
                tracking-[0.14em]
                text-[var(--text-muted)]
              "
            >
              Available courses
            </p>

            <p
              className="
                mt-1
                text-xl
                font-bold
                text-[var(--text-primary)]
              "
            >
              {courses.length}
            </p>
          </div>
        </div>
      </header>

      <section>
        <CourseGrid
          courses={courses}
          emptyTitle="No courses available"
          emptyDescription="CASE University courses will appear here when curriculum is available."
        />
      </section>
    </div>
  );
}
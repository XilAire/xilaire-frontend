import CourseCard from "@/components/university/CourseCard";

import type {
  UniversityCourse,
  UniversityCourseSummary,
} from "@/types/university";

type CourseGridCourse =
  | UniversityCourse
  | UniversityCourseSummary;

type CourseGridProps = {
  courses: CourseGridCourse[];
  emptyTitle?: string;
  emptyDescription?: string;
  showCounts?: boolean;
};

function EmptyCoursesIcon() {
  return (
    <svg
      width="28"
      height="28"
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

export default function CourseGrid({
  courses,
  emptyTitle = "No courses available",
  emptyDescription = "CASE University courses will appear here when they become available.",
  showCounts = true,
}: CourseGridProps) {
  if (courses.length === 0) {
    return (
      <div
        className="
          rounded-[var(--radius-xl)]
          border
          border-dashed
          border-[var(--border-default)]
          bg-[var(--surface-default)]
          px-5
          py-12
          text-center
          shadow-[var(--shadow-xs)]
          sm:px-8
          sm:py-16
        "
      >
        <div className="mx-auto max-w-md">
          <div
            className="
              mx-auto
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-2xl
              border
              border-[var(--primary-border)]
              bg-[var(--primary-soft)]
              text-[var(--primary)]
            "
          >
            <EmptyCoursesIcon />
          </div>

          <h2
            className="
              mt-5
              text-lg
              font-bold
              tracking-tight
              text-[var(--text-primary)]
              sm:text-xl
            "
          >
            {emptyTitle}
          </h2>

          <p
            className="
              mt-2
              text-sm
              leading-6
              text-[var(--text-secondary)]
              sm:text-base
            "
          >
            {emptyDescription}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="
        grid
        grid-cols-1
        gap-4
        sm:gap-5
        md:grid-cols-2
        xl:grid-cols-3
        2xl:gap-6
      "
    >
      {courses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          showCounts={showCounts}
        />
      ))}
    </div>
  );
}
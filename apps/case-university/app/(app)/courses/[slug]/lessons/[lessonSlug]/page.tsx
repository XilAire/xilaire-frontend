import Link from "next/link";
import { notFound } from "next/navigation";

import LessonAssessment from "@/components/university/LessonAssessment";
import LessonContent from "@/components/university/LessonContent";
import LessonProgressControls from "@/components/university/LessonProgressControls";
import LessonResources from "@/components/university/LessonResources";
import {
  getCurrentAssessmentAttemptSummaryAction,
  getLearnerLessonAssessmentAction,
} from "@/app/actions/university-assessments";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getPublishedUniversityCourseWithModules,
  getUniversityLessonBySlug,
} from "@/lib/university/courses";
import {
  getCurrentUniversityAccess,
  getUniversityCourseEntitlement,
} from "@/lib/university/entitlements";
import {
  getAuthorizedUniversityLessonResources,
} from "@/lib/university/lesson-resources";
import { getCurrentUserLessonProgress } from "@/lib/university/progress";

type LessonPageProps = {
  params: Promise<{
    slug: string;
    lessonSlug: string;
  }>;
};

function ArrowLeftIcon() {
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
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
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

function ChevronRightIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
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
      width="14"
      height="14"
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
      <circle cx="12" cy="12" r="9" />
      <path d="m10 8 6 4-6 4V8Z" />
    </svg>
  );
}

function LockIcon() {
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
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function formatDuration(minutes: number | null) {
  if (!minutes || minutes <= 0) {
    return null;
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

export default async function LessonPage({
  params,
}: LessonPageProps) {
  const { slug, lessonSlug } = await params;

  const course =
    await getPublishedUniversityCourseWithModules(slug);

  if (!course) {
    notFound();
  }

  const modules = course.modules ?? [];

  const currentModule = modules.find((module) =>
    module.lessons?.some(
      (moduleLesson) =>
        moduleLesson.slug === lessonSlug,
    ),
  );

  if (!currentModule) {
    notFound();
  }

  const lesson = currentModule.lessons?.find(
    (item) => item.slug === lessonSlug,
  );

  if (!lesson) {
    notFound();
  }

  const orderedLessons = modules.flatMap((module) =>
    (module.lessons ?? []).map((moduleLesson) => ({
      ...moduleLesson,
      moduleId: module.id,
      moduleTitle: module.title,
      moduleSlug: module.slug,
    })),
  );

  const currentLessonIndex =
    orderedLessons.findIndex(
      (item) => item.id === lesson.id,
    );

  const previousLesson =
    currentLessonIndex > 0
      ? orderedLessons[currentLessonIndex - 1]
      : null;

  const nextLesson =
    currentLessonIndex >= 0 &&
    currentLessonIndex < orderedLessons.length - 1
      ? orderedLessons[currentLessonIndex + 1]
      : null;

  const lessonNumber =
    currentLessonIndex >= 0
      ? currentLessonIndex + 1
      : 1;

  const totalLessons = orderedLessons.length;

  const lessonDuration =
    formatDuration(lesson.estimated_minutes);

  const moduleLessonIndex =
    (currentModule.lessons ?? []).findIndex(
      (item) => item.id === lesson.id,
    );

  const moduleNumber =
    modules.findIndex(
      (module) => module.id === currentModule.id,
    ) + 1;

  /*
   * The catalog is intentionally viewable without authentication.
   * Authenticated progress/resources are not loaded until Supabase
   * confirms the current user.
   */
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const universityAccess =
    await getCurrentUniversityAccess();

  const courseEntitlement =
    getUniversityCourseEntitlement(course.slug);

  const hasFullCourseAccess =
    courseEntitlement
      ? universityAccess.entitlements[
          courseEntitlement
        ] === true
      : universityAccess.tier === "pro";

  const canAccessCurrentLesson =
    lesson.is_preview
      ? universityAccess.entitlements
          .preview_lessons
      : hasFullCourseAccess;

  const requiredTier =
    courseEntitlement === "options_trading"
      ? "Pro"
      : "Plus";

  /*
   * Direct-URL access boundary. Full lesson content and downloadable
   * resource metadata are never fetched when access fails.
   */
  if (!canAccessCurrentLesson) {
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
        <nav
          aria-label="Breadcrumb"
          className="
            flex
            flex-wrap
            items-center
            gap-1.5
            text-sm
            font-semibold
            text-[var(--text-muted)]
          "
        >
          <Link
            href="/courses"
            className="
              rounded-md
              outline-none
              transition
              hover:text-[var(--primary)]
              focus-visible:ring-2
              focus-visible:ring-[var(--focus-ring)]
            "
          >
            Courses
          </Link>

          <ChevronRightIcon />

          <Link
            href={`/courses/${course.slug}`}
            className="
              max-w-[240px]
              truncate
              rounded-md
              outline-none
              transition
              hover:text-[var(--primary)]
              focus-visible:ring-2
              focus-visible:ring-[var(--focus-ring)]
            "
          >
            {course.title}
          </Link>

          <ChevronRightIcon />

          <span
            className="
              max-w-[280px]
              truncate
              text-[var(--text-primary)]
            "
          >
            {lesson.title}
          </span>
        </nav>

        <section
          className="
            relative
            mt-8
            overflow-hidden
            rounded-[var(--radius-xl)]
            border
            border-[var(--primary-border)]
            bg-[var(--surface-default)]
            shadow-[var(--shadow-md)]
          "
        >
          <div
            className="
              absolute
              inset-x-0
              top-0
              h-1
              bg-[var(--primary)]
            "
            aria-hidden="true"
          />

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
              relative
              z-10
              mx-auto
              max-w-3xl
              px-5
              py-12
              text-center
              sm:px-8
              sm:py-16
              lg:px-10
              lg:py-20
            "
          >
            <div
              className="
                mx-auto
                flex
                h-16
                w-16
                items-center
                justify-center
                rounded-2xl
                border
                border-[var(--primary-border)]
                bg-[var(--primary-soft)]
                text-[var(--primary)]
                shadow-[var(--shadow-xs)]
              "
            >
              <LockIcon />
            </div>

            <p
              className="
                mt-6
                text-xs
                font-extrabold
                uppercase
                tracking-[0.16em]
                text-[var(--primary)]
              "
            >
              Lesson Locked
            </p>

            <h1
              className="
                mt-3
                text-3xl
                font-bold
                tracking-tight
                text-[var(--text-primary)]
                sm:text-4xl
                lg:text-5xl
              "
            >
              {lesson.title}
            </h1>

            {lesson.short_description ? (
              <p
                className="
                  mx-auto
                  mt-4
                  max-w-2xl
                  text-sm
                  leading-7
                  text-[var(--text-secondary)]
                  sm:text-base
                "
              >
                {lesson.short_description}
              </p>
            ) : null}

            <div
              className="
                mx-auto
                mt-7
                max-w-xl
                rounded-2xl
                border
                border-[var(--border-subtle)]
                bg-[var(--surface-muted)]
                p-5
              "
            >
              <p
                className="
                  text-sm
                  leading-6
                  text-[var(--text-secondary)]
                "
              >
                This lesson is part of the full{" "}
                <span className="font-bold text-[var(--text-primary)]">
                  {course.title}
                </span>{" "}
                course and requires CASE University{" "}
                <span className="font-bold text-[var(--primary)]">
                  {requiredTier}
                </span>{" "}
                access.
              </p>

              <p
                className="
                  mt-3
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.1em]
                  text-[var(--text-muted)]
                "
              >
                Current plan:{" "}
                <span className="text-[var(--text-primary)]">
                  {universityAccess.tier}
                </span>
              </p>
            </div>

            <div
              className="
                mt-8
                flex
                flex-col
                justify-center
                gap-3
                sm:flex-row
              "
            >
              {user ? (
                <Link
                  href="/pricing"
                  className="
                    inline-flex
                    min-h-12
                    items-center
                    justify-center
                    rounded-xl
                    bg-[var(--primary)]
                    px-5
                    py-3
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
                  View Plans
                </Link>
              ) : (
                <Link
                  href={`/auth/signin?redirect=/courses/${course.slug}/lessons/${lesson.slug}`}
                  className="
                    inline-flex
                    min-h-12
                    items-center
                    justify-center
                    rounded-xl
                    bg-[var(--primary)]
                    px-5
                    py-3
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
                  Sign In
                </Link>
              )}

              <Link
                href={`/courses/${course.slug}`}
                className="
                  inline-flex
                  min-h-12
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-[var(--border-default)]
                  bg-[var(--surface-default)]
                  px-5
                  py-3
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
                <ArrowLeftIcon />
                Course Overview
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  /*
   * Trusted full-content boundary.
   */
  const fullLesson =
    await getUniversityLessonBySlug(
      course.slug,
      lesson.slug,
    );

  if (!fullLesson) {
    notFound();
  }

  /*
   * Resource metadata is loaded only for authenticated users.
   * getAuthorizedUniversityLessonResources() repeats the trusted
   * lesson authorization and returns only downloadable resources
   * appropriate for the learner/admin.
   */
  const [
    lessonProgress,
    lessonAssessment,
    lessonResources,
  ] = user
    ? await Promise.all([
        getCurrentUserLessonProgress(
          fullLesson.id,
        ),
        getLearnerLessonAssessmentAction(
          fullLesson.id,
        ),
        getAuthorizedUniversityLessonResources({
          courseSlug: course.slug,
          lessonSlug: fullLesson.slug,
        }),
      ])
    : [null, null, []];

  const assessmentAttemptSummary =
    lessonAssessment
      ? await getCurrentAssessmentAttemptSummaryAction(
          lessonAssessment.id,
        )
      : null;

  const assessmentPassed =
    assessmentAttemptSummary?.hasPassed ?? false;

  const hasRequiredAssessment =
    Boolean(lessonAssessment?.is_required);

  const isCompleted =
    lessonProgress?.status === "completed";

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
      <nav
        aria-label="Breadcrumb"
        className="
          flex
          flex-wrap
          items-center
          gap-1.5
          text-sm
          font-semibold
          text-[var(--text-muted)]
        "
      >
        <Link
          href="/courses"
          className="
            rounded-md
            outline-none
            transition
            hover:text-[var(--primary)]
            focus-visible:ring-2
            focus-visible:ring-[var(--focus-ring)]
          "
        >
          Courses
        </Link>

        <ChevronRightIcon />

        <Link
          href={`/courses/${course.slug}`}
          className="
            max-w-[240px]
            truncate
            rounded-md
            outline-none
            transition
            hover:text-[var(--primary)]
            focus-visible:ring-2
            focus-visible:ring-[var(--focus-ring)]
          "
        >
          {course.title}
        </Link>

        <ChevronRightIcon />

        <span
          className="
            max-w-[280px]
            truncate
            text-[var(--text-primary)]
          "
        >
          {lesson.title}
        </span>
      </nav>

      <div
        className="
          mt-5
          grid
          gap-6
          xl:grid-cols-[320px_minmax(0,1fr)]
          2xl:grid-cols-[350px_minmax(0,1fr)]
        "
      >
        <aside
          className="
            order-2
            min-w-0
            xl:order-1
          "
        >
          <div className="xl:sticky xl:top-28">
            <div
              className="
                overflow-hidden
                rounded-2xl
                border
                border-[var(--border-subtle)]
                bg-[var(--surface-default)]
                shadow-[var(--shadow-xs)]
              "
            >
              <div
                className="
                  border-b
                  border-[var(--border-subtle)]
                  bg-[var(--surface-muted)]
                  px-5
                  py-5
                "
              >
                <p
                  className="
                    text-xs
                    font-extrabold
                    uppercase
                    tracking-[0.16em]
                    text-[var(--primary)]
                  "
                >
                  Course curriculum
                </p>

                <h2
                  className="
                    mt-2
                    text-base
                    font-bold
                    leading-6
                    text-[var(--text-primary)]
                  "
                >
                  {course.title}
                </h2>

                <p
                  className="
                    mt-2
                    text-xs
                    font-semibold
                    text-[var(--text-muted)]
                  "
                >
                  Lesson {lessonNumber} of {totalLessons}
                </p>

                <div
                  className="
                    mt-4
                    h-2
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
                      transition-all
                    "
                    style={{
                      width:
                        totalLessons > 0
                          ? `${Math.min(
                              100,
                              Math.max(
                                0,
                                (lessonNumber /
                                  totalLessons) *
                                  100,
                              ),
                            )}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>

              <div
                className="
                  max-h-[calc(100dvh-290px)]
                  overflow-y-auto
                  p-3
                "
              >
                <div className="space-y-3">
                  {modules.map((module, index) => {
                    const moduleLessons =
                      module.lessons ?? [];

                    const isCurrentModule =
                      module.id === currentModule.id;

                    return (
                      <section
                        key={module.id}
                        className={[
                          "overflow-hidden rounded-xl border",
                          isCurrentModule
                            ? "border-[var(--primary-border)]"
                            : "border-[var(--border-subtle)]",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "px-3 py-3",
                            isCurrentModule
                              ? "bg-[var(--primary-soft)]"
                              : "bg-[var(--surface-muted)]",
                          ].join(" ")}
                        >
                          <p
                            className={[
                              "text-[9px] font-extrabold uppercase tracking-[0.14em]",
                              isCurrentModule
                                ? "text-[var(--primary)]"
                                : "text-[var(--text-muted)]",
                            ].join(" ")}
                          >
                            Module {index + 1}
                          </p>

                          <p
                            className="
                              mt-1
                              text-sm
                              font-bold
                              leading-5
                              text-[var(--text-primary)]
                            "
                          >
                            {module.title}
                          </p>
                        </div>

                        <div
                          className="
                            divide-y
                            divide-[var(--border-subtle)]
                          "
                        >
                          {moduleLessons.map(
                            (
                              moduleLesson,
                              lessonIndex,
                            ) => {
                              const isCurrentLesson =
                                moduleLesson.id ===
                                lesson.id;

                              const isLocked =
                                moduleLesson.is_preview
                                  ? !universityAccess
                                      .entitlements
                                      .preview_lessons
                                  : !hasFullCourseAccess;

                              return (
                                <Link
                                  key={moduleLesson.id}
                                  href={`/courses/${course.slug}/lessons/${moduleLesson.slug}`}
                                  aria-current={
                                    isCurrentLesson
                                      ? "page"
                                      : undefined
                                  }
                                  className={[
                                    "group flex items-start gap-3 px-3 py-3 outline-none transition",
                                    "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]",
                                    isCurrentLesson
                                      ? "bg-[var(--sidebar-active-background)]"
                                      : "hover:bg-[var(--surface-hover)]",
                                  ].join(" ")}
                                >
                                  <span
                                    className={[
                                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                                      isCurrentLesson
                                        ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                                        : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
                                    ].join(" ")}
                                  >
                                    {isLocked ? (
                                      <LockIcon />
                                    ) : (
                                      <LessonIcon />
                                    )}
                                  </span>

                                  <div
                                    className="
                                      min-w-0
                                      flex-1
                                    "
                                  >
                                    <p
                                      className={[
                                        "text-xs font-bold leading-5",
                                        isCurrentLesson
                                          ? "text-[var(--primary)]"
                                          : "text-[var(--text-primary)]",
                                      ].join(" ")}
                                    >
                                      {lessonIndex + 1}.{" "}
                                      {moduleLesson.title}
                                    </p>

                                    {moduleLesson.estimated_minutes ? (
                                      <p
                                        className="
                                          mt-1
                                          text-[10px]
                                          font-semibold
                                          text-[var(--text-muted)]
                                        "
                                      >
                                        {formatDuration(
                                          moduleLesson.estimated_minutes,
                                        )}
                                      </p>
                                    ) : null}
                                  </div>
                                </Link>
                              );
                            },
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            </div>

            <Link
              href={`/courses/${course.slug}`}
              className="
                mt-3
                inline-flex
                w-full
                min-h-11
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
                text-[var(--text-secondary)]
                outline-none
                transition
                hover:border-[var(--border-strong)]
                hover:bg-[var(--surface-hover)]
                hover:text-[var(--text-primary)]
                focus-visible:ring-2
                focus-visible:ring-[var(--focus-ring)]
              "
            >
              <ArrowLeftIcon />
              Course overview
            </Link>
          </div>
        </aside>

        <main
          className="
            order-1
            min-w-0
            xl:order-2
          "
        >
          <article
            className="
              overflow-hidden
              rounded-[var(--radius-xl)]
              border
              border-[var(--border-subtle)]
              bg-[var(--surface-default)]
              shadow-[var(--shadow-sm)]
            "
          >
            <header
              className="
                relative
                overflow-hidden
                border-b
                border-[var(--border-subtle)]
                px-5
                py-7
                sm:px-7
                sm:py-9
                lg:px-9
              "
            >
              <div
                className="
                  absolute
                  inset-x-0
                  top-0
                  h-1
                  bg-[var(--primary)]
                "
                aria-hidden="true"
              />

              <div
                className="
                  pointer-events-none
                  absolute
                  -right-20
                  -top-20
                  h-56
                  w-56
                  rounded-full
                  bg-[var(--primary-soft)]
                  blur-3xl
                "
                aria-hidden="true"
              />

              <div className="relative z-10">
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
                      tracking-[0.14em]
                      text-[var(--primary)]
                    "
                  >
                    Module {moduleNumber}
                  </span>

                  <span
                    className="
                      rounded-full
                      border
                      border-[var(--border-default)]
                      bg-[var(--surface-muted)]
                      px-3
                      py-1
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-[0.12em]
                      text-[var(--text-muted)]
                    "
                  >
                    Lesson {moduleLessonIndex + 1}
                  </span>

                  {lesson.is_preview ? (
                    <span
                      className="
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
                      Preview
                    </span>
                  ) : null}

                  {isCompleted ? (
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
                      <CheckIcon />
                      Completed
                    </span>
                  ) : null}
                </div>

                <p
                  className="
                    mt-5
                    text-xs
                    font-extrabold
                    uppercase
                    tracking-[0.16em]
                    text-[var(--text-muted)]
                  "
                >
                  {currentModule.title}
                </p>

                <h1
                  className="
                    mt-2
                    max-w-4xl
                    text-3xl
                    font-bold
                    tracking-tight
                    text-[var(--text-primary)]
                    sm:text-4xl
                    lg:text-5xl
                  "
                >
                  {lesson.title}
                </h1>

                {lesson.short_description ? (
                  <p
                    className="
                      mt-4
                      max-w-3xl
                      text-sm
                      leading-7
                      text-[var(--text-secondary)]
                      sm:text-base
                    "
                  >
                    {lesson.short_description}
                  </p>
                ) : null}

                <div
                  className="
                    mt-6
                    flex
                    flex-wrap
                    items-center
                    gap-4
                    text-sm
                    font-semibold
                    text-[var(--text-muted)]
                  "
                >
                  {lessonDuration ? (
                    <span
                      className="
                        inline-flex
                        items-center
                        gap-2
                      "
                    >
                      <ClockIcon />
                      {lessonDuration}
                    </span>
                  ) : null}

                  <span
                    className="
                      inline-flex
                      items-center
                      gap-2
                    "
                  >
                    <BookOpenIcon />
                    Lesson {lessonNumber} of {totalLessons}
                  </span>
                </div>
              </div>
            </header>

            <div
              className="
                px-5
                py-8
                sm:px-7
                sm:py-10
                lg:px-9
                lg:py-12
              "
            >
              <div
                className="
                  mx-auto
                  max-w-4xl
                "
              >
                <LessonContent
                  content={fullLesson.content}
                />
              </div>
            </div>

            <footer
              className="
                border-t
                border-[var(--border-subtle)]
                bg-[var(--surface-muted)]
                px-5
                py-5
                sm:px-7
                lg:px-9
              "
            >
              <div
                className="
                  mx-auto
                  grid
                  max-w-4xl
                  grid-cols-1
                  gap-4
                  md:grid-cols-2
                "
              >
                <div className="min-w-0">
                  {previousLesson ? (
                    <Link
                      href={`/courses/${course.slug}/lessons/${previousLesson.slug}`}
                      className="
                        group
                        flex
                        h-full
                        min-h-16
                        w-full
                        min-w-0
                        items-center
                        gap-3
                        rounded-xl
                        border
                        border-[var(--border-default)]
                        bg-[var(--surface-default)]
                        px-4
                        py-3
                        text-left
                        outline-none
                        transition
                        hover:border-[var(--border-strong)]
                        hover:bg-[var(--surface-hover)]
                        focus-visible:ring-2
                        focus-visible:ring-[var(--focus-ring)]
                      "
                    >
                      <span
                        className="
                          shrink-0
                          text-[var(--text-muted)]
                          transition
                          group-hover:-translate-x-1
                          group-hover:text-[var(--primary)]
                        "
                      >
                        <ArrowLeftIcon />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className="
                            block
                            text-[10px]
                            font-extrabold
                            uppercase
                            tracking-[0.12em]
                            text-[var(--text-muted)]
                          "
                        >
                          Previous
                        </span>

                        <span
                          className="
                            mt-0.5
                            block
                            whitespace-normal
                            break-words
                            text-sm
                            font-bold
                            leading-5
                            text-[var(--text-primary)]
                          "
                        >
                          {previousLesson.title}
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <div
                      className="
                        flex
                        h-full
                        min-h-16
                        items-center
                        text-sm
                        font-semibold
                        text-[var(--text-muted)]
                      "
                    >
                      First lesson in this course
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  {nextLesson ? (
                    <Link
                      href={`/courses/${course.slug}/lessons/${nextLesson.slug}`}
                      className="
                        group
                        flex
                        h-full
                        min-h-16
                        w-full
                        min-w-0
                        items-center
                        justify-between
                        gap-3
                        rounded-xl
                        border
                        border-[var(--border-default)]
                        bg-[var(--surface-default)]
                        px-4
                        py-3
                        text-left
                        outline-none
                        transition
                        hover:border-[var(--primary-border)]
                        hover:bg-[var(--primary-soft)]
                        focus-visible:ring-2
                        focus-visible:ring-[var(--focus-ring)]
                      "
                    >
                      <span className="min-w-0 flex-1">
                        <span
                          className="
                            block
                            text-[10px]
                            font-extrabold
                            uppercase
                            tracking-[0.12em]
                            text-[var(--text-muted)]
                          "
                        >
                          Next lesson
                        </span>

                        <span
                          className="
                            mt-0.5
                            block
                            whitespace-normal
                            break-words
                            text-sm
                            font-bold
                            leading-5
                            text-[var(--text-primary)]
                          "
                        >
                          {nextLesson.title}
                        </span>
                      </span>

                      <span
                        className="
                          shrink-0
                          text-[var(--text-muted)]
                          transition
                          group-hover:translate-x-1
                          group-hover:text-[var(--primary)]
                        "
                      >
                        <ArrowRightIcon />
                      </span>
                    </Link>
                  ) : (
                    <Link
                      href={`/courses/${course.slug}`}
                      className="
                        inline-flex
                        h-full
                        min-h-16
                        w-full
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        border
                        border-[var(--border-default)]
                        bg-[var(--surface-default)]
                        px-5
                        py-3
                        text-sm
                        font-bold
                        text-[var(--text-primary)]
                        outline-none
                        transition
                        hover:border-[var(--primary-border)]
                        hover:bg-[var(--primary-soft)]
                        focus-visible:ring-2
                        focus-visible:ring-[var(--focus-ring)]
                      "
                    >
                      Course overview
                      <ArrowRightIcon />
                    </Link>
                  )}
                </div>
              </div>
            </footer>
          </article>

          {user ? (
            <LessonResources
              courseSlug={course.slug}
              lessonSlug={fullLesson.slug}
              resources={lessonResources}
            />
          ) : null}

          {user &&
          lessonAssessment &&
          assessmentAttemptSummary ? (
            <section className="mt-6">
              <LessonAssessment
                assessment={lessonAssessment}
                initialAttemptSummary={
                  assessmentAttemptSummary
                }
              />
            </section>
          ) : null}

          <section className="mt-6">
            {user ? (
              <LessonProgressControls
                courseId={course.id}
                courseSlug={course.slug}
                moduleId={currentModule.id}
                lessonId={fullLesson.id}
                lessonSlug={fullLesson.slug}
                isCompleted={isCompleted}
                hasRequiredAssessment={
                  hasRequiredAssessment
                }
                assessmentPassed={
                  assessmentPassed
                }
                nextLessonSlug={
                  nextLesson?.slug ?? null
                }
              />
            ) : (
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
                    gap-4
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
                >
                  <div>
                    <h2
                      className="
                        text-base
                        font-bold
                        text-[var(--text-primary)]
                      "
                    >
                      Save your learning progress
                    </h2>

                    <p
                      className="
                        mt-1
                        max-w-2xl
                        text-sm
                        leading-6
                        text-[var(--text-secondary)]
                      "
                    >
                      Sign in to track completed lessons, course progress, and
                      resume where you left off.
                    </p>
                  </div>

                  <Link
                    href={`/auth/signin?redirect=/courses/${course.slug}/lessons/${lesson.slug}`}
                    className="
                      inline-flex
                      min-h-11
                      shrink-0
                      items-center
                      justify-center
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
                    Sign in
                  </Link>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

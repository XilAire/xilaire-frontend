import Link from "next/link";
import { notFound } from "next/navigation";

import CertificateClaimPanel from "@/components/university/CertificateClaimPanel";
import CourseEnrollmentPanel from "@/components/university/CourseEnrollmentPanel";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserCertificateEligibility } from "@/lib/university/certificates";
import { getUniversityCourseForLearnerOrAdminPreview } from "@/lib/university/courses";
import {
  getCurrentUniversityAccess,
  getUniversityCourseEntitlement,
} from "@/lib/university/entitlements";
import {
  getCurrentUserCourseLessonProgress,
  getCurrentUserCourseProgressSummary,
} from "@/lib/university/progress";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CourseDetailPageProps = {
  params: Promise<{
    slug: string;
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

function ModuleIcon() {
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
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="3"
      />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </svg>
  );
}

function LessonIcon() {
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
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path d="m10 8 6 4-6 4V8Z" />
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
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function LockIcon() {
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
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
      />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
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

function formatDifficulty(difficulty: string) {
  if (!difficulty) {
    return "Course";
  }

  return (
    difficulty.charAt(0).toUpperCase() +
    difficulty.slice(1)
  );
}

function normalizeProgress(
  value:
    | number
    | string
    | null
    | undefined,
) {
  const numericValue =
    Number(value ?? 0);

  if (!Number.isFinite(numericValue)) {
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

export default async function CourseDetailPage({
  params,
}: CourseDetailPageProps) {
  const { slug } = await params;

  const course =
    await getUniversityCourseForLearnerOrAdminPreview(
      slug,
    );

  if (!course) {
    notFound();
  }

  const modules =
    course.modules ?? [];

  const orderedLessons =
    modules.flatMap(
      (module) =>
        (module.lessons ?? []).map(
          (lesson) => ({
            ...lesson,
            moduleId: module.id,
          }),
        ),
    );

  const totalLessons =
    orderedLessons.length;

  const courseDuration =
    formatDuration(
      course.estimated_minutes,
    );

  const description =
    course.description ??
    course.short_description ??
    "Explore this CASE University course.";


  const supabase =
    await createSupabaseServerClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  const [
    universityAccess,
    currentUserRole,
  ] = await Promise.all([
    getCurrentUniversityAccess(),
    user
      ? resolveCurrentUserRole()
      : Promise.resolve(null),
  ]);

  const courseEntitlement =
    getUniversityCourseEntitlement(
      course.slug,
    );

  const isAdminCurriculumPreview =
    course.status !== "published";

  const isUniversityAdmin =
    (currentUserRole?.role_rank ?? 0) >= 4;

  const canBypassSequentialProgression =
    isUniversityAdmin ||
    isAdminCurriculumPreview;

  const hasFullCourseAccess =
    isUniversityAdmin ||
    isAdminCurriculumPreview ||
    (courseEntitlement
      ? universityAccess.entitlements[
          courseEntitlement
        ] === true
      : universityAccess.tier === "pro");

  const requiredTier =
    courseEntitlement === "options_trading"
      ? "Pro"
      : courseEntitlement
        ? "Plus"
        : "Pro";

  const [
    courseProgress,
    lessonProgress,
    certificateEligibility,
  ] =
    user
      ? await Promise.all([
          getCurrentUserCourseProgressSummary(
            course.id,
          ),
          getCurrentUserCourseLessonProgress(
            course.id,
          ),
          getCurrentUserCertificateEligibility(
            course.id,
          ),
        ])
      : [
          null,
          [],
          null,
        ];

  const completedLessonIds =
    new Set(
      lessonProgress
        .filter(
          (progress) =>
            progress.status ===
            "completed",
        )
        .map(
          (progress) =>
            progress.lesson_id,
        ),
    );

  const startedLessonIds =
    new Set(
      lessonProgress
        .filter(
          (progress) =>
            progress.status ===
            "in_progress",
        )
        .map(
          (progress) =>
            progress.lesson_id,
        ),
    );

  const completedLessons =
    completedLessonIds.size;

  const enrollment =
    courseProgress?.enrollment ??
    null;

  const isEnrolled =
    Boolean(enrollment);

  const progressPercent =
    normalizeProgress(
      courseProgress?.progress_percent ??
        enrollment?.progress_percent ??
        0,
    );

  const isCompleted =
    enrollment?.status ===
      "completed" ||
    progressPercent >= 100;

  /*
   * Sequential progression is enforced at the protected lesson-content
   * boundary as well. This page mirrors that rule visually so learners can
   * see the entire curriculum without being able to open future lessons.
   * University administrators can review the full curriculum in any order.
   */
  const nextSequentialLesson =
    orderedLessons.find(
      (lesson) =>
        !completedLessonIds.has(
          lesson.id,
        ),
    ) ??
    null;

  const nextSequentialLessonId =
    nextSequentialLesson?.id ??
    null;

  const firstCurriculumLesson =
    orderedLessons[0] ??
    null;

  const firstLesson =
    firstCurriculumLesson &&
    (
      firstCurriculumLesson.is_preview ||
      hasFullCourseAccess
    )
      ? firstCurriculumLesson
      : null;

  const inProgressLesson =
    orderedLessons.find(
      (lesson) =>
        (
          lesson.is_preview ||
          hasFullCourseAccess
        ) &&
        startedLessonIds.has(
          lesson.id,
        ) &&
        (
          canBypassSequentialProgression ||
          lesson.id ===
            nextSequentialLessonId
        ),
    ) ??
    null;

  const firstIncompleteLesson =
    nextSequentialLesson &&
    (
      nextSequentialLesson.is_preview ||
      hasFullCourseAccess
    )
      ? nextSequentialLesson
      : null;

  const resumeLesson =
    inProgressLesson ??
    firstIncompleteLesson ??
    firstLesson;

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
      <Link
        href="/courses"
        className="
          inline-flex
          items-center
          gap-2
          rounded-lg
          text-sm
          font-bold
          text-[var(--text-secondary)]
          outline-none
          transition
          hover:text-[var(--primary)]
          focus-visible:ring-2
          focus-visible:ring-[var(--focus-ring)]
        "
      >
        <ArrowLeftIcon />
        All courses
      </Link>

      <section
        className="
          relative
          mt-5
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
            grid
            gap-8
            px-5
            py-7
            sm:px-7
            sm:py-9
            lg:grid-cols-[minmax(0,1fr)_320px]
            lg:px-9
            lg:py-10
            xl:grid-cols-[minmax(0,1fr)_360px]
          "
        >
          <div
            className="
              min-w-0
              max-w-4xl
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
                  text-xs
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

              {isAdminCurriculumPreview ? (
                <span
                  className="
                    rounded-full
                    border
                    border-[var(--achievement-border)]
                    bg-[var(--achievement-soft)]
                    px-3
                    py-1
                    text-xs
                    font-extrabold
                    uppercase
                    tracking-[0.12em]
                    text-[var(--achievement)]
                  "
                >
                  Admin preview · {course.status}
                </span>
              ) : null}

              {course.is_featured ? (
                <span
                  className="
                    rounded-full
                    border
                    border-[var(--achievement-border)]
                    bg-[var(--achievement-soft)]
                    px-3
                    py-1
                    text-xs
                    font-bold
                    text-[var(--achievement)]
                  "
                >
                  Featured
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
                    text-xs
                    font-bold
                    text-[var(--achievement)]
                  "
                >
                  <CheckIcon />
                  Completed
                </span>
              ) : null}
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
              {course.title}
            </h1>

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
              {description}
            </p>

            <div
              className="
                mt-7
                flex
                flex-wrap
                items-center
                gap-x-6
                gap-y-3
                text-sm
                font-semibold
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
                <ModuleIcon />

                {modules.length}{" "}
                {modules.length === 1
                  ? "module"
                  : "modules"}
              </span>

              <span
                className="
                  inline-flex
                  items-center
                  gap-2
                "
              >
                <LessonIcon />

                {totalLessons}{" "}
                {totalLessons === 1
                  ? "lesson"
                  : "lessons"}
              </span>

              {courseDuration ? (
                <span
                  className="
                    inline-flex
                    items-center
                    gap-2
                  "
                >
                  <ClockIcon />
                  {courseDuration}
                </span>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div
              className={[
                "rounded-2xl border p-4",
                hasFullCourseAccess
                  ? "border-[var(--achievement-border)] bg-[var(--achievement-soft)]"
                  : "border-[var(--primary-border)] bg-[var(--primary-soft)]",
              ].join(" ")}
            >
              <div
                className="
                  flex
                  items-start
                  gap-3
                "
              >
                <div
                  className={[
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    hasFullCourseAccess
                      ? "bg-[var(--achievement-soft)] text-[var(--achievement)]"
                      : "bg-[var(--surface-default)] text-[var(--primary)]",
                  ].join(" ")}
                >
                  {hasFullCourseAccess ? (
                    <CheckIcon />
                  ) : (
                    <LockIcon />
                  )}
                </div>

                <div className="min-w-0">
                  <p
                    className="
                      text-xs
                      font-extrabold
                      uppercase
                      tracking-[0.12em]
                      text-[var(--text-muted)]
                    "
                  >
                    CASE University{" "}
                    {hasFullCourseAccess
                      ? universityAccess.tier
                      : requiredTier}
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-bold
                      text-[var(--text-primary)]
                    "
                  >
                    {hasFullCourseAccess
                      ? "Full course access"
                      : `${requiredTier} required for the full course`}
                  </p>

                  {!hasFullCourseAccess ? (
                    <p
                      className="
                        mt-1
                        text-xs
                        leading-5
                        text-[var(--text-secondary)]
                      "
                    >
                      Preview lessons remain available. Locked lessons require the appropriate CASE University plan.
                    </p>
                  ) : null}
                </div>
              </div>

              {!hasFullCourseAccess ? (
                <Link
                  href="/pricing"
                  className="
                    mt-4
                    inline-flex
                    min-h-10
                    w-full
                    items-center
                    justify-center
                    rounded-xl
                    bg-[var(--primary)]
                    px-4
                    py-2
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
                  View {requiredTier} Plan
                </Link>
              ) : null}
            </div>

            <CourseEnrollmentPanel
              courseId={
                course.id
              }
              courseSlug={
                course.slug
              }
              firstLessonSlug={
                firstLesson?.slug ??
                null
              }
              resumeLessonSlug={
                resumeLesson?.slug ??
                null
              }
              isAuthenticated={
                Boolean(user)
              }
              isEnrolled={
                isEnrolled
              }
              isCompleted={
                isCompleted
              }
              progressPercent={
                progressPercent
              }
              completedLessons={
                completedLessons
              }
              totalLessons={
                totalLessons
              }
            />
          </div>
        </div>
      </section>

      {user &&
      isEnrolled &&
      hasFullCourseAccess &&
      universityAccess.entitlements
        .course_certificates &&
      certificateEligibility ? (
        <section
          className="
            mt-8
          "
        >
          <div
            className="
              mb-5
            "
          >
            <p
              className="
                text-xs
                font-extrabold
                uppercase
                tracking-[0.18em]
                text-[var(--achievement)]
              "
            >
              Achievement
            </p>

            <h2
              className="
                mt-1
                text-2xl
                font-bold
                tracking-tight
                text-[var(--text-primary)]
              "
            >
              Course certificate
            </h2>
          </div>

          <CertificateClaimPanel
            courseId={
              course.id
            }
            courseSlug={
              course.slug
            }
            courseTitle={
              course.title
            }
            eligible={
              certificateEligibility.eligible
            }
            alreadyIssued={
              certificateEligibility.alreadyIssued
            }
            completedLessons={
              certificateEligibility.alreadyIssued
                ? totalLessons
                : certificateEligibility.completedLessons
            }
            totalLessons={
              certificateEligibility.alreadyIssued
                ? totalLessons
                : certificateEligibility.totalLessons
            }
            certificateId={
              certificateEligibility.certificate?.id ??
              null
            }
            certificateNumber={
              certificateEligibility.certificate?.certificate_number ??
              null
            }
            issuedAt={
              certificateEligibility.certificate?.issued_at ??
              null
            }
          />
        </section>
      ) : null}

      <section
        className="
          mt-8
        "
      >
        <div
          className="
            mb-5
            flex
            flex-col
            gap-2
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
                text-2xl
                font-bold
                tracking-tight
                text-[var(--text-primary)]
              "
            >
              Course modules
            </h2>

            <p
              className="
                mt-1
                text-sm
                text-[var(--text-secondary)]
              "
            >
              Follow the curriculum from the first module through course completion.
            </p>
          </div>

          <div
            className="
              flex
              flex-wrap
              items-center
              gap-3
            "
          >
            {isEnrolled ? (
              <span
                className="
                  rounded-full
                  border
                  border-[var(--primary-border)]
                  bg-[var(--primary-soft)]
                  px-3
                  py-1.5
                  text-xs
                  font-extrabold
                  text-[var(--primary)]
                "
              >
                {Math.round(
                  progressPercent,
                )}
                % complete
              </span>
            ) : null}

            <p
              className="
                text-sm
                font-semibold
                text-[var(--text-muted)]
              "
            >
              {modules.length} modules ·{" "}
              {totalLessons} lessons
            </p>
          </div>
        </div>

        {modules.length === 0 ? (
          <div
            className="
              rounded-2xl
              border
              border-dashed
              border-[var(--border-default)]
              bg-[var(--surface-default)]
              px-6
              py-14
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
              <BookIcon />
            </div>

            <h3
              className="
                mt-4
                text-lg
                font-bold
                text-[var(--text-primary)]
              "
            >
              Curriculum coming soon
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
              Course modules and lessons will appear here when they are available.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {modules.map(
              (
                module,
                moduleIndex,
              ) => {
                const lessons =
                  module.lessons ??
                  [];

                const moduleDuration =
                  formatDuration(
                    module.estimated_minutes,
                  );

                const moduleCompletedLessons =
                  lessons.filter(
                    (lesson) =>
                      completedLessonIds.has(
                        lesson.id,
                      ),
                  ).length;

                const moduleCompleted =
                  lessons.length > 0 &&
                  moduleCompletedLessons ===
                    lessons.length;

                return (
                  <article
                    key={
                      module.id
                    }
                    className="
                      overflow-hidden
                      rounded-2xl
                      border
                      border-[var(--border-subtle)]
                      bg-[var(--surface-default)]
                      shadow-[var(--shadow-xs)]
                    "
                  >
                    <header
                      className="
                        flex
                        flex-col
                        gap-4
                        border-b
                        border-[var(--border-subtle)]
                        bg-[var(--surface-muted)]
                        px-5
                        py-5
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                        sm:px-6
                      "
                    >
                      <div
                        className="
                          flex
                          min-w-0
                          items-start
                          gap-4
                        "
                      >
                        <div
                          className={[
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-black",
                            moduleCompleted
                              ? "border-[var(--achievement-border)] bg-[var(--achievement-soft)] text-[var(--achievement)]"
                              : "border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary)]",
                          ].join(" ")}
                        >
                          {moduleCompleted ? (
                            <CheckIcon />
                          ) : (
                            moduleIndex + 1
                          )}
                        </div>

                        <div className="min-w-0">
                          <p
                            className="
                              text-[10px]
                              font-extrabold
                              uppercase
                              tracking-[0.14em]
                              text-[var(--text-muted)]
                            "
                          >
                            Module{" "}
                            {moduleIndex + 1}
                          </p>

                          <h3
                            className="
                              mt-1
                              text-lg
                              font-bold
                              tracking-tight
                              text-[var(--text-primary)]
                              sm:text-xl
                            "
                          >
                            {module.title}
                          </h3>

                          {module.description ? (
                            <p
                              className="
                                mt-2
                                max-w-3xl
                                text-sm
                                leading-6
                                text-[var(--text-secondary)]
                              "
                            >
                              {module.description}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div
                        className="
                          flex
                          shrink-0
                          items-center
                          gap-3
                          pl-[60px]
                          text-xs
                          font-semibold
                          text-[var(--text-muted)]
                          sm:pl-0
                        "
                      >
                        {isEnrolled ? (
                          <span>
                            {moduleCompletedLessons}/
                            {lessons.length} completed
                          </span>
                        ) : (
                          <span>
                            {lessons.length}{" "}
                            {lessons.length === 1
                              ? "lesson"
                              : "lessons"}
                          </span>
                        )}

                        {moduleDuration ? (
                          <>
                            <span aria-hidden="true">
                              •
                            </span>

                            <span>
                              {moduleDuration}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </header>

                    <div
                      className="
                        divide-y
                        divide-[var(--border-subtle)]
                      "
                    >
                      {lessons.length === 0 ? (
                        <div
                          className="
                            px-5
                            py-5
                            text-sm
                            text-[var(--text-muted)]
                            sm:px-6
                          "
                        >
                          Lessons for this module are coming soon.
                        </div>
                      ) : (
                        lessons.map(
                          (
                            lesson,
                            lessonIndex,
                          ) => {
                            const duration =
                              formatDuration(
                                lesson.estimated_minutes,
                              );

                            const lessonHref =
                              `/courses/${course.slug}/lessons/${lesson.slug}`;

                            const lessonCompleted =
                              completedLessonIds.has(
                                lesson.id,
                              );

                            const lessonStarted =
                              startedLessonIds.has(
                                lesson.id,
                              );

                            const isPlanLocked =
                              !lesson.is_preview &&
                              !hasFullCourseAccess;

                            const isNextSequentialLesson =
                              lesson.id ===
                              nextSequentialLessonId;

                            const isSequentiallyLocked =
                              !canBypassSequentialProgression &&
                              !lessonCompleted &&
                              !isNextSequentialLesson;

                            const lessonLocked =
                              isPlanLocked ||
                              isSequentiallyLocked;

                            const isUpNext =
                              !canBypassSequentialProgression &&
                              isNextSequentialLesson &&
                              !lessonCompleted &&
                              !lessonStarted &&
                              !isPlanLocked;

                            const rowClassName = [
                              "flex items-center gap-4 px-5 py-4 outline-none transition sm:px-6",
                              isSequentiallyLocked
                                ? "cursor-not-allowed bg-[var(--surface-muted)] opacity-75"
                                : "group hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]",
                            ].join(" ");

                            const lessonRowContent = (
                              <>
                                <div
                                  className={[
                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition",
                                    lessonCompleted
                                      ? "border-[var(--achievement-border)] bg-[var(--achievement-soft)] text-[var(--achievement)]"
                                      : lessonLocked
                                        ? "border-[var(--border-default)] bg-[var(--surface-muted)] text-[var(--text-muted)]"
                                        : lessonStarted ||
                                            isUpNext
                                          ? "border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary)]"
                                          : "border-transparent bg-[var(--surface-muted)] text-[var(--text-muted)] group-hover:bg-[var(--primary-soft)] group-hover:text-[var(--primary)]",
                                  ].join(" ")}
                                >
                                  {lessonCompleted ? (
                                    <CheckIcon />
                                  ) : lessonLocked ? (
                                    <LockIcon />
                                  ) : (
                                    <LessonIcon />
                                  )}
                                </div>

                                <div
                                  className="
                                    min-w-0
                                    flex-1
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
                                    <p
                                      className={[
                                        "text-sm font-bold transition sm:text-base",
                                        isSequentiallyLocked
                                          ? "text-[var(--text-muted)]"
                                          : "text-[var(--text-primary)] group-hover:text-[var(--primary)]",
                                      ].join(" ")}
                                    >
                                      {lessonIndex + 1}.{" "}
                                      {lesson.title}
                                    </p>

                                    {lessonCompleted ? (
                                      <span
                                        className="
                                          rounded-full
                                          border
                                          border-[var(--achievement-border)]
                                          bg-[var(--achievement-soft)]
                                          px-2
                                          py-0.5
                                          text-[9px]
                                          font-extrabold
                                          uppercase
                                          tracking-wide
                                          text-[var(--achievement)]
                                        "
                                      >
                                        Completed
                                      </span>
                                    ) : lessonStarted &&
                                      !isSequentiallyLocked ? (
                                      <span
                                        className="
                                          rounded-full
                                          border
                                          border-[var(--primary-border)]
                                          bg-[var(--primary-soft)]
                                          px-2
                                          py-0.5
                                          text-[9px]
                                          font-extrabold
                                          uppercase
                                          tracking-wide
                                          text-[var(--primary)]
                                        "
                                      >
                                        In progress
                                      </span>
                                    ) : null}

                                    {isUpNext ? (
                                      <span
                                        className="
                                          rounded-full
                                          border
                                          border-[var(--primary-border)]
                                          bg-[var(--primary-soft)]
                                          px-2
                                          py-0.5
                                          text-[9px]
                                          font-extrabold
                                          uppercase
                                          tracking-wide
                                          text-[var(--primary)]
                                        "
                                      >
                                        Up next
                                      </span>
                                    ) : null}

                                    {lesson.is_preview ? (
                                      <span
                                        className="
                                          rounded-full
                                          bg-[var(--primary-soft)]
                                          px-2
                                          py-0.5
                                          text-[9px]
                                          font-extrabold
                                          uppercase
                                          tracking-wide
                                          text-[var(--primary)]
                                        "
                                      >
                                        Preview
                                      </span>
                                    ) : null}

                                    {isSequentiallyLocked ? (
                                      <span
                                        className="
                                          inline-flex
                                          items-center
                                          gap-1
                                          rounded-full
                                          border
                                          border-[var(--border-default)]
                                          bg-[var(--surface-default)]
                                          px-2
                                          py-0.5
                                          text-[9px]
                                          font-extrabold
                                          uppercase
                                          tracking-wide
                                          text-[var(--text-muted)]
                                        "
                                      >
                                        <LockIcon />
                                        Complete previous lesson
                                      </span>
                                    ) : isPlanLocked ? (
                                      <span
                                        className="
                                          inline-flex
                                          items-center
                                          gap-1
                                          rounded-full
                                          border
                                          border-[var(--border-default)]
                                          bg-[var(--surface-muted)]
                                          px-2
                                          py-0.5
                                          text-[9px]
                                          font-extrabold
                                          uppercase
                                          tracking-wide
                                          text-[var(--text-muted)]
                                        "
                                      >
                                        <LockIcon />
                                        {requiredTier} required
                                      </span>
                                    ) : null}
                                  </div>

                                  {lesson.short_description ? (
                                    <p
                                      className="
                                        mt-1
                                        line-clamp-1
                                        text-xs
                                        text-[var(--text-secondary)]
                                        sm:text-sm
                                      "
                                    >
                                      {lesson.short_description}
                                    </p>
                                  ) : null}
                                </div>

                                <div
                                  className="
                                    flex
                                    shrink-0
                                    items-center
                                    gap-3
                                  "
                                >
                                  {duration ? (
                                    <span
                                      className="
                                        hidden
                                        items-center
                                        gap-1.5
                                        text-xs
                                        font-semibold
                                        text-[var(--text-muted)]
                                        sm:inline-flex
                                      "
                                    >
                                      <ClockIcon />
                                      {duration}
                                    </span>
                                  ) : null}

                                  <span
                                    className={[
                                      "text-[var(--text-muted)] transition",
                                      lessonLocked
                                        ? ""
                                        : "group-hover:translate-x-1 group-hover:text-[var(--primary)]",
                                    ].join(" ")}
                                  >
                                    {lessonLocked ? (
                                      <LockIcon />
                                    ) : (
                                      <ArrowRightIcon />
                                    )}
                                  </span>
                                </div>
                              </>
                            );

                            if (
                              isSequentiallyLocked
                            ) {
                              return (
                                <div
                                  key={
                                    lesson.id
                                  }
                                  aria-disabled="true"
                                  aria-label={`${lesson.title} — locked until the previous lesson is completed`}
                                  className={
                                    rowClassName
                                  }
                                >
                                  {lessonRowContent}
                                </div>
                              );
                            }

                            return (
                              <Link
                                key={
                                  lesson.id
                                }
                                href={
                                  isPlanLocked
                                    ? "/pricing"
                                    : lessonHref
                                }
                                aria-label={
                                  isPlanLocked
                                    ? `${lesson.title} — locked, ${requiredTier} required`
                                    : undefined
                                }
                                className={
                                  rowClassName
                                }
                              >
                                {lessonRowContent}
                              </Link>
                            );
                          },
                        )
                      )}
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>
    </div>
  );
}

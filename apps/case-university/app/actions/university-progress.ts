"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  completeCurrentUserLesson,
  ensureCurrentUserCourseEnrollment,
  startCurrentUserLesson,
} from "@/lib/university/progress";

import {
  getCurrentUserCertificateEligibility,
  issueCurrentUserCertificate,
} from "@/lib/university/certificates";

export type UniversityProgressActionState = {
  success: boolean;
  message: string;
  certificateIssued?: boolean;
  certificateId?: string;
  certificateNumber?: string;
};

type BeginCourseInput = {
  courseId: string;
  courseSlug: string;
  firstLessonSlug?: string | null;
};

type StartLessonInput = {
  courseId: string;
  courseSlug: string;
  moduleId: string;
  lessonId: string;
  lessonSlug: string;
};

type CompleteLessonInput = {
  courseId: string;
  courseSlug: string;
  moduleId: string;
  lessonId: string;
  lessonSlug: string;
  nextLessonSlug?: string | null;
};

function requireValue(
  value: string | null | undefined,
  fieldName: string,
) {
  const normalizedValue =
    value?.trim();

  if (!normalizedValue) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  return normalizedValue;
}

function revalidateUniversityProgressPaths(
  courseSlug: string,
  lessonSlug?: string | null,
) {
  revalidatePath(
    "/dashboard",
  );

  revalidatePath(
    "/courses",
  );

  revalidatePath(
    `/courses/${courseSlug}`,
  );

  if (lessonSlug) {
    revalidatePath(
      `/courses/${courseSlug}/lessons/${lessonSlug}`,
    );
  }
}

async function tryIssueCertificateAfterCompletion(
  courseId: string,
  courseSlug: string,
) {
  try {
    const eligibility =
      await getCurrentUserCertificateEligibility(
        courseId,
      );

    if (
      eligibility.alreadyIssued &&
      eligibility.certificate
    ) {
      revalidatePath(
        "/certificates",
      );

      revalidatePath(
        "/progress",
      );

      return {
        issued: false,
        certificate:
          eligibility.certificate,
      };
    }

    if (!eligibility.eligible) {
      return {
        issued: false,
        certificate: null,
      };
    }

    /*
     * The authoritative certificate RPC performs the final
     * entitlement and completion checks. This application
     * helper deliberately does not bypass plan access.
     */
    const certificate =
      await issueCurrentUserCertificate(
        courseId,
      );

    revalidatePath(
      "/certificates",
    );

    revalidatePath(
      "/progress",
    );

    revalidatePath(
      `/courses/${courseSlug}`,
    );

    return {
      issued: true,
      certificate,
    };
  } catch (error) {
    /*
     * Certificate issuance must never roll back an otherwise
     * valid lesson completion. The database RPC remains the
     * authority for certificate eligibility, including the
     * course_certificates entitlement.
     */
    console.info(
      "[CASE University] Automatic certificate issuance was not completed.",
      error,
    );

    return {
      issued: false,
      certificate: null,
    };
  }
}

export async function beginCourseAction({
  courseId,
  courseSlug,
  firstLessonSlug,
}: BeginCourseInput): Promise<void> {
  const normalizedCourseId =
    requireValue(
      courseId,
      "Course ID",
    );

  const normalizedCourseSlug =
    requireValue(
      courseSlug,
      "Course slug",
    );

  const normalizedFirstLessonSlug =
    firstLessonSlug?.trim() ||
    null;

  await ensureCurrentUserCourseEnrollment(
    normalizedCourseId,
  );

  revalidateUniversityProgressPaths(
    normalizedCourseSlug,
    normalizedFirstLessonSlug,
  );

  if (
    normalizedFirstLessonSlug
  ) {
    redirect(
      `/courses/${normalizedCourseSlug}/lessons/${normalizedFirstLessonSlug}`,
    );
  }

  redirect(
    `/courses/${normalizedCourseSlug}`,
  );
}

export async function startLessonAction({
  courseId,
  courseSlug,
  moduleId,
  lessonId,
  lessonSlug,
}: StartLessonInput): Promise<UniversityProgressActionState> {
  const normalizedCourseId =
    requireValue(
      courseId,
      "Course ID",
    );

  const normalizedCourseSlug =
    requireValue(
      courseSlug,
      "Course slug",
    );

  const normalizedModuleId =
    requireValue(
      moduleId,
      "Module ID",
    );

  const normalizedLessonId =
    requireValue(
      lessonId,
      "Lesson ID",
    );

  const normalizedLessonSlug =
    requireValue(
      lessonSlug,
      "Lesson slug",
    );

  await startCurrentUserLesson({
    courseId:
      normalizedCourseId,

    moduleId:
      normalizedModuleId,

    lessonId:
      normalizedLessonId,
  });

  revalidateUniversityProgressPaths(
    normalizedCourseSlug,
    normalizedLessonSlug,
  );

  return {
    success:
      true,

    message:
      "Lesson progress started.",
  };
}

export async function completeLessonAction({
  courseId,
  courseSlug,
  moduleId,
  lessonId,
  lessonSlug,
  nextLessonSlug,
}: CompleteLessonInput): Promise<UniversityProgressActionState> {
  const normalizedCourseId =
    requireValue(
      courseId,
      "Course ID",
    );

  const normalizedCourseSlug =
    requireValue(
      courseSlug,
      "Course slug",
    );

  const normalizedModuleId =
    requireValue(
      moduleId,
      "Module ID",
    );

  const normalizedLessonId =
    requireValue(
      lessonId,
      "Lesson ID",
    );

  const normalizedLessonSlug =
    requireValue(
      lessonSlug,
      "Lesson slug",
    );

  const normalizedNextLessonSlug =
    nextLessonSlug?.trim() ||
    null;

  try {
    await completeCurrentUserLesson({
      courseId:
        normalizedCourseId,

      moduleId:
        normalizedModuleId,

      lessonId:
        normalizedLessonId,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to complete this lesson.";

    const assessmentRequired =
      message.includes(
        "Pass the required lesson assessment before completing this lesson.",
      );

    if (assessmentRequired) {
      return {
        success: false,
        message:
          "Knowledge check required. Pass the required lesson assessment before marking this lesson complete.",
      };
    }

    console.error(
      "[CASE University] Unable to complete lesson.",
      error,
    );

    return {
      success: false,
      message:
        "We could not save your lesson completion. Please try again.",
    };
  }

  const certificateResult =
    await tryIssueCertificateAfterCompletion(
      normalizedCourseId,
      normalizedCourseSlug,
    );

  revalidateUniversityProgressPaths(
    normalizedCourseSlug,
    normalizedLessonSlug,
  );

  if (
    normalizedNextLessonSlug
  ) {
    revalidatePath(
      `/courses/${normalizedCourseSlug}/lessons/${normalizedNextLessonSlug}`,
    );
  }

  return {
    success: true,
    message: certificateResult.issued
      ? "Lesson completed. Your course certificate has been issued."
      : "Lesson completed.",
    certificateIssued:
      certificateResult.issued,
    certificateId:
      certificateResult.certificate?.id,
    certificateNumber:
      certificateResult.certificate?.certificate_number,
  };
}

export async function completeLessonAndContinueAction({
  courseId,
  courseSlug,
  moduleId,
  lessonId,
  lessonSlug,
  nextLessonSlug,
}: CompleteLessonInput): Promise<UniversityProgressActionState> {
  const normalizedCourseId =
    requireValue(
      courseId,
      "Course ID",
    );

  const normalizedCourseSlug =
    requireValue(
      courseSlug,
      "Course slug",
    );

  const normalizedModuleId =
    requireValue(
      moduleId,
      "Module ID",
    );

  const normalizedLessonId =
    requireValue(
      lessonId,
      "Lesson ID",
    );

  const normalizedLessonSlug =
    requireValue(
      lessonSlug,
      "Lesson slug",
    );

  const normalizedNextLessonSlug =
    nextLessonSlug?.trim() ||
    null;

  try {
    await completeCurrentUserLesson({
      courseId:
        normalizedCourseId,

      moduleId:
        normalizedModuleId,

      lessonId:
        normalizedLessonId,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to complete this lesson.";

    const assessmentRequired =
      message.includes(
        "Pass the required lesson assessment before completing this lesson.",
      );

    if (assessmentRequired) {
      return {
        success: false,
        message:
          "Knowledge check required. Pass the required lesson assessment before continuing to the next lesson.",
      };
    }

    console.error(
      "[CASE University] Unable to complete lesson and continue.",
      error,
    );

    return {
      success: false,
      message:
        "We could not save your lesson completion. Please try again.",
    };
  }

  await tryIssueCertificateAfterCompletion(
    normalizedCourseId,
    normalizedCourseSlug,
  );

  revalidateUniversityProgressPaths(
    normalizedCourseSlug,
    normalizedLessonSlug,
  );

  if (
    normalizedNextLessonSlug
  ) {
    revalidatePath(
      `/courses/${normalizedCourseSlug}/lessons/${normalizedNextLessonSlug}`,
    );

    redirect(
      `/courses/${normalizedCourseSlug}/lessons/${normalizedNextLessonSlug}`,
    );
  }

  redirect(
    `/courses/${normalizedCourseSlug}`,
  );
}

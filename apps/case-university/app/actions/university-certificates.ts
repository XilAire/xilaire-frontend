"use server";

import { revalidatePath } from "next/cache";

import {
  getCurrentUserCertificateEligibility,
  issueCurrentUserCertificate,
} from "@/lib/university/certificates";

export type UniversityCertificateActionState = {
  success: boolean;
  message: string;
  certificateId?: string;
  certificateNumber?: string;
};

type IssueCertificateInput = {
  courseId: string;
  courseSlug: string;
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

function revalidateCertificatePaths(
  courseSlug: string,
) {
  revalidatePath(
    "/dashboard",
  );

  revalidatePath(
    "/learning",
  );

  revalidatePath(
    "/progress",
  );

  revalidatePath(
    "/certificates",
  );

  revalidatePath(
    `/courses/${courseSlug}`,
  );
}

export async function issueCertificateAction(
  input: IssueCertificateInput,
): Promise<UniversityCertificateActionState> {
  try {
    const courseId =
      requireValue(
        input.courseId,
        "Course ID",
      );

    const courseSlug =
      requireValue(
        input.courseSlug,
        "Course slug",
      );

    const eligibility =
      await getCurrentUserCertificateEligibility(
        courseId,
      );

    if (
      eligibility.alreadyIssued &&
      eligibility.certificate
    ) {
      revalidateCertificatePaths(
        courseSlug,
      );

      return {
        success: true,
        message:
          "Your certificate has already been issued.",
        certificateId:
          eligibility.certificate.id,
        certificateNumber:
          eligibility.certificate.certificate_number,
      };
    }

    if (
      !eligibility.eligible
    ) {
      if (
        eligibility.reason ===
        "course_not_found"
      ) {
        return {
          success: false,
          message:
            "This course could not be found.",
        };
      }

      if (
        eligibility.reason ===
        "course_has_no_lessons"
      ) {
        return {
          success: false,
          message:
            "This course does not currently contain any lessons and is not eligible for a certificate.",
        };
      }

      if (
        eligibility.reason ===
        "course_incomplete"
      ) {
        return {
          success: false,
          message:
            `Complete all lessons before claiming your certificate. ${eligibility.completedLessons} of ${eligibility.totalLessons} lessons are currently complete.`,
        };
      }

      return {
        success: false,
        message:
          "Certificate requirements have not yet been met.",
      };
    }

    const certificate =
      await issueCurrentUserCertificate(
        courseId,
      );

    revalidateCertificatePaths(
      courseSlug,
    );

    return {
      success: true,
      message:
        "Your CASE University certificate has been issued.",
      certificateId:
        certificate.id,
      certificateNumber:
        certificate.certificate_number,
    };
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to issue the certificate.";

    return {
      success: false,
      message,
    };
  }
}

export async function reconcileCompletedCourseCertificateAction(
  input: IssueCertificateInput,
): Promise<UniversityCertificateActionState> {
  try {
    const courseId = requireValue(
      input.courseId,
      "Course ID",
    );

    const courseSlug = requireValue(
      input.courseSlug,
      "Course slug",
    );

    const eligibility =
      await getCurrentUserCertificateEligibility(
        courseId,
      );

    if (
      eligibility.alreadyIssued &&
      eligibility.certificate
    ) {
      revalidateCertificatePaths(
        courseSlug,
      );

      return {
        success: true,
        message:
          "Your certificate has already been issued.",
        certificateId:
          eligibility.certificate.id,
        certificateNumber:
          eligibility.certificate.certificate_number,
      };
    }

    if (!eligibility.eligible) {
      return {
        success: false,
        message:
          eligibility.reason === "course_incomplete"
            ? `This course is not complete yet. ${eligibility.completedLessons} of ${eligibility.totalLessons} lessons are complete.`
            : "This course is not currently eligible for certificate issuance.",
      };
    }

    const certificate =
      await issueCurrentUserCertificate(
        courseId,
      );

    revalidateCertificatePaths(
      courseSlug,
    );

    return {
      success: true,
      message:
        "Your CASE University certificate has been issued.",
      certificateId:
        certificate.id,
      certificateNumber:
        certificate.certificate_number,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to reconcile the certificate.";

    return {
      success: false,
      message,
    };
  }
}

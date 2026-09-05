"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createSupabaseServerServiceClient,
} from "@/lib/supabase/serverService";
import {
  getUniversityStripeMode,
} from "@/lib/university/stripe-mode";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import type {
  AdminLessonAssessmentDraft,
  AssessmentAttemptSummary,
  AssessmentSubmissionResult,
  LearnerLessonAssessment,
} from "@/lib/university/assessments";

function createAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_UNIVERSITY;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_UNIVERSITY;

  if (!url || !key) {
    throw new Error(
      "CASE University service-role configuration is missing.",
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function requireUniversityAdmin() {
  const role = await resolveCurrentUserRole();

  if (!role || role.role_rank < 4) {
    throw new Error("Administrator access required.");
  }
}

export async function getLearnerLessonAssessmentAction(
  lessonId: string,
): Promise<LearnerLessonAssessment | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const stripeMode =
    getUniversityStripeMode();

  const serviceSupabase =
    createSupabaseServerServiceClient();

  const { data, error } = await serviceSupabase.rpc(
    "get_university_user_lesson_assessment",
    {
      p_user_id: user.id,
      p_lesson_id: lessonId,
      p_stripe_mode: stripeMode,
    },
  );

  if (error) {
    console.error(
      "[CASE University] Assessment load failed.",
      error,
    );
    return null;
  }

  return (data ?? null) as LearnerLessonAssessment | null;
}

export async function getCurrentAssessmentAttemptSummaryAction(
  assessmentId: string,
): Promise<AssessmentAttemptSummary> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      attemptCount: 0,
      bestScore: null,
      hasPassed: false,
      lastScore: null,
    };
  }

  const { data, error } = await supabase
    .from("university_assessment_attempts")
    .select("score, passed, completed_at")
    .eq("assessment_id", assessmentId)
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false });

  if (error) {
    console.error(
      "[CASE University] Unable to load assessment attempts.",
      error,
    );

    return {
      attemptCount: 0,
      bestScore: null,
      hasPassed: false,
      lastScore: null,
    };
  }

  const attempts = data ?? [];

  return {
    attemptCount: attempts.length,
    bestScore:
      attempts.length > 0
        ? Math.max(
            ...attempts.map((attempt) => attempt.score),
          )
        : null,
    hasPassed: attempts.some((attempt) => attempt.passed),
    lastScore: attempts[0]?.score ?? null,
  };
}

export async function submitLessonAssessmentAction(
  assessmentId: string,
  answers: Record<string, string>,
): Promise<{
  success: boolean;
  message: string;
  result?: AssessmentSubmissionResult;
}> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "Sign in before submitting an assessment.",
    };
  }

  const stripeMode =
    getUniversityStripeMode();

  const serviceSupabase =
    createSupabaseServerServiceClient();

  const { data, error } = await serviceSupabase.rpc(
    "submit_university_user_lesson_assessment",
    {
      p_user_id: user.id,
      p_assessment_id: assessmentId,
      p_answers: answers,
      p_stripe_mode: stripeMode,
    },
  );

  if (error) {
    console.error(
      "[CASE University] Assessment submission failed.",
      error,
    );

    return {
      success: false,
      message:
        "Unable to grade the assessment right now.",
    };
  }

  const result = data as AssessmentSubmissionResult;

  return {
    success: true,
    message: result.passed
      ? "Assessment passed."
      : "Assessment submitted. Review the results and try again.",
    result,
  };
}

export async function saveLessonAssessmentAction(
  input: {
    courseId: string;
    moduleId: string;
    lessonId: string;
    assessment: AdminLessonAssessmentDraft;
  },
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await requireUniversityAdmin();
  } catch {
    return {
      success: false,
      message:
        "You do not have permission to manage assessments.",
    };
  }

  const {
    courseId,
    moduleId,
    lessonId,
    assessment,
  } = input;

  if (!assessment.title.trim()) {
    return {
      success: false,
      message: "Assessment title is required.",
    };
  }

  if (
    !Number.isInteger(assessment.passingScore) ||
    assessment.passingScore < 1 ||
    assessment.passingScore > 100
  ) {
    return {
      success: false,
      message:
        "Passing score must be between 1 and 100.",
    };
  }

  if (
    assessment.status === "published" &&
    assessment.questions.length === 0
  ) {
    return {
      success: false,
      message:
        "Add at least one question before publishing.",
    };
  }

  for (const question of assessment.questions) {
    if (!question.prompt.trim()) {
      return {
        success: false,
        message:
          "Every assessment question needs a prompt.",
      };
    }

    if (question.answers.length < 2) {
      return {
        success: false,
        message:
          "Every assessment question needs at least two answers.",
      };
    }

    const correctAnswers =
      question.answers.filter(
        (answer) => answer.isCorrect,
      );

    if (correctAnswers.length !== 1) {
      return {
        success: false,
        message:
          "Every assessment question must have exactly one correct answer.",
      };
    }

    if (
      question.answers.some(
        (answer) => !answer.answerText.trim(),
      )
    ) {
      return {
        success: false,
        message:
          "Assessment answer choices cannot be blank.",
      };
    }

    if (
      question.questionType === "true_false" &&
      question.answers.length !== 2
    ) {
      return {
        success: false,
        message:
          "True / False questions must have exactly two answers.",
      };
    }
  }

  const admin = createAdminClient();

  const transactionalQuestions =
    assessment.questions.map((question) => ({
      questionType: question.questionType,
      prompt: question.prompt.trim(),
      explanation:
        question.explanation.trim() || null,
      answers: question.answers.map((answer) => ({
        answerText: answer.answerText.trim(),
        isCorrect: answer.isCorrect,
      })),
    }));

  const { data: savedAssessmentId, error: saveError } =
    await admin.rpc(
      "save_university_lesson_assessment",
      {
        p_assessment_id:
          assessment.id || null,
        p_course_id: courseId,
        p_module_id: moduleId,
        p_lesson_id: lessonId,
        p_title: assessment.title.trim(),
        p_instructions:
          assessment.instructions.trim() || null,
        p_passing_score:
          assessment.passingScore,
        p_is_required:
          assessment.isRequired,
        p_status:
          assessment.status,
        p_questions:
          transactionalQuestions,
      },
    );

  if (saveError || !savedAssessmentId) {
    console.error(
      "[CASE University Admin] Transactional assessment save failed.",
      saveError,
    );

    const databaseMessage =
      saveError?.message ?? "";

    const knownValidationMessages = [
      "The lesson could not be found or does not belong to the supplied course and module.",
      "Assessment title is required.",
      "Passing score must be between 1 and 100.",
      "Invalid assessment status.",
      "Assessment questions must be supplied as an array.",
      "Add at least one question before publishing.",
      "Every assessment question needs a prompt.",
      "Every assessment question needs answers.",
      "Every assessment question needs at least two answers.",
      "Unsupported assessment question type.",
      "True / False questions must have exactly two answers.",
      "Every assessment question must have exactly one correct answer.",
      "Assessment answer choices cannot be blank.",
      "The assessment no longer belongs to this lesson.",
    ];

    const knownMessage =
      knownValidationMessages.find((message) =>
        databaseMessage.includes(message),
      );

    return {
      success: false,
      message:
        knownMessage ??
        "Unable to save the assessment. No assessment changes were committed.",
    };
  }

  revalidatePath(
    `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`,
  );
  revalidatePath("/courses");

  return {
    success: true,
    message:
      "Lesson assessment saved successfully.",
  };
}

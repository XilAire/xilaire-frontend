"use server";

import { revalidatePath } from "next/cache";

import {
  abandonCurrentUserPracticeSession,
  createCurrentUserMissedQuestionsPracticeSession,
  createCurrentUserPracticeSession,
  createCurrentUserWeakAreaPracticeSession,
  submitCurrentUserPracticeSession,
  type UniversityPracticeSubmissionResult,
} from "@/lib/university/practice";

export async function createPracticeSessionAction(input: {
  scopeType: "course" | "module";
  courseId: string;
  moduleId?: string | null;
  questionCount: number;
}): Promise<{
  success: boolean;
  message: string;
  sessionId?: string;
}> {
  try {
    const session = await createCurrentUserPracticeSession(input);

    revalidatePath("/practice");

    return {
      success: true,
      message: "Practice session created.",
      sessionId: session.id,
    };
  } catch (error) {
    console.error("[CASE University] Unable to create practice session.", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to create practice session right now.",
    };
  }
}

export async function createMissedQuestionsPracticeSessionAction(
  questionCount: number,
): Promise<{
  success: boolean;
  message: string;
  sessionId?: string;
}> {
  try {
    const session =
      await createCurrentUserMissedQuestionsPracticeSession(questionCount);

    revalidatePath("/practice");

    return {
      success: true,
      message: "Missed-questions practice created.",
      sessionId: session.id,
    };
  } catch (error) {
    console.error(
      "[CASE University] Unable to create missed-questions practice.",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to create missed-questions practice right now.",
    };
  }
}

export async function createWeakAreaPracticeSessionAction(
  questionCount: number,
): Promise<{
  success: boolean;
  message: string;
  sessionId?: string;
}> {
  try {
    const session =
      await createCurrentUserWeakAreaPracticeSession(questionCount);

    revalidatePath("/practice");

    return {
      success: true,
      message: "Weak-area practice created.",
      sessionId: session.id,
    };
  } catch (error) {
    console.error("[CASE University] Unable to create weak-area practice.", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to create weak-area practice right now.",
    };
  }
}

export async function submitPracticeSessionAction(
  sessionId: string,
  answers: Record<string, string>,
): Promise<{
  success: boolean;
  message: string;
  result?: UniversityPracticeSubmissionResult;
}> {
  try {
    const result = await submitCurrentUserPracticeSession({
      sessionId,
      answers,
    });

    revalidatePath("/practice");
    revalidatePath(`/practice/${sessionId}`);

    return {
      success: true,
      message: "Practice session graded.",
      result,
    };
  } catch (error) {
    console.error("[CASE University] Unable to submit practice session.", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to grade this practice session right now.",
    };
  }
}

export async function abandonPracticeSessionAction(
  sessionId: string,
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const abandoned = await abandonCurrentUserPracticeSession(sessionId);

    revalidatePath("/practice");
    revalidatePath(`/practice/${sessionId}`);

    return {
      success: abandoned,
      message: abandoned
        ? "Practice session abandoned."
        : "This practice session is no longer active.",
    };
  } catch (error) {
    console.error("[CASE University] Unable to abandon practice session.", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to abandon this practice session right now.",
    };
  }
}

import "server-only";

import { createClient } from "@supabase/supabase-js";

import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import type {
  AdminLessonAssessmentDraft,
  AdminAssessmentQuestion,
} from "@/lib/university/assessments";

type AssessmentRow = {
  id: string;
  title: string;
  instructions: string | null;
  passing_score: number;
  is_required: boolean;
  status: "draft" | "published" | "archived";
};

type QuestionRow = {
  id: string;
  question_type: "multiple_choice" | "true_false";
  prompt: string;
  explanation: string | null;
  sort_order: number;
};

type AnswerRow = {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean;
  sort_order: number;
};

function createAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_UNIVERSITY;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_UNIVERSITY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "CASE University service-role configuration is missing.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getAdminLessonAssessment(
  {
    courseId,
    moduleId,
    lessonId,
  }: {
    courseId: string;
    moduleId: string;
    lessonId: string;
  },
): Promise<AdminLessonAssessmentDraft | undefined> {
  const role = await resolveCurrentUserRole();

  if (!role || role.role_rank < 4) {
    throw new Error("Administrator access required.");
  }

  const admin = createAdminClient();

  const { data: assessment, error: assessmentError } =
    await admin
      .from("university_lesson_assessments")
      .select(`
        id,
        title,
        instructions,
        passing_score,
        is_required,
        status
      `)
      .eq("course_id", courseId)
      .eq("module_id", moduleId)
      .eq("lesson_id", lessonId)
      .maybeSingle();

  if (assessmentError) {
    console.error(
      "[CASE University Admin] Unable to load lesson assessment.",
      assessmentError,
    );
    throw new Error("Unable to load the lesson assessment.");
  }

  if (!assessment) {
    return undefined;
  }

  const assessmentRow = assessment as AssessmentRow;

  const { data: questions, error: questionsError } =
    await admin
      .from("university_assessment_questions")
      .select(`
        id,
        question_type,
        prompt,
        explanation,
        sort_order
      `)
      .eq("assessment_id", assessmentRow.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

  if (questionsError) {
    console.error(
      "[CASE University Admin] Unable to load assessment questions.",
      questionsError,
    );
    throw new Error("Unable to load assessment questions.");
  }

  const questionRows = (questions ?? []) as QuestionRow[];
  const questionIds = questionRows.map((question) => question.id);

  let answerRows: AnswerRow[] = [];

  if (questionIds.length > 0) {
    const { data: answers, error: answersError } =
      await admin
        .from("university_assessment_answers")
        .select(`
          id,
          question_id,
          answer_text,
          is_correct,
          sort_order
        `)
        .in("question_id", questionIds)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

    if (answersError) {
      console.error(
        "[CASE University Admin] Unable to load assessment answers.",
        answersError,
      );
      throw new Error("Unable to load assessment answers.");
    }

    answerRows = (answers ?? []) as AnswerRow[];
  }

  const questionsForEditor: AdminAssessmentQuestion[] =
    questionRows.map((question) => ({
      id: question.id,
      questionType: question.question_type,
      prompt: question.prompt,
      explanation: question.explanation ?? "",
      answers: answerRows
        .filter(
          (answer) =>
            answer.question_id === question.id,
        )
        .sort(
          (left, right) =>
            left.sort_order - right.sort_order,
        )
        .map((answer) => ({
          id: answer.id,
          answerText: answer.answer_text,
          isCorrect: answer.is_correct,
        })),
    }));

  return {
    id: assessmentRow.id,
    title: assessmentRow.title,
    instructions: assessmentRow.instructions ?? "",
    passingScore: assessmentRow.passing_score,
    isRequired: assessmentRow.is_required,
    status: assessmentRow.status,
    questions: questionsForEditor,
  };
}

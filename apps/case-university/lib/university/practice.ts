import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServerServiceClient } from "@/lib/supabase/serverService";
import { getUniversityStripeMode } from "@/lib/university/stripe-mode";

export type UniversityPracticeScopeType =
  | "course"
  | "module"
  | "missed_questions"
  | "weak_areas";

export type UniversityPracticeSessionStatus =
  | "active"
  | "completed"
  | "abandoned";

export type UniversityPracticeCatalogModule = {
  id: string;
  slug: string;
  title: string;
  reached_lessons: number;
  available_questions: number;
};

export type UniversityPracticeCatalogCourse = {
  id: string;
  slug: string;
  title: string;
  reached_lessons: number;
  available_questions: number;
  modules: UniversityPracticeCatalogModule[];
};

export type UniversityPracticeCatalog = {
  courses: UniversityPracticeCatalogCourse[];
};

export type UniversityPracticeAnswerOption = {
  id: string;
  answer_text: string;
  sort_order: number;
};

export type UniversityPracticeQuestion = {
  id: string;
  source_question_id: string;
  course_title: string;
  module_title: string;
  lesson_title: string;
  lesson_slug: string;
  question_type: "multiple_choice" | "true_false";
  prompt: string;
  sort_order: number;
  answers: UniversityPracticeAnswerOption[];
};

export type UniversityPracticeSession = {
  id: string;
  scope_type: UniversityPracticeScopeType;
  course_id: string | null;
  module_id: string | null;
  course_title: string;
  module_title: string | null;
  question_count: number;
  status: UniversityPracticeSessionStatus;
  started_at: string;
  completed_at?: string | null;
  questions: UniversityPracticeQuestion[];
};

export type UniversityPracticeSubmissionResultItem = {
  session_question_id: string;
  source_question_id: string;
  selected_answer_id: string | null;
  correct_answer_id: string;
  correct: boolean;
  explanation: string | null;
};

export type UniversityPracticeSubmissionResult = {
  attempt_id: string;
  session_id: string;
  score: number;
  correct_count: number;
  question_count: number;
  results: UniversityPracticeSubmissionResultItem[];
};

export type UniversityPracticeHistorySummary = {
  attempt_count: number;
  total_questions: number;
  total_correct: number;
  average_score: number | null;
  best_score: number | null;
  last_practiced_at: string | null;
};

export type UniversityPracticeHistoryAttempt = {
  attempt_id: string;
  session_id: string;
  scope_type: UniversityPracticeScopeType;
  course_id: string | null;
  module_id: string | null;
  course_title: string;
  module_title: string | null;
  score: number;
  correct_count: number;
  question_count: number;
  completed_at: string;
};

export type UniversityPracticeHistory = {
  summary: UniversityPracticeHistorySummary;
  recent_attempts: UniversityPracticeHistoryAttempt[];
};

export type UniversityPracticePerformanceOverall = {
  attempt_count: number;
  answered_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  accuracy: number | null;
  unique_questions_practiced: number;
  last_practiced_at: string | null;
};

export type UniversityPracticeCoursePerformance = {
  course_id: string;
  course_title: string;
  answered_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  accuracy: number | null;
  unique_questions_practiced: number;
  last_practiced_at: string | null;
};

export type UniversityPracticeModulePerformance = {
  course_id: string;
  module_id: string;
  course_title: string;
  module_title: string;
  answered_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  accuracy: number | null;
  unique_questions_practiced: number;
  last_practiced_at: string | null;
};

export type UniversityPracticeRecentTrend = {
  recent_attempt_count: number;
  previous_attempt_count: number;
  recent_average: number | null;
  previous_average: number | null;
  change: number | null;
};

export type UniversityPracticePerformance = {
  overall: UniversityPracticePerformanceOverall;
  by_course: UniversityPracticeCoursePerformance[];
  by_module: UniversityPracticeModulePerformance[];
  recent_trend: UniversityPracticeRecentTrend;
};

export type UniversityPracticeWeakQuestion = {
  question_id: string;
  course_id: string;
  module_id: string;
  lesson_id: string;
  course_title: string;
  module_title: string;
  lesson_title: string;
  prompt: string;
  attempts: number;
  correct_count: number;
  incorrect_count: number;
  accuracy: number | null;
  last_practiced_at: string | null;
};

export type UniversityPracticeWeakModule = {
  course_id: string;
  module_id: string;
  course_title: string;
  module_title: string;
  answered_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  accuracy: number | null;
  weak_question_count: number;
  last_practiced_at: string | null;
};

export type UniversityPracticeWeakAreas = {
  weak_question_count: number;
  weak_module_count: number;
  weakest_questions: UniversityPracticeWeakQuestion[];
  weakest_modules: UniversityPracticeWeakModule[];
};

async function requireAuthenticatedPracticeUser() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be signed in to use CASE University Practice.");
  }

  return user;
}

export async function getCurrentUserPracticeCatalog(): Promise<UniversityPracticeCatalog> {
  const user = await requireAuthenticatedPracticeUser();
  const stripeMode = getUniversityStripeMode();
  const serviceSupabase = createSupabaseServerServiceClient();

  const { data, error } = await serviceSupabase.rpc(
    "get_university_user_practice_catalog",
    {
      p_user_id: user.id,
      p_stripe_mode: stripeMode,
    },
  );

  if (error) {
    throw new Error(`Unable to load practice catalog: ${error.message}`);
  }

  return (data ?? { courses: [] }) as UniversityPracticeCatalog;
}

export async function createCurrentUserPracticeSession(input: {
  scopeType: "course" | "module";
  courseId: string;
  moduleId?: string | null;
  questionCount: number;
}): Promise<UniversityPracticeSession> {
  const user = await requireAuthenticatedPracticeUser();
  const stripeMode = getUniversityStripeMode();
  const serviceSupabase = createSupabaseServerServiceClient();

  const { data, error } = await serviceSupabase.rpc(
    "create_university_user_practice_session",
    {
      p_user_id: user.id,
      p_scope_type: input.scopeType,
      p_course_id: input.courseId,
      p_module_id:
        input.scopeType === "module" ? input.moduleId ?? null : null,
      p_question_count: input.questionCount,
      p_stripe_mode: stripeMode,
    },
  );

  if (error) {
    throw new Error(`Unable to create practice session: ${error.message}`);
  }

  if (!data || typeof data !== "object") {
    throw new Error("Unable to create practice session: invalid database response.");
  }

  return data as UniversityPracticeSession;
}

export async function createCurrentUserMissedQuestionsPracticeSession(
  questionCount: number,
): Promise<UniversityPracticeSession> {
  const user = await requireAuthenticatedPracticeUser();
  const stripeMode = getUniversityStripeMode();
  const serviceSupabase = createSupabaseServerServiceClient();

  const { data, error } = await serviceSupabase.rpc(
    "create_university_user_missed_questions_practice_session",
    {
      p_user_id: user.id,
      p_question_count: questionCount,
      p_stripe_mode: stripeMode,
    },
  );

  if (error) {
    throw new Error(`Unable to create missed-questions practice: ${error.message}`);
  }

  if (!data || typeof data !== "object") {
    throw new Error("Unable to create missed-questions practice: invalid database response.");
  }

  return data as UniversityPracticeSession;
}

export async function createCurrentUserWeakAreaPracticeSession(
  questionCount: number,
): Promise<UniversityPracticeSession> {
  const user = await requireAuthenticatedPracticeUser();
  const stripeMode = getUniversityStripeMode();
  const serviceSupabase = createSupabaseServerServiceClient();

  const { data, error } = await serviceSupabase.rpc(
    "create_university_user_weak_area_practice_session",
    {
      p_user_id: user.id,
      p_question_count: questionCount,
      p_stripe_mode: stripeMode,
    },
  );

  if (error) {
    throw new Error(`Unable to create weak-area practice: ${error.message}`);
  }

  if (!data || typeof data !== "object") {
    throw new Error("Unable to create weak-area practice: invalid database response.");
  }

  return data as UniversityPracticeSession;
}

export async function getCurrentUserPracticeSession(
  sessionId: string,
): Promise<UniversityPracticeSession | null> {
  const user = await requireAuthenticatedPracticeUser();
  const stripeMode = getUniversityStripeMode();
  const serviceSupabase = createSupabaseServerServiceClient();

  const { data, error } = await serviceSupabase.rpc(
    "get_university_user_practice_session",
    {
      p_user_id: user.id,
      p_session_id: sessionId,
      p_stripe_mode: stripeMode,
    },
  );

  if (error) {
    throw new Error(`Unable to load practice session: ${error.message}`);
  }

  return (data ?? null) as UniversityPracticeSession | null;
}

export async function submitCurrentUserPracticeSession(input: {
  sessionId: string;
  answers: Record<string, string>;
}): Promise<UniversityPracticeSubmissionResult> {
  const user = await requireAuthenticatedPracticeUser();
  const stripeMode = getUniversityStripeMode();
  const serviceSupabase = createSupabaseServerServiceClient();

  const { data, error } = await serviceSupabase.rpc(
    "submit_university_user_practice_session",
    {
      p_user_id: user.id,
      p_session_id: input.sessionId,
      p_answers: input.answers,
      p_stripe_mode: stripeMode,
    },
  );

  if (error) {
    throw new Error(`Unable to submit practice session: ${error.message}`);
  }

  if (!data || typeof data !== "object") {
    throw new Error("Unable to submit practice session: invalid database response.");
  }

  return data as UniversityPracticeSubmissionResult;
}

export async function getCurrentUserPracticeHistory(
  limit = 20,
): Promise<UniversityPracticeHistory> {
  const user = await requireAuthenticatedPracticeUser();
  const serviceSupabase = createSupabaseServerServiceClient();

  const { data, error } = await serviceSupabase.rpc(
    "get_university_user_practice_history",
    {
      p_user_id: user.id,
      p_limit: limit,
    },
  );

  if (error) {
    throw new Error(`Unable to load practice history: ${error.message}`);
  }

  return (
    data ?? {
      summary: {
        attempt_count: 0,
        total_questions: 0,
        total_correct: 0,
        average_score: null,
        best_score: null,
        last_practiced_at: null,
      },
      recent_attempts: [],
    }
  ) as UniversityPracticeHistory;
}

export async function getCurrentUserPracticePerformance(): Promise<UniversityPracticePerformance> {
  const user = await requireAuthenticatedPracticeUser();
  const serviceSupabase = createSupabaseServerServiceClient();

  const { data, error } = await serviceSupabase.rpc(
    "get_university_user_practice_performance",
    {
      p_user_id: user.id,
    },
  );

  if (error) {
    throw new Error(`Unable to load practice performance: ${error.message}`);
  }

  return (
    data ?? {
      overall: {
        attempt_count: 0,
        answered_questions: 0,
        correct_answers: 0,
        incorrect_answers: 0,
        accuracy: null,
        unique_questions_practiced: 0,
        last_practiced_at: null,
      },
      by_course: [],
      by_module: [],
      recent_trend: {
        recent_attempt_count: 0,
        previous_attempt_count: 0,
        recent_average: null,
        previous_average: null,
        change: null,
      },
    }
  ) as UniversityPracticePerformance;
}

export async function getCurrentUserPracticeWeakAreas(
  limit = 10,
): Promise<UniversityPracticeWeakAreas> {
  const user = await requireAuthenticatedPracticeUser();
  const serviceSupabase = createSupabaseServerServiceClient();

  const { data, error } = await serviceSupabase.rpc(
    "get_university_user_practice_weak_areas",
    {
      p_user_id: user.id,
      p_limit: limit,
    },
  );

  if (error) {
    throw new Error(`Unable to load practice weak areas: ${error.message}`);
  }

  return (
    data ?? {
      weak_question_count: 0,
      weak_module_count: 0,
      weakest_questions: [],
      weakest_modules: [],
    }
  ) as UniversityPracticeWeakAreas;
}

export async function abandonCurrentUserPracticeSession(
  sessionId: string,
): Promise<boolean> {
  const user = await requireAuthenticatedPracticeUser();
  const serviceSupabase = createSupabaseServerServiceClient();

  const { data, error } = await serviceSupabase.rpc(
    "abandon_university_user_practice_session",
    {
      p_user_id: user.id,
      p_session_id: sessionId,
    },
  );

  if (error) {
    throw new Error(`Unable to abandon practice session: ${error.message}`);
  }

  return Boolean(data);
}

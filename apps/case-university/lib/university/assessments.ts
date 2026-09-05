export type LearnerAssessmentAnswer = {
  id: string;
  answer_text: string;
  sort_order: number;
};

export type LearnerAssessmentQuestion = {
  id: string;
  question_type: "multiple_choice" | "true_false";
  prompt: string;
  sort_order: number;
  answers: LearnerAssessmentAnswer[];
};

export type LearnerLessonAssessment = {
  id: string;
  lesson_id: string;
  title: string;
  instructions: string | null;
  passing_score: number;
  is_required: boolean;
  questions: LearnerAssessmentQuestion[];
};

export type AssessmentResultItem = {
  question_id: string;
  selected_answer_id: string | null;
  correct_answer_id: string | null;
  correct: boolean;
  explanation: string | null;
};

export type AssessmentSubmissionResult = {
  attempt_id: string;
  score: number;
  passed: boolean;
  correct_count: number;
  question_count: number;
  passing_score: number;
  results: AssessmentResultItem[];
};

export type AssessmentAttemptSummary = {
  attemptCount: number;
  bestScore: number | null;
  hasPassed: boolean;
  lastScore: number | null;
};

export type AdminAssessmentAnswer = {
  id?: string;
  answerText: string;
  isCorrect: boolean;
};

export type AdminAssessmentQuestion = {
  id?: string;
  questionType: "multiple_choice" | "true_false";
  prompt: string;
  explanation: string;
  answers: AdminAssessmentAnswer[];
};

export type AdminLessonAssessmentDraft = {
  id?: string;
  title: string;
  instructions: string;
  passingScore: number;
  isRequired: boolean;
  status: "draft" | "published" | "archived";
  questions: AdminAssessmentQuestion[];
};

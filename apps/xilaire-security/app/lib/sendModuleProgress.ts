// apps/xilaire-security/lib/sendModuleProgress.ts

export type ProgressPayload = {
  moduleId: string;
  watchedSeconds: number;
  watchedPercent: number;
  quizScore?: number;
  isPassed?: boolean;
  markComplete?: boolean;
};

export type ProgressResponse = {
  ok: boolean;
  data: {
    user_id: string;
    module_id: string;
    watched_seconds: number;
    watched_percent: number;
    is_passed: boolean;
    quiz_score: number | null;
    completed_at: string | null;
    updated_at?: string;
  };
  enrollment?: {
    id: string;
    course_id: string;
    progress: number;
    completed_at: string | null;
    updated_at: string;
  } | null;
  warning?: string;
};

export async function sendModuleProgress(
  payload: ProgressPayload
): Promise<ProgressResponse | null> {
  const res = await fetch("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      module_id: payload.moduleId,
      watched_seconds: payload.watchedSeconds,
      watched_percent: payload.watchedPercent,
      quiz_score: payload.quizScore,
      is_passed: payload.isPassed,
      mark_complete: payload.markComplete,
    }),
  });

  if (!res.ok) {
    console.error("sendModuleProgress failed", await res.text());
    return null;
  }

  const data = (await res.json()) as ProgressResponse;
  return data;
}

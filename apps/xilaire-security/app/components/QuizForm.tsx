"use client";
import { useState } from "react";

type Answer = { question_id: string; option_id: string };

export default function QuizForm({
  quiz_id,
  module_id,
  questions,
}: {
  quiz_id: string;
  module_id: string;
  questions: { id: string; text: string; options: { id: string; text: string }[] }[];
}) {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score_percent: number; passed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function choose(qid: string, oid: string) {
    setAnswers((prev) => {
      const rest = prev.filter((a) => a.question_id !== qid);
      return [...rest, { question_id: qid, option_id: oid }];
    });
  }

  async function onSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz_id, module_id, answers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Quiz failed");
      setResult(json.result ?? null);
    } catch (e: any) {
      setError(e?.message ?? "Quiz failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <div className="font-medium">{q.text}</div>
          <div className="space-y-1">
            {q.options.map((o) => (
              <label key={o.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={q.id}
                  onChange={() => choose(q.id, o.id)}
                />
                <span>{o.text}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="rounded bg-black px-4 py-2 text-white"
      >
        {submitting ? "Submitting..." : "Submit Quiz"}
      </button>

      {result && (
        <p>
          Score: {result.score_percent}% — {result.passed ? "Passed 🎉" : "Try again"}
        </p>
      )}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}

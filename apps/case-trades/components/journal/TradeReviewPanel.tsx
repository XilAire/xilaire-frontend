"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";

import { generateTradeReview } from "@/lib/journal/generateTradeReview";

type TradeReview = {
  id: string;
  execution_id: string;
  signal_id: string;
  grade: string;
  execution_score: number;
  discipline_score: number | null;
  summary: string;
  what_went_well: string[] | null;
  mistakes: string[] | null;
  improvement_plan: string[] | null;
  psychology_review: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type TradeReviewPanelProps = {
  tradeId: string;
  initialReview?: TradeReview | null;
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getGradeTone(grade: string) {
  if (grade.startsWith("A")) return "text-emerald-300 bg-emerald-500/10";
  if (grade.startsWith("B")) return "text-sky-300 bg-sky-500/10";
  if (grade.startsWith("C")) return "text-orange-300 bg-orange-500/10";
  return "text-red-300 bg-red-500/10";
}

function getScoreTone(score: number) {
  if (score >= 85) return "text-emerald-300";
  if (score >= 70) return "text-sky-300";
  if (score >= 55) return "text-orange-300";
  return "text-red-300";
}

export default function TradeReviewPanel({
  tradeId,
  initialReview = null,
}: TradeReviewPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [review, setReview] = useState<TradeReview | null>(initialReview);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  function handleGenerateReview() {
    setMessage(null);

    startTransition(async () => {
      const result = await generateTradeReview({
        tradeId,
      });

      if (!result.success) {
        setMessage({
          type: "error",
          text: result.error,
        });

        return;
      }

      setReview(result.review);

      setMessage({
        type: "success",
        text: review
          ? "Trade review regenerated."
          : "Trade review generated.",
      });

      router.refresh();
    });
  }

  return (
    <section className="space-y-5 rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
            <Bot className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              CASE AI Trade Review
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
              Generate a structured review using the signal, execution fills,
              P/L, journal notes, discipline score, and psychology fields.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerateReview}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : review ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isPending
            ? "Reviewing..."
            : review
              ? "Regenerate Review"
              : "Generate Review"}
        </button>
      </div>

      {message && (
        <div
          className={
            "rounded-lg border px-4 py-3 text-sm " +
            (message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : message.type === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-sky-500/30 bg-sky-500/10 text-sky-300")
          }
        >
          {message.text}
        </div>
      )}

      {!review ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-slate-950 p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-emerald-400" />

            <div>
              <h3 className="font-semibold text-slate-100">
                No AI review generated yet
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Add journal notes, setup, emotion, discipline score, and
                screenshots first for a better review. Then generate a CASE AI
                trade review.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <ReviewMetric
              label="Grade"
              value={review.grade}
              className={getGradeTone(review.grade)}
            />

            <ReviewMetric
              label="Execution Score"
              value={`${Number(review.execution_score).toFixed(0)}/100`}
              className={getScoreTone(Number(review.execution_score))}
            />

            <ReviewMetric
              label="Discipline"
              value={
                review.discipline_score !== null &&
                review.discipline_score !== undefined
                  ? `${Number(review.discipline_score).toFixed(0)}/10`
                  : "—"
              }
              className="text-slate-100"
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-950 p-5">
            <div className="mb-3 flex items-center gap-2 text-emerald-400">
              <ClipboardCheck className="h-4 w-4" />
              <h3 className="font-semibold text-slate-100">Summary</h3>
            </div>

            <p className="text-sm leading-7 text-slate-300">
              {review.summary}
            </p>

            <p className="mt-4 text-xs text-slate-600">
              Last updated: {formatDateTime(review.updated_at ?? review.created_at)}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ReviewList
              title="What Went Well"
              icon={<CheckCircle2 />}
              tone="positive"
              items={review.what_went_well ?? []}
            />

            <ReviewList
              title="Mistakes"
              icon={<AlertTriangle />}
              tone="negative"
              items={review.mistakes ?? []}
            />

            <ReviewList
              title="Improvement Plan"
              icon={<Target />}
              tone="neutral"
              items={review.improvement_plan ?? []}
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-950 p-5">
            <div className="mb-3 flex items-center gap-2 text-sky-300">
              <Bot className="h-4 w-4" />
              <h3 className="font-semibold text-slate-100">
                Psychology Review
              </h3>
            </div>

            <p className="text-sm leading-7 text-slate-300">
              {review.psychology_review}
            </p>
          </div>
        </>
      )}
    </section>
  );
}

function ReviewMetric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${className}`}>{value}</p>
    </div>
  );
}

function ReviewList({
  title,
  icon,
  items,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  tone: "positive" | "negative" | "neutral";
}) {
  const iconClass =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
        ? "text-red-400"
        : "text-sky-300";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-5">
      <div className={`mb-4 flex items-center gap-2 ${iconClass}`}>
        {icon}
        <h3 className="font-semibold text-slate-100">{title}</h3>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No items generated.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li
              key={`${title}-${index}`}
              className="flex gap-3 text-sm leading-6 text-slate-300"
            >
              <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${iconClass.replace("text-", "bg-")}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
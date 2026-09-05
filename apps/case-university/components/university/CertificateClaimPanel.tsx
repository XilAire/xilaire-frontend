"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { reconcileCompletedCourseCertificateAction } from "@/app/actions/university-certificates";

type CertificateClaimPanelProps = {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  eligible: boolean;
  alreadyIssued: boolean;
  completedLessons: number;
  totalLessons: number;
  certificateId: string | null;
  certificateNumber: string | null;
  issuedAt: string | null;
};

export default function CertificateClaimPanel({
  courseId,
  courseSlug,
  courseTitle,
  eligible,
  alreadyIssued,
  completedLessons,
  totalLessons,
  certificateId,
  certificateNumber,
  issuedAt,
}: CertificateClaimPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const safeTotal = Math.max(0, totalLessons);
  const safeCompleted = Math.min(
    safeTotal,
    Math.max(0, completedLessons),
  );
  const progress =
    safeTotal > 0
      ? Math.round((safeCompleted / safeTotal) * 100)
      : 0;

  function issueCertificate() {
    setNotice(null);

    startTransition(async () => {
      const result =
        await reconcileCompletedCourseCertificateAction({
          courseId,
          courseSlug,
        });

      if (!result.success) {
        setNotice({
          type: "error",
          message: result.message,
        });
        return;
      }

      setNotice({
        type: "success",
        message: result.message,
      });

      router.refresh();

      if (result.certificateId) {
        router.push(`/certificates/${result.certificateId}`);
      }
    });
  }

  function viewCertificate() {
    if (!certificateId) return;
    router.push(`/certificates/${certificateId}`);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--achievement-border)] bg-[var(--achievement-soft)] shadow-[var(--shadow-sm)]">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-7">
        <div className="min-w-0">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--achievement-border)] bg-[var(--surface-default)] text-[var(--achievement)] shadow-[var(--shadow-xs)]">
              <AwardIcon />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--achievement)]">
                {alreadyIssued ? "Certificate earned" : eligible ? "Certificate ready" : "Certificate progress"}
              </p>

              <h3 className="mt-1 text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">
                {alreadyIssued
                  ? `${courseTitle} certificate`
                  : eligible
                    ? "You completed the course"
                    : "Complete the course to earn your certificate"}
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                {alreadyIssued
                  ? "Your CASE University certificate has been issued and is available to view, print, or save as PDF."
                  : eligible
                    ? "All required lessons are complete. Issue your CASE University certificate now."
                    : `${safeCompleted} of ${safeTotal} lessons are complete.`}
              </p>

              {alreadyIssued && certificateNumber ? (
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--text-muted)]">
                  <span>
                    <strong className="text-[var(--text-secondary)]">Certificate:</strong>{" "}
                    {certificateNumber}
                  </span>

                  {issuedAt ? (
                    <span>
                      <strong className="text-[var(--text-secondary)]">Issued:</strong>{" "}
                      {formatDate(issuedAt)}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {!alreadyIssued ? (
            <div className="mt-5">
              <div className="flex items-center justify-between gap-4 text-xs font-bold text-[var(--text-muted)]">
                <span>{safeCompleted} of {safeTotal} lessons completed</span>
                <span>{progress}%</span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-default)]">
                <div
                  className="h-full rounded-full bg-[var(--achievement)] transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}

          {notice ? (
            <div
              role="status"
              className={[
                "mt-4 rounded-xl border px-4 py-3 text-sm leading-6",
                notice.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200",
              ].join(" ")}
            >
              {notice.message}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
          {alreadyIssued && certificateId ? (
            <button
              type="button"
              onClick={viewCertificate}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--achievement)] px-5 text-sm font-bold text-white shadow-[var(--shadow-sm)] transition hover:opacity-90"
            >
              View certificate
              <ArrowRightIcon />
            </button>
          ) : eligible ? (
            <button
              type="button"
              onClick={issueCertificate}
              disabled={isPending}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--achievement)] px-5 text-sm font-bold text-white shadow-[var(--shadow-sm)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Issuing..." : "Issue certificate"}
              {!isPending ? <AwardIconSmall /> : null}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl border border-[var(--achievement-border)] bg-[var(--surface-default)] px-5 text-sm font-bold text-[var(--text-muted)] opacity-70"
            >
              Certificate locked
            </button>
          )}

          <button
            type="button"
            onClick={() => router.push("/certificates")}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--achievement-border)] bg-[var(--surface-default)] px-4 text-xs font-bold text-[var(--text-secondary)] transition hover:border-[var(--achievement)]"
          >
            All certificates
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function AwardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="5" />
      <path d="m8.5 12.5-1.5 8 5-3 5 3-1.5-8" />
    </svg>
  );
}

function AwardIconSmall() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="5" />
      <path d="m8.5 12.5-1.5 8 5-3 5 3-1.5-8" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  publishUniversityCourseAction,
  publishUniversityLessonAction,
  publishUniversityModuleAction,
  unpublishUniversityCourseAction,
  unpublishUniversityLessonAction,
  unpublishUniversityModuleAction,
} from "@/app/actions/university-admin";

type PublishingControlsProps =
  | {
      entityType: "course";
      status: string;
      courseId: string;
      moduleId?: never;
      lessonId?: never;
      compact?: boolean;
    }
  | {
      entityType: "module";
      status: string;
      courseId: string;
      moduleId: string;
      lessonId?: never;
      compact?: boolean;
    }
  | {
      entityType: "lesson";
      status: string;
      courseId: string;
      moduleId: string;
      lessonId: string;
      compact?: boolean;
    };

type Notice = {
  type: "success" | "error";
  message: string;
} | null;

export default function PublishingControls(
  props: PublishingControlsProps,
) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<Notice>(null);

  const isPublished =
    props.status.toLowerCase() === "published";

  function handleAction() {
    setNotice(null);

    startTransition(async () => {
      let result: {
        success: boolean;
        message: string;
      };

      if (props.entityType === "course") {
        result = isPublished
          ? await unpublishUniversityCourseAction({
              courseId: props.courseId,
            })
          : await publishUniversityCourseAction({
              courseId: props.courseId,
            });
      } else if (props.entityType === "module") {
        result = isPublished
          ? await unpublishUniversityModuleAction({
              courseId: props.courseId,
              moduleId: props.moduleId,
            })
          : await publishUniversityModuleAction({
              courseId: props.courseId,
              moduleId: props.moduleId,
            });
      } else {
        result = isPublished
          ? await unpublishUniversityLessonAction({
              courseId: props.courseId,
              moduleId: props.moduleId,
              lessonId: props.lessonId,
            })
          : await publishUniversityLessonAction({
              courseId: props.courseId,
              moduleId: props.moduleId,
              lessonId: props.lessonId,
            });
      }

      setNotice({
        type: result.success ? "success" : "error",
        message: result.message,
      });

      if (result.success) {
        router.refresh();
      }
    });
  }

  const entityLabel =
    props.entityType.charAt(0).toUpperCase() +
    props.entityType.slice(1);

  return (
    <div className={props.compact ? "space-y-3" : "space-y-4"}>
      {notice ? (
        <div
          role="status"
          className={[
            "rounded-xl border px-3.5 py-3 text-xs leading-5",
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200",
          ].join(" ")}
        >
          {notice.message}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleAction}
        disabled={isPending}
        className={[
          "inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
          isPublished
            ? "border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:border-[var(--border-strong)]"
            : "bg-[var(--primary)] text-white hover:opacity-90",
        ].join(" ")}
      >
        {isPending
          ? isPublished
            ? "Unpublishing..."
            : "Publishing..."
          : isPublished
            ? `Unpublish ${entityLabel}`
            : `Publish ${entityLabel}`}
      </button>

      <p className="text-xs leading-5 text-[var(--text-muted)]">
        {isPublished
          ? "Unpublishing removes this item from the released curriculum. Parent items may also return to draft when required."
          : "Publishing is blocked until this item's readiness requirements are satisfied."}
      </p>
    </div>
  );
}

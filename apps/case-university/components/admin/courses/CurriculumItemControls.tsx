"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  archiveUniversityCurriculumItemAction,
  deleteUniversityCurriculumItemAction,
  moveUniversityCurriculumItemAction,
  publishUniversityCourseAction,
  publishUniversityLessonAction,
  publishUniversityModuleAction,
  restoreUniversityCurriculumItemAction,
  unpublishUniversityCourseAction,
  unpublishUniversityLessonAction,
  unpublishUniversityModuleAction,
} from "@/app/actions/university-admin";

type CurriculumItemControlsProps = {
  entityType: "course" | "module" | "lesson";
  entityId: string;
  courseId: string;
  moduleId?: string;
  status: string;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  deleteRedirectTo?: string;
  compact?: boolean;
};

type Notice = {
  type: "success" | "error";
  message: string;
} | null;

export default function CurriculumItemControls({
  entityType,
  entityId,
  courseId,
  moduleId,
  status,
  canMoveUp = true,
  canMoveDown = true,
  deleteRedirectTo,
  compact = false,
}: CurriculumItemControlsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<Notice>(null);

  const normalizedStatus = status.toLowerCase();
  const isArchived = normalizedStatus === "archived";
  const isDraft = normalizedStatus === "draft";
  const isPublished = normalizedStatus === "published";

  const baseInput = {
    entityType,
    entityId,
    courseId,
    moduleId,
  } as const;

  function run(
    actionName: string,
    operation: () => Promise<{
      success: boolean;
      message: string;
      deleted?: boolean;
    }>,
  ) {
    setNotice(null);
    setPendingAction(actionName);

    startTransition(async () => {
      const result = await operation();

      setNotice({
        type: result.success ? "success" : "error",
        message: result.message,
      });

      setPendingAction(null);

      if (result.success) {
        if (result.deleted && deleteRedirectTo) {
          router.push(deleteRedirectTo);
        }

        router.refresh();
      }
    });
  }

  function confirmDelete() {
    const confirmed = window.confirm(
      `Permanently delete this ${entityType}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    run("delete", () =>
      deleteUniversityCurriculumItemAction(baseInput),
    );
  }

  function changePublishState(publish: boolean) {
    const actionName = publish ? "publish" : "unpublish";

    run(actionName, () => {
      if (entityType === "course") {
        return publish
          ? publishUniversityCourseAction({ courseId })
          : unpublishUniversityCourseAction({ courseId });
      }

      if (entityType === "module") {
        return publish
          ? publishUniversityModuleAction({
              courseId,
              moduleId: entityId,
            })
          : unpublishUniversityModuleAction({
              courseId,
              moduleId: entityId,
            });
      }

      if (!moduleId) {
        return Promise.resolve({
          success: false,
          message: "The lesson module identifier is missing.",
        });
      }

      return publish
        ? publishUniversityLessonAction({
            courseId,
            moduleId,
            lessonId: entityId,
          })
        : unpublishUniversityLessonAction({
            courseId,
            moduleId,
            lessonId: entityId,
          });
    });
  }

  return (
    <div className="space-y-3">
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

      <div
        className={
          compact
            ? "flex flex-wrap items-center gap-2"
            : "grid grid-cols-2 gap-2"
        }
      >
        {!isArchived ? (
          <ActionButton
            label={
              pendingAction === (isPublished ? "unpublish" : "publish")
                ? isPublished
                  ? "Unpublishing..."
                  : "Publishing..."
                : isPublished
                  ? "Unpublish"
                  : "Publish"
            }
            disabled={isPending}
            onClick={() => changePublishState(!isPublished)}
            tone={isPublished ? "default" : "primary"}
          />
        ) : null}

        <ActionButton
          label={pendingAction === "up" ? "Moving..." : "Move up"}
          disabled={isPending || !canMoveUp}
          onClick={() =>
            run("up", () =>
              moveUniversityCurriculumItemAction({
                ...baseInput,
                direction: "up",
              }),
            )
          }
        />

        <ActionButton
          label={pendingAction === "down" ? "Moving..." : "Move down"}
          disabled={isPending || !canMoveDown}
          onClick={() =>
            run("down", () =>
              moveUniversityCurriculumItemAction({
                ...baseInput,
                direction: "down",
              }),
            )
          }
        />

        {isArchived ? (
          <ActionButton
            label={
              pendingAction === "restore"
                ? "Restoring..."
                : "Restore to Draft"
            }
            disabled={isPending}
            onClick={() =>
              run("restore", () =>
                restoreUniversityCurriculumItemAction(baseInput),
              )
            }
          />
        ) : (
          <ActionButton
            label={
              pendingAction === "archive"
                ? "Archiving..."
                : "Archive"
            }
            disabled={isPending}
            onClick={() =>
              run("archive", () =>
                archiveUniversityCurriculumItemAction(baseInput),
              )
            }
          />
        )}

        <button
          type="button"
          onClick={confirmDelete}
          disabled={isPending || !isDraft}
          title={
            isDraft
              ? `Permanently delete this ${entityType}`
              : "Only Draft items can be permanently deleted"
          }
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
        >
          {pendingAction === "delete"
            ? "Deleting..."
            : "Delete Draft"}
        </button>
      </div>

      {!compact ? (
        <p className="text-xs leading-5 text-[var(--text-muted)]">
          Permanent deletion is restricted to Draft items with no protected
          learner history or child curriculum.
        </p>
      ) : null}
    </div>
  );
}

function ActionButton({
  label,
  disabled,
  onClick,
  tone = "default",
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  tone?: "default" | "primary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        tone === "primary"
          ? "inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--primary)] bg-[var(--primary)] px-3 text-xs font-bold text-[var(--primary-foreground)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          : "inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-xs font-bold text-[var(--text-primary)] transition hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-40"
      }
    >
      {label}
    </button>
  );
}

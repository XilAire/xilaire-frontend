"use client";

import {
  FormEvent,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import { updateUniversityLessonSettingsAction } from "@/app/actions/university-admin";
import LessonContentBuilder from "@/components/admin/courses/LessonContentBuilder";
import {
  normalizeLessonContent,
  serializeLessonContent,
} from "@/lib/university/lesson-content";

type LessonSettingsFormProps = {
  lesson: {
    id: string;
    course_id: string;
    module_id: string;
    slug: string;
    title: string;
    short_description: string | null;
    content: unknown;
    status: string;
    lesson_type: string;
    sort_order: number;
    estimated_minutes: number | null;
    video_url: string | null;
    is_preview: boolean;
  };
};

type Notice = {
  type: "success" | "error";
  message: string;
} | null;

const STATUS_OPTIONS = [
  {
    value: "draft",
    label: "Draft",
    description: "Keep the lesson out of released curriculum.",
  },
  {
    value: "published",
    label: "Published",
    description: "Mark the lesson as released curriculum.",
  },
  {
    value: "archived",
    label: "Archived",
    description: "Retain the lesson but remove it from active curriculum.",
  },
] as const;

export default function LessonSettingsForm({
  lesson,
}: LessonSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialContent = useMemo(
    () => normalizeLessonContent(lesson.content),
    [lesson.content],
  );

  const initialContentJson = useMemo(
    () => serializeLessonContent(initialContent),
    [initialContent],
  );

  const [title, setTitle] = useState(lesson.title);
  const [slug, setSlug] = useState(lesson.slug);
  const [shortDescription, setShortDescription] = useState(
    lesson.short_description ?? "",
  );
  const [lessonType, setLessonType] = useState(lesson.lesson_type);
  const [status, setStatus] = useState(lesson.status);
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    lesson.estimated_minutes?.toString() ?? "",
  );
  const [sortOrder, setSortOrder] = useState(
    lesson.sort_order.toString(),
  );
  const [videoUrl, setVideoUrl] = useState(lesson.video_url ?? "");
  const [isPreview, setIsPreview] = useState(lesson.is_preview);
  const [content, setContent] = useState(initialContent);
  const [notice, setNotice] = useState<Notice>(null);

  const hasChanges =
    title !== lesson.title ||
    slug !== lesson.slug ||
    shortDescription !== (lesson.short_description ?? "") ||
    lessonType !== lesson.lesson_type ||
    status !== lesson.status ||
    estimatedMinutes !==
      (lesson.estimated_minutes?.toString() ?? "") ||
    sortOrder !== lesson.sort_order.toString() ||
    videoUrl !== (lesson.video_url ?? "") ||
    isPreview !== lesson.is_preview ||
    serializeLessonContent(content) !== initialContentJson;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const parsedEstimatedMinutes =
      estimatedMinutes.trim() === ""
        ? null
        : Number(estimatedMinutes);

    const parsedSortOrder = Number(sortOrder);

    startTransition(async () => {
      const result =
        await updateUniversityLessonSettingsAction({
          courseId: lesson.course_id,
          moduleId: lesson.module_id,
          lessonId: lesson.id,
          title,
          slug,
          shortDescription,
          lessonType,
          status,
          estimatedMinutes: parsedEstimatedMinutes,
          sortOrder: parsedSortOrder,
          videoUrl,
          isPreview,
          contentJson: serializeLessonContent(content),
        });

      setNotice({
        type: result.success ? "success" : "error",
        message: result.message,
      });

      if (result.success) {
        router.refresh();
      }
    });
  }



  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {notice ? (
        <div
          role="status"
          className={[
            "rounded-2xl border px-4 py-3 text-sm leading-6",
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200",
          ].join(" ")}
        >
          {notice.message}
        </div>
      ) : null}

      <section className={sectionClassName}>
        <SectionHeader
          title="Lesson details"
          description="Manage the learner-facing lesson metadata and ordering."
        />

        <div className="space-y-6 px-5 py-6 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <Field label="Lesson title" htmlFor="lesson-title">
              <input
                id="lesson-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                disabled={isPending}
                className={inputClassName}
              />
            </Field>

            <Field
              label="Lesson slug"
              htmlFor="lesson-slug"
              hint="Unique within this module."
            >
              <input
                id="lesson-slug"
                value={slug}
                onChange={(event) =>
                  setSlug(normalizeSlug(event.target.value))
                }
                required
                disabled={isPending}
                className={inputClassName}
              />
            </Field>
          </div>

          <Field
            label="Short description"
            htmlFor="lesson-short-description"
            hint="Used in curriculum lists and lesson summaries."
          >
            <textarea
              id="lesson-short-description"
              value={shortDescription}
              onChange={(event) =>
                setShortDescription(event.target.value)
              }
              rows={4}
              disabled={isPending}
              className={`${inputClassName} min-h-28 resize-y py-3`}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Field
              label="Lesson type"
              htmlFor="lesson-type"
              hint="Examples: lesson, video, quiz, worksheet."
            >
              <input
                id="lesson-type"
                value={lessonType}
                onChange={(event) =>
                  setLessonType(
                    event.target.value
                      .trimStart()
                      .toLowerCase()
                      .replace(/\s+/g, "_"),
                  )
                }
                required
                disabled={isPending}
                className={inputClassName}
              />
            </Field>

            <Field
              label="Estimated minutes"
              htmlFor="lesson-estimated-minutes"
            >
              <input
                id="lesson-estimated-minutes"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={estimatedMinutes}
                onChange={(event) =>
                  setEstimatedMinutes(event.target.value)
                }
                disabled={isPending}
                className={inputClassName}
              />
            </Field>

            <Field
              label="Sort order"
              htmlFor="lesson-sort-order"
            >
              <input
                id="lesson-sort-order"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(event.target.value)
                }
                required
                disabled={isPending}
                className={inputClassName}
              />
            </Field>

            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Preview access
              </p>

              <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3.5">
                <input
                  type="checkbox"
                  checked={isPreview}
                  onChange={(event) =>
                    setIsPreview(event.target.checked)
                  }
                  disabled={isPending}
                  className="h-4 w-4 accent-[var(--primary)]"
                />

                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  Allow preview
                </span>
              </label>
            </div>
          </div>

          <Field
            label="Video URL"
            htmlFor="lesson-video-url"
            hint="Optional public http/https URL for lesson video content."
          >
            <input
              id="lesson-video-url"
              type="url"
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
              placeholder="https://..."
              disabled={isPending}
              className={inputClassName}
            />
          </Field>
        </div>
      </section>

      <section className={sectionClassName}>
        <SectionHeader
          title="Publishing status"
          description="Control the lesson's curriculum state. Course-level publishing controls come after lesson management."
        />

        <div className="grid gap-3 px-5 py-6 sm:px-6 md:grid-cols-3">
          {STATUS_OPTIONS.map((option) => {
            const selected = status === option.value;

            return (
              <label
                key={option.value}
                className={[
                  "cursor-pointer rounded-2xl border p-4 transition",
                  selected
                    ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface-secondary)] hover:border-[var(--border-strong)]",
                  isPending
                    ? "cursor-not-allowed opacity-60"
                    : "",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="lesson-status"
                  value={option.value}
                  checked={selected}
                  onChange={() => setStatus(option.value)}
                  disabled={isPending}
                  className="sr-only"
                />

                <span className="block text-sm font-bold text-[var(--text-primary)]">
                  {option.label}
                </span>

                <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
                  {option.description}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className={sectionClassName}>
        <SectionHeader
          title="Lesson content builder"
          description="Create the learner-facing lesson with structured content blocks. The builder saves directly into the existing JSONB content column."
        />

        <div className="px-5 py-6 sm:px-6">
          <LessonContentBuilder
            value={content}
            onChange={setContent}
            disabled={isPending}
          />
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-[var(--text-muted)]">
          All writes are performed through the protected CASE University
          admin server action.
        </p>

        <button
          type="submit"
          disabled={isPending || !hasChanges}
          className="inline-flex min-h-11 min-w-36 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save lesson"}
        </button>
      </div>
    </form>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
      <h2 className="text-lg font-bold text-[var(--text-primary)]">
        {title}
      </h2>

      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="text-sm font-semibold text-[var(--text-primary)]"
      >
        {label}
      </label>

      {hint ? (
        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          {hint}
        </p>
      ) : null}

      <div className="mt-2">{children}</div>
    </div>
  );
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const sectionClassName =
  "overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-[var(--shadow-sm)]";

const inputClassName =
  "min-h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-60";

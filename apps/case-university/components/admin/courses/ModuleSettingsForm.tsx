"use client";

import {
  FormEvent,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import { updateUniversityModuleSettingsAction } from "@/app/actions/university-admin";

type ModuleSettingsFormProps = {
  module: {
    id: string;
    course_id: string;
    slug: string;
    title: string;
    description: string | null;
    status: string;
    sort_order: number;
    estimated_minutes: number | null;
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
    description: "Keep this module hidden from released curriculum.",
  },
  {
    value: "published",
    label: "Published",
    description: "Mark this module as released curriculum.",
  },
  {
    value: "archived",
    label: "Archived",
    description: "Retain the module but remove it from active curriculum.",
  },
] as const;

export default function ModuleSettingsForm({
  module,
}: ModuleSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(module.title);
  const [slug, setSlug] = useState(module.slug);
  const [description, setDescription] = useState(
    module.description ?? "",
  );
  const [status, setStatus] = useState(module.status);
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    module.estimated_minutes?.toString() ?? "",
  );
  const [sortOrder, setSortOrder] = useState(
    module.sort_order.toString(),
  );
  const [notice, setNotice] = useState<Notice>(null);

  const hasChanges = useMemo(() => {
    return (
      title !== module.title ||
      slug !== module.slug ||
      description !== (module.description ?? "") ||
      status !== module.status ||
      estimatedMinutes !==
        (module.estimated_minutes?.toString() ?? "") ||
      sortOrder !== module.sort_order.toString()
    );
  }, [
    description,
    estimatedMinutes,
    module,
    slug,
    sortOrder,
    status,
    title,
  ]);

  function handleTitleChange(value: string) {
    setTitle(value);

    if (!hasChanges || slug === module.slug) {
      setSlug(normalizeSlug(value));
    }
  }

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
        await updateUniversityModuleSettingsAction({
          courseId: module.course_id,
          moduleId: module.id,
          title,
          slug,
          description,
          status,
          estimatedMinutes: parsedEstimatedMinutes,
          sortOrder: parsedSortOrder,
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
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-[var(--shadow-sm)]"
    >
      <div className="border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">
          Module settings
        </h2>

        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
          Update the module metadata, learner order, duration, and
          publishing state.
        </p>
      </div>

      <div className="space-y-6 px-5 py-6 sm:px-6">
        {notice ? (
          <div
            className={[
              "rounded-2xl border px-4 py-3 text-sm leading-6",
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200",
            ].join(" ")}
            role="status"
          >
            {notice.message}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <Field label="Module title" htmlFor="module-title">
            <input
              id="module-title"
              value={title}
              onChange={(event) =>
                handleTitleChange(event.target.value)
              }
              required
              disabled={isPending}
              className={inputClassName}
            />
          </Field>

          <Field
            label="Module slug"
            htmlFor="module-slug"
            hint="Used internally and in future learner-facing module URLs."
          >
            <input
              id="module-slug"
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
          label="Description"
          htmlFor="module-description"
          hint="Explain what the learner will understand after completing this module."
        >
          <textarea
            id="module-description"
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            rows={5}
            disabled={isPending}
            className={`${inputClassName} min-h-32 resize-y py-3`}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Estimated minutes"
            htmlFor="module-estimated-minutes"
            hint="Optional total learning time for the module."
          >
            <input
              id="module-estimated-minutes"
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
            htmlFor="module-sort-order"
            hint="Lower values appear earlier in the course."
          >
            <input
              id="module-sort-order"
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
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-[var(--text-primary)]">
            Module status
          </legend>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
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
                    name="module-status"
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
        </fieldset>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs leading-5 text-[var(--text-muted)]">
          Saving changes updates the shared CASE University curriculum.
        </p>

        <button
          type="submit"
          disabled={isPending || !hasChanges}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save module"}
        </button>
      </div>
    </form>
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

const inputClassName =
  "min-h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-60";

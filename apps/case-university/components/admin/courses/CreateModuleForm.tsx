"use client";

import {
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { createUniversityModuleAction } from "@/app/actions/university-admin";

export default function CreateModuleForm({
  courseId,
}: {
  courseId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const parsedEstimatedMinutes =
        estimatedMinutes.trim() === ""
          ? null
          : Number(estimatedMinutes);

      if (
        parsedEstimatedMinutes !== null &&
        (!Number.isInteger(parsedEstimatedMinutes) ||
          parsedEstimatedMinutes <= 0)
      ) {
        setError(
          "Estimated minutes must be a positive whole number.",
        );
        return;
      }

      const result = await createUniversityModuleAction({
        courseId,
        title,
        slug: slug || title,
        description,
        estimatedMinutes: parsedEstimatedMinutes,
      });

      if (!result.success || !result.id) {
        setError(result.message);
        return;
      }

      router.push(
        `/admin/courses/${courseId}/modules/${result.id}`,
      );
      router.refresh();
    });
  }

  return (
    <details
      open
      className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-[var(--shadow-sm)]"
    >
      <summary className="flex cursor-pointer list-none flex-col gap-3 px-5 py-5 marker:hidden sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">
            Curriculum builder
          </p>

          <h2 className="mt-2 text-lg font-bold text-[var(--text-primary)]">
            Add module
          </h2>

          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
            Create the next section of this course. The new module starts as Draft and opens directly in the module editor.
          </p>
        </div>

        <span className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-primary)]">
          New module
        </span>
      </summary>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 border-t border-[var(--border-subtle)] px-5 py-6 sm:px-6"
      >
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
          >
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <Field
            label="Module title"
            hint="Learner-facing name for this module."
          >
            <input
              required
              autoComplete="off"
              value={title}
              onChange={(event) => {
                const nextTitle = event.target.value;
                setTitle(nextTitle);

                if (!slugTouched) {
                  setSlug(normalizeSlug(nextTitle));
                }
              }}
              placeholder="Investing Basics"
              className={inputClassName}
            />
          </Field>

          <Field
            label="Module slug"
            hint="Generated from the title; you can customize it."
          >
            <input
              required
              autoComplete="off"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(normalizeSlug(event.target.value));
              }}
              placeholder="investing-basics"
              className={inputClassName}
            />
          </Field>
        </div>

        <Field
          label="Description"
          hint="Optional summary of what learners will cover in this module."
        >
          <textarea
            rows={4}
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            placeholder="Introduce the major concepts covered in this module..."
            className={textareaClassName}
          />
        </Field>

        <div className="max-w-xs">
          <Field
            label="Estimated minutes"
            hint="Optional total learning time for the module."
          >
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={estimatedMinutes}
              onChange={(event) =>
                setEstimatedMinutes(event.target.value)
              }
              placeholder="60"
              className={inputClassName}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-[var(--text-muted)]">
            New modules are created as Draft and assigned the next curriculum position automatically.
          </p>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-primary)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Creating..." : "Create module"}
          </button>
        </div>
      </form>
    </details>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[var(--text-primary)]">
        {label}
      </span>

      {hint ? (
        <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
          {hint}
        </span>
      ) : null}

      <span className="mt-2 block">{children}</span>
    </label>
  );
}

const inputClassName =
  "min-h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-60";

const textareaClassName =
  `${inputClassName} min-h-28 resize-y py-3 leading-6`;

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

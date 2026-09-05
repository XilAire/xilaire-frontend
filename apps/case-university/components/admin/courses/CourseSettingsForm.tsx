"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  updateUniversityCourseSettingsAction,
} from "@/app/actions/university-admin";

type CourseSettingsFormProps = {
  course: {
    id: string;
    title: string;
    slug: string;
    shortDescription: string | null;
    description: string | null;
    difficulty: string;
    estimatedMinutes: number | null;
    sortOrder: number;
    thumbnailUrl: string | null;
    isFeatured: boolean;
  };
};

export default function CourseSettingsForm({
  course,
}: CourseSettingsFormProps) {
  const router =
    useRouter();

  const [
    title,
    setTitle,
  ] =
    useState(
      course.title,
    );

  const [
    slug,
    setSlug,
  ] =
    useState(
      course.slug,
    );

  const [
    shortDescription,
    setShortDescription,
  ] =
    useState(
      course.shortDescription ??
      "",
    );

  const [
    description,
    setDescription,
  ] =
    useState(
      course.description ??
      "",
    );

  const [
    difficulty,
    setDifficulty,
  ] =
    useState(
      course.difficulty,
    );

  const [
    estimatedMinutes,
    setEstimatedMinutes,
  ] =
    useState(
      course.estimatedMinutes
        ?.toString() ??
      "",
    );

  const [
    sortOrder,
    setSortOrder,
  ] =
    useState(
      course.sortOrder
        .toString(),
    );

  const [
    thumbnailUrl,
    setThumbnailUrl,
  ] =
    useState(
      course.thumbnailUrl ??
      "",
    );

  const [
    isFeatured,
    setIsFeatured,
  ] =
    useState(
      course.isFeatured,
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(
      false,
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string |
      null
    >(
      null,
    );

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<
      string |
      null
    >(
      null,
    );

  const normalizedSlug =
    useMemo(
      () =>
        normalizeSlug(
          slug,
        ),
      [
        slug,
      ],
    );

  const hasChanges =
    title.trim() !==
      course.title ||
    normalizedSlug !==
      course.slug ||
    shortDescription.trim() !==
      (
        course.shortDescription ??
        ""
      ) ||
    description.trim() !==
      (
        course.description ??
        ""
      ) ||
    difficulty !==
      course.difficulty ||
    estimatedMinutes.trim() !==
      (
        course.estimatedMinutes
          ?.toString() ??
        ""
      ) ||
    sortOrder.trim() !==
      course.sortOrder
        .toString() ||
    thumbnailUrl.trim() !==
      (
        course.thumbnailUrl ??
        ""
      ) ||
    isFeatured !==
      course.isFeatured;

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      isSubmitting
    ) {
      return;
    }

    setErrorMessage(
      null,
    );

    setSuccessMessage(
      null,
    );

    const parsedEstimatedMinutes =
      estimatedMinutes.trim()
        ? Number(
            estimatedMinutes,
          )
        : null;

    const parsedSortOrder =
      Number(
        sortOrder,
      );

    if (
      !title.trim()
    ) {
      setErrorMessage(
        "Course title is required.",
      );

      return;
    }

    if (
      !normalizedSlug
    ) {
      setErrorMessage(
        "Course slug is required.",
      );

      return;
    }

    if (
      parsedEstimatedMinutes !==
        null &&
      (
        !Number.isInteger(
          parsedEstimatedMinutes,
        ) ||
        parsedEstimatedMinutes <=
          0
      )
    ) {
      setErrorMessage(
        "Estimated minutes must be a positive whole number.",
      );

      return;
    }

    if (
      !Number.isInteger(
        parsedSortOrder,
      ) ||
      parsedSortOrder < 0
    ) {
      setErrorMessage(
        "Sort order must be zero or a positive whole number.",
      );

      return;
    }

    setIsSubmitting(
      true,
    );

    try {
      const result =
        await updateUniversityCourseSettingsAction(
          {
            courseId:
              course.id,

            title,

            slug:
              normalizedSlug,

            shortDescription,

            description,

            difficulty,

            estimatedMinutes:
              parsedEstimatedMinutes,

            sortOrder:
              parsedSortOrder,

            thumbnailUrl,

            isFeatured,
          },
        );

      if (
        !result.success
      ) {
        setErrorMessage(
          result.message,
        );

        return;
      }

      setSlug(
        normalizedSlug,
      );

      setSuccessMessage(
        result.message,
      );

      router.refresh();
    } catch (
      error
    ) {
      console.error(
        "Unable to save CASE University course settings",
        error,
      );

      setErrorMessage(
        "Unable to save the course settings right now.",
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-6"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <FieldGroup
          label="Course title"
          htmlFor="course-title"
          required
        >
          <input
            id="course-title"
            type="text"
            required
            value={
              title
            }
            onChange={(
              event,
            ) =>
              setTitle(
                event.target.value,
              )
            }
            disabled={
              isSubmitting
            }
            className={inputClassName}
          />
        </FieldGroup>

        <FieldGroup
          label="Course slug"
          htmlFor="course-slug"
          required
          helper={
            normalizedSlug
              ? `/courses/${normalizedSlug}`
              : "Used in the learner-facing URL."
          }
        >
          <input
            id="course-slug"
            type="text"
            required
            value={
              slug
            }
            onChange={(
              event,
            ) =>
              setSlug(
                event.target.value,
              )
            }
            onBlur={() =>
              setSlug(
                normalizedSlug,
              )
            }
            disabled={
              isSubmitting
            }
            className={inputClassName}
          />
        </FieldGroup>
      </div>

      <FieldGroup
        label="Short description"
        htmlFor="course-short-description"
        helper="Used in cards, headers, and compact course summaries."
      >
        <textarea
          id="course-short-description"
          rows={
            3
          }
          value={
            shortDescription
          }
          onChange={(
            event,
          ) =>
            setShortDescription(
              event.target.value,
            )
          }
          disabled={
            isSubmitting
          }
          className={textareaClassName}
        />
      </FieldGroup>

      <FieldGroup
        label="Full description"
        htmlFor="course-description"
        helper="Long-form description for the course detail page."
      >
        <textarea
          id="course-description"
          rows={
            6
          }
          value={
            description
          }
          onChange={(
            event,
          ) =>
            setDescription(
              event.target.value,
            )
          }
          disabled={
            isSubmitting
          }
          className={textareaClassName}
        />
      </FieldGroup>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <FieldGroup
          label="Difficulty"
          htmlFor="course-difficulty"
        >
          <select
            id="course-difficulty"
            value={
              difficulty
            }
            onChange={(
              event,
            ) =>
              setDifficulty(
                event.target.value,
              )
            }
            disabled={
              isSubmitting
            }
            className={inputClassName}
          >
            <option value="beginner">
              Beginner
            </option>

            <option value="intermediate">
              Intermediate
            </option>

            <option value="advanced">
              Advanced
            </option>
          </select>
        </FieldGroup>

        <FieldGroup
          label="Estimated minutes"
          htmlFor="course-duration"
        >
          <input
            id="course-duration"
            type="number"
            min={
              1
            }
            step={
              1
            }
            value={
              estimatedMinutes
            }
            onChange={(
              event,
            ) =>
              setEstimatedMinutes(
                event.target.value,
              )
            }
            disabled={
              isSubmitting
            }
            className={inputClassName}
          />
        </FieldGroup>

        <FieldGroup
          label="Sort order"
          htmlFor="course-sort-order"
        >
          <input
            id="course-sort-order"
            type="number"
            min={
              0
            }
            step={
              1
            }
            required
            value={
              sortOrder
            }
            onChange={(
              event,
            ) =>
              setSortOrder(
                event.target.value,
              )
            }
            disabled={
              isSubmitting
            }
            className={inputClassName}
          />
        </FieldGroup>

        <div>
          <p className="block text-sm font-semibold text-[var(--text-primary)]">
            Featured course
          </p>

          <label
            className="
              mt-2
              flex
              min-h-[48px]
              cursor-pointer
              items-center
              gap-3
              rounded-xl
              border
              border-[var(--border-default)]
              bg-[var(--surface-muted)]
              px-4
              py-3
            "
          >
            <input
              type="checkbox"
              checked={
                isFeatured
              }
              onChange={(
                event,
              ) =>
                setIsFeatured(
                  event.target.checked,
                )
              }
              disabled={
                isSubmitting
              }
              className="h-4 w-4 accent-[var(--primary)]"
            />

            <span className="text-sm font-medium text-[var(--text-secondary)]">
              Show as featured
            </span>
          </label>
        </div>
      </div>

      <FieldGroup
        label="Thumbnail URL"
        htmlFor="course-thumbnail"
        helper="Optional public http/https image URL."
      >
        <input
          id="course-thumbnail"
          type="url"
          value={
            thumbnailUrl
          }
          onChange={(
            event,
          ) =>
            setThumbnailUrl(
              event.target.value,
            )
          }
          disabled={
            isSubmitting
          }
          placeholder="https://..."
          className={inputClassName}
        />
      </FieldGroup>

      {errorMessage ? (
        <div
          role="alert"
          className="
            rounded-xl
            border
            border-red-200
            bg-red-50
            px-4
            py-3
            text-sm
            leading-6
            text-red-700

            dark:border-red-900/60
            dark:bg-red-950/30
            dark:text-red-300
          "
        >
          {
            errorMessage
          }
        </div>
      ) : null}

      {successMessage ? (
        <div
          role="status"
          className="
            rounded-xl
            border
            border-emerald-200
            bg-emerald-50
            px-4
            py-3
            text-sm
            leading-6
            text-emerald-700

            dark:border-emerald-900/60
            dark:bg-emerald-950/30
            dark:text-emerald-300
          "
        >
          {
            successMessage
          }
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-5">
        <p className="text-xs leading-5 text-[var(--text-muted)]">
          Changes are saved through the protected CASE University admin server action.
        </p>

        <button
          type="submit"
          disabled={
            isSubmitting ||
            !hasChanges
          }
          className="
            inline-flex
            min-w-[150px]
            items-center
            justify-center
            rounded-xl
            bg-[var(--primary)]
            px-4
            py-2.5
            text-sm
            font-bold
            text-[var(--primary-foreground)]
            shadow-[var(--shadow-primary)]
            transition
            hover:bg-[var(--primary-hover)]
            focus:outline-none
            focus-visible:ring-2
            focus-visible:ring-[var(--focus-ring)]
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {isSubmitting
            ? "Saving..."
            : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function FieldGroup({
  label,
  htmlFor,
  helper,
  required = false,
  children,
}: {
  label:
    string;

  htmlFor:
    string;

  helper?:
    string;

  required?:
    boolean;

  children:
    React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={
          htmlFor
        }
        className="block text-sm font-semibold text-[var(--text-primary)]"
      >
        {
          label
        }

        {required ? (
          <span className="ml-1 text-red-500">
            *
          </span>
        ) : null}
      </label>

      <div className="mt-2">
        {
          children
        }
      </div>

      {helper ? (
        <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
          {
            helper
          }
        </p>
      ) : null}
    </div>
  );
}

function normalizeSlug(
  value:
    string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

const inputClassName =
  "block w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] hover:border-[var(--border-strong)] focus:border-[var(--primary)] focus:bg-[var(--surface-default)] focus:ring-2 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60";

const textareaClassName =
  `${inputClassName} resize-y`;

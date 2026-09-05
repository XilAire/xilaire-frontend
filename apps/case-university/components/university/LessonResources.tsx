import Link from "next/link";

import type {
  UniversityLessonResource,
  UniversityLessonResourceType,
} from "@/lib/university/lesson-resources";

type LessonResourcesProps = {
  courseSlug: string;
  lessonSlug: string;
  resources: UniversityLessonResource[];
};

function DownloadIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  );
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return null;
  }

  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(kilobytes >= 100 ? 0 : 1)} KB`;
  }

  const megabytes = kilobytes / 1024;

  if (megabytes < 1024) {
    return `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`;
  }

  const gigabytes = megabytes / 1024;

  return `${gigabytes.toFixed(gigabytes >= 100 ? 0 : 1)} GB`;
}

function getResourceLabel(
  resourceType: UniversityLessonResourceType,
) {
  switch (resourceType) {
    case "worksheet":
      return "Worksheet";

    case "checklist":
      return "Checklist";

    case "template":
      return "Template";

    case "reference":
      return "Reference";

    default:
      return "Resource";
  }
}

function getDownloadLabel(
  resourceType: UniversityLessonResourceType,
) {
  switch (resourceType) {
    case "worksheet":
      return "Download worksheet";

    case "checklist":
      return "Download checklist";

    case "template":
      return "Download template";

    case "reference":
      return "Download reference";

    default:
      return "Download resource";
  }
}

export default function LessonResources({
  courseSlug,
  lessonSlug,
  resources,
}: LessonResourcesProps) {
  if (resources.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="lesson-resources-heading"
      className="
        mt-6
        overflow-hidden
        rounded-[var(--radius-xl)]
        border
        border-[var(--border-subtle)]
        bg-[var(--surface-default)]
        shadow-[var(--shadow-sm)]
      "
    >
      <div
        className="
          border-b
          border-[var(--border-subtle)]
          bg-[var(--surface-muted)]
          px-5
          py-5
          sm:px-7
          lg:px-9
        "
      >
        <div
          className="
            mx-auto
            max-w-4xl
          "
        >
          <p
            className="
              text-xs
              font-extrabold
              uppercase
              tracking-[0.16em]
              text-[var(--primary)]
            "
          >
            Lesson resources
          </p>

          <h2
            id="lesson-resources-heading"
            className="
              mt-2
              text-xl
              font-bold
              tracking-tight
              text-[var(--text-primary)]
              sm:text-2xl
            "
          >
            Downloads for this lesson
          </h2>

          <p
            className="
              mt-2
              max-w-2xl
              text-sm
              leading-6
              text-[var(--text-secondary)]
            "
          >
            Download the worksheets and supporting materials for this lesson.
            Files are delivered through CASE University&apos;s protected download
            service.
          </p>
        </div>
      </div>

      <div
        className="
          px-5
          py-5
          sm:px-7
          sm:py-6
          lg:px-9
        "
      >
        <div
          className="
            mx-auto
            grid
            max-w-4xl
            gap-4
          "
        >
          {resources.map((resource) => {
            const fileSize =
              formatFileSize(resource.file_size_bytes);

            const resourceLabel =
              getResourceLabel(resource.resource_type);

            const downloadLabel =
              getDownloadLabel(resource.resource_type);

            const isDraft =
              resource.status === "draft";

            return (
              <article
                key={resource.id}
                className="
                  rounded-2xl
                  border
                  border-[var(--border-subtle)]
                  bg-[var(--surface-default)]
                  p-4
                  sm:p-5
                "
              >
                <div
                  className="
                    flex
                    flex-col
                    gap-4
                    sm:flex-row
                    sm:items-start
                    sm:justify-between
                  "
                >
                  <div
                    className="
                      flex
                      min-w-0
                      gap-3
                    "
                  >
                    <div
                      className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-[var(--primary-border)]
                        bg-[var(--primary-soft)]
                        text-[var(--primary)]
                      "
                    >
                      <FileIcon />
                    </div>

                    <div className="min-w-0">
                      <div
                        className="
                          flex
                          flex-wrap
                          items-center
                          gap-2
                        "
                      >
                        <span
                          className="
                            rounded-full
                            border
                            border-[var(--primary-border)]
                            bg-[var(--primary-soft)]
                            px-2.5
                            py-1
                            text-[9px]
                            font-extrabold
                            uppercase
                            tracking-[0.12em]
                            text-[var(--primary)]
                          "
                        >
                          {resourceLabel}
                        </span>

                        {isDraft ? (
                          <span
                            className="
                              rounded-full
                              border
                              border-[var(--achievement-border)]
                              bg-[var(--achievement-soft)]
                              px-2.5
                              py-1
                              text-[9px]
                              font-extrabold
                              uppercase
                              tracking-[0.12em]
                              text-[var(--achievement)]
                            "
                          >
                            Admin preview · Draft
                          </span>
                        ) : null}
                      </div>

                      <h3
                        className="
                          mt-2
                          break-words
                          text-base
                          font-bold
                          leading-6
                          text-[var(--text-primary)]
                        "
                      >
                        {resource.title}
                      </h3>

                      {resource.description ? (
                        <p
                          className="
                            mt-1.5
                            text-sm
                            leading-6
                            text-[var(--text-secondary)]
                          "
                        >
                          {resource.description}
                        </p>
                      ) : null}

                      <div
                        className="
                          mt-3
                          flex
                          flex-wrap
                          gap-x-3
                          gap-y-1
                          text-[11px]
                          font-semibold
                          uppercase
                          tracking-[0.08em]
                          text-[var(--text-muted)]
                        "
                      >
                        <span>
                          Version {resource.version_number}
                        </span>

                        {fileSize ? (
                          <span>{fileSize}</span>
                        ) : null}

                        <span>
                          {resource.status === "published"
                            ? "Published"
                            : "Draft preview"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/courses/${courseSlug}/lessons/${lessonSlug}/resources/${resource.id}`}
                    prefetch={false}
                    className="
                      inline-flex
                      min-h-11
                      shrink-0
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      bg-[var(--primary)]
                      px-4
                      py-2.5
                      text-sm
                      font-bold
                      text-[var(--primary-foreground)]
                      shadow-[var(--shadow-primary)]
                      outline-none
                      transition
                      hover:bg-[var(--primary-hover)]
                      focus-visible:ring-2
                      focus-visible:ring-[var(--focus-ring)]
                    "
                  >
                    <DownloadIcon />

                    {downloadLabel}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

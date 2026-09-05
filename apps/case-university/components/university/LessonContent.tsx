import type { ReactNode } from "react";

import WorksheetDownloadButton from "@/components/university/WorksheetDownloadButton";
import {
  normalizeLessonContent,
  type LessonCalloutBlock,
  type LessonContentBlock,
} from "@/lib/university/lesson-content";

export default function LessonContent({
  content,
}: {
  content: unknown;
}) {
  const document = normalizeLessonContent(content);

  if (document.blocks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-5 py-10 text-center">
        <p className="text-sm font-bold text-[var(--text-primary)]">
          Lesson content is being prepared.
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Check back soon for the complete lesson.
        </p>
      </div>
    );
  }

  return (
    <article className="space-y-7 text-[var(--text-primary)]">
      {document.blocks.map((block, index) => {
        const worksheet =
          getWorksheetForHeading(
            document.blocks,
            index,
          );

        return (
          <div
            key={block.id}
            className="contents"
          >
            <RenderBlock block={block} />

            {worksheet ? (
              <WorksheetDownloadCard
                title={worksheet.title}
                questions={worksheet.questions}
              />
            ) : null}
          </div>
        );
      })}
    </article>
  );
}

function RenderBlock({
  block,
}: {
  block: LessonContentBlock;
}) {
  if (block.type === "heading") {
    if (block.level === 3) {
      return (
        <h3 className="pt-2 text-xl font-extrabold tracking-tight sm:text-2xl">
          {block.text}
        </h3>
      );
    }

    if (block.level === 4) {
      return (
        <h4 className="pt-1 text-lg font-bold tracking-tight sm:text-xl">
          {block.text}
        </h4>
      );
    }

    return (
      <h2 className="pt-3 text-2xl font-black tracking-tight sm:text-3xl">
        {block.text}
      </h2>
    );
  }

  if (block.type === "paragraph") {
    return (
      <TextParagraph>
        {block.text}
      </TextParagraph>
    );
  }

  if (block.type === "callout") {
    return <Callout block={block} />;
  }

  if (block.type === "list") {
    const items =
      block.items.filter(
        (item) =>
          item.trim().length > 0,
      );

    const className =
      "space-y-2 pl-6 text-base leading-7 text-[var(--text-secondary)] sm:text-[17px]";

    return block.style ===
      "numbered" ? (
      <ol
        className={`${className} list-decimal`}
      >
        {items.map(
          (item, index) => (
            <li key={index}>
              {item}
            </li>
          ),
        )}
      </ol>
    ) : (
      <ul
        className={`${className} list-disc`}
      >
        {items.map(
          (item, index) => (
            <li key={index}>
              {item}
            </li>
          ),
        )}
      </ul>
    );
  }

  if (block.type === "example") {
    return (
      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">
          {block.title ||
            "Example"}
        </p>

        <div className="mt-3">
          <TextParagraph>
            {block.body}
          </TextParagraph>
        </div>
      </section>
    );
  }

  if (block.type === "image") {
    if (!block.url) {
      return null;
    }

    return (
      <figure className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 sm:p-4">
        <img
          src={block.url}
          alt={block.alt}
          className="mx-auto max-h-[560px] w-full rounded-xl object-contain"
        />

        {block.caption ? (
          <figcaption className="px-2 pb-1 pt-3 text-center text-xs leading-5 text-[var(--text-muted)]">
            {block.caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  if (block.type === "table") {
    return (
      <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <caption className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-left text-xs font-bold text-[var(--text-secondary)]">
              {block.caption ||
                "Lesson table"}
            </caption>

            <thead className="bg-[var(--surface-secondary)]">
              <tr>
                {block.headers.map(
                  (
                    header,
                    index,
                  ) => (
                    <th
                      key={index}
                      scope="col"
                      className="border-b border-[var(--border-subtle)] px-4 py-3 font-bold text-[var(--text-primary)]"
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody>
              {block.rows.map(
                (
                  row,
                  rowIndex,
                ) => (
                  <tr
                    key={
                      rowIndex
                    }
                    className="border-b border-[var(--border-subtle)] last:border-b-0"
                  >
                    {block.headers.map(
                      (
                        _,
                        columnIndex,
                      ) => (
                        <td
                          key={
                            columnIndex
                          }
                          className="px-4 py-3 leading-6 text-[var(--text-secondary)]"
                        >
                          {row[
                            columnIndex
                          ] ??
                            ""}
                        </td>
                      ),
                    )}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (
    block.type ===
    "knowledge_check"
  ) {
    return (
      <section className="rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary-soft)] p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">
          Knowledge check
        </p>

        <h3 className="mt-3 text-lg font-bold leading-7 text-[var(--text-primary)]">
          {block.question}
        </h3>

        <div className="mt-4 space-y-2">
          {block.options.map(
            (
              option,
              index,
            ) => (
              <div
                key={index}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]"
              >
                <span className="mr-2 font-bold text-[var(--text-primary)]">
                  {String.fromCharCode(
                    65 +
                      index,
                  )}
                  .
                </span>

                {option}
              </div>
            ),
          )}
        </div>

        <details className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 py-3">
          <summary className="cursor-pointer text-sm font-bold text-[var(--primary)]">
            Reveal answer
          </summary>

          <div className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            <p>
              <span className="font-bold text-[var(--text-primary)]">
                Correct
                answer:
              </span>{" "}
              {block.options[
                block
                  .correctIndex
              ] ?? ""}
            </p>

            {block.explanation ? (
              <p className="mt-2">
                {
                  block.explanation
                }
              </p>
            ) : null}
          </div>
        </details>
      </section>
    );
  }

  return (
    <hr className="border-0 border-t border-[var(--border-default)]" />
  );
}

function WorksheetDownloadCard({
  title,
  questions,
}: {
  title: string;
  questions: string[];
}) {
  return (
    <section className="rounded-2xl border border-[var(--primary-border)] bg-[var(--primary-soft)] p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">
            Downloadable
            worksheet
          </p>

          <h3 className="mt-2 text-lg font-bold text-[var(--text-primary)] sm:text-xl">
            {title}
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Download a
            printable PDF with
            space to write your
            answers. The
            worksheet contains{" "}
            {questions.length}{" "}
            practice{" "}
            {questions.length ===
            1
              ? "question"
              : "questions"}
            .
          </p>
        </div>

        <WorksheetDownloadButton
          title={title}
          questions={questions}
        />
      </div>
    </section>
  );
}

function getWorksheetForHeading(
  blocks: LessonContentBlock[],
  index: number,
): {
  title: string;
  questions: string[];
} | null {
  const block = blocks[index];

  if (
    block?.type !==
      "heading" ||
    block.text
      .trim()
      .toLowerCase() !==
      "worksheet"
  ) {
    return null;
  }

  const nextBlock =
    blocks[index + 1];

  if (
    nextBlock?.type !==
      "list" ||
    nextBlock.style !==
      "numbered"
  ) {
    return null;
  }

  const questions =
    nextBlock.items
      .map((item) =>
        item.trim(),
      )
      .filter(Boolean);

  if (
    questions.length === 0
  ) {
    return null;
  }

  return {
    title:
      "Lesson Worksheet",
    questions,
  };
}

function Callout({
  block,
}: {
  block: LessonCalloutBlock;
}) {
  const styles =
    block.tone === "warning"
      ? "border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/20"
      : block.tone ===
          "tip"
        ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20"
        : "border-[var(--primary)]/30 bg-[var(--primary-soft)]";

  const label =
    block.tone === "warning"
      ? "Important"
      : block.tone ===
          "tip"
        ? "Tip"
        : "Key concept";

  return (
    <aside
      className={`rounded-2xl border p-5 sm:p-6 ${styles}`}
    >
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>

      {block.title ? (
        <h3 className="mt-2 text-lg font-bold text-[var(--text-primary)]">
          {block.title}
        </h3>
      ) : null}

      {block.body ? (
        <div className="mt-2">
          <TextParagraph>
            {block.body}
          </TextParagraph>
        </div>
      ) : null}
    </aside>
  );
}

function TextParagraph({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <p className="whitespace-pre-line text-base leading-7 text-[var(--text-secondary)] sm:text-[17px] sm:leading-8">
      {children}
    </p>
  );
}

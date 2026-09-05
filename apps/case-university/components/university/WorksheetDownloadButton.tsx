"use client";

import {
  useState,
} from "react";

type WorksheetDownloadButtonProps = {
  title: string;
  questions: string[];
};

export default function WorksheetDownloadButton({
  title,
  questions,
}: WorksheetDownloadButtonProps) {
  const [
    isGenerating,
    setIsGenerating,
  ] = useState(false);

  async function handleDownload() {
    if (
      isGenerating ||
      questions.length === 0
    ) {
      return;
    }

    setIsGenerating(true);

    try {
      const {
        PDFDocument,
        StandardFonts,
        rgb,
      } = await import(
        "pdf-lib"
      );

      const pdfDocument =
        await PDFDocument.create();

      const regularFont =
        await pdfDocument.embedFont(
          StandardFonts.Helvetica,
        );

      const boldFont =
        await pdfDocument.embedFont(
          StandardFonts.HelveticaBold,
        );

      const pageWidth = 612;
      const pageHeight = 792;
      const margin = 54;
      const contentWidth =
        pageWidth - margin * 2;

      let page =
        pdfDocument.addPage([
          pageWidth,
          pageHeight,
        ]);

      let y =
        pageHeight - margin;

      function addPage() {
        page =
          pdfDocument.addPage([
            pageWidth,
            pageHeight,
          ]);

        y =
          pageHeight -
          margin;
      }

      function ensureSpace(
        height: number,
      ) {
        if (
          y - height <
          margin
        ) {
          addPage();
        }
      }

      function drawTextLines(
        text: string,
        options: {
          size: number;
          bold?: boolean;
          lineHeight?: number;
          indent?: number;
        },
      ) {
        const font =
          options.bold
            ? boldFont
            : regularFont;

        const lineHeight =
          options.lineHeight ??
          options.size * 1.35;

        const indent =
          options.indent ?? 0;

        const lines =
          wrapPdfText(
            text,
            font,
            options.size,
            contentWidth -
              indent,
          );

        ensureSpace(
          lines.length *
            lineHeight,
        );

        for (
          const line of lines
        ) {
          page.drawText(
            line,
            {
              x:
                margin +
                indent,
              y,
              size:
                options.size,
              font,
              color:
                rgb(
                  0.09,
                  0.13,
                  0.22,
                ),
            },
          );

          y -=
            lineHeight;
        }
      }

      page.drawText(
        "CASE University",
        {
          x: margin,
          y,
          size: 18,
          font: boldFont,
          color: rgb(
            0.15,
            0.39,
            0.92,
          ),
        },
      );

      y -= 20;

      page.drawText(
        "INVESTING ACADEMY",
        {
          x: margin,
          y,
          size: 8,
          font: boldFont,
          color: rgb(
            0.42,
            0.47,
            0.57,
          ),
        },
      );

      y -= 34;

      drawTextLines(
        title,
        {
          size: 22,
          bold: true,
          lineHeight: 28,
        },
      );

      y -= 8;

      drawTextLines(
        "Complete the questions below to reinforce the concepts from this lesson.",
        {
          size: 10,
          lineHeight: 15,
        },
      );

      y -= 18;

      page.drawText(
        "Name: ________________________________",
        {
          x: margin,
          y,
          size: 10,
          font: regularFont,
        },
      );

      page.drawText(
        "Date: ____________________",
        {
          x: 385,
          y,
          size: 10,
          font: regularFont,
        },
      );

      y -= 34;

      questions.forEach(
        (
          question,
          index,
        ) => {
          const prompt =
            `${index + 1}. ${question}`;

          const promptLines =
            wrapPdfText(
              prompt,
              regularFont,
              11,
              contentWidth,
            );

          const answerLines =
            getAnswerLineCount(
              question,
            );

          const neededHeight =
            promptLines.length *
              16 +
            answerLines * 22 +
            22;

          ensureSpace(
            neededHeight,
          );

          drawTextLines(
            prompt,
            {
              size: 11,
              lineHeight: 16,
            },
          );

          y -= 6;

          for (
            let lineIndex = 0;
            lineIndex <
            answerLines;
            lineIndex += 1
          ) {
            page.drawLine({
              start: {
                x: margin,
                y,
              },
              end: {
                x:
                  pageWidth -
                  margin,
                y,
              },
              thickness: 0.6,
              color: rgb(
                0.72,
                0.75,
                0.8,
              ),
            });

            y -= 22;
          }

          y -= 10;
        },
      );

      ensureSpace(52);

      y -= 6;

      page.drawLine({
        start: {
          x: margin,
          y,
        },
        end: {
          x:
            pageWidth -
            margin,
          y,
        },
        thickness: 0.8,
        color: rgb(
          0.84,
          0.86,
          0.9,
        ),
      });

      y -= 20;

      drawTextLines(
        "CASE University worksheets are educational materials and are not financial advice.",
        {
          size: 8,
          lineHeight: 12,
        },
      );

      const bytes =
        await pdfDocument.save();

      const pdfBytes =
        new Uint8Array(
          bytes.byteLength,
        );

      pdfBytes.set(bytes);

      const blob =
        new Blob(
          [pdfBytes.buffer],
          {
            type: "application/pdf",
          },
        );

      const objectUrl =
        URL.createObjectURL(
          blob,
        );

      const anchor =
        document.createElement(
          "a",
        );

      anchor.href =
        objectUrl;

      anchor.download =
        `${slugifyFileName(
          title,
        )}.pdf`;

      document.body.appendChild(
        anchor,
      );

      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(
        objectUrl,
      );
    } catch (error) {
      console.error(
        "[CASE University] Unable to generate worksheet PDF.",
        error,
      );

      window.alert(
        "The worksheet PDF could not be generated. Please try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={
        handleDownload
      }
      disabled={
        isGenerating
      }
      className="
        inline-flex
        min-h-11
        shrink-0
        items-center
        justify-center
        gap-2
        rounded-xl
        bg-[var(--primary)]
        px-5
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
        disabled:cursor-not-allowed
        disabled:opacity-60
      "
    >
      <DownloadIcon />

      {isGenerating
        ? "Creating PDF..."
        : "Download Worksheet PDF"}
    </button>
  );
}

function getAnswerLineCount(
  question: string,
) {
  const length =
    question.trim().length;

  if (length > 120) {
    return 5;
  }

  if (length > 70) {
    return 4;
  }

  return 3;
}

function slugifyFileName(
  value: string,
) {
  const slug =
    value
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

  return slug
    ? `${slug}-case-university`
    : "case-university-worksheet";
}

function wrapPdfText(
  text: string,
  font: {
    widthOfTextAtSize: (
      text: string,
      size: number,
    ) => number;
  },
  size: number,
  maxWidth: number,
) {
  const paragraphs =
    text
      .replace(/\r/g, "")
      .split("\n");

  const lines: string[] =
    [];

  for (
    const paragraph of
    paragraphs
  ) {
    const words =
      paragraph
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (
      words.length === 0
    ) {
      lines.push("");
      continue;
    }

    let line =
      words[0];

    for (
      let index = 1;
      index <
      words.length;
      index += 1
    ) {
      const candidate =
        `${line} ${words[index]}`;

      if (
        font.widthOfTextAtSize(
          candidate,
          size,
        ) <= maxWidth
      ) {
        line =
          candidate;
      } else {
        lines.push(
          line,
        );

        line =
          words[index];
      }
    }

    lines.push(line);
  }

  return lines;
}

function DownloadIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
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

export const LESSON_CONTENT_VERSION = 1 as const;

export type LessonHeadingBlock = {
  id: string;
  type: "heading";
  level: 2 | 3 | 4;
  text: string;
};

export type LessonParagraphBlock = {
  id: string;
  type: "paragraph";
  text: string;
};

export type LessonCalloutBlock = {
  id: string;
  type: "callout";
  tone: "key" | "tip" | "warning";
  title: string;
  body: string;
};

export type LessonListBlock = {
  id: string;
  type: "list";
  style: "bullet" | "numbered";
  items: string[];
};

export type LessonExampleBlock = {
  id: string;
  type: "example";
  title: string;
  body: string;
};

export type LessonImageBlock = {
  id: string;
  type: "image";
  url: string;
  alt: string;
  caption: string;
};

export type LessonTableBlock = {
  id: string;
  type: "table";
  caption: string;
  headers: string[];
  rows: string[][];
};

export type LessonKnowledgeCheckBlock = {
  id: string;
  type: "knowledge_check";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type LessonDividerBlock = {
  id: string;
  type: "divider";
};

export type LessonContentBlock =
  | LessonHeadingBlock
  | LessonParagraphBlock
  | LessonCalloutBlock
  | LessonListBlock
  | LessonExampleBlock
  | LessonImageBlock
  | LessonTableBlock
  | LessonKnowledgeCheckBlock
  | LessonDividerBlock;

export type LessonContentDocument = {
  version: typeof LESSON_CONTENT_VERSION;
  blocks: LessonContentBlock[];
};

export function createEmptyLessonContent(): LessonContentDocument {
  return {
    version: LESSON_CONTENT_VERSION,
    blocks: [],
  };
}

export function normalizeLessonContent(
  value: unknown,
): LessonContentDocument {
  if (!isRecord(value)) {
    return createEmptyLessonContent();
  }

  const rawBlocks = Array.isArray(value.blocks) ? value.blocks : [];
  const blocks = rawBlocks
    .map(normalizeBlock)
    .filter((block): block is LessonContentBlock => block !== null);

  return {
    version: LESSON_CONTENT_VERSION,
    blocks,
  };
}

export function serializeLessonContent(
  document: LessonContentDocument,
) {
  return JSON.stringify(normalizeLessonContent(document));
}

export function isLessonContentPublishable(value: unknown) {
  const document = normalizeLessonContent(value);

  if (document.blocks.length === 0) {
    return false;
  }

  return document.blocks.some((block) => {
    switch (block.type) {
      case "heading":
      case "paragraph":
        return block.text.trim().length > 0;
      case "callout":
        return block.title.trim().length > 0 || block.body.trim().length > 0;
      case "list":
        return block.items.some((item) => item.trim().length > 0);
      case "example":
        return block.title.trim().length > 0 || block.body.trim().length > 0;
      case "image":
        return block.url.trim().length > 0 && block.alt.trim().length > 0;
      case "table":
        return (
          block.headers.some((header) => header.trim().length > 0) ||
          block.rows.some((row) => row.some((cell) => cell.trim().length > 0))
        );
      case "knowledge_check":
        return (
          block.question.trim().length > 0 &&
          block.options.filter((option) => option.trim().length > 0).length >= 2
        );
      case "divider":
        return false;
    }
  });
}

function normalizeBlock(value: unknown): LessonContentBlock | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value.id) || createStableFallbackId(value);
  const type = asString(value.type);

  if (type === "heading") {
    const rawLevel = Number(value.level);
    const level: 2 | 3 | 4 = rawLevel === 3 || rawLevel === 4 ? rawLevel : 2;

    return {
      id,
      type,
      level,
      text: asString(value.text),
    };
  }

  if (type === "paragraph") {
    return {
      id,
      type,
      text: asString(value.text),
    };
  }

  if (type === "callout") {
    const toneValue = asString(value.tone);
    const tone: LessonCalloutBlock["tone"] =
      toneValue === "tip" || toneValue === "warning" ? toneValue : "key";

    return {
      id,
      type,
      tone,
      title: asString(value.title),
      body: asString(value.body),
    };
  }

  if (type === "list") {
    return {
      id,
      type,
      style: asString(value.style) === "numbered" ? "numbered" : "bullet",
      items: asStringArray(value.items).length > 0 ? asStringArray(value.items) : [""],
    };
  }

  if (type === "example") {
    return {
      id,
      type,
      title: asString(value.title),
      body: asString(value.body),
    };
  }

  if (type === "image") {
    return {
      id,
      type,
      url: asString(value.url),
      alt: asString(value.alt),
      caption: asString(value.caption),
    };
  }

  if (type === "table") {
    const headers = asStringArray(value.headers);
    const safeHeaders = headers.length > 0 ? headers : ["Column 1", "Column 2"];
    const rows = Array.isArray(value.rows)
      ? value.rows
          .filter(Array.isArray)
          .map((row) => normalizeTableRow(row, safeHeaders.length))
      : [];

    return {
      id,
      type,
      caption: asString(value.caption),
      headers: safeHeaders,
      rows: rows.length > 0 ? rows : [safeHeaders.map(() => "")],
    };
  }

  if (type === "knowledge_check") {
    const options = asStringArray(value.options);
    const safeOptions = options.length >= 2 ? options : ["", ""];
    const rawCorrectIndex = Number(value.correctIndex);
    const correctIndex =
      Number.isInteger(rawCorrectIndex) &&
      rawCorrectIndex >= 0 &&
      rawCorrectIndex < safeOptions.length
        ? rawCorrectIndex
        : 0;

    return {
      id,
      type,
      question: asString(value.question),
      options: safeOptions,
      correctIndex,
      explanation: asString(value.explanation),
    };
  }

  if (type === "divider") {
    return {
      id,
      type,
    };
  }

  return null;
}

function normalizeTableRow(row: unknown[], columns: number) {
  return Array.from({ length: columns }, (_, index) => asString(row[index]));
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => asString(item));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function createStableFallbackId(value: Record<string, unknown>) {
  const source = JSON.stringify(value);
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  return `legacy-${hash.toString(36)}`;
}

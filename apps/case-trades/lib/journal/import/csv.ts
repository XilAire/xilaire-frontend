import { normalizeHeader } from "@/lib/journal/import/detectBroker";

export type CsvRow = Record<string, string>;

export type CsvDelimiter =
  | ","
  | "\t"
  | ";"
  | "|";

export type ParsedCsv = {
  headers: string[];
  rows: CsvRow[];

  /**
   * Delimiter detected from the CSV header row.
   */
  delimiter: CsvDelimiter;

  /**
   * Number of non-empty physical lines read from the source file.
   */
  sourceLineCount: number;

  /**
   * Number of logical CSV records parsed after combining quoted
   * multiline fields.
   */
  recordCount: number;

  /**
   * Non-fatal parser warnings that can be surfaced by the import preview.
   */
  warnings: string[];
};

type CsvRecord = {
  values: string[];
  physicalLineStart: number;
  physicalLineEnd: number;
};

const SUPPORTED_DELIMITERS: CsvDelimiter[] = [
  ",",
  "\t",
  ";",
  "|",
];

function stripBom(
  value: string,
) {
  return value.replace(
    /^\uFEFF/,
    "",
  );
}

function normalizeNewlines(
  value: string,
) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function isQuoteCharacter(
  value: string,
) {
  return (
    value === '"' ||
    value === "“" ||
    value === "”"
  );
}

function countDelimiterOutsideQuotes({
  line,
  delimiter,
}: {
  line: string;
  delimiter: CsvDelimiter;
}) {
  let count = 0;
  let insideQuotes = false;

  for (
    let index = 0;
    index < line.length;
    index += 1
  ) {
    const char =
      line[index];

    const nextChar =
      line[index + 1];

    if (
      isQuoteCharacter(char)
    ) {
      if (
        insideQuotes &&
        isQuoteCharacter(
          nextChar,
        )
      ) {
        index += 1;
        continue;
      }

      insideQuotes =
        !insideQuotes;

      continue;
    }

    if (
      char === delimiter &&
      !insideQuotes
    ) {
      count += 1;
    }
  }

  return count;
}

function detectDelimiter(
  headerLine: string,
): CsvDelimiter {
  let bestDelimiter:
    CsvDelimiter = ",";

  let bestCount = -1;

  for (
    const delimiter of
    SUPPORTED_DELIMITERS
  ) {
    const count =
      countDelimiterOutsideQuotes({
        line:
          headerLine,
        delimiter,
      });

    if (
      count > bestCount
    ) {
      bestDelimiter =
        delimiter;

      bestCount =
        count;
    }
  }

  return bestDelimiter;
}

function splitCsvRecord({
  record,
  delimiter,
}: {
  record: string;
  delimiter: CsvDelimiter;
}) {
  const result:
    string[] = [];

  let current = "";
  let insideQuotes = false;

  for (
    let index = 0;
    index < record.length;
    index += 1
  ) {
    const char =
      record[index];

    const nextChar =
      record[index + 1];

    if (
      isQuoteCharacter(
        char,
      )
    ) {
      if (
        insideQuotes &&
        isQuoteCharacter(
          nextChar,
        )
      ) {
        current += '"';
        index += 1;
        continue;
      }

      insideQuotes =
        !insideQuotes;

      continue;
    }

    if (
      char === delimiter &&
      !insideQuotes
    ) {
      result.push(
        current.trim(),
      );

      current = "";
      continue;
    }

    current += char;
  }

  result.push(
    current.trim(),
  );

  return result;
}

/**
 * Backward-compatible CSV line splitter.
 *
 * Existing callers can continue using splitCsvLine() while the parser
 * itself supports delimiter detection and multiline quoted records.
 */
export function splitCsvLine(
  line: string,
  delimiter: CsvDelimiter = ",",
) {
  return splitCsvRecord({
    record:
      line,
    delimiter,
  });
}

function buildLogicalRecords(
  csvText: string,
) {
  const physicalLines =
    normalizeNewlines(
      stripBom(
        csvText,
      ),
    ).split("\n");

  const records:
    Array<{
      text: string;
      physicalLineStart: number;
      physicalLineEnd: number;
    }> = [];

  let currentRecord = "";
  let currentStartLine = 1;
  let insideQuotes = false;

  physicalLines.forEach(
    (
      line,
      index,
    ) => {
      const physicalLineNumber =
        index + 1;

      if (
        !currentRecord
      ) {
        currentStartLine =
          physicalLineNumber;
      }

      currentRecord =
        currentRecord
          ? `${currentRecord}\n${line}`
          : line;

      for (
        let characterIndex = 0;
        characterIndex < line.length;
        characterIndex += 1
      ) {
        const char =
          line[characterIndex];

        const nextChar =
          line[
            characterIndex +
              1
          ];

        if (
          !isQuoteCharacter(
            char,
          )
        ) {
          continue;
        }

        if (
          insideQuotes &&
          isQuoteCharacter(
            nextChar,
          )
        ) {
          characterIndex += 1;
          continue;
        }

        insideQuotes =
          !insideQuotes;
      }

      if (
        !insideQuotes
      ) {
        if (
          currentRecord.trim()
        ) {
          records.push({
            text:
              currentRecord,

            physicalLineStart:
              currentStartLine,

            physicalLineEnd:
              physicalLineNumber,
          });
        }

        currentRecord = "";
      }
    },
  );

  if (
    currentRecord.trim()
  ) {
    records.push({
      text:
        currentRecord,

      physicalLineStart:
        currentStartLine,

      physicalLineEnd:
        physicalLines.length,
    });
  }

  return {
    records,
    sourceLineCount:
      physicalLines.filter(
        (line) =>
          line.trim().length >
          0,
      ).length,

    hadUnclosedQuote:
      insideQuotes,
  };
}

function makeUniqueHeaders(
  rawHeaders: string[],
) {
  const counts =
    new Map<
      string,
      number
    >();

  return rawHeaders.map(
    (
      rawHeader,
      index,
    ) => {
      const baseHeader =
        normalizeHeader(
          rawHeader,
        ) ||
        `column_${index + 1}`;

      const currentCount =
        counts.get(
          baseHeader,
        ) ?? 0;

      counts.set(
        baseHeader,
        currentCount + 1,
      );

      if (
        currentCount === 0
      ) {
        return baseHeader;
      }

      return `${baseHeader}_${currentCount + 1}`;
    },
  );
}

function isEmptyRecord(
  values: string[],
) {
  return values.every(
    (value) =>
      value.trim().length ===
      0,
  );
}

function buildCsvRow({
  headers,
  values,
}: {
  headers: string[];
  values: string[];
}) {
  const row:
    CsvRow = {};

  headers.forEach(
    (
      header,
      index,
    ) => {
      row[header] =
        values[index]?.trim() ??
        "";
    },
  );

  return row;
}

function parseLogicalRecords({
  logicalRecords,
  delimiter,
}: {
  logicalRecords:
    Array<{
      text: string;
      physicalLineStart: number;
      physicalLineEnd: number;
    }>;
  delimiter: CsvDelimiter;
}) {
  return logicalRecords.map(
    (record): CsvRecord => ({
      values:
        splitCsvRecord({
          record:
            record.text,
          delimiter,
        }),

      physicalLineStart:
        record.physicalLineStart,

      physicalLineEnd:
        record.physicalLineEnd,
    }),
  );
}

export function parseCsv(
  csvText: string,
): ParsedCsv {
  const warnings:
    string[] = [];

  const {
    records:
      logicalRecords,
    sourceLineCount,
    hadUnclosedQuote,
  } =
    buildLogicalRecords(
      csvText,
    );

  if (
    logicalRecords.length <
    2
  ) {
    return {
      headers:
        [],

      rows:
        [],

      delimiter:
        ",",

      sourceLineCount,

      recordCount:
        logicalRecords.length,

      warnings:
        logicalRecords.length ===
        1
          ? [
              "The CSV contains a header row but no data rows.",
            ]
          : [],
    };
  }

  if (
    hadUnclosedQuote
  ) {
    warnings.push(
      "The CSV appears to contain an unclosed quoted field. CASE attempted to parse the remaining content as one record.",
    );
  }

  const delimiter =
    detectDelimiter(
      logicalRecords[0].text,
    );

  const parsedRecords =
    parseLogicalRecords({
      logicalRecords,
      delimiter,
    });

  const headerRecord =
    parsedRecords[0];

  const headers =
    makeUniqueHeaders(
      headerRecord.values,
    );

  if (
    headers.length === 0
  ) {
    return {
      headers:
        [],

      rows:
        [],

      delimiter,

      sourceLineCount,

      recordCount:
        parsedRecords.length,

      warnings: [
        ...warnings,
        "The CSV header row is empty.",
      ],
    };
  }

  const rows:
    CsvRow[] = [];

  parsedRecords
    .slice(1)
    .forEach(
      (
        record,
        index,
      ) => {
        if (
          isEmptyRecord(
            record.values,
          )
        ) {
          return;
        }

        if (
          record.values.length !==
          headers.length
        ) {
          warnings.push(
            `CSV record ${index + 2} spans physical line${
              record.physicalLineStart ===
              record.physicalLineEnd
                ? ""
                : "s"
            } ${record.physicalLineStart}${
              record.physicalLineStart ===
              record.physicalLineEnd
                ? ""
                : `-${record.physicalLineEnd}`
            } and contains ${record.values.length} field${
              record.values.length ===
              1
                ? ""
                : "s"
            }; the header contains ${headers.length}. Missing values were left blank and extra values were ignored.`,
          );
        }

        rows.push(
          buildCsvRow({
            headers,
            values:
              record.values,
          }),
        );
      },
    );

  return {
    headers,
    rows,
    delimiter,
    sourceLineCount,
    recordCount:
      parsedRecords.length,
    warnings,
  };
}

export function getValue(
  row: CsvRow,
  keys: string[],
) {
  for (
    const key of
    keys
  ) {
    const normalizedKey =
      normalizeHeader(
        key,
      );

    const directValue =
      row[normalizedKey];

    if (
      directValue !==
        undefined &&
      directValue !== ""
    ) {
      return directValue;
    }

    /*
     * Duplicate CSV headers are normalized as header_2, header_3, etc.
     * Search those aliases when the primary header is blank.
     */
    const duplicateHeaderKeys =
      Object.keys(
        row,
      ).filter(
        (rowKey) =>
          rowKey.startsWith(
            `${normalizedKey}_`,
          ),
      );

    for (
      const duplicateKey of
      duplicateHeaderKeys
    ) {
      const duplicateValue =
        row[duplicateKey];

      if (
        duplicateValue !==
          undefined &&
        duplicateValue !==
          ""
      ) {
        return duplicateValue;
      }
    }
  }

  return "";
}

export function getValues(
  row: CsvRow,
  keys: string[],
) {
  const values:
    string[] = [];

  for (
    const key of
    keys
  ) {
    const normalizedKey =
      normalizeHeader(
        key,
      );

    Object.entries(
      row,
    ).forEach(
      (
        [
          rowKey,
          value,
        ],
      ) => {
        if (
          rowKey ===
            normalizedKey ||
          rowKey.startsWith(
            `${normalizedKey}_`,
          )
        ) {
          const normalizedValue =
            value.trim();

          if (
            normalizedValue &&
            !values.includes(
              normalizedValue,
            )
          ) {
            values.push(
              normalizedValue,
            );
          }
        }
      },
    );
  }

  return values;
}

import type {
  ReportDateRange,
  ReportSummary,
} from "@/lib/reports/reports-service";

export type ReportExportFile = {
  filename: string;
  content: string;
  mimeType: string;
};

export type ReportExportSection =
  | "summary"
  | "spending"
  | "income"
  | "accounts"
  | "monthly-trend"
  | "daily-trend";

export type BuildReportCsvInput = {
  report: ReportSummary;
  workspaceName?: string | null;
  sections?: ReportExportSection[];
};

const DEFAULT_SECTIONS:
  ReportExportSection[] =
  [
    "summary",
    "spending",
    "income",
    "accounts",
    "monthly-trend",
  ];

export function buildReportCsv({
  report,
  workspaceName,
  sections =
    DEFAULT_SECTIONS,
}: BuildReportCsvInput): ReportExportFile {
  const normalizedSections =
    Array.from(
      new Set(
        sections,
      ),
    );

  const rows:
    string[][] =
    [];

  rows.push([
    "CASE Budget Financial Report",
  ]);

  rows.push([
    "Workspace",
    normalizeCsvValue(
      workspaceName ||
        "Current Workspace",
    ),
  ]);

  rows.push([
    "Reporting Period",
    formatDateRange(
      report.period,
    ),
  ]);

  rows.push([
    "Generated",
    new Date().toISOString(),
  ]);

  rows.push([]);

  for (
    const section
    of normalizedSections
  ) {
    switch (
      section
    ) {
      case "summary":
        appendSummarySection(
          rows,
          report,
        );
        break;

      case "spending":
        appendSpendingSection(
          rows,
          report,
        );
        break;

      case "income":
        appendIncomeSection(
          rows,
          report,
        );
        break;

      case "accounts":
        appendAccountsSection(
          rows,
          report,
        );
        break;

      case "monthly-trend":
        appendMonthlyTrendSection(
          rows,
          report,
        );
        break;

      case "daily-trend":
        appendDailyTrendSection(
          rows,
          report,
        );
        break;

      default:
        break;
    }
  }

  const content =
    rows
      .map(
        (
          row,
        ) =>
          row
            .map(
              escapeCsvCell,
            )
            .join(
              ",",
            ),
      )
      .join(
        "\r\n",
      );

  return {
    filename:
      buildReportFilename({
        workspaceName,
        dateRange:
          report.period,
      }),

    content,

    mimeType:
      "text/csv;charset=utf-8;",
  };
}

export function downloadReportCsv(
  file: ReportExportFile,
) {
  if (
    typeof window ===
      "undefined" ||
    typeof document ===
      "undefined"
  ) {
    return false;
  }

  const blob =
    new Blob(
      [
        "\uFEFF",
        file.content,
      ],
      {
        type:
          file.mimeType,
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
    file.filename;

  anchor.style.display =
    "none";

  document.body.appendChild(
    anchor,
  );

  anchor.click();

  document.body.removeChild(
    anchor,
  );

  URL.revokeObjectURL(
    objectUrl,
  );

  return true;
}

export function printReportPage() {
  if (
    typeof window ===
    "undefined"
  ) {
    return false;
  }

  window.print();

  return true;
}

export function buildReportFilename({
  workspaceName,
  dateRange,
}: {
  workspaceName?:
    string | null;
  dateRange:
    ReportDateRange;
}) {
  const workspaceSlug =
    slugify(
      workspaceName ||
        "workspace",
    );

  return [
    "case-budget",
    workspaceSlug,
    "financial-report",
    dateRange.startDate,
    "to",
    dateRange.endDate,
  ].join(
    "-",
  ) +
    ".csv";
}

function appendSummarySection(
  rows:
    string[][],
  report:
    ReportSummary,
) {
  rows.push([
    "SUMMARY",
  ]);

  rows.push([
    "Metric",
    "Value",
  ]);

  rows.push([
    "Income",
    formatNumber(
      report.transactionTotals
        .income,
    ),
  ]);

  rows.push([
    "Cleared Income",
    formatNumber(
      report.transactionTotals
        .clearedIncome,
    ),
  ]);

  rows.push([
    "Pending Income",
    formatNumber(
      report.transactionTotals
        .pendingIncome,
    ),
  ]);

  rows.push([
    "Expenses",
    formatNumber(
      report.transactionTotals
        .expenses,
    ),
  ]);

  rows.push([
    "Cleared Expenses",
    formatNumber(
      report.transactionTotals
        .clearedExpenses,
    ),
  ]);

  rows.push([
    "Pending Expenses",
    formatNumber(
      report.transactionTotals
        .pendingExpenses,
    ),
  ]);

  rows.push([
    "Transfers",
    formatNumber(
      report.transactionTotals
        .transfers,
    ),
  ]);

  rows.push([
    "Net Cash Flow",
    formatNumber(
      report.transactionTotals
        .clearedIncome -
        report.transactionTotals
          .clearedExpenses,
    ),
  ]);

  rows.push([
    "Transaction Count",
    String(
      report.transactionTotals
        .transactionCount,
    ),
  ]);

  rows.push([
    "Cleared Transactions",
    String(
      report.transactionTotals
        .clearedTransactionCount,
    ),
  ]);

  rows.push([
    "Pending Transactions",
    String(
      report.transactionTotals
        .pendingTransactionCount,
    ),
  ]);

  rows.push([
    "Total Assets",
    formatNumber(
      report.accountTotals
        .totalAssets,
    ),
  ]);

  rows.push([
    "Total Liabilities",
    formatNumber(
      report.accountTotals
        .totalLiabilities,
    ),
  ]);

  rows.push([
    "Net Worth",
    formatNumber(
      report.accountTotals
        .netWorth,
    ),
  ]);

  rows.push([
    "Accounts Included",
    String(
      report.accountTotals
        .includedAccountCount,
    ),
  ]);

  rows.push([]);
}

function appendSpendingSection(
  rows:
    string[][],
  report:
    ReportSummary,
) {
  rows.push([
    "SPENDING BY ITEM",
  ]);

  rows.push([
    "Item",
    "Group",
    "Amount",
    "Transactions",
    "Percentage",
  ]);

  if (
    report.spendingByCategory
      .length ===
    0
  ) {
    rows.push([
      "No cleared spending",
    ]);

    rows.push([]);

    return;
  }

  for (
    const item
    of report.spendingByCategory
  ) {
    rows.push([
      item.name,
      item.groupName,
      formatNumber(
        item.amount,
      ),
      String(
        item.transactionCount,
      ),
      formatPercentage(
        item.percentage,
      ),
    ]);
  }

  rows.push([]);
}

function appendIncomeSection(
  rows:
    string[][],
  report:
    ReportSummary,
) {
  rows.push([
    "INCOME BREAKDOWN",
  ]);

  rows.push([
    "Category",
    "Group",
    "Amount",
    "Transactions",
    "Percentage",
  ]);

  if (
    report.incomeByCategory
      .length ===
    0
  ) {
    rows.push([
      "No cleared income",
    ]);

    rows.push([]);

    return;
  }

  for (
    const item
    of report.incomeByCategory
  ) {
    rows.push([
      item.name,
      item.groupName,
      formatNumber(
        item.amount,
      ),
      String(
        item.transactionCount,
      ),
      formatPercentage(
        item.percentage,
      ),
    ]);
  }

  rows.push([]);
}

function appendAccountsSection(
  rows:
    string[][],
  report:
    ReportSummary,
) {
  rows.push([
    "SPENDING BY ACCOUNT",
  ]);

  rows.push([
    "Account",
    "Account Type",
    "Amount",
    "Transactions",
    "Percentage",
  ]);

  if (
    report.spendingByAccount
      .length ===
    0
  ) {
    rows.push([
      "No account spending",
    ]);

    rows.push([]);

    return;
  }

  for (
    const item
    of report.spendingByAccount
  ) {
    rows.push([
      item.accountName,
      item.accountType,
      formatNumber(
        item.amount,
      ),
      String(
        item.transactionCount,
      ),
      formatPercentage(
        item.percentage,
      ),
    ]);
  }

  rows.push([]);
}

function appendMonthlyTrendSection(
  rows:
    string[][],
  report:
    ReportSummary,
) {
  rows.push([
    "MONTHLY TREND",
  ]);

  rows.push([
    "Month",
    "Income",
    "Expenses",
    "Transfers",
    "Net Cash Flow",
    "Transactions",
  ]);

  if (
    report.monthlyTrend
      .length ===
    0
  ) {
    rows.push([
      "No monthly trend data",
    ]);

    rows.push([]);

    return;
  }

  for (
    const point
    of report.monthlyTrend
  ) {
    rows.push([
      point.label,
      formatNumber(
        point.income,
      ),
      formatNumber(
        point.expenses,
      ),
      formatNumber(
        point.transfers,
      ),
      formatNumber(
        point.netCashFlow,
      ),
      String(
        point.transactionCount,
      ),
    ]);
  }

  rows.push([]);
}

function appendDailyTrendSection(
  rows:
    string[][],
  report:
    ReportSummary,
) {
  rows.push([
    "DAILY TREND",
  ]);

  rows.push([
    "Date",
    "Income",
    "Expenses",
    "Transfers",
    "Net Cash Flow",
    "Transactions",
  ]);

  if (
    report.dailyTrend
      .length ===
    0
  ) {
    rows.push([
      "No daily trend data",
    ]);

    rows.push([]);

    return;
  }

  for (
    const point
    of report.dailyTrend
  ) {
    rows.push([
      point.date,
      formatNumber(
        point.income,
      ),
      formatNumber(
        point.expenses,
      ),
      formatNumber(
        point.transfers,
      ),
      formatNumber(
        point.netCashFlow,
      ),
      String(
        point.transactionCount,
      ),
    ]);
  }

  rows.push([]);
}

function escapeCsvCell(
  value: string,
) {
  const normalizedValue =
    String(
      value ??
        "",
    );

  if (
    normalizedValue.includes(
      ",",
    ) ||
    normalizedValue.includes(
      "\"",
    ) ||
    normalizedValue.includes(
      "\n",
    ) ||
    normalizedValue.includes(
      "\r",
    )
  ) {
    return `"${normalizedValue.replace(
      /"/g,
      "\"\"",
    )}"`;
  }

  return normalizedValue;
}

function formatNumber(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return "0.00";
  }

  return value.toFixed(
    2,
  );
}

function formatPercentage(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return "0.00%";
  }

  return `${value.toFixed(
    2,
  )}%`;
}

function formatDateRange(
  dateRange:
    ReportDateRange,
) {
  return `${dateRange.startDate} to ${dateRange.endDate}`;
}

function normalizeCsvValue(
  value: string,
) {
  return value
    .replace(
      /\r?\n/g,
      " ",
    )
    .trim();
}

function slugify(
  value: string,
) {
  const slug =
    value
      .trim()
      .toLowerCase()
      .replace(
        /['’]/g,
        "",
      )
      .replace(
        /[^a-z0-9]+/g,
        "-",
      )
      .replace(
        /^-+|-+$/g,
        "");

  return (
    slug ||
    "workspace"
  );
}
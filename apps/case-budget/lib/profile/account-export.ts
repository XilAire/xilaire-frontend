import type {
  CaseBudgetAccountExport,
  CaseBudgetExportData,
  CreateCaseBudgetExportInput,
} from "@/types/account-export";

const CASE_BUDGET_EXPORT_VERSION =
  "1.0" as const;

const CASE_BUDGET_EXPORT_FILENAME_PREFIX =
  "case-budget-export";

export function createCaseBudgetAccountExport({
  profile,
  workspace,
  selectedBudgetMonth,
  budgetMonths,
  accounts,
  transactions,
  bills,
  goals = [],
  debts = [],
  investments = [],
  payCycles = [],
  netWorth = [],
}: CreateCaseBudgetExportInput): CaseBudgetAccountExport {
  const exportedAt =
    new Date().toISOString();

  const data:
    CaseBudgetExportData = {
      profile:
        profile
          ? {
              ...profile,
            }
          : null,

      workspace:
        workspace
          ? {
              ...workspace,
            }
          : null,

      budget: {
        selectedMonth:
          selectedBudgetMonth,

        months:
          cloneBudgetMonths(
            budgetMonths,
          ),
      },

      accounts:
        accounts.map(
          (
            account,
          ) => ({
            ...account,
          }),
        ),

      transactions:
        transactions.map(
          (
            transaction,
          ) => ({
            ...transaction,

            account:
              transaction.account
                ? {
                    ...transaction.account,
                  }
                : transaction.account,

            category:
              transaction.category
                ? {
                    ...transaction.category,
                  }
                : transaction.category,
          }),
        ),

      bills:
        bills.map(
          (
            bill,
          ) => ({
            ...bill,

            account:
              bill.account
                ? {
                    ...bill.account,
                  }
                : bill.account,

            budgetItem:
              bill.budgetItem
                ? {
                    ...bill.budgetItem,
                  }
                : bill.budgetItem,

            reminder:
              bill.reminder
                ? {
                    ...bill.reminder,
                  }
                : bill.reminder,

            budgetSync:
              bill.budgetSync
                ? {
                    ...bill.budgetSync,
                  }
                : bill.budgetSync,
          }),
        ),

      goals:
        cloneUnknownArray(
          goals,
        ),

      debts:
        cloneUnknownArray(
          debts,
        ),

      investments:
        cloneUnknownArray(
          investments,
        ),

      payCycles:
        cloneUnknownArray(
          payCycles,
        ),

      netWorth:
        cloneUnknownArray(
          netWorth,
        ),
    };

  return {
    metadata: {
      application:
        "CASE Budget",

      version:
        CASE_BUDGET_EXPORT_VERSION,

      exportedAt,

      format:
        "json",
    },

    data,
  };
}

export function serializeCaseBudgetAccountExport(
  accountExport:
    CaseBudgetAccountExport,
) {
  return JSON.stringify(
    accountExport,
    null,
    2,
  );
}

export function createCaseBudgetExportFilename(
  accountExport:
    CaseBudgetAccountExport,
) {
  const exportedAt =
    new Date(
      accountExport.metadata.exportedAt,
    );

  const datePart =
    Number.isNaN(
      exportedAt.getTime(),
    )
      ? createCurrentDatePart()
      : [
          exportedAt
            .getFullYear()
            .toString()
            .padStart(
              4,
              "0",
            ),

          String(
            exportedAt.getMonth() +
              1,
          ).padStart(
            2,
            "0",
          ),

          String(
            exportedAt.getDate(),
          ).padStart(
            2,
            "0",
          ),
        ].join(
          "-",
        );

  const workspacePart =
    sanitizeFilenamePart(
      accountExport.data.workspace
        ?.name ??
        "",
    );

  return [
    CASE_BUDGET_EXPORT_FILENAME_PREFIX,
    workspacePart,
    datePart,
  ]
    .filter(
      Boolean,
    )
    .join(
      "-"
    )
    .concat(
      ".json",
    );
}

export function downloadCaseBudgetAccountExport(
  accountExport:
    CaseBudgetAccountExport,
) {
  if (
    typeof window ===
      "undefined" ||
    typeof document ===
      "undefined"
  ) {
    throw new Error(
      "CASE Budget account exports can only be downloaded in the browser.",
    );
  }

  const serializedExport =
    serializeCaseBudgetAccountExport(
      accountExport,
    );

  const blob =
    new Blob(
      [
        serializedExport,
      ],
      {
        type:
          "application/json;charset=utf-8",
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
    createCaseBudgetExportFilename(
      accountExport,
    );

  anchor.style.display =
    "none";

  document.body.appendChild(
    anchor,
  );

  try {
    anchor.click();
  } finally {
    anchor.remove();

    window.setTimeout(
      () => {
        URL.revokeObjectURL(
          objectUrl,
        );
      },
      0,
    );
  }
}

function cloneBudgetMonths(
  budgetMonths:
    CreateCaseBudgetExportInput["budgetMonths"],
) {
  return Object.fromEntries(
    Object.entries(
      budgetMonths,
    ).map(
      ([
        monthKey,
        budgetMonth,
      ]) => [
        monthKey,

        {
          ...budgetMonth,

          incomeSources:
            budgetMonth.incomeSources.map(
              (
                incomeSource,
              ) => ({
                ...incomeSource,
              }),
            ),

          budgetGroups:
            budgetMonth.budgetGroups.map(
              (
                group,
              ) => ({
                ...group,

                categories:
                  group.categories.map(
                    (
                      category,
                    ) => ({
                      ...category,
                    }),
                  ),
              }),
            ),
        },
      ],
    ),
  );
}

function cloneUnknownArray(
  values:
    unknown[],
) {
  return values.map(
    (
      value,
    ) =>
      cloneUnknownValue(
        value,
      ),
  );
}

function cloneUnknownValue(
  value:
    unknown,
): unknown {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return value;
  }

  if (
    value instanceof
    Date
  ) {
    return value.toISOString();
  }

  if (
    Array.isArray(
      value,
    )
  ) {
    return value.map(
      (
        item,
      ) =>
        cloneUnknownValue(
          item,
        ),
    );
  }

  if (
    typeof value ===
    "object"
  ) {
    return Object.fromEntries(
      Object.entries(
        value as Record<
          string,
          unknown
        >,
      ).map(
        ([
          key,
          nestedValue,
        ]) => [
          key,
          cloneUnknownValue(
            nestedValue,
          ),
        ],
      ),
    );
  }

  return value;
}

function sanitizeFilenamePart(
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
    )
    .slice(
      0,
      80,
    );
}

function createCurrentDatePart() {
  const now =
    new Date();

  return [
    now
      .getFullYear()
      .toString()
      .padStart(
        4,
        "0",
      ),

    String(
      now.getMonth() +
        1,
    ).padStart(
      2,
      "0",
    ),

    String(
      now.getDate(),
    ).padStart(
      2,
      "0",
    ),
  ].join(
    "-",
  );
}
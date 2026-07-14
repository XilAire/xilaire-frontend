"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  parseBrokerCsv,
  type ParseBrokerCsvResult,
} from "@/lib/journal/import/parseBrokerCsv";
import type { GroupedBrokerStrategyTrade } from "@/lib/journal/import/groupStrategies";
import { importParsedBrokerTrades } from "@/lib/journal/import/importTrades";

export type ImportPreviewResult =
  | {
      success: true;

      broker:
        ParseBrokerCsvResult["broker"];

      trades:
        GroupedBrokerStrategyTrade[];

      warnings:
        string[];

      totalTrades:
        number;

      groupedStrategies:
        number;

      totalOptionLegs:
        number;
    }
  | {
      success: false;

      errors:
        string[];

      warnings:
        string[];
    };

export type ImportTradesResult =
  | {
      success: true;

      imported:
        number;

      skipped:
        number;

      warnings:
        string[];
    }
  | {
      success: false;

      errors:
        string[];
    };

function normalizeServerError(
  error: unknown,
) {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return String(
    error,
  );
}

function uniqueMessages(
  values: string[],
) {
  return Array.from(
    new Set(
      values
        .map(
          (value) =>
            value.trim(),
        )
        .filter(Boolean),
    ),
  );
}

export async function previewBrokerImport(
  csvText: string,
): Promise<ImportPreviewResult> {
  if (
    !csvText.trim()
  ) {
    return {
      success:
        false,

      errors: [
        "No CSV data was provided.",
      ],

      warnings:
        [],
    };
  }

  try {
    const result =
      parseBrokerCsv(
        csvText,
      );

    const warnings =
      uniqueMessages(
        result.warnings,
      );

    if (
      result.errors.length >
      0
    ) {
      return {
        success:
          false,

        errors:
          uniqueMessages(
            result.errors,
          ),

        warnings,
      };
    }

    if (
      result.trades.length ===
      0
    ) {
      return {
        success:
          false,

        errors: [
          "No importable grouped trade strategies were found in the CSV.",
        ],

        warnings,
      };
    }

    return {
      success:
        true,

      broker:
        result.broker,

      trades:
        result.trades,

      warnings,

      totalTrades:
        result.trades.length,

      groupedStrategies:
        result.groupedStrategies,

      totalOptionLegs:
        result.totalOptionLegs,
    };
  } catch (
    error
  ) {
    return {
      success:
        false,

      errors: [
        `Failed to preview broker import: ${normalizeServerError(
          error,
        )}`,
      ],

      warnings:
        [],
    };
  }
}

export async function importBrokerTrades(
  trades: GroupedBrokerStrategyTrade[],
): Promise<ImportTradesResult> {
  if (
    !Array.isArray(
      trades,
    ) ||
    trades.length ===
      0
  ) {
    return {
      success:
        false,

      errors: [
        "There are no grouped strategies to import.",
      ],
    };
  }

  const supabase =
    await createSupabaseServerClient();

  const {
    data: {
      user,
    },
    error:
      authError,
  } =
    await supabase.auth.getUser();

  if (
    authError ||
    !user
  ) {
    return {
      success:
        false,

      errors: [
        authError?.message
          ? `Unauthorized: ${authError.message}`
          : "Unauthorized.",
      ],
    };
  }

  try {
    const result =
      await importParsedBrokerTrades({
        supabase,

        userId:
          user.id,

        trades,
      });

    if (
      !result.success
    ) {
      return {
        success:
          false,

        errors:
          uniqueMessages(
            result.errors,
          ),
      };
    }

    /*
     * Refresh every journal surface affected by imported grouped strategies.
     */
    revalidatePath(
      "/dashboard/journal",
    );

    revalidatePath(
      "/dashboard/journal/reports",
    );

    revalidatePath(
      "/dashboard/journal/import",
    );

    revalidatePath(
      "/dashboard/performance",
    );

    return {
      success:
        true,

      imported:
        result.imported,

      skipped:
        result.skipped,

      /*
       * Successful imports can still return non-fatal notices, such as
       * the legacy journal schema fallback notice.
       */
      warnings:
        uniqueMessages(
          result.errors,
        ),
    };
  } catch (
    error
  ) {
    return {
      success:
        false,

      errors: [
        `Failed to import grouped broker strategies: ${normalizeServerError(
          error,
        )}`,
      ],
    };
  }
}

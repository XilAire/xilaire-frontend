"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  parseBrokerCsv,
  type ParsedBrokerTrade,
  type ParseBrokerCsvResult,
} from "@/lib/journal/import/parseBrokerCsv";
import { importParsedBrokerTrades } from "@/lib/journal/import/importTrades";

export type ImportPreviewResult =
  | {
      success: true;
      broker: ParseBrokerCsvResult["broker"];
      trades: ParsedBrokerTrade[];
      warnings: string[];
      totalTrades: number;
    }
  | {
      success: false;
      errors: string[];
    };

export type ImportTradesResult =
  | {
      success: true;
      imported: number;
      skipped: number;
    }
  | {
      success: false;
      errors: string[];
    };

export async function previewBrokerImport(
  csvText: string
): Promise<ImportPreviewResult> {
  if (!csvText.trim()) {
    return {
      success: false,
      errors: ["No CSV data was provided."],
    };
  }

  const result = parseBrokerCsv(csvText);

  if (result.errors.length > 0) {
    return {
      success: false,
      errors: result.errors,
    };
  }

  return {
    success: true,
    broker: result.broker,
    trades: result.trades,
    warnings: result.warnings,
    totalTrades: result.trades.length,
  };
}

export async function importBrokerTrades(
  trades: ParsedBrokerTrade[]
): Promise<ImportTradesResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      errors: ["Unauthorized."],
    };
  }

  const result = await importParsedBrokerTrades({
    supabase,
    userId: user.id,
    trades,
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.errors,
    };
  }

  revalidatePath("/dashboard/journal");
  revalidatePath("/dashboard/journal/reports");

  return {
    success: true,
    imported: result.imported,
    skipped: result.skipped,
  };
}
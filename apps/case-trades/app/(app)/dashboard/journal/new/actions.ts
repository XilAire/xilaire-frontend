"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserEntitlements } from "@/lib/auth/getUserEntitlements";

function toNumber(value: FormDataEntryValue | null) {
  if (value === null || value === "") return null;

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}

function toStringValue(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function toIsoDateTime(value: string) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export async function createJournalTrade(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const entitlements = await getUserEntitlements(user.id);

  if (!entitlements.journal.active) {
    throw new Error("Journal subscription required.");
  }

  const symbol = toStringValue(formData.get("symbol")).toUpperCase();
  const instrumentType = toStringValue(formData.get("instrument_type"));
  const side = toStringValue(formData.get("side"));

  const quantity = toNumber(formData.get("quantity"));
  const entryPrice = toNumber(formData.get("entry_price"));
  const exitPrice = toNumber(formData.get("exit_price"));

  const entryDate = toIsoDateTime(toStringValue(formData.get("entry_date")));
  const exitDate = toIsoDateTime(toStringValue(formData.get("exit_date")));

  const notes = toStringValue(formData.get("notes"));
  const lessonLearned = toStringValue(formData.get("lesson_learned"));

  if (!symbol) {
    throw new Error("Symbol is required.");
  }

  if (!["STOCK", "OPTION"].includes(instrumentType)) {
    throw new Error("Invalid instrument type.");
  }

  if (instrumentType === "OPTION" && !entitlements.journal.options) {
    throw new Error("Options journaling requires Pro or Elite.");
  }

  if (!["LONG", "SHORT", "CALL", "PUT"].includes(side)) {
    throw new Error("Invalid trade side.");
  }

  if (!entryPrice || entryPrice <= 0) {
    throw new Error("Entry price is required.");
  }

  const profitLoss =
    exitPrice !== null && entryPrice !== null && quantity !== null
      ? Number(((exitPrice - entryPrice) * quantity).toFixed(2))
      : null;

  const profitLossPct =
    exitPrice !== null && entryPrice !== null && entryPrice > 0
      ? Number((((exitPrice - entryPrice) / entryPrice) * 100).toFixed(2))
      : null;

  const { data, error } = await supabase
    .from("journal_trades")
    .insert({
      user_id: user.id,
      symbol,
      instrument_type: instrumentType,
      side,
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity,
      profit_loss: profitLoss,
      profit_loss_pct: profitLossPct,
      entry_date: entryDate ?? new Date().toISOString(),
      exit_date: exitDate,
      notes: [
        notes,
        lessonLearned ? `Lesson Learned: ${lessonLearned}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Create journal trade failed", error);
    throw new Error("Failed to save journal trade.");
  }

  redirect(`/dashboard/journal/${data.id}`);
}

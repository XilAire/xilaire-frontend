"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";

type SaveJournalNotesInput = {
  tradeId: string;
  notes?: string | null;
  setup?: string | null;
  mistakes?: string | null;
  tags?: string[] | string | null;
  emotion?: string | null;
  discipline_score?: number | string | null;
};

type SaveJournalNotesResult =
  | {
      success: true;
      trade_id: string;
    }
  | {
      success: false;
      error: string;
    };

function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function isMasterAdmin(role: Awaited<ReturnType<typeof resolveCurrentUserRole>>) {
  return (
    role?.role_name === "master_admin" ||
    role?.role_rank === 4 ||
    String(role?.email ?? "").toLowerCase() ===
      "csthilaire@xilairetechnologies.com"
  );
}

function normalizeText(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizeTags(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) {
    return value
      .map((tag) => String(tag).trim())
      .filter((tag) => tag.length > 0);
  }

  return String(value ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function normalizeScore(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const score = Number(value);

  if (!Number.isFinite(score)) {
    return null;
  }

  return Math.min(Math.max(score, 1), 10);
}

export async function saveJournalNotes(
  input: SaveJournalNotesInput
): Promise<SaveJournalNotesResult> {
  const tradeId = normalizeText(input.tradeId);

  if (!tradeId) {
    return {
      success: false,
      error: "Missing trade ID.",
    };
  }

  const role = await resolveCurrentUserRole();

  if (!role) {
    return {
      success: false,
      error: "Unauthorized.",
    };
  }

  const supabase = createSupabaseAdmin();

  const { data: execution, error: executionError } = await supabase
    .from("signal_executions")
    .select(
      `
      id,
      signal_id,
      created_by,
      signals!inner (
        id,
        organization_id,
        created_by
      )
    `
    )
    .eq("id", tradeId)
    .maybeSingle();

  if (executionError || !execution) {
    console.error("saveJournalNotes: execution lookup failed", executionError);

    return {
      success: false,
      error: "Trade execution not found.",
    };
  }

  const admin = isMasterAdmin(role);

  const signalCreatedBy =
    Array.isArray(execution.signals) && execution.signals.length > 0
      ? execution.signals[0]?.created_by
      : (execution.signals as any)?.created_by;

  const canEdit =
    admin ||
    execution.created_by === role.user_id ||
    signalCreatedBy === role.user_id;

  if (!canEdit) {
    return {
      success: false,
      error: "You do not have permission to edit this journal entry.",
    };
  }

  const now = new Date().toISOString();

  const payload = {
    execution_id: tradeId,
    signal_id: execution.signal_id,
    notes: normalizeText(input.notes),
    setup: normalizeText(input.setup),
    mistakes: normalizeText(input.mistakes),
    tags: normalizeTags(input.tags),
    emotion: normalizeText(input.emotion),
    discipline_score: normalizeScore(input.discipline_score),
    updated_at: now,
    updated_by: role.user_id,
  };

  const { error: upsertError } = await supabase
    .from("journal_execution_notes")
    .upsert(payload, {
      onConflict: "execution_id",
    });

  if (upsertError) {
    console.error("saveJournalNotes: upsert failed", upsertError);

    return {
      success: false,
      error: `Failed to save journal notes: ${upsertError.message}`,
    };
  }

  revalidatePath("/dashboard/journal");
  revalidatePath(`/dashboard/journal/${tradeId}`);
  revalidatePath(`/dashboard/signals/${execution.signal_id}`);

  return {
    success: true,
    trade_id: tradeId,
  };
}
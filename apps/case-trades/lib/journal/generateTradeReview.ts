"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";

type TradeOutcome = "WIN" | "LOSS" | "BREAKEVEN" | null;

type GenerateTradeReviewInput = {
  tradeId: string;
};

type GenerateTradeReviewResult =
  | {
      success: true;
      review: {
        id: string;
        execution_id: string;
        signal_id: string;
        grade: string;
        execution_score: number;
        discipline_score: number | null;
        summary: string;
        what_went_well: string[];
        mistakes: string[];
        improvement_plan: string[];
        psychology_review: string;
        created_at: string | null;
        updated_at: string | null;
      };
    }
  | {
      success: false;
      error: string;
    };

type FillRow = {
  side: string | null;
  contracts: number | null;
  price: number | null;
  created_at: string | null;
};

type NotesRow = {
  notes: string | null;
  setup: string | null;
  mistakes: string | null;
  tags: string[] | null;
  emotion: string | null;
  discipline_score: number | string | null;
};

type ExecutionRow = {
  id: string;
  signal_id: string;
  status: string | null;
  contracts: number | null;
  entry_price: number | null;
  exit_price: number | null;
  pnl: number | null;
  pnl_pct: number | null;
  opened_at: string | null;
  closed_at: string | null;
  created_by: string | null;
  execution_fills: FillRow[] | null;
  signals: {
    id: string;
    asset: string | null;
    underlying: string | null;
    action: string | null;
    open_action: string | null;
    instrument_type: string | null;
    option_type: string | null;
    strike_price: number | null;
    expiration_date: string | null;
    confidence: number | null;
    trade_style: string | null;
    status: string | null;
    outcome: TradeOutcome | string | null;
    return_pct: number | null;
    created_by: string | null;
  };
};

const REVIEW_TABLE = "journal_trade_reviews";

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

function normalizeNumber(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getSymbol(execution: ExecutionRow) {
  return (
    execution.signals.asset ??
    execution.signals.underlying ??
    "this trade"
  );
}

function getOutcome(execution: ExecutionRow): TradeOutcome {
  const rawOutcome = String(execution.signals.outcome ?? "").toUpperCase();

  if (rawOutcome === "WIN" || rawOutcome === "LOSS" || rawOutcome === "BREAKEVEN") {
    return rawOutcome;
  }

  const pnl = normalizeNumber(execution.pnl);
  const pnlPct = normalizeNumber(execution.pnl_pct ?? execution.signals.return_pct);

  if (pnl !== null) {
    if (pnl > 0) return "WIN";
    if (pnl < 0) return "LOSS";
    return "BREAKEVEN";
  }

  if (pnlPct !== null) {
    if (pnlPct > 0) return "WIN";
    if (pnlPct < 0) return "LOSS";
    return "BREAKEVEN";
  }

  return null;
}

function getDurationMinutes(openedAt: string | null, closedAt: string | null) {
  if (!openedAt || !closedAt) {
    return null;
  }

  const opened = new Date(openedAt).getTime();
  const closed = new Date(closedAt).getTime();

  if (!Number.isFinite(opened) || !Number.isFinite(closed)) {
    return null;
  }

  return Math.max(Math.round((closed - opened) / 60000), 0);
}

function formatDuration(minutes: number | null) {
  if (minutes === null) {
    return "unknown duration";
  }

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes > 0
      ? `${hours} hour${hours === 1 ? "" : "s"} ${remainingMinutes} minute${
          remainingMinutes === 1 ? "" : "s"
        }`
      : `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours > 0
    ? `${days} day${days === 1 ? "" : "s"} ${remainingHours} hour${
        remainingHours === 1 ? "" : "s"
      }`
    : `${days} day${days === 1 ? "" : "s"}`;
}

function averageWeightedPrice(fills: FillRow[]) {
  const totalQuantity = fills.reduce(
    (sum, fill) => sum + Number(fill.contracts ?? 0),
    0
  );

  if (totalQuantity <= 0) {
    return null;
  }

  const totalValue = fills.reduce((sum, fill) => {
    return sum + Number(fill.contracts ?? 0) * Number(fill.price ?? 0);
  }, 0);

  return Number((totalValue / totalQuantity).toFixed(4));
}

function getOpenFills(fills: FillRow[]) {
  return fills.filter((fill) => String(fill.side ?? "").toUpperCase() === "OPEN");
}

function getCloseFills(fills: FillRow[]) {
  return fills.filter((fill) => String(fill.side ?? "").toUpperCase() === "CLOSE");
}

function calculateExecutionScore({
  execution,
  notes,
}: {
  execution: ExecutionRow;
  notes: NotesRow | null;
}) {
  let score = 50;

  const outcome = getOutcome(execution);
  const pnlPct = normalizeNumber(execution.pnl_pct ?? execution.signals.return_pct);
  const fills = execution.execution_fills ?? [];
  const openFills = getOpenFills(fills);
  const closeFills = getCloseFills(fills);
  const durationMinutes = getDurationMinutes(execution.opened_at, execution.closed_at);
  const disciplineScore = normalizeNumber(notes?.discipline_score);

  if (outcome === "WIN") score += 18;
  if (outcome === "BREAKEVEN") score += 5;
  if (outcome === "LOSS") score -= 12;

  if (pnlPct !== null) {
    if (pnlPct >= 50) score += 12;
    else if (pnlPct >= 20) score += 8;
    else if (pnlPct >= 5) score += 4;
    else if (pnlPct <= -30) score -= 12;
    else if (pnlPct <= -10) score -= 8;
  }

  if (openFills.length > 0) score += 8;
  if (closeFills.length > 0) score += 8;

  if (execution.status === "CLOSED") score += 5;

  if (durationMinutes !== null) {
    if (durationMinutes >= 1) score += 2;
    if (durationMinutes <= 3 && execution.signals.trade_style === "swing") {
      score -= 5;
    }
  }

  if (notes?.setup) score += 4;
  if (notes?.notes) score += 4;
  if (notes?.mistakes) score += 3;
  if (notes?.emotion) score += 2;

  if (disciplineScore !== null) {
    score += Math.round((disciplineScore - 5) * 2);
  }

  return Math.min(Math.max(score, 1), 100);
}

function gradeFromScore(score: number) {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "B-";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  if (score >= 55) return "C-";
  if (score >= 50) return "D";
  return "F";
}

function buildSummary({
  execution,
  notes,
  executionScore,
  grade,
}: {
  execution: ExecutionRow;
  notes: NotesRow | null;
  executionScore: number;
  grade: string;
}) {
  const symbol = getSymbol(execution);
  const outcome = getOutcome(execution);
  const pnlPct = normalizeNumber(execution.pnl_pct ?? execution.signals.return_pct);
  const durationMinutes = getDurationMinutes(execution.opened_at, execution.closed_at);
  const duration = formatDuration(durationMinutes);
  const setup = normalizeText(notes?.setup);

  const outcomeText =
    outcome === "WIN"
      ? "winning"
      : outcome === "LOSS"
        ? "losing"
        : outcome === "BREAKEVEN"
          ? "breakeven"
          : "ungraded";

  const returnText =
    pnlPct !== null ? ` with a ${pnlPct.toFixed(2)}% return` : "";

  return `${symbol} was a ${outcomeText} ${execution.signals.trade_style ?? "trade"}${returnText}. The position lasted ${duration}. CASE graded the execution as ${grade} with an execution score of ${executionScore}/100.${
    setup ? ` The documented setup was: ${setup}.` : ""
  }`;
}

function buildWhatWentWell({
  execution,
  notes,
}: {
  execution: ExecutionRow;
  notes: NotesRow | null;
}) {
  const items: string[] = [];
  const outcome = getOutcome(execution);
  const fills = execution.execution_fills ?? [];
  const openFills = getOpenFills(fills);
  const closeFills = getCloseFills(fills);
  const pnlPct = normalizeNumber(execution.pnl_pct ?? execution.signals.return_pct);

  if (outcome === "WIN") {
    items.push("The trade produced a winning result and followed through enough to close profitably.");
  }

  if (pnlPct !== null && pnlPct >= 20) {
    items.push("The return was strong relative to the entry price, showing good upside capture.");
  }

  if (openFills.length > 0 && closeFills.length > 0) {
    items.push("The execution ledger has both open and close fills, which gives the journal clean trade history.");
  }

  if (notes?.setup) {
    items.push("The trade setup was documented, making it easier to review repeatable patterns.");
  }

  if (notes?.emotion) {
    items.push("The emotional state was recorded, which supports better psychology tracking over time.");
  }

  if (notes?.discipline_score) {
    items.push("A discipline score was recorded, making this trade easier to compare against future trades.");
  }

  if (items.length === 0) {
    items.push("The trade was captured in the journal with enough structure to support future review.");
  }

  return items;
}

function buildMistakes({
  execution,
  notes,
}: {
  execution: ExecutionRow;
  notes: NotesRow | null;
}) {
  const items: string[] = [];
  const outcome = getOutcome(execution);
  const durationMinutes = getDurationMinutes(execution.opened_at, execution.closed_at);
  const closeFills = getCloseFills(execution.execution_fills ?? []);

  if (notes?.mistakes) {
    items.push(notes.mistakes);
  }

  if (outcome === "LOSS") {
    items.push("Review whether the stop-loss, position size, or entry timing could have been improved.");
  }

  if (closeFills.length === 0) {
    items.push("No close fill was found, so the trade may not have complete execution history.");
  }

  if (
    durationMinutes !== null &&
    durationMinutes <= 3 &&
    execution.signals.trade_style === "swing"
  ) {
    items.push("The trade was marked as a swing but was held for only a few minutes, so the style classification may need review.");
  }

  if (!notes?.setup) {
    items.push("The setup was not documented. Add a clear setup label to improve pattern tracking.");
  }

  if (!notes?.notes) {
    items.push("Trade notes were not provided. Add more context about why the trade was taken and how it behaved.");
  }

  if (items.length === 0) {
    items.push("No major mistakes were detected from the available journal data.");
  }

  return items;
}

function buildImprovementPlan({
  execution,
  notes,
}: {
  execution: ExecutionRow;
  notes: NotesRow | null;
}) {
  const items: string[] = [];
  const outcome = getOutcome(execution);

  items.push("Before entering, define the setup, invalidation level, target area, and planned scale-out rules.");

  if (!notes?.emotion) {
    items.push("Record your emotion before and after the trade to identify psychology patterns.");
  }

  if (!notes?.discipline_score) {
    items.push("Add a discipline score after every trade so performance can be measured beyond P/L.");
  }

  if (outcome === "WIN") {
    items.push("Review whether the exit captured the intended move or whether scaling rules could improve future upside.");
  }

  if (outcome === "LOSS") {
    items.push("Identify whether the loss came from entry timing, thesis failure, oversized risk, or emotional decision-making.");
  }

  items.push("Attach before, during, and after screenshots so the trade can be reviewed visually.");

  return items;
}

function buildPsychologyReview(notes: NotesRow | null) {
  const emotion = normalizeText(notes?.emotion);
  const disciplineScore = normalizeNumber(notes?.discipline_score);

  if (!emotion && disciplineScore === null) {
    return "No psychology data was recorded yet. Add emotion and discipline score after each trade so CASE can identify behavioral patterns over time.";
  }

  if (disciplineScore !== null && disciplineScore >= 8) {
    return `Psychology review: emotion was recorded as "${emotion ?? "not specified"}" and discipline was strong at ${disciplineScore}/10. Continue reinforcing this process and compare it against future trades.`;
  }

  if (disciplineScore !== null && disciplineScore <= 4) {
    return `Psychology review: emotion was recorded as "${emotion ?? "not specified"}" and discipline was weak at ${disciplineScore}/10. Review whether the trade involved chasing, hesitation, revenge trading, or breaking the plan.`;
  }

  return `Psychology review: emotion was recorded as "${emotion ?? "not specified"}"${
    disciplineScore !== null ? ` with discipline scored ${disciplineScore}/10` : ""
  }. Continue tracking this to find patterns between emotion, execution quality, and P/L.`;
}

export async function generateTradeReview({
  tradeId,
}: GenerateTradeReviewInput): Promise<GenerateTradeReviewResult> {
  const normalizedTradeId = normalizeText(tradeId);

  if (!normalizedTradeId) {
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
      status,
      contracts,
      entry_price,
      exit_price,
      pnl,
      pnl_pct,
      opened_at,
      closed_at,
      created_by,
      execution_fills!left (
        side,
        contracts,
        price,
        created_at
      ),
      signals!inner (
        id,
        asset,
        underlying,
        action,
        open_action,
        instrument_type,
        option_type,
        strike_price,
        expiration_date,
        confidence,
        trade_style,
        status,
        outcome,
        return_pct,
        created_by
      )
      `
    )
    .eq("id", normalizedTradeId)
    .maybeSingle<ExecutionRow>();

  if (executionError || !execution || !execution.signals) {
    console.error("generateTradeReview: execution lookup failed", executionError);

    return {
      success: false,
      error: "Trade execution not found.",
    };
  }

  const admin = isMasterAdmin(role);

  const canReview =
    admin ||
    execution.created_by === role.user_id ||
    execution.signals.created_by === role.user_id;

  if (!canReview) {
    return {
      success: false,
      error: "You do not have permission to review this trade.",
    };
  }

  const { data: notes } = await supabase
    .from("journal_execution_notes")
    .select(
      `
      notes,
      setup,
      mistakes,
      tags,
      emotion,
      discipline_score
      `
    )
    .eq("execution_id", normalizedTradeId)
    .maybeSingle<NotesRow>();

  const executionScore = calculateExecutionScore({
    execution,
    notes: notes ?? null,
  });

  const disciplineScore = normalizeNumber(notes?.discipline_score);
  const grade = gradeFromScore(executionScore);

  const reviewPayload = {
    execution_id: execution.id,
    signal_id: execution.signal_id,
    grade,
    execution_score: executionScore,
    discipline_score: disciplineScore,
    summary: buildSummary({
      execution,
      notes: notes ?? null,
      executionScore,
      grade,
    }),
    what_went_well: buildWhatWentWell({
      execution,
      notes: notes ?? null,
    }),
    mistakes: buildMistakes({
      execution,
      notes: notes ?? null,
    }),
    improvement_plan: buildImprovementPlan({
      execution,
      notes: notes ?? null,
    }),
    psychology_review: buildPsychologyReview(notes ?? null),
    updated_at: new Date().toISOString(),
    updated_by: role.user_id,
  };

  const { data: review, error: upsertError } = await supabase
    .from(REVIEW_TABLE)
    .upsert(reviewPayload, {
      onConflict: "execution_id",
    })
    .select(
      `
      id,
      execution_id,
      signal_id,
      grade,
      execution_score,
      discipline_score,
      summary,
      what_went_well,
      mistakes,
      improvement_plan,
      psychology_review,
      created_at,
      updated_at
      `
    )
    .single();

  if (upsertError || !review) {
    console.error("generateTradeReview: review upsert failed", upsertError);

    return {
      success: false,
      error: `Failed to generate trade review: ${
        upsertError?.message ?? "No review returned"
      }`,
    };
  }

  revalidatePath("/dashboard/journal");
  revalidatePath(`/dashboard/journal/${execution.id}`);
  revalidatePath(`/dashboard/signals/${execution.signal_id}`);

  return {
    success: true,
    review,
  };
}
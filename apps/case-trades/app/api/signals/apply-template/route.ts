import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
type TemplateType = "SCALP" | "SWING" | "LEAP";
type TradeStyle = "scalp" | "swing" | "leap";

/* -------------------------------------------------
   EXECUTION RULE TEMPLATES (CANONICAL)
------------------------------------------------- */
const EXECUTION_TEMPLATES: Record<
  TemplateType,
  {
    style: TradeStyle;
    rules: {
      rule_type: "STOP_LOSS" | "TAKE_PROFIT";
      value_pct: number;
      quantity_pct: number;
    }[];
  }
> = {
  SCALP: {
    style: "scalp",
    rules: [
      { rule_type: "STOP_LOSS", value_pct: -15, quantity_pct: 100 },
      { rule_type: "TAKE_PROFIT", value_pct: 20, quantity_pct: 100 },
    ],
  },
  SWING: {
    style: "swing",
    rules: [
      { rule_type: "STOP_LOSS", value_pct: -30, quantity_pct: 100 },
      { rule_type: "TAKE_PROFIT", value_pct: 40, quantity_pct: 50 },
      { rule_type: "TAKE_PROFIT", value_pct: 80, quantity_pct: 50 },
    ],
  },
  LEAP: {
    style: "leap",
    rules: [
      { rule_type: "STOP_LOSS", value_pct: -50, quantity_pct: 100 },
      { rule_type: "TAKE_PROFIT", value_pct: 100, quantity_pct: 50 },
      { rule_type: "TAKE_PROFIT", value_pct: 200, quantity_pct: 50 },
    ],
  },
};

/* -------------------------------------------------
   POST /api/signals/apply-template
------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const { signalId, template } = await req.json();

    if (!signalId || !template) {
      return NextResponse.json(
        { error: "Missing signalId or template" },
        { status: 400 }
      );
    }

    const selected = EXECUTION_TEMPLATES[template as TemplateType];

    if (!selected) {
      return NextResponse.json(
        { error: "Invalid template type" },
        { status: 400 }
      );
    }

    /* 🔒 AUTHORIZATION — MASTER ADMIN ONLY */
    const role = await resolveCurrentUserRole();

    if (!role || role.role_rank !== 4) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServerClient();

    /* -------------------------------------------------
       1️⃣ UPDATE SIGNAL TRADE STYLE
    ------------------------------------------------- */
    const { error: styleError } = await supabase
      .from("signals")
      .update({
        trade_style: selected.style,
        updated_by: role.user_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", signalId);

    if (styleError) {
      throw styleError;
    }

    /* -------------------------------------------------
       2️⃣ DEACTIVATE EXISTING EXECUTION RULES
    ------------------------------------------------- */
    const { error: deactivateError } = await supabase
      .from("signal_execution_rules")
      .update({
        is_active: false,
        updated_by: role.user_id,
        updated_at: new Date().toISOString(),
      })
      .eq("signal_id", signalId)
      .eq("is_active", true);

    if (deactivateError) {
      throw deactivateError;
    }

    /* -------------------------------------------------
       3️⃣ INSERT NEW TEMPLATE RULES
    ------------------------------------------------- */
    const { error: insertError } = await supabase
      .from("signal_execution_rules")
      .insert(
        selected.rules.map((r) => ({
          signal_id: signalId,
          rule_type: r.rule_type,
          value_pct: r.value_pct,
          quantity_pct: r.quantity_pct,
          is_active: true,
          created_by: role.user_id,
        }))
      );

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      applied: template,
    });
  } catch (err) {
    console.error("Apply execution template failed:", err);
    return NextResponse.json(
      { error: "Failed to apply execution template" },
      { status: 500 }
    );
  }
}

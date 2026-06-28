"use server";

import { createClient } from "@supabase/supabase-js";
import applyExecutionTemplate from "@/lib/applyExecutionRuleTemplate";
import { EXECUTION_RULE_TEMPLATES } from "@/lib/executionRuleTemplates";
import { sendSignalToDiscord } from "@/lib/discord/sendSignalToDiscord";

export type CreateSignalInput = {
  action: "BUY" | "SELL";
  instrument_type: "OPTION" | "STOCK";
  underlying: string;
  entry_price: number;
  underlying_entry_price: number;
  option_type?: "CALL" | "PUT";
  strike_price?: number;
  expiration_date?: string;
  confidence: number;
  trade_style: "scalp" | "swing" | "leap";
};

export async function createSignal(input: CreateSignalInput) {
  const errors: Record<string, string> = {};

  if (!input.action) errors.action = "Action is required.";
  if (!input.instrument_type) errors.instrument_type = "Instrument type is required.";
  if (!input.underlying?.trim()) errors.underlying = "Underlying ticker is required.";
  if (!input.entry_price || input.entry_price <= 0) errors.entry_price = "Entry price must be greater than 0.";
  if (!input.underlying_entry_price || input.underlying_entry_price <= 0) {
    errors.underlying_entry_price = "Underlying market price is required.";
  }
  if (input.confidence < 1 || input.confidence > 100) {
    errors.confidence = "Confidence must be between 1 and 100.";
  }
  if (!input.trade_style) errors.trade_style = "Execution style is required.";

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES!
  );

  const { data: signal, error } = await supabase
    .from("signals")
    .insert({
      asset: input.underlying,
      underlying: input.underlying,
      instrument_type: input.instrument_type,
      action: input.action,
      entry_price: input.entry_price,
      underlying_entry_price: input.underlying_entry_price,
      option_type: input.option_type ?? null,
      strike_price: input.strike_price ?? null,
      expiration_date: input.expiration_date ?? null,
      confidence: input.confidence,
      trade_style: input.trade_style,
      status: "Active",
    })
    .select("id")
    .single();

  if (error || !signal) {
    console.error("Create signal failed", error);
    return { errors: { _form: "Failed to create signal. Please try again." } };
  }

  const template = EXECUTION_RULE_TEMPLATES[input.trade_style];

  if (!template?.rules?.length) {
    return { errors: { _form: "Invalid execution style." } };
  }

  try {
    await applyExecutionTemplate(signal.id, input.trade_style, template.rules);
  } catch (err) {
    console.error("Execution rule template failed", err);
    return {
      errors: {
        _form: "Signal was created, but execution rules failed to apply.",
      },
    };
  }

  try {
    await sendSignalToDiscord({
      ...input,
      signal_id: signal.id,
    });
  } catch (err) {
    console.error("Discord post failed, but signal was created:", err);
  }

  return { success: true, id: signal.id };
}
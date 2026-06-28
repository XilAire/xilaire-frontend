import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  Hash,
  Info,
  ShieldCheck,
} from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { getProfile } from "@/lib/getProfile";

import { Button } from "@/components/ui/button";

interface EditSignalPageProps {
  params: {
    signalId: string;
  };
  searchParams?: Record<string, string>;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString();
}

function withOrgQuery(href: string, organizationSlug?: string | null) {
  if (!organizationSlug) return href;

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}org=${encodeURIComponent(organizationSlug)}`;
}

function isMasterAdminProfile(profile: any) {
  return (
    profile.current_organization?.is_master_admin === true ||
    profile.roles?.[0]?.name === "master_admin" ||
    profile.roles?.[0]?.rank === 4 ||
    String(profile.email ?? "").toLowerCase() ===
      "csthilaire@xilairetechnologies.com"
  );
}

export default async function EditSignalPage({
  params,
  searchParams,
}: EditSignalPageProps) {
  const { signalId } = params;
  const errors = searchParams ?? {};
  const organizationSlugParam = searchParams?.org;

  /* -------------------------------------------------
     🔒 AUTH — MASTER ADMIN ONLY
  ------------------------------------------------- */
  const role = await resolveCurrentUserRole();

  if (!role || role.role_rank !== 4) {
    throw new Error("Unauthorized");
  }

  const profile = await getProfile({
    organizationSlug: organizationSlugParam,
  });

  const currentOrganization = profile.current_organization;

  if (!currentOrganization) {
    redirect("/dashboard/billing?reason=no_organization");
  }

  if (!isMasterAdminProfile(profile)) {
    throw new Error("Unauthorized");
  }

  const organizationSlug = currentOrganization.organization_slug;
  const organizationId = currentOrganization.organization_id;

  const supabase = createSupabaseServerClient();

  /* -------------------------------------------------
     📥 LOAD SIGNAL — ORGANIZATION SCOPED
  ------------------------------------------------- */
  const { data: signal, error } = await supabase
    .from("signals")
    .select("*")
    .eq("id", signalId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("Edit signal load error", error);
    throw new Error("Failed to load signal");
  }

  if (!signal) {
    notFound();
  }

  /* -------------------------------------------------
     🧾 SERVER ACTION — UPDATE SIGNAL
  ------------------------------------------------- */
  async function updateSignal(formData: FormData) {
    "use server";

    const supabase = createSupabaseServerClient();
    const role = await resolveCurrentUserRole();

    if (!role || role.role_rank !== 4) {
      throw new Error("Unauthorized");
    }

    const formOrganizationId = String(
      formData.get("organization_id") || ""
    ).trim();

    const formOrganizationSlug = String(formData.get("org") || "").trim();

    if (!formOrganizationId) {
      throw new Error("Missing organization_id.");
    }

    const asset = String(formData.get("asset") || "").trim().toUpperCase();
    const underlying = String(formData.get("underlying") || "")
      .trim()
      .toUpperCase();
    const action = String(formData.get("action") || "");
    const optionType = String(formData.get("option_type") || "");
    const tradeStyle = String(formData.get("trade_style") || "");
    const entryPrice = Number(formData.get("entry_price"));
    const underlyingEntryPriceRaw = formData.get("underlying_entry_price");
    const underlyingEntryPrice =
      underlyingEntryPriceRaw === null || String(underlyingEntryPriceRaw) === ""
        ? null
        : Number(underlyingEntryPriceRaw);
    const strikePrice = Number(formData.get("strike_price"));
    const expirationDate = String(formData.get("expiration_date") || "");
    const stopLossPctRaw = formData.get("stop_loss_pct");
    const takeProfitPctRaw = formData.get("take_profit_pct");
    const stopLossPct =
      stopLossPctRaw === null || String(stopLossPctRaw) === ""
        ? null
        : Number(stopLossPctRaw);
    const takeProfitPct =
      takeProfitPctRaw === null || String(takeProfitPctRaw) === ""
        ? null
        : Number(takeProfitPctRaw);
    const confidence = Number(formData.get("confidence"));
    const status = String(formData.get("status") || "");
    const outcome = String(formData.get("outcome") || "");
    const rationale = String(formData.get("rationale") || "").trim();

    const formErrors: Record<string, string> = {};

    if (!asset) {
      formErrors.asset = "Ticker is required.";
    }

    if (!underlying) {
      formErrors.underlying = "Underlying is required.";
    }

    if (!["BUY", "SELL", "HOLD"].includes(action)) {
      formErrors.action = "Action must be BUY, SELL, or HOLD.";
    }

    if (!["CALL", "PUT"].includes(optionType)) {
      formErrors.option_type = "Option type must be CALL or PUT.";
    }

    if (!["scalp", "swing", "leap"].includes(tradeStyle)) {
      formErrors.trade_style = "Trade style must be scalp, swing, or leap.";
    }

    if (!entryPrice || Number.isNaN(entryPrice) || entryPrice <= 0) {
      formErrors.entry_price = "Entry price must be greater than 0.";
    }

    if (
      underlyingEntryPrice !== null &&
      (Number.isNaN(underlyingEntryPrice) || underlyingEntryPrice <= 0)
    ) {
      formErrors.underlying_entry_price =
        "Underlying entry price must be greater than 0.";
    }

    if (!strikePrice || Number.isNaN(strikePrice) || strikePrice <= 0) {
      formErrors.strike_price = "Strike must be greater than 0.";
    }

    if (!expirationDate) {
      formErrors.expiration_date = "Expiration date is required.";
    }

    if (
      stopLossPct !== null &&
      (Number.isNaN(stopLossPct) || stopLossPct >= 0)
    ) {
      formErrors.stop_loss_pct = "Stop loss should be a negative percentage.";
    }

    if (
      takeProfitPct !== null &&
      (Number.isNaN(takeProfitPct) || takeProfitPct <= 0)
    ) {
      formErrors.take_profit_pct =
        "Take profit should be a positive percentage.";
    }

    if (Number.isNaN(confidence) || confidence < 0 || confidence > 100) {
      formErrors.confidence = "Confidence must be between 0 and 100.";
    }

    if (!["Active", "Triggered", "Closed", "Expired"].includes(status)) {
      formErrors.status = "Invalid status value.";
    }

    if (status === "Closed") {
      if (!["WIN", "LOSS", "BREAKEVEN"].includes(outcome)) {
        formErrors.outcome = "Outcome is required when closing a signal.";
      }
    }

    if (Object.keys(formErrors).length > 0) {
      const params = new URLSearchParams(formErrors);

      if (formOrganizationSlug) {
        params.set("org", formOrganizationSlug);
      }

      redirect(`/dashboard/signals/edit/${signalId}?${params.toString()}`);
    }

    const { data: currentSignal, error: currentSignalError } = await supabase
      .from("signals")
      .select("id, organization_id, closed_at")
      .eq("id", signalId)
      .eq("organization_id", formOrganizationId)
      .maybeSingle();

    if (currentSignalError || !currentSignal) {
      console.error("Edit signal organization guard failed", {
        signalId,
        formOrganizationId,
        currentSignalError,
      });

      throw new Error("Signal not found for selected organization.");
    }

    const nextClosedAt =
      status === "Closed"
        ? currentSignal.closed_at ?? new Date().toISOString()
        : null;

    const { error } = await supabase
      .from("signals")
      .update({
        asset,
        underlying,
        action,
        instrument_type: "OPTION",
        option_type: optionType,
        trade_style: tradeStyle,
        price: entryPrice,
        entry_price: entryPrice,
        underlying_entry_price: underlyingEntryPrice,
        strike_price: strikePrice,
        expiration_date: expirationDate,
        stop_loss_pct: stopLossPct,
        take_profit_pct: takeProfitPct,
        confidence,
        status,
        outcome: status === "Closed" ? outcome : null,
        closed_at: nextClosedAt,
        rationale: rationale || null,
        updated_by: role.user_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", signalId)
      .eq("organization_id", formOrganizationId);

    if (error) {
      console.error("Edit signal save error", error);

      const params = new URLSearchParams({
        _form: "Save failed.",
      });

      if (formOrganizationSlug) {
        params.set("org", formOrganizationSlug);
      }

      redirect(`/dashboard/signals/edit/${signalId}?${params.toString()}`);
    }

    redirect(withOrgQuery("/dashboard/admin/signals?saved=1", formOrganizationSlug));
  }

  /* -------------------------------------------------
     🧱 UI
  ------------------------------------------------- */
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-300">
            {currentOrganization.organization_name} · Platform Administration
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-100">
            Edit Signal
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Update option details, strike, expiration, confidence, risk targets,
            and lifecycle status. Master-admin only. Changes are audited.
          </p>
        </div>

        <Link
          href={withOrgQuery("/dashboard/admin/signals", organizationSlug)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Signals
        </Link>
      </div>

      {errors._form && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errors._form}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <form
          action={updateSignal}
          noValidate
          className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80"
        >
          <input type="hidden" name="organization_id" value={organizationId} />
          <input type="hidden" name="org" value={organizationSlug} />

          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function () {
                  let isDirty = false;
                  const form = document.querySelector("form");
                  const submitBtn = document.querySelector("button[type='submit']");

                  if (!form || !submitBtn) return;

                  form.addEventListener("change", () => {
                    isDirty = true;
                  });

                  form.addEventListener("submit", () => {
                    isDirty = false;
                    submitBtn.disabled = true;
                    submitBtn.innerText = "Saving…";
                    document.body.style.cursor = "wait";
                  });

                  window.addEventListener("beforeunload", function (e) {
                    if (!isDirty) return;
                    e.preventDefault();
                    e.returnValue = "";
                  });
                })();
              `,
            }}
          />

          <div className="border-b border-white/10 p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                <Activity className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Signal Details
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Primary trade setup information shown to subscribed traders.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2">
            <Field
              label="Ticker"
              name="asset"
              required
              defaultValue={signal.asset ?? ""}
              error={errors.asset}
              hint="Ticker symbol shown in the signal board."
            />

            <Field
              label="Underlying"
              name="underlying"
              required
              defaultValue={signal.underlying ?? signal.asset ?? ""}
              error={errors.underlying}
              hint="Underlying asset for the option contract."
            />

            <SelectField
              label="Action"
              name="action"
              required
              defaultValue={signal.action ?? "BUY"}
              error={errors.action}
              hint="Trade direction."
              options={[
                { label: "Buy", value: "BUY" },
                { label: "Sell", value: "SELL" },
                { label: "Hold", value: "HOLD" },
              ]}
            />

            <SelectField
              label="Option Type"
              name="option_type"
              required
              defaultValue={signal.option_type ?? "CALL"}
              error={errors.option_type}
              hint="Call or put contract."
              options={[
                { label: "Call", value: "CALL" },
                { label: "Put", value: "PUT" },
              ]}
            />

            <SelectField
              label="Trade Style"
              name="trade_style"
              required
              defaultValue={signal.trade_style ?? "swing"}
              error={errors.trade_style}
              hint="Scalp, swing, or leap."
              options={[
                { label: "Scalp", value: "scalp" },
                { label: "Swing", value: "swing" },
                { label: "Leap", value: "leap" },
              ]}
            />

            <Field
              label="Strike"
              name="strike_price"
              type="number"
              step="0.01"
              required
              defaultValue={signal.strike_price ?? ""}
              error={errors.strike_price}
              hint="Option strike price."
            />

            <Field
              label="Entry Price"
              name="entry_price"
              type="number"
              step="0.01"
              required
              defaultValue={signal.entry_price ?? signal.price ?? ""}
              error={errors.entry_price}
              hint="Expected option contract entry price."
            />

            <Field
              label="Underlying Entry Price"
              name="underlying_entry_price"
              type="number"
              step="0.01"
              defaultValue={signal.underlying_entry_price ?? ""}
              error={errors.underlying_entry_price}
              hint="Optional underlying price at signal entry."
            />

            <Field
              label="Expiration"
              name="expiration_date"
              type="date"
              required
              defaultValue={signal.expiration_date ?? ""}
              error={errors.expiration_date}
              hint="Option expiration date."
            />

            <Field
              label="Confidence (%)"
              name="confidence"
              type="number"
              min={0}
              max={100}
              required
              defaultValue={signal.confidence ?? ""}
              error={errors.confidence}
              hint="Analyst confidence score."
            />

            <Field
              label="Stop Loss (%)"
              name="stop_loss_pct"
              type="number"
              step="0.01"
              defaultValue={signal.stop_loss_pct ?? ""}
              error={errors.stop_loss_pct}
              hint="Use a negative value, e.g. -30."
            />

            <Field
              label="Take Profit (%)"
              name="take_profit_pct"
              type="number"
              step="0.01"
              defaultValue={signal.take_profit_pct ?? ""}
              error={errors.take_profit_pct}
              hint="Use a positive value, e.g. 40."
            />

            <SelectField
              label="Status"
              name="status"
              required
              defaultValue={signal.status}
              error={errors.status}
              hint="Controls lifecycle state."
              options={[
                { label: "Active", value: "Active" },
                { label: "Triggered", value: "Triggered" },
                { label: "Closed", value: "Closed" },
                { label: "Expired", value: "Expired" },
              ]}
            />

            <SelectField
              label="Outcome"
              name="outcome"
              defaultValue={signal.outcome ?? ""}
              error={errors.outcome}
              hint="Required when closing a signal."
              options={[
                { label: "—", value: "" },
                { label: "Win", value: "WIN" },
                { label: "Loss", value: "LOSS" },
                { label: "Breakeven", value: "BREAKEVEN" },
              ]}
            />

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-200">
                Rationale
              </label>

              <textarea
                name="rationale"
                defaultValue={signal.rationale ?? ""}
                rows={5}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500/50"
                placeholder="Optional trade thesis, chart context, catalyst, or notes."
              />

              <p className="mt-2 text-xs text-slate-500">
                Optional note shown internally or to subscribers depending on
                your signal display rules.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 p-6 sm:flex-row sm:items-center sm:justify-end">
            <Link
              href={withOrgQuery("/dashboard/admin/signals", organizationSlug)}
              className="inline-flex items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        </form>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-sky-500/10 p-3 text-sky-300">
                <Info className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-100">
                  Current Signal
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {signal.action ?? "BUY"} {signal.underlying ?? signal.asset}{" "}
                  {signal.strike_price ? `${signal.strike_price}` : ""}{" "}
                  {signal.option_type ?? ""}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <Metric
                icon={<Hash />}
                label="Strike"
                value={signal.strike_price ?? "—"}
              />
              <Metric
                icon={<CircleDollarSign />}
                label="Entry"
                value={signal.entry_price ?? signal.price ?? "—"}
              />
              <Metric
                icon={<CalendarDays />}
                label="Expiration"
                value={signal.expiration_date ?? "—"}
              />
              <Metric
                icon={<Gauge />}
                label="Confidence"
                value={
                  signal.confidence !== null && signal.confidence !== undefined
                    ? `${signal.confidence}%`
                    : "—"
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-100">
                  Audit Information
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  System tracking for this signal record.
                </p>
              </div>
            </div>

            <dl className="mt-6 space-y-4 text-sm">
              <AuditRow label="Signal ID" value={signal.id} mono />
              <AuditRow
                label="Organization"
                value={currentOrganization.organization_name}
              />
              <AuditRow
                label="Organization ID"
                value={signal.organization_id ?? "—"}
                mono
              />
              <AuditRow label="Status" value={signal.status} />
              <AuditRow label="Outcome" value={signal.outcome ?? "—"} />
              <AuditRow
                label="Created At"
                value={formatDateTime(signal.created_at)}
              />
              <AuditRow
                label="Last Updated At"
                value={formatDateTime(signal.updated_at)}
              />
              <AuditRow
                label="Closed At"
                value={formatDateTime(signal.closed_at)}
              />
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
  error,
  hint,
  step,
  min,
  max,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number | null;
  error?: string;
  hint?: string;
  step?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-200">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>

      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        step={step}
        min={min}
        max={max}
        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500/50"
      />

      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}

      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}

function SelectField({
  label,
  name,
  required = false,
  defaultValue,
  error,
  hint,
  options,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string | number | null;
  error?: string;
  hint?: string;
  options: {
    label: string;
    value: string;
  }[];
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-200">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>

      <select
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/50"
      >
        {options.map((option) => (
          <option
            key={option.value || option.label}
            value={option.value}
            className="bg-slate-950 text-slate-100"
          >
            {option.label}
          </option>
        ))}
      </select>

      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}

      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950 p-4">
      <div className="text-emerald-400 [&>svg]:h-4 [&>svg]:w-4">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-semibold text-slate-100">{value}</p>
      </div>
    </div>
  );
}

function AuditRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd
        className={
          "mt-1 break-all text-slate-200 " + (mono ? "font-mono text-xs" : "")
        }
      >
        {value}
      </dd>
    </div>
  );
}
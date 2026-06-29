import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import CalendarInput from "./components/CalendarInput";

/* ----------------------------------------
   APPROVAL STAGES
---------------------------------------- */
const CHANGE_REQUEST_APPROVAL_STAGES = [
  "Planning Review",
  "Risk Assessment",
  "Security Review",
  "CAB Approval",
  "Scheduling Approval",
  "Implementation Approval",
  "Post-Implementation Review",
];

export default async function NewChangeRequestPage() {
  const supabase = createServerSupabaseClient();

  /* ----------------------------------------
     AUTH CHECK
  ---------------------------------------- */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return notFound();

  /* ----------------------------------------
     LOAD TECHNICIANS
  ---------------------------------------- */
  const { data: technicians } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name");

  /* ----------------------------------------
     SERVER ACTION
  ---------------------------------------- */
  async function submit(formData: FormData) {
    "use server";

    const serverSupabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) redirect("/auth/signin");

    const title = String(formData.get("title") || "").trim();
    if (!title) return;

    const description = String(formData.get("description") || "").trim();
    const risk = String(formData.get("risk") || "medium");

    const assignedTo = (formData.get("assigned_to") as string) || null;
    const plannedStart = (formData.get("start_date") as string) || null;
    const plannedEnd = (formData.get("end_date") as string) || null;

    const requiresApproval = formData.get("requiresApproval") === "on";

    const { data, error } = await serverSupabase
      .from("change_requests")
      .insert({
        title,
        description: description || null,
        risk,
        status: "planning",

        assigned_to: assignedTo,
        start_date: plannedStart,
        end_date: plannedEnd,

        requires_approval: requiresApproval,
        approval_status: requiresApproval ? "pending" : null,

        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Failed to create change request");
    }

    if (requiresApproval) {
      await serverSupabase.from("approvals").insert(
        CHANGE_REQUEST_APPROVAL_STAGES.map((stage, index) => ({
          request_type: "change_request",
          request_id: data.id,
          outcome: index === 0 ? "pending" : null,
          notes: stage,
        }))
      );
    }

    redirect(`/helpdesk/change-requests/${data.id}`);
  }

  /* ----------------------------------------
     RENDER
  ---------------------------------------- */
  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          New Change Request
        </h1>
        <p className="text-sm text-slate-400">
          Define scope, ownership, timing, and approvals
        </p>
      </div>

      <form
        action={submit}
        className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 space-y-8"
      >
        <Field label="Change Title">
          <input
            name="title"
            required
            placeholder="e.g. Deploy New VPN Client"
            className={inputClass}
          />
        </Field>

        <Field label="Description">
          <textarea
            name="description"
            rows={4}
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Field label="Assigned To">
            <select name="assigned_to" className={inputClass}>
              <option value="">— Unassigned —</option>
              {technicians?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
          </Field>

          <CalendarInput label="Planned Start" name="start_date" />
          <CalendarInput label="Planned End" name="end_date" />
        </div>

        <Field label="Risk Level">
          <select name="risk" defaultValue="medium" className={inputClass}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </Field>

        <label className="flex items-center gap-3 text-slate-300">
          <input type="checkbox" name="requiresApproval" defaultChecked />
          Requires approval before execution
        </label>

        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm text-slate-400">
          Approval stages will be created automatically.
          Tasks may not be completed until approvals are granted.
        </div>

        <div className="flex gap-4 pt-6 border-t border-slate-700">
          <button className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded text-white">
            Create Change Request
          </button>
          <a
            href="/helpdesk/change-requests"
            className="px-6 py-2 rounded border border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}

/* ----------------------------------------
   SHARED STYLES
---------------------------------------- */
const inputClass =
  "w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

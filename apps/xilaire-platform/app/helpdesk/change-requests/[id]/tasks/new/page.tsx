import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { createChangeTask } from "../../../actions";

export default async function NewTaskPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerSupabaseClient();
  const changeRequestId = params.id;

  /* ----------------------------------------
     AUTH CHECK
  ---------------------------------------- */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return notFound();

  /* ----------------------------------------
     LOAD CHANGE REQUEST
  ---------------------------------------- */
  const { data: change } = await supabase
    .from("change_requests")
    .select("id, title")
    .eq("id", changeRequestId)
    .single();

  if (!change) return notFound();

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

    const summary = String(formData.get("summary") || "").trim();
    if (!summary) return;

    await createChangeTask({
      changeRequestId,

      summary,
      description: String(formData.get("description") || "").trim(),

      requiresApproval: formData.get("requiresApproval") === "on",

      assignedTo:
        (formData.get("assigned_to") as string) || null,

      startDate:
        (formData.get("start_date") as string) || null,

      endDate:
        (formData.get("end_date") as string) || null,

      implementationPlan:
        String(formData.get("implementation_plan") || ""),

      preTestPlan:
        String(formData.get("pre_test_plan") || ""),

      postTestPlan:
        String(formData.get("post_test_plan") || ""),

      backoutPlan:
        String(formData.get("backout_plan") || ""),

      outageExpected:
        formData.get("outage_expected") === "yes",
    });

    redirect(`/helpdesk/change-requests/${changeRequestId}`);
  }

  /* ----------------------------------------
     RENDER
  ---------------------------------------- */
  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Add Task
        </h1>
        <p className="text-sm text-slate-400">
          Change Request:{" "}
          <span className="text-slate-200 font-medium">
            {change.title}
          </span>
        </p>
      </div>

      <form
        action={submit}
        className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 space-y-8"
      >
        {/* SUMMARY */}
        <Field label="Task Summary">
          <input
            name="summary"
            required
            placeholder="Describe the task…"
            className={inputClass}
          />
        </Field>

        {/* DESCRIPTION */}
        <Field label="Description">
          <textarea
            name="description"
            rows={4}
            className={inputClass}
          />
        </Field>

        {/* ASSIGNMENT + DATES */}
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

          <Field label="Start Date">
            <input
              type="datetime-local"
              name="start_date"
              className={inputClass}
            />
          </Field>

          <Field label="End Date">
            <input
              type="datetime-local"
              name="end_date"
              className={inputClass}
            />
          </Field>
        </div>

        {/* PLANS */}
        <Field label="Implementation Plan">
          <textarea
            name="implementation_plan"
            rows={3}
            className={inputClass}
          />
        </Field>

        <Field label="Pre-Test Plan">
          <textarea
            name="pre_test_plan"
            rows={2}
            className={inputClass}
          />
        </Field>

        <Field label="Post-Test Plan">
          <textarea
            name="post_test_plan"
            rows={2}
            className={inputClass}
          />
        </Field>

        <Field label="Backout Plan">
          <textarea
            name="backout_plan"
            rows={2}
            className={inputClass}
          />
        </Field>

        {/* OUTAGE */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Outage Expected?
          </label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input type="radio" name="outage_expected" value="yes" />
              Yes
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="outage_expected"
                value="no"
                defaultChecked
              />
              No
            </label>
          </div>
        </div>

        {/* APPROVAL */}
        <label className="flex items-center gap-3">
          <input type="checkbox" name="requiresApproval" />
          Requires approval before execution
        </label>

        {/* ACTIONS */}
        <div className="flex gap-4 pt-6 border-t border-slate-700">
          <button className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded text-white">
            Create Task
          </button>
          <a
            href={`/helpdesk/change-requests/${changeRequestId}`}
            className="px-6 py-2 rounded border border-slate-600"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}

/* ----------------------------------------
   SHARED INPUT STYLES
---------------------------------------- */
const inputClass =
  "w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

/* ----------------------------------------
   FIELD WRAPPER
---------------------------------------- */
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

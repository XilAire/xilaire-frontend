import { supabasePlatform } from "@/lib/supabasePlatformClient";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";

import {
  EditableInput,
  EditableTextArea,
  EditableSelect,
} from "@/components/helpdesk/EditableField";

import AttachmentUploader from "@/components/helpdesk/AttachmentUploader";

/* ============================================================================
   SERVER ACTION — Create Incident
============================================================================ */
export async function createIncident(formData: FormData) {
  "use server";

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const severity = formData.get("severity") as string;
  const affectedSystem = formData.get("affected_system") as string;

  if (!title || !severity) {
    throw new Error("Missing required fields.");
  }

  const {
    data: { user },
  } = await supabasePlatform.auth.getUser();

  if (!user) throw new Error("Not authenticated.");

  // Create incident
  const { data, error } = await supabasePlatform
    .from("incidents")
    .insert({
      title,
      description,
      severity,
      affected_system: affectedSystem,
      status: "open",
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Failed to create incident.");
  }

  // Refresh list
  revalidatePath("/helpdesk/incidents");

  // Redirect to new incident
  redirect(`/helpdesk/incidents/${data.id}`);
}

/* ============================================================================
   NEW INCIDENT PAGE
============================================================================ */
export default function NewIncidentPage() {
  return (
    <div className="space-y-10">

      {/* BACK LINK */}
      <Link
        href="/helpdesk/incidents"
        className="text-blue-400 hover:text-blue-300 text-sm"
      >
        ← Back to Incidents
      </Link>

      {/* HEADER CARD */}
      <div className="rounded-2xl p-6 border border-slate-800 bg-[#0f1628] shadow-xl">
        <h1 className="text-3xl font-bold text-white">Create New Incident</h1>
        <p className="text-slate-400 text-sm mt-2">
          Log a new operational issue and attach relevant details.
        </p>
      </div>

      <form action={createIncident} className="space-y-8">

        {/* ===========================
            BASIC INFORMATION
        ============================ */}
        <Section>
          <SectionTitle>Incident Info</SectionTitle>

          <FieldWrapper>
            <Label>Title</Label>
            <input
              name="title"
              required
              placeholder="Example: Email service outage"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
            />
          </FieldWrapper>

          <FieldWrapper>
            <Label>Severity</Label>
            <select
              name="severity"
              required
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </FieldWrapper>

          <FieldWrapper>
            <Label>Affected System</Label>
            <input
              name="affected_system"
              placeholder="Exchange, Firewall, Network, Email..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
            />
          </FieldWrapper>

          <FieldWrapper>
            <Label>Description</Label>
            <textarea
              name="description"
              rows={5}
              placeholder="Describe the incident and initial findings..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
            />
          </FieldWrapper>
        </Section>

        {/* ===========================
            ATTACHMENTS
        ============================ */}
        <Section>
          <SectionTitle>Attachments (optional)</SectionTitle>
          <p className="text-slate-400 text-sm mb-4">
            You can upload screenshots or logs after you create the incident.
          </p>

          <div className="rounded-lg border border-slate-700 bg-slate-900 text-slate-400 px-4 py-3">
            Attachments can be added on the Incident Detail page.
          </div>
        </Section>

        {/* ===========================
            SUBMIT BUTTON
        ============================ */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg"
          >
            Create Incident
          </button>
        </div>

      </form>
    </div>
  );
}

/* ============================================================================
   UI COMPONENTS — same as incident detail page
============================================================================ */

function Label({ children }) {
  return <label className="block text-slate-300 mb-2">{children}</label>;
}

function FieldWrapper({ children }) {
  return (
    <div className="rounded-xl p-5 border border-slate-800 bg-[#0b1120] shadow-lg mb-4">
      {children}
    </div>
  );
}

function Section({ children }) {
  return (
    <section className="rounded-xl p-6 border border-slate-800 bg-[#0b1120] shadow-xl space-y-5">
      {children}
    </section>
  );
}

function SectionTitle({ children }) {
  return <h2 className="text-xl font-semibold text-white mb-3">{children}</h2>;
}

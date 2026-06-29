import { supabasePlatform } from "@/lib/supabasePlatformClient";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";

/* ============================================================================
   SERVER ACTION — Create Service Request
============================================================================ */
export async function createServiceRequest(formData: FormData) {
  "use server";

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;
  const priority = formData.get("priority") as string;
  const requestType = formData.get("request_type") as string;

  if (!title) {
    throw new Error("A title is required.");
  }

  const {
    data: { user },
  } = await supabasePlatform.auth.getUser();

  if (!user) throw new Error("Not authenticated.");

  // Insert service request
  const { data, error } = await supabasePlatform
    .from("service_requests")
    .insert({
      title,
      description,
      category,
      priority,
      request_type: requestType,
      status: "open",
      requester_id: user.id,
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !data) {
    console.error(error);
    throw new Error("Failed to create service request.");
  }

  // Refresh service request list
  revalidatePath("/helpdesk/service-requests");

  // Redirect to detail page
  redirect(`/helpdesk/service-requests/${data.id}`);
}

/* ============================================================================
   NEW SERVICE REQUEST PAGE
============================================================================ */
export default function NewServiceRequestPage() {
  return (
    <div className="space-y-10">

      {/* BACK LINK */}
      <Link
        href="/helpdesk/service-requests"
        className="text-blue-400 hover:text-blue-300 text-sm"
      >
        ← Back to Service Requests
      </Link>

      {/* HEADER CARD */}
      <div className="rounded-2xl p-6 border border-slate-800 bg-[#0f1628] shadow-xl">
        <h1 className="text-3xl font-bold text-white">Create New Service Request</h1>
        <p className="text-slate-400 text-sm mt-2">
          Submit a new request for support, access, or troubleshooting.
        </p>
      </div>

      {/* FORM */}
      <form action={createServiceRequest} className="space-y-8">

        {/* ===========================
            BASIC INFORMATION
        ============================ */}
        <Section>
          <SectionTitle>Request Info</SectionTitle>

          <FieldWrapper>
            <Label>Title</Label>
            <input
              name="title"
              required
              placeholder="Example: Request VPN access"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
            />
          </FieldWrapper>

          <FieldWrapper>
            <Label>Category</Label>
            <input
              name="category"
              placeholder="Hardware, Network, Access, Billing…"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
            />
          </FieldWrapper>

          <FieldWrapper>
            <Label>Request Type</Label>
            <select
              name="request_type"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
            >
              <option value="">None</option>
              <option value="issue">Issue</option>
              <option value="access">Access</option>
              <option value="application">Application</option>
              <option value="hardware">Hardware</option>
              <option value="network">Network</option>
              <option value="security">Security</option>
              <option value="billing">Billing</option>
              <option value="other">Other</option>
            </select>
          </FieldWrapper>

          <FieldWrapper>
            <Label>Priority</Label>
            <select
              name="priority"
              required
              defaultValue="medium"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </FieldWrapper>

          <FieldWrapper>
            <Label>Description</Label>
            <textarea
              name="description"
              rows={5}
              placeholder="Describe the request or issue in detail…"
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
            Attachments can be added after the request is created.
          </p>

          <div className="rounded-lg border border-slate-700 bg-slate-900 text-slate-400 px-4 py-3">
            You can upload screenshots and files on the Service Request Detail page.
          </div>
        </Section>

        {/* ===========================
            SUBMIT
        ============================ */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg"
          >
            Create Request
          </button>
        </div>

      </form>
    </div>
  );
}

/* ============================================================================
   SHARED UI COMPONENTS (matching your New Incident Page)
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

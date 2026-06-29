// apps/xilaire-platform/app/(app)/contact-requests/page.tsx
import type { Metadata } from "next";
import { supabasePlatform } from "@/lib/supabasePlatformClient";
import Link from "next/link";
import { CreateTicketButton } from "./CreateTicketButton";

export const metadata: Metadata = {
  title: "Contact requests | XilAire Platform",
  description:
    "Overview of all inbound contact requests captured by the XilAire Platform.",
};

// ensure this page is never statically cached
export const dynamic = "force-dynamic";

type ContactRequestRow = {
  id: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
  topic: string | null;
  service_sku: string | null;
  service_name: string | null;
  source_path: string | null;
  status: string | null;
  linked_ticket_id: string | null;
};

async function getContactRequests(): Promise<ContactRequestRow[]> {
  const { data, error } = await supabasePlatform
    .from("contact_requests")
    .select(
      `
      id,
      created_at,
      full_name,
      email,
      topic,
      service_sku,
      service_name,
      source_path,
      status,
      linked_ticket_id
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading contact requests:", error);
    return [];
  }

  return (data as ContactRequestRow[]) ?? [];
}

export default async function ContactRequestsPage() {
  const requests = await getContactRequests();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-50">
          Contact requests
        </h1>
        <p className="text-sm text-slate-400">
          All inbound form submissions captured by the XilAire Platform.
        </p>
      </header>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
        <table className="min-w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/60 text-[11px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Topic / Service</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Ticket</th>
              <th className="px-4 py-3 font-medium text-right">Created</th>
            </tr>
          </thead>

          {requests.length === 0 ? (
            <tbody>
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-xs text-slate-500"
                >
                  No contact requests yet. Once visitors submit the contact
                  form, they&apos;ll appear here.
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody className="divide-y divide-slate-800">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-900/40">
                  {/* CONTACT */}
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-50">
                        {r.full_name || "Unknown contact"}
                      </span>
                      {r.email && (
                        <span className="text-[11px] text-slate-400">
                          {r.email}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* TOPIC / SERVICE */}
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-slate-100">
                        {r.topic || r.service_name || "General inquiry"}
                      </span>
                      {(r.service_sku || r.service_name) && (
                        <span className="text-[11px] text-slate-500">
                          {r.service_sku && (
                            <span className="font-mono uppercase">
                              {r.service_sku}
                            </span>
                          )}
                          {r.service_sku && r.service_name && " • "}
                          {r.service_name}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* SOURCE PATH */}
                  <td className="px-4 py-3 align-top">
                    <span className="text-[11px] text-slate-400">
                      {r.source_path || "/contact"}
                    </span>
                  </td>

                  {/* STATUS */}
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        (r.status || "new") === "new"
                          ? "bg-sky-500/15 text-sky-300"
                          : (r.status || "new") === "converted"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-slate-500/15 text-slate-300"
                      }`}
                    >
                      {(r.status || "new").toUpperCase()}
                    </span>
                  </td>

                  {/* TICKET */}
                  <td className="px-4 py-3 align-top">
                    {r.linked_ticket_id ? (
                      <Link
                        href={`/tickets/${r.linked_ticket_id}`}
                        className="text-[11px] font-medium text-sky-300 hover:text-sky-200"
                      >
                        View ticket →
                      </Link>
                    ) : (
                      <CreateTicketButton requestId={r.id} />
                    )}
                  </td>

                  {/* CREATED */}
                  <td className="px-4 py-3 text-right align-top">
                    <span className="text-[11px] text-slate-400">
                      {new Date(r.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
    </div>
  );
}

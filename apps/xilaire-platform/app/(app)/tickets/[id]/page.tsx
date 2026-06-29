import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabasePlatform } from "@/lib/supabasePlatformClient";
import { TicketStatusControls } from "../TicketStatusControls";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "critical";

type TicketRow = {
  id: string;
  title: string | null;
  description: string | null;
  status: TicketStatus; // ticket_status enum
  priority: TicketPriority; // ticket_priority enum
  bot_id: string | null;
  requester_email: string | null;
  created_at: string;
  updated_at: string;
};

type TicketPageProps = {
  params: { id: string };
};

// --- Data loader -------------------------------------------------------------

async function getTicket(id: string): Promise<TicketRow | null> {
  const { data, error } = await supabasePlatform
    .from("tickets")
    .select(
      `
      id,
      title,
      description,
      status,
      priority,
      bot_id,
      requester_email,
      created_at,
      updated_at
    `,
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error loading ticket:", error);
    return null;
  }

  return data as TicketRow;
}

// --- Metadata ---------------------------------------------------------------

export async function generateMetadata(
  { params }: TicketPageProps,
): Promise<Metadata> {
  const ticket = await getTicket(params.id);

  if (!ticket) {
    return {
      title: "Ticket not found | XilAire Platform",
    };
  }

  return {
    title: `${ticket.title || "Ticket"} | XilAire Platform`,
    description:
      ticket.description ||
      "Detailed view of a ticket inside the XilAire Platform.",
  };
}

// --- Page -------------------------------------------------------------------

export default async function TicketPage({ params }: TicketPageProps) {
  const ticket = await getTicket(params.id);

  if (!ticket) {
    notFound();
  }

  const created = new Date(ticket.created_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const updated = new Date(ticket.updated_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb + heading */}
      <header className="space-y-2">
        <div className="text-xs text-slate-500">
          <Link
            href="/tickets"
            className="hover:text-sky-300 hover:underline"
          >
            Tickets
          </Link>{" "}
          <span className="text-slate-600">/</span>{" "}
          <span className="font-mono text-slate-400 text-[11px]">
            {ticket.id}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-50">
              {ticket.title || "Untitled ticket"}
            </h1>
            {ticket.requester_email && (
              <p className="text-xs text-slate-400">
                Requester:{" "}
                <span className="font-medium text-slate-100">
                  {ticket.requester_email}
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status pill (reflects value when page loaded, live changes via sidebar) */}
            <span
              className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wide
                ${
                  ticket.status === "resolved" || ticket.status === "closed"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : ticket.status === "in_progress"
                    ? "bg-amber-500/15 text-amber-300"
                    : "bg-sky-500/15 text-sky-300"
                }
              `}
            >
              {ticket.status.replace("_", " ")}
            </span>

            {/* Priority pill */}
            <span
              className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wide
                ${
                  ticket.priority === "critical" || ticket.priority === "high"
                    ? "bg-rose-500/15 text-rose-300"
                    : ticket.priority === "medium"
                    ? "bg-amber-500/15 text-amber-300"
                    : "bg-slate-500/15 text-slate-300"
                }
              `}
            >
              {ticket.priority} priority
            </span>
          </div>
        </div>
      </header>

      {/* Main content card */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        {/* Description / body */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          <h2 className="text-sm font-semibold text-slate-50">Details</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
            {ticket.description || "No description provided."}
          </p>
        </section>

        {/* Meta + controls panel */}
        <aside className="space-y-4">
          {/* NEW: status + priority controls */}
          <TicketStatusControls
            ticketId={ticket.id}
            initialStatus={ticket.status}
            initialPriority={ticket.priority}
          />

          {/* Metadata card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-300">
            <h3 className="text-sm font-semibold text-slate-50">
              Ticket metadata
            </h3>
            <dl className="mt-3 space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-right text-slate-200">{created}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Last updated</dt>
                <dd className="text-right text-slate-200">{updated}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Bot</dt>
                <dd className="text-right text-slate-200">
                  {ticket.bot_id || "Not assigned"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Ticket ID</dt>
                <dd className="text-right font-mono text-[11px] text-slate-400">
                  {ticket.id}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

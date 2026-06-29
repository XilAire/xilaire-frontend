"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabasePlatformClient";
import Link from "next/link";
import NewTicketModal from "@/components/helpdesk/NewTicketModal";
import PillDropdown from "@/components/ui/PillDropdown";
import { Search, X } from "lucide-react";
import HelpdeskHeader from "@/components/helpdesk/HelpdeskHeader";

type TicketRow = {
  id: string;
  title: string | null;
  email: string | null;
  description: string | null;
  status: "open" | "in_progress" | "resolved" | "closed" | string;
  priority: "low" | "medium" | "high" | "critical" | string;
  bot_id: string | null;
  created_at: string;
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [botFilter, setBotFilter] = useState<string | null>(null);

  /* ------------------------------------------------------
   * Load Tickets
   * ----------------------------------------------------*/
  const loadTickets = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[TicketsPage] Failed to load tickets:", error);
      setTickets([]);
      setLoading(false);
      return;
    }

    setTickets((data as TicketRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  /* ------------------------------------------------------
   * Badge Styles (Both Themes)
   * ----------------------------------------------------*/
  const statusBadge: Record<string, string> = {
    open:
      "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 ring-1 ring-yellow-500/30",
    in_progress:
      "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30",
    resolved:
      "bg-green-500/10 text-green-700 dark:text-green-300 ring-1 ring-green-500/30",
    closed:
      "bg-gray-500/10 text-gray-700 dark:text-gray-400 ring-1 ring-gray-600/30",
  };

  const priorityBadge: Record<string, string> = {
    low:
      "bg-gray-500/10 text-gray-700 dark:text-gray-300 ring-1 ring-gray-600/30",
    medium:
      "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-blue-600/30",
    high:
      "bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-orange-600/30",
    critical:
      "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-red-600/30",
  };

  /* ------------------------------------------------------
   * Filtering Logic
   * ----------------------------------------------------*/
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const normalizedSearch = search.toLowerCase();

      const matchSearch =
        t.title?.toLowerCase().includes(normalizedSearch) ||
        t.email?.toLowerCase().includes(normalizedSearch) ||
        t.id?.toLowerCase().includes(normalizedSearch) ||
        t.description?.toLowerCase().includes(normalizedSearch);

      const matchStatus = !statusFilter || t.status === statusFilter;
      const matchPriority = !priorityFilter || t.priority === priorityFilter;

      const matchBot =
        !botFilter ||
        (botFilter === "unassigned" && !t.bot_id) ||
        t.bot_id === botFilter;

      return Boolean(matchSearch) && matchStatus && matchPriority && matchBot;
    });
  }, [tickets, search, statusFilter, priorityFilter, botFilter]);

  /* ------------------------------------------------------
   * Unique Bot List
   * ----------------------------------------------------*/
  const botList = useMemo(() => {
    const ids = new Set<string>();
    tickets.forEach((t) => {
      if (t.bot_id) ids.add(t.bot_id);
    });
    return Array.from(ids);
  }, [tickets]);

  /* ------------------------------------------------------
   * PAGE UI
   * ----------------------------------------------------*/
  return (
    <div className="max-w-7xl mx-auto">
      <HelpdeskHeader
        title="Tickets"
        subtitle="Live view of all support and automation tickets."
      />

      {showModal && (
        <NewTicketModal
          onClose={async () => {
            setShowModal(false);
            await loadTickets();
          }}
        />
      )}

      <div
        className="
          rounded-xl border
          border-gray-300 dark:border-slate-800
          bg-white/70 dark:bg-slate-900/60
          p-5 mb-6 shadow
          backdrop-blur-md
        "
      >
        <div
          className="
            flex items-center gap-2
            bg-gray-100 dark:bg-slate-900
            border border-gray-300 dark:border-slate-700
            rounded-lg px-3 py-2 shadow-inner
            mb-6
          "
        >
          <Search size={18} className="text-gray-500 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search tickets..."
            className="w-full bg-transparent text-gray-700 dark:text-slate-200 text-sm outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <PillDropdown
            label="Status"
            value={statusFilter || "Any"}
            options={["Any", "open", "in_progress", "resolved", "closed"]}
            onChange={(val) => setStatusFilter(val === "Any" ? null : val)}
          />

          <PillDropdown
            label="Priority"
            value={priorityFilter || "Any"}
            options={["Any", "low", "medium", "high", "critical"]}
            onChange={(val) => setPriorityFilter(val === "Any" ? null : val)}
          />

          <PillDropdown
            label="Bot"
            value={botFilter || "Any"}
            options={["Any", "unassigned", ...botList]}
            onChange={(val) => setBotFilter(val === "Any" ? null : val)}
          />
        </div>

        {(search || statusFilter || priorityFilter || botFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter(null);
              setPriorityFilter(null);
              setBotFilter(null);
            }}
            className="
              flex items-center gap-1 text-xs
              text-gray-500 dark:text-slate-400
              hover:text-black dark:hover:text-white
              mt-4
            "
          >
            <X size={14} /> Clear Filters
          </button>
        )}
      </div>

      <div
        className="
          rounded-xl border
          border-gray-300 dark:border-slate-800
          bg-white dark:bg-slate-900
          overflow-hidden shadow-xl
        "
      >
        <div
          className="
            grid grid-cols-[1fr,150px,160px,140px,180px]
            px-6 py-4 border-b
            border-gray-200 dark:border-slate-800
            text-xs font-semibold
            text-gray-500 dark:text-slate-400
            uppercase tracking-wide
            bg-gray-100 dark:bg-slate-800/60
          "
        >
          <div>Ticket</div>
          <div className="text-center">Bot</div>
          <div className="text-center">Status</div>
          <div className="text-center">Priority</div>
          <div className="text-right">Created</div>
        </div>

        {loading && (
          <p className="text-gray-500 dark:text-slate-500 p-6 text-sm">
            Loading…
          </p>
        )}

        {!loading && filteredTickets.length === 0 && (
          <p className="text-gray-500 dark:text-slate-500 p-6 text-sm">
            No tickets match your filters.
          </p>
        )}

        {!loading &&
          filteredTickets.map((t) => (
            <Link
              key={t.id}
              href={`/helpdesk/tickets/${t.id}`}
              className="
                grid grid-cols-[1fr,150px,160px,140px,180px]
                px-6 py-5 border-b
                border-gray-200 dark:border-slate-900/60
                hover:bg-gray-100 dark:hover:bg-slate-800/60
                transition group
              "
            >
              <div>
                <p className="text-gray-800 dark:text-white font-medium group-hover:text-sky-600 dark:group-hover:text-sky-300 transition">
                  {t.title || "Untitled Ticket"}
                </p>
                <p className="text-gray-500 dark:text-slate-600 text-xs">
                  #{t.id.slice(0, 8)}
                </p>
              </div>

              <div className="flex justify-center items-center">
                {t.bot_id ? (
                  <span
                    className="
                      px-2 py-1 rounded-md
                      bg-gray-200 dark:bg-slate-800
                      text-gray-700 dark:text-slate-300 text-xs
                      ring-1 ring-gray-300 dark:ring-slate-700/40
                    "
                  >
                    {t.bot_id.slice(0, 12)}…
                  </span>
                ) : (
                  <span className="text-gray-400 dark:text-slate-600 text-xs">
                    —
                  </span>
                )}
              </div>

              <div className="flex justify-center">
                <span
                  className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize ${
                    statusBadge[t.status] ??
                    "bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-1 ring-slate-500/30"
                  }`}
                >
                  {String(t.status || "").replace("_", " ")}
                </span>
              </div>

              <div className="flex justify-center">
                <span
                  className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize ${
                    priorityBadge[t.priority] ??
                    "bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-1 ring-slate-500/30"
                  }`}
                >
                  {t.priority || "unknown"}
                </span>
              </div>

              <div className="text-right text-gray-600 dark:text-slate-500 text-xs">
                {new Date(t.created_at).toLocaleString()}
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
}
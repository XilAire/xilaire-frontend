"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import PillDropdown from "@/components/ui/PillDropdown";

type Incident = {
  id: string;
  title: string;
  severity: string;
  status: string;
  affected_system: string | null;
  created_at: string;
};

export default function IncidentsClient({
  incidents,
  userEmail,
}: {
  incidents: Incident[];
  userEmail: string | null;
}) {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [systemFilter, setSystemFilter] = useState<string | null>(null);

  /* -------------------------------------------------
     FILTERING
  ------------------------------------------------- */
  const filteredIncidents = useMemo(() => {
    const text = search.toLowerCase();

    return incidents.filter((inc) => {
      const matchSearch =
        inc.title?.toLowerCase().includes(text) ||
        inc.id?.toLowerCase().includes(text) ||
        inc.affected_system?.toLowerCase().includes(text);

      const matchSeverity =
        !severityFilter || inc.severity === severityFilter;
      const matchStatus =
        !statusFilter || inc.status === statusFilter;
      const matchSystem =
        !systemFilter || inc.affected_system === systemFilter;

      return matchSearch && matchSeverity && matchStatus && matchSystem;
    });
  }, [incidents, search, severityFilter, statusFilter, systemFilter]);

  const systems = useMemo(() => {
    return Array.from(
      new Set(
        incidents
          .map((i) => i.affected_system)
          .filter(Boolean) as string[]
      )
    );
  }, [incidents]);

  /* -------------------------------------------------
     BADGE STYLES (OVAL PILLS)
  ------------------------------------------------- */
  const severityBadge: Record<string, string> = {
    low: "bg-gray-500/10 text-gray-300",
    medium: "bg-blue-500/10 text-blue-300",
    high: "bg-orange-500/10 text-orange-300",
    critical: "bg-red-500/10 text-red-300",
  };

  const statusBadge: Record<string, string> = {
    open: "bg-yellow-500/10 text-yellow-300",
    investigating: "bg-sky-500/10 text-sky-300",
    resolved: "bg-emerald-500/10 text-emerald-300",
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between pt-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Incidents</h1>
          <p className="text-sm text-slate-400">
            Live tracking for outages, anomalies, and system issues.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/helpdesk/incidents/new"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-700"
          >
            + New Incident
          </Link>

          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-700 text-white font-semibold">
            {userEmail?.[0]?.toUpperCase() ?? "?"}
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="rounded-xl p-5 space-y-6 border border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800">
          <Search size={18} className="text-slate-400" />
          <input
            placeholder="Search incidents..."
            className="w-full bg-transparent text-sm text-slate-200 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <PillDropdown
            label="Severity"
            value={severityFilter || "Any"}
            options={["Any", "low", "medium", "high", "critical"]}
            onChange={(v) => setSeverityFilter(v === "Any" ? null : v)}
          />

          <PillDropdown
            label="Status"
            value={statusFilter || "Any"}
            options={["Any", "open", "investigating", "resolved"]}
            onChange={(v) => setStatusFilter(v === "Any" ? null : v)}
          />

          <PillDropdown
            label="System"
            value={systemFilter || "Any"}
            options={["Any", ...systems]}
            onChange={(v) => setSystemFilter(v === "Any" ? null : v)}
          />
        </div>

        {(search || severityFilter || statusFilter || systemFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setSeverityFilter(null);
              setStatusFilter(null);
              setSystemFilter(null);
            }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
          >
            <X size={14} />
            Clear Filters
          </button>
        )}
      </div>

      {/* TABLE */}
      <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
        <div className="grid grid-cols-[1fr,140px,160px,160px] px-6 py-4 text-xs uppercase text-slate-400 border-b border-slate-800">
          <div>Incident</div>
          <div className="text-center">Severity</div>
          <div className="text-center">Status</div>
          <div className="text-right">Created</div>
        </div>

        {filteredIncidents.length === 0 && (
          <p className="p-6 text-sm text-slate-500">No incidents found.</p>
        )}

        {filteredIncidents.map((i) => (
          <Link
            key={i.id}
            href={`/helpdesk/incidents/${i.id}`}
            className="grid grid-cols-[1fr,140px,160px,160px] px-6 py-5 border-b border-slate-900 hover:bg-slate-900"
          >
            <div>
              <p className="font-medium text-white">{i.title}</p>
              <p className="text-[10px] text-slate-500">ID: {i.id}</p>
              <p className="text-xs text-slate-400">
                {i.affected_system}
              </p>
            </div>

            {/* SEVERITY PILL */}
            <div className="flex justify-center">
              <span
                className={`
                  px-4 py-0.5 rounded-full
                  text-xs font-medium leading-5 capitalize
                  ${severityBadge[i.severity]}
                `}
              >
                {i.severity}
              </span>
            </div>

            {/* STATUS PILL */}
            <div className="flex justify-center">
              <span
                className={`
                  px-4 py-0.5 rounded-full
                  text-xs font-medium leading-5 capitalize
                  ${statusBadge[i.status]}
                `}
              >
                {i.status}
              </span>
            </div>

            <div className="text-right text-xs text-slate-400">
              {new Date(i.created_at).toLocaleString()}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

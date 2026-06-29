"use client";

import { useEffect, useState, useRef } from "react";
import { supabasePlatform } from "@/lib/supabasePlatformClient";
import Link from "next/link";
import {
  ArrowRight,
  MessageSquare,
  Wand2,
  ChevronDown,
  Paperclip,
  Download,
  Upload,
} from "lucide-react";
import HelpdeskHeader from "@/components/helpdesk/HelpdeskHeader";

/* ============================================================================
   STATUS PILL BUTTON
============================================================================ */
function StatusPillButton({ label, value, active, onClick, disabled }) {
  return (
    <button
      disabled={disabled}
      onClick={() => onClick(value)}
      className={`
        px-4 py-1.5 rounded-full text-xs font-medium capitalize border transition
        flex items-center justify-center

        ${active
          ? `
              bg-sky-600 text-white border-sky-500 
              shadow-md dark:shadow-sky-900/40
            `
          : `
              bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300
              dark:bg-slate-800/60 dark:text-slate-300 
              dark:border-slate-700 dark:hover:bg-slate-700/70
            `
        }

        ${disabled ? "opacity-40 cursor-not-allowed" : ""}
      `}
    >
      {label}
    </button>
  );
}

/* ============================================================================
   PRIORITY DROPDOWN
============================================================================ */
function PriorityPillDropdown({ value, disabled, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative w-full" ref={ref}>
      <button
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`
          w-full px-4 py-2 rounded-full border text-xs font-medium 
          flex items-center justify-between transition

          bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200
          dark:bg-slate-800/60 dark:text-slate-200 
          dark:border-slate-700 dark:hover:bg-slate-700/60

          ${disabled ? "opacity-40 cursor-not-allowed" : ""}
        `}
      >
        <span className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-slate-400">Level</span>
          <span className="capitalize dark:text-slate-100 text-gray-900">
            {value}
          </span>
        </span>

        <ChevronDown
          size={14}
          className={`
            text-gray-500 dark:text-slate-400 transition-transform
            ${open ? "rotate-180" : ""}
          `}
        />
      </button>

      {open && (
        <div
          className="
            absolute left-0 right-0 mt-2 rounded-xl overflow-hidden z-[999]
            bg-white border border-gray-200 shadow-xl
            dark:bg-slate-900 dark:border-slate-700
          "
        >
          {["low", "medium", "high", "critical"].map((p) => (
            <button
              key={p}
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
              className={`
                w-full px-4 py-2 text-xs text-left capitalize transition
                ${
                  value === p
                    ? "text-sky-600 dark:text-sky-300 font-semibold"
                    : "text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700/50"
                }
              `}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   TICKET DETAIL PAGE (FULL LIGHT/DARK MODE)
============================================================================ */
export default function TicketDetailPage({ params }) {
  const [ticket, setTicket] = useState(null);
  const [activity, setActivity] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [user, setUser] = useState(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Load User */
  useEffect(() => {
    supabasePlatform.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });
  }, []);

  /* Load Ticket */
  const loadTicket = async () => {
    const { data } = await supabasePlatform
      .from("tickets")
      .select("*")
      .eq("id", params.id)
      .single();

    setTicket(data);
  };

  /* Load Logs */
  const loadLogs = async () => {
    const { data } = await supabasePlatform
      .from("ticket_activity")
      .select("*")
      .eq("ticket_id", params.id)
      .order("created_at", { ascending: false });

    setActivity(data || []);
  };

  /* Load Attachments */
  const loadAttachments = async () => {
    const { data } = await supabasePlatform
      .from("ticket_attachments")
      .select("*")
      .eq("ticket_id", params.id)
      .order("created_at", { ascending: false });

    setAttachments(data || []);
  };

  useEffect(() => {
    loadTicket();
    loadLogs();
    loadAttachments();
  }, [params.id]);

  if (!ticket)
    return (
      <p className="text-gray-500 dark:text-slate-500 p-6">Loading…</p>
    );

  /* Update Ticket */
  const updateTicket = async (field, value) => {
    setUpdating(true);

    await fetch("/api/tickets/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: ticket.id,
        [field]: value,
      }),
    });

    await loadTicket();
    await loadLogs();
    setUpdating(false);
  };

  /* Submit Comment */
  const submitComment = async () => {
    if (!newComment.trim()) return;
    setCommentLoading(true);

    await fetch("/api/tickets/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: ticket.id,
        message: newComment,
        userEmail: user?.email || "Unknown",
      }),
    });

    setNewComment("");
    await loadLogs();
    setCommentLoading(false);
  };

  /* Icon for Activity */
  const iconForType = (type) => {
    switch (type) {
      case "comment":
        return (
          <MessageSquare
            size={16}
            className="text-sky-600 dark:text-sky-300"
          />
        );
      case "status_change":
      case "priority_change":
        return (
          <ArrowRight
            size={16}
            className="text-amber-600 dark:text-amber-300"
          />
        );
      default:
        return (
          <Wand2
            size={16}
            className="text-gray-600 dark:text-slate-300"
          />
        );
    }
  };

  /* Download File */
  const downloadFile = async (file) => {
    const { data } = await supabasePlatform.storage
      .from("ticket_attachments")
      .download(file.file_path);

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* Upload File */
  const uploadAttachment = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.files?.length) return;

    const files: File[] = Array.from(event.target.files);

    setUploadingAttachment(true);

    for (const file of files) {
      const path = `${ticket.id}/${Date.now()}-${file.name}`;

      await supabasePlatform.storage
        .from("ticket_attachments")
        .upload(path, file);

      await supabasePlatform.from("ticket_attachments").insert({
        ticket_id: ticket.id,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        file_type: file.type,
      });
    }

    setUploadingAttachment(false);
    await loadAttachments();
  };

  /* ============================================================================
     FULL PAGE UI
  ============================================================================ */
  return (
    <div className="max-w-7xl mx-auto space-y-8">

      {/* HEADER */}
      <HelpdeskHeader
        title={ticket.title}
        subtitle={ticket.service || "Ticket details & activity history"}
      />

      {/* BREADCRUMB */}
      <div className="text-xs text-gray-500 dark:text-slate-500 -mt-4">
        <Link
          href="/helpdesk/tickets"
          className="hover:text-sky-600 dark:hover:text-sky-300 hover:underline"
        >
          Tickets
        </Link>{" "}
        /{" "}
        <span className="font-mono text-gray-600 dark:text-slate-400 text-[11px]">
          {params.id}
        </span>
      </div>

      {/* GRID */}
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">

        {/* LEFT SIDE */}
        <div className="space-y-6">

          {/* DETAILS CARD */}
          <section
            className="
              rounded-2xl p-6 border shadow-lg
              bg-white border-gray-200 
              dark:bg-slate-950/60 dark:border-slate-800
            "
          >
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-50">
              Details
            </h2>

            <div className="mt-4 space-y-3 text-sm text-gray-700 dark:text-slate-300">
              {ticket.name && (
                <p>
                  <span className="text-gray-500 dark:text-slate-400">
                    Name:
                  </span>{" "}
                  {ticket.name}
                </p>
              )}

              {ticket.email && (
                <p>
                  <span className="text-gray-500 dark:text-slate-400">
                    Email:
                  </span>{" "}
                  {ticket.email}
                </p>
              )}

              {ticket.service && (
                <p>
                  <span className="text-gray-500 dark:text-slate-400">
                    Service:
                  </span>{" "}
                  {ticket.service}
                </p>
              )}

              <div className="pt-3">
                <h4 className="font-semibold text-gray-600 dark:text-slate-400">
                  Message
                </h4>
                <p className="mt-2 text-gray-800 dark:text-slate-200 whitespace-pre-wrap">
                  {ticket.description}
                </p>
              </div>
            </div>
          </section>

          {/* ATTACHMENTS */}
          <section
            className="
              rounded-2xl p-6 border shadow-lg
              bg-white border-gray-200 
              dark:bg-slate-950/60 dark:border-slate-800
            "
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-50">
                Attachments
              </h3>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="
                  flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition
                  bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200
                  dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700/70
                "
              >
                <Upload size={14} />
                Upload
              </button>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                onChange={uploadAttachment}
              />
            </div>

            {uploadingAttachment && (
              <p className="text-xs text-sky-600 dark:text-sky-300 mb-2">
                Uploading…
              </p>
            )}

            {attachments.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-slate-500">
                No attachments uploaded.
              </p>
            ) : (
              <div className="space-y-3">
                {attachments.map((file) => (
                  <div
                    key={file.id}
                    className="
                      flex items-center justify-between px-3 py-2 rounded-lg border text-xs
                      bg-gray-50 border-gray-300 text-gray-700
                      dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200
                    "
                  >
                    <div className="flex items-center gap-2">
                      <Paperclip
                        size={14}
                        className="text-gray-500 dark:text-slate-400"
                      />
                      <span>{file.file_name}</span>
                    </div>

                    <button
                      onClick={() => downloadFile(file)}
                      className="text-sky-600 dark:text-sky-300 hover:opacity-80"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ACTIVITY LOG */}
          <section
            className="
              rounded-2xl p-6 border shadow-lg
              bg-white border-gray-200 
              dark:bg-slate-950/60 dark:border-slate-800
            "
          >
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-50 mb-4">
              Activity Log
            </h3>

            {/* Add Comment */}
            <div className="mb-6">
              <textarea
                placeholder="Add a comment…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="
                  w-full rounded-lg p-3 text-sm
                  bg-gray-50 border border-gray-300 text-gray-800
                  dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200
                "
              />

              <button
                onClick={submitComment}
                disabled={commentLoading || !newComment.trim()}
                className="
                  mt-2 px-4 py-2 rounded-lg text-xs font-medium transition
                  bg-sky-600 text-white hover:bg-sky-700
                  disabled:opacity-40
                "
              >
                {commentLoading ? "Posting…" : "Post Comment"}
              </button>
            </div>

            <div className="space-y-4">
              {activity.map((log) => (
                <div
                  key={log.id}
                  className="
                    flex items-start gap-3 p-3 rounded-xl border
                    bg-gray-50 border-gray-300 text-gray-800
                    dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200
                  "
                >
                  <div className="mt-1">{iconForType(log.type)}</div>

                  <div>
                    <p className="text-sm">{log.message}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* RIGHT SIDE */}
        <aside className="space-y-6">

          {/* STATUS CARD */}
          <div
            className="
              rounded-2xl p-6 border shadow-lg
              bg-white border-gray-200 
              dark:bg-slate-950/60 dark:border-slate-800
            "
          >
            <h3 className="text-sm font-medium text-gray-700 dark:text-slate-400 mb-3">
              Status
            </h3>

            <div className="flex flex-wrap gap-2">
              {[
                { label: "Open", value: "open" },
                { label: "In Progress", value: "in_progress" },
                { label: "Resolved", value: "resolved" },
                { label: "Closed", value: "closed" },
              ].map((s) => (
                <StatusPillButton
                  key={s.value}
                  label={s.label}
                  value={s.value}
                  active={ticket.status === s.value}
                  disabled={updating}
                  onClick={(v) => updateTicket("status", v)}
                />
              ))}
            </div>
          </div>

          {/* PRIORITY CARD */}
          <div
            className="
              rounded-2xl p-6 border shadow-lg
              bg-white border-gray-200 
              dark:bg-slate-950/60 dark:border-slate-800
            "
          >
            <h3 className="text-sm font-medium text-gray-700 dark:text-slate-400 mb-3">
              Priority
            </h3>

            <PriorityPillDropdown
              value={ticket.priority}
              disabled={updating}
              onChange={(v) => updateTicket("priority", v)}
            />
          </div>

          {/* METADATA */}
          <div
            className="
              rounded-2xl p-6 border shadow-lg
              bg-white border-gray-200 
              dark:bg-slate-950/60 dark:border-slate-800
            "
          >
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-50 mb-4">
              Ticket Metadata
            </h3>

            <div className="space-y-2 text-xs text-gray-700 dark:text-slate-300">
              <p className="flex justify-between">
                <span className="text-gray-500 dark:text-slate-500">Created</span>
                <span>{new Date(ticket.created_at).toLocaleString()}</span>
              </p>

              <p className="flex justify-between">
                <span className="text-gray-500 dark:text-slate-500">Last updated</span>
                <span>{new Date(ticket.updated_at).toLocaleString()}</span>
              </p>

              <p className="flex justify-between">
                <span className="text-gray-500 dark:text-slate-500">Bot</span>
                <span>{ticket.bot_id || "Not assigned"}</span>
              </p>

              <p className="flex justify-between">
                <span className="text-gray-500 dark:text-slate-500">Ticket ID</span>
                <span className="font-mono text-[11px] text-gray-600 dark:text-slate-400">
                  {ticket.id}
                </span>
              </p>
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}

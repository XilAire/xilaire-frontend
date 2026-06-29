"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabasePlatform } from "@/lib/supabasePlatformClient";

import {
  MessageSquare,
  ArrowRight,
  Wand2,
  Paperclip,
  Download,
  Trash2,
  PlusCircle,
  CheckCircle,
  Circle,
} from "lucide-react";

// ✅ NEW — standardized incident actions pill
import IncidentActions from "@/components/ui/pills/IncidentActions";

/* ============================================================================ 
   LIGHT + DARK SEVERITY BADGES
============================================================================ */
const severityColors: Record<string, string> = {
  low: `
    bg-gray-200 text-gray-700 border border-gray-300 
    dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600
  `,
  medium: `
    bg-blue-100 text-blue-700 border-blue-300
    dark:bg-blue-600/20 dark:text-blue-300 dark:border-blue-800/40
  `,
  high: `
    bg-orange-100 text-orange-700 border-orange-300
    dark:bg-orange-600/20 dark:text-orange-300 dark:border-orange-800/40
  `,
  critical: `
    bg-red-100 text-red-700 border-red-300
    dark:bg-red-600/20 dark:text-red-300 dark:border-red-800/40
  `,
};

const statusOptions = [
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "resolved", label: "Resolved" },
];

export default function IncidentDetailPage({ params }) {
  const router = useRouter();

  const [incident, setIncident] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const [user, setUser] = useState<any>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);

  useEffect(() => {
    supabasePlatform.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });
  }, []);

  /* ============================================================
      LOADERS
  ============================================================ */
  const loadIncident = async () => {
    const { data } = await supabasePlatform
      .from("incidents")
      .select("*")
      .eq("id", params.id)
      .single();
    setIncident(data || null);
  };

  const loadActivity = async () => {
    const { data } = await supabasePlatform
      .from("incident_activity")
      .select("*")
      .eq("incident_id", params.id)
      .order("created_at", { ascending: false });

    setActivity(data || []);
  };

  const loadAttachments = async () => {
    const { data } = await supabasePlatform.storage
      .from("incident_attachments")
      .list(`${params.id}/`, {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

    setAttachments(data || []);
  };

  const loadTasks = async () => {
    const { data } = await supabasePlatform
      .from("tasks")
      .select("*")
      .eq("parent_type", "incident")
      .eq("parent_id", params.id)
      .order("created_at", { ascending: true });

    setTasks(data || []);
  };

  const loadTechnicians = async () => {
    const { data } = await supabasePlatform
      .from("profiles")
      .select("id, email")
      .order("email", { ascending: true });

    setTechnicians(data || []);
  };

  useEffect(() => {
    loadIncident();
    loadActivity();
    loadAttachments();
    loadTasks();
    loadTechnicians();
  }, [params.id]);

  if (!incident) {
    return (
      <p className="text-gray-600 dark:text-slate-500 p-6">
        Incident not found or has been deleted.
      </p>
    );
  }

  /* ============================================================
      DELETE INCIDENT
  ============================================================ */
  const deleteIncident = async () => {
    if (!confirm("Are you sure you want to delete this incident?")) return;

    await supabasePlatform
      .from("tasks")
      .delete()
      .eq("parent_type", "incident")
      .eq("parent_id", incident.id);

    await supabasePlatform
      .from("incident_activity")
      .delete()
      .eq("incident_id", incident.id);

    const { data: files } = await supabasePlatform.storage
      .from("incident_attachments")
      .list(`${incident.id}/`);

    if (files?.length) {
      await supabasePlatform.storage
        .from("incident_attachments")
        .remove(files.map((f) => `${incident.id}/${f.name}`));
    }

    await supabasePlatform.from("incidents").delete().eq("id", incident.id);

    router.push("/helpdesk/incidents");
  };

  /* ============================================================
      STATUS, ASSIGNMENT, COMMENTS, TASKS, FILES
  ============================================================ */

  const updateAssignedTo = async (value: string | null) => {
    const oldValue = incident.assigned_to;

    await supabasePlatform
      .from("incidents")
      .update({ assigned_to: value })
      .eq("id", incident.id);

    await supabasePlatform.from("incident_activity").insert({
      incident_id: incident.id,
      type: "assignment",
      message: `Assigned to changed from "${oldValue || "Unassigned"}" to "${
        value || "Unassigned"
      }"`,
      created_by: user?.email,
    });

    loadIncident();
    loadActivity();
  };

  const createTask = async () => {
    if (!newTaskTitle.trim()) return;

    await supabasePlatform.from("tasks").insert({
      parent_type: "incident",
      parent_id: incident.id,
      title: newTaskTitle,
      status: "open",
      priority: "medium",
      created_by: user?.id,
    });

    setNewTaskTitle("");
    loadTasks();
  };

  const toggleTaskStatus = async (task: any) => {
    const newStatus = task.status === "completed" ? "open" : "completed";

    await supabasePlatform
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", task.id);

    loadTasks();
  };

  const updateStatus = async (newStatus: string) => {
    if (newStatus === incident.status) return;

    setUpdatingStatus(true);

    await supabasePlatform
      .from("incidents")
      .update({ status: newStatus })
      .eq("id", incident.id);

    await supabasePlatform.from("incident_activity").insert({
      incident_id: incident.id,
      type: "status_change",
      message: `Status changed to: ${newStatus}`,
      created_by: user?.email,
    });

    loadIncident();
    loadActivity();
    setUpdatingStatus(false);
  };

  const submitComment = async () => {
    if (!comment.trim()) return;

    setPosting(true);

    await supabasePlatform.from("incident_activity").insert({
      incident_id: incident.id,
      type: "comment",
      message: comment,
      created_by: user?.email,
    });

    setComment("");
    loadActivity();
    setPosting(false);
  };

  const handleFileSelect = (e: any) =>
    setUploadFiles(Array.from(e.target.files));

  const uploadAttachmentsFn = async () => {
    if (!uploadFiles.length) return;
    setUploading(true);

    for (const file of uploadFiles) {
      const path = `${params.id}/${Date.now()}-${file.name}`;

      await supabasePlatform.storage
        .from("incident_attachments")
        .upload(path, file);

      await supabasePlatform.from("incident_activity").insert({
        incident_id: incident.id,
        type: "attachment",
        message: `Uploaded file: ${file.name}`,
        created_by: user?.email,
      });
    }

    setUploadFiles([]);
    loadAttachments();
    loadActivity();
    setUploading(false);
  };

  const downloadFile = async (name: string) => {
    const { data } = await supabasePlatform.storage
      .from("incident_attachments")
      .download(`${params.id}/${name}`);

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteFile = async (name: string) => {
    await supabasePlatform.storage
      .from("incident_attachments")
      .remove([`${params.id}/${name}`]);

    await supabasePlatform.from("incident_activity").insert({
      incident_id: incident.id,
      type: "attachment_delete",
      message: `Deleted file: ${name}`,
      created_by: user?.email,
    });

    loadAttachments();
    loadActivity();
  };

  const iconForType = (type: string) => {
    switch (type) {
      case "comment":
        return (
          <MessageSquare size={16} className="text-sky-500 dark:text-sky-300" />
        );
      case "status_change":
        return (
          <ArrowRight
            size={16}
            className="text-amber-500 dark:text-amber-300"
          />
        );
      case "assignment":
        return (
          <ArrowRight
            size={16}
            className="text-purple-500 dark:text-purple-300"
          />
        );
      case "attachment":
        return (
          <Paperclip
            size={16}
            className="text-green-600 dark:text-green-400"
          />
        );
      default:
        return (
          <Wand2 size={16} className="text-gray-500 dark:text-slate-400" />
        );
    }
  };

  /* ============================================================
      PAGE UI
  ============================================================ */
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between pt-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
            {incident.title}
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Incident Overview & Activity Log
          </p>
        </div>

        {/* RIGHT SIDE BUTTONS */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/helpdesk/incidents")}
            className="
              px-4 py-2 text-xs rounded-lg border font-medium
              bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300
              dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700
            "
          >
            Back
          </button>

          {/* FIXED — passing required props correctly */}
          <IncidentActions
            incidentId={incident.id}
            deleteIncident={deleteIncident}
            updateStatus={updateStatus}
          />
        </div>
      </div>

      {/* BREADCRUMB */}
      <div className="text-xs text-gray-500 dark:text-slate-500">
        <Link
          href="/helpdesk/incidents"
          className="hover:text-sky-600 dark:hover:text-sky-300 hover:underline"
        >
          Incidents
        </Link>{" "}
        /{" "}
        <span className="font-mono text-gray-600 dark:text-slate-400 text-[11px]">
          {incident.id}
        </span>
      </div>

      {/* MAIN GRID */}
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr] mt-6">
        
        {/* LEFT PANEL */}
        <div className="space-y-6">

          {/* DETAILS */}
          <section
            className="
              rounded-2xl p-6 border shadow-lg
              bg-white border-gray-300
              dark:bg-slate-950/60 dark:border-slate-800
            "
          >
            <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-50">
              Details
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <p>
                <span className="text-gray-500 dark:text-slate-400">
                  Affected System:
                </span>{" "}
                {incident.affected_system}
              </p>

              <p className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-slate-400">
                  Severity:
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${severityColors[incident.severity]}`}
                >
                  {incident.severity}
                </span>
              </p>

              {/* ASSIGNMENT */}
              <div className="pt-3">
                <h4 className="font-semibold text-gray-600 dark:text-slate-400 mb-1">
                  Assigned To
                </h4>

                <select
                  value={incident.assigned_to || ""}
                  onChange={(e) =>
                    updateAssignedTo(
                      e.target.value === "" ? null : e.target.value
                    )
                  }
                  className="
                    w-72 px-3 py-2 rounded-lg text-sm
                    bg-gray-100 border border-gray-300 text-gray-800
                    dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200
                  "
                >
                  <option value="">Unassigned</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* STATUS */}
              <div className="pt-3">
                <h4 className="font-semibold text-gray-600 dark:text-slate-400 mb-2">
                  Status
                </h4>

                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      disabled={updatingStatus}
                      onClick={() => updateStatus(opt.value)}
                      className={`px-4 py-1.5 rounded-full text-xs capitalize border font-medium transition
                        ${
                          incident.status === opt.value
                            ? "bg-sky-600 text-white border-sky-500 shadow-lg"
                            : "bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                        }
                        ${updatingStatus ? "opacity-40 cursor-not-allowed" : ""}
                      `}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <p>
                <span className="text-gray-500 dark:text-slate-400">Created:</span>{" "}
                {new Date(incident.created_at).toLocaleString()}
              </p>

              <div className="pt-3">
                <h4 className="font-semibold text-gray-600 dark:text-slate-400">
                  Description
                </h4>
                <p className="mt-2 text-gray-800 dark:text-slate-200 whitespace-pre-wrap">
                  {incident.description}
                </p>
              </div>
            </div>
          </section>

          {/* TASKS */}
          <section
            className="
              rounded-2xl p-6 border shadow-lg
              bg-white border-gray-300
              dark:bg-slate-950/60 dark:border-slate-800
            "
          >
            <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-50 flex items-center gap-2 mb-4">
              <PlusCircle size={16} /> Tasks
            </h3>

            <div className="flex gap-2 mb-4">
              <input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="New task..."
                className="
                  flex-1 px-3 py-2 rounded-lg text-sm
                  bg-gray-100 border border-gray-300 text-gray-800
                  dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200
                "
              />
              <button
                onClick={createTask}
                className="
                  px-4 py-2 text-xs font-medium rounded-lg
                  bg-sky-600 text-white hover:bg-sky-700
                "
              >
                Add
              </button>
            </div>

            <div className="space-y-3">
              {tasks.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-slate-500">
                  No tasks added yet.
                </p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="
                      flex items-center gap-3 p-3 rounded-lg border
                      bg-gray-100 border-gray-300 text-gray-800
                      dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200
                    "
                  >
                    <button onClick={() => toggleTaskStatus(task)}>
                      {task.status === "completed" ? (
                        <CheckCircle className="text-green-500" size={18} />
                      ) : (
                        <Circle className="text-gray-400" size={18} />
                      )}
                    </button>

                    <span
                      className={`flex-1 text-sm ${
                        task.status === "completed"
                          ? "line-through opacity-60"
                          : ""
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ATTACHMENTS */}
          <section
            className="
              rounded-2xl p-6 border shadow-lg
              bg-white border-gray-300
              dark:bg-slate-950/60 dark:border-slate-800
            "
          >
            <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-50 mb-4 flex items-center gap-2">
              <Paperclip size={16} /> Attachments
            </h3>

            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="w-full text-sm text-gray-700 dark:text-slate-300 mb-3"
            />

            <button
              onClick={uploadAttachmentsFn}
              disabled={uploading || uploadFiles.length === 0}
              className="
                px-4 py-2 text-xs rounded-lg font-medium
                bg-sky-600 text-white hover:bg-sky-700
                disabled:opacity-40
              "
            >
              {uploading ? "Uploading…" : "Upload Files"}
            </button>

            <div className="space-y-3 mt-4">
              {attachments.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-slate-500">
                  No attachments uploaded.
                </p>
              ) : (
                attachments.map((file) => (
                  <div
                    key={file.name}
                    className="
                      flex items-center justify-between px-3 py-2 rounded-lg border
                      bg-gray-100 border-gray-300 text-gray-800
                      dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200
                    "
                  >
                    <div className="flex items-center gap-2">
                      <Paperclip size={14} className="text-gray-500" />
                      <span className="text-sm">{file.name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => downloadFile(file.name)}
                        className="text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
                      >
                        <Download size={16} />
                      </button>

                      <button
                        onClick={() => deleteFile(file.name)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ACTIVITY LOG */}
          <section
            className="
              rounded-2xl p-6 border shadow-lg
              bg-white border-gray-300
              dark:bg-slate-950/60 dark:border-slate-800
            "
          >
            <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-50 mb-4">
              Activity Log
            </h3>

            <textarea
              id="comment-box"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Leave a comment..."
              className="
                w-full p-3 rounded-lg text-sm
                bg-gray-100 border border-gray-300 text-gray-800
                dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200
              "
            />

            <button
              onClick={submitComment}
              disabled={posting || !comment.trim()}
              className="
                mt-2 px-4 py-2 text-xs font-medium rounded-lg
                bg-sky-600 text-white hover:bg-sky-700
                disabled:opacity-40
              "
            >
              {posting ? "Posting…" : "Post Comment"}
            </button>

            <div className="space-y-4 mt-4">
              {activity.map((log) => (
                <div
                  key={log.id}
                  className="
                    flex items-start gap-3 p-3 rounded-xl border
                    bg-gray-100 border-gray-300 text-gray-800
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

        {/* RIGHT SIDEBAR */}
        <aside className="space-y-6">
          <div
            className="
              rounded-2xl p-6 border shadow-lg
              bg-white border-gray-300
              dark:bg-slate-950/60 dark:border-slate-800
            "
          >
            <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-50 mb-4">
              Incident Metadata
            </h3>

            <div className="space-y-3 text-xs text-gray-700 dark:text-slate-300">
              <p className="flex justify-between">
                <span className="text-gray-500">ID</span>
                <span className="font-mono">{incident.id}</span>
              </p>

              <p className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span>{new Date(incident.created_at).toLocaleString()}</span>
              </p>

              <p className="flex justify-between">
                <span className="text-gray-500">Severity</span>
                <span className="capitalize">{incident.severity}</span>
              </p>

              <p className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="capitalize">{incident.status}</span>
              </p>

              <p className="flex justify-between">
                <span className="text-gray-500">Assigned</span>
                <span className="capitalize">
                  {incident.assigned_to
                    ? technicians.find((t) => t.id === incident.assigned_to)
                        ?.email || "Unknown"
                    : "Unassigned"}
                </span>
              </p>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}

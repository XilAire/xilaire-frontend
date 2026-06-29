"use client";

import { useState, useRef } from "react";
import { supabasePlatform } from "@/lib/supabasePlatformClient";
import { Upload, Paperclip, X } from "lucide-react";

export default function NewTicketModal({ onClose }) {
  const supabase = supabasePlatform;

  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------------------------------------------------------------------
  // ✔️ Upload attachments (using correct bucket + correct table)
  // ---------------------------------------------------------------------
  async function uploadAttachments(ticketId: string) {
    if (files.length === 0) return;

    for (const file of files) {
      const path = `${ticketId}/${Date.now()}-${file.name}`;

      // Upload to the SAME bucket used in Ticket Detail page
      const { error: uploadError } = await supabase.storage
        .from("ticket_attachments")
        .upload(path, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      // Insert into the SAME table used in Ticket Detail page
      await supabase.from("ticket_attachments").insert({
        ticket_id: ticketId,
        file_name: file.name,
        file_path: path,
        file_type: file.type,
        file_size: file.size,
      });
    }
  }

  // ---------------------------------------------------------------------
  // Create ticket + upload attachments
  // ---------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from("tickets")
      .insert({
        title,
        description,
        requester_email: email || null,
        priority,
        status: "open",
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const ticketId = data.id;

    // Upload attachments AFTER ticket is created
    await uploadAttachments(ticketId);

    setLoading(false);
    onClose();
  };

  return (
    <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Create new ticket</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition"
        >
          <X size={20} />
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Title */}
        <div>
          <label className="text-sm text-slate-300">Title</label>
          <input
            type="text"
            className="w-full bg-slate-800 text-white rounded-lg p-2 mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="text-sm text-slate-300">Requester Email</label>
          <input
            type="email"
            className="w-full bg-slate-800 text-white rounded-lg p-2 mt-1"
            placeholder="user@example.com (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Priority */}
        <div>
          <label className="text-sm text-slate-300">Priority</label>
          <select
            className="w-full bg-slate-800 text-white rounded-lg p-2 mt-1"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm text-slate-300">Description</label>
          <textarea
            className="w-full bg-slate-800 text-white rounded-lg p-2 mt-1"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
        </div>

        {/* Attachments */}
        <div>
          <label className="text-sm text-slate-300 flex items-center gap-2">
            <Paperclip size={14} />
            Attachments
          </label>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg"
          >
            <Upload size={16} />
            Add Files
          </button>

          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center bg-slate-800/60 p-2 rounded-md"
                >
                  <span className="text-slate-300 text-sm">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg"
          >
            {loading ? "Creating..." : "Create Ticket"}
          </button>
        </div>
      </form>
    </div>
  );
}

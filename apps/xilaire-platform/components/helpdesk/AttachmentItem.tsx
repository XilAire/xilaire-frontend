"use client";

import { useState, useMemo } from "react";
import { supabasePlatform } from "@/lib/supabasePlatformClient";

export default function AttachmentItem({
  attachment,
}: {
  attachment: any;
}) {
  const [deleting, setDeleting] = useState(false);

  // ⭐ Public URL memoized so it doesn’t regenerate every render
  const downloadUrl = useMemo(() => {
    return supabasePlatform.storage
      .from("service_requests")
      .getPublicUrl(attachment.file_path).data.publicUrl;
  }, [attachment.file_path]);

  async function deleteFile() {
    if (deleting) return;
    if (!confirm(`Delete "${attachment.file_name}"?`)) return;

    setDeleting(true);

    // 1️⃣ Remove file from storage
    const { error: storageError } = await supabasePlatform.storage
      .from("service_requests")
      .remove([attachment.file_path]);

    if (storageError) {
      console.error("Storage delete error:", storageError);
      setDeleting(false);
      return;
    }

    // 2️⃣ Remove DB row
    const { error: dbError } = await supabasePlatform
      .from("service_request_attachments")
      .delete()
      .eq("id", attachment.id);

    if (dbError) {
      console.error("DB delete error:", dbError);
      setDeleting(false);
      return;
    }

    // 3️⃣ Log delete
    await supabasePlatform.from("service_request_logs").insert({
      request_id: attachment.request_id,
      action: "attachment_delete",
      message: `Deleted file: ${attachment.file_name}`,
    });

    setDeleting(false);

    // 4️⃣ Refresh page (replaces onDelete callback)
    window.location.reload();
  }

  return (
    <div className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700">
      <div>
        <p className="text-white font-medium">{attachment.file_name}</p>
        <p className="text-slate-500 text-xs">
          {(attachment.file_size / 1024).toFixed(1)} KB
        </p>
      </div>

      <div className="flex gap-4 items-center">
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          Download
        </a>

        <button
          onClick={deleteFile}
          disabled={deleting}
          className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

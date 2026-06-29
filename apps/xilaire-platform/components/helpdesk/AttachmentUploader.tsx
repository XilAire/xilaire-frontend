"use client";

import { useState } from "react";
import { supabasePlatform } from "@/lib/supabasePlatformClient";

export default function AttachmentUploader({
  requestId,
}: {
  requestId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);

  async function uploadFiles() {
    if (!files || files.length === 0) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      const filePath = `${requestId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabasePlatform.storage
        .from("service_requests")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      await supabasePlatform.from("service_request_attachments").insert({
        request_id: requestId,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
      });

      await supabasePlatform.from("service_request_logs").insert({
        request_id: requestId,
        action: "attachment_upload",
        message: `Uploaded file: ${file.name}`,
      });
    }

    setUploading(false);
    setFiles(null);

    // 🔥 Force client reload
    window.location.reload();
  }

  return (
    <div className="border border-slate-700 bg-slate-900 rounded-lg p-4">
      <h3 className="text-white mb-3 font-semibold">Attachments</h3>

      <input
        type="file"
        multiple
        onChange={(e) => setFiles(e.target.files)}
        className="text-slate-300"
      />

      <button
        onClick={uploadFiles}
        disabled={uploading}
        className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
      >
        {uploading ? "Uploading…" : "Upload Files"}
      </button>
    </div>
  );
}

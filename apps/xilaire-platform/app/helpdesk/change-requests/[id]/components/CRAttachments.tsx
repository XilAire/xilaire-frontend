"use client";

import { useState, useEffect, useRef } from "react";
import { supabasePlatform } from "@/lib/supabasePlatformClient";
import { Upload, Paperclip, X, Download } from "lucide-react";

interface CRAttachmentsProps {
  changeId: string;
}

export default function CRAttachments({ changeId }: CRAttachmentsProps) {
  const supabase = supabasePlatform;
  const fileRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // ------------------------------------------------------------
  // LOAD ATTACHMENTS FOR THIS CHANGE REQUEST
  // ------------------------------------------------------------
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    const { data, error } = await supabase
      .from("change_request_attachments")
      .select("*")
      .eq("change_request_id", changeId)
      .order("created_at", { ascending: false });

    if (!error) setFiles(data || []);
  };

  // ------------------------------------------------------------
  // HANDLE FILE UPLOAD
  // ------------------------------------------------------------
  const handleUpload = async (e: any) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setUploading(true);

    const filePath = `${changeId}/${Date.now()}_${selected.name}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("change-request-attachments")
      .upload(filePath, selected);

    if (uploadError) {
      console.error(uploadError);
      setUploading(false);
      return;
    }

    // Insert metadata into DB
    await supabase.from("change_request_attachments").insert({
      change_request_id: changeId,
      file_name: selected.name,
      file_path: filePath,
      file_size: selected.size,
    });

    setUploading(false);
    loadFiles();
  };

  // ------------------------------------------------------------
  // DELETE FILE
  // ------------------------------------------------------------
  const handleDelete = async (file: any) => {
    await supabase.storage
      .from("change-request-attachments")
      .remove([file.file_path]);

    await supabase
      .from("change_request_attachments")
      .delete()
      .eq("id", file.id);

    loadFiles();
  };

  // ------------------------------------------------------------
  // DOWNLOAD FILE
  // ------------------------------------------------------------
  const downloadFile = async (file: any) => {
    const { data } = await supabase.storage
      .from("change-request-attachments")
      .download(file.file_path);

    if (!data) return;

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.file_name;
    a.click();
  };

  return (
    <div className="space-y-6">

      {/* FILE UPLOADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center shadow-sm">
        <div
          className="cursor-pointer p-6 border border-dashed border-slate-700 rounded-xl hover:border-blue-500/50 transition"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-300">Click to upload files</p>
          <p className="text-slate-500 text-xs mt-1">PDF, Images, Documents</p>
        </div>

        <input
          type="file"
          ref={fileRef}
          className="hidden"
          onChange={handleUpload}
        />

        {uploading && (
          <p className="text-blue-400 text-sm mt-2">Uploading...</p>
        )}
      </div>

      {/* FILE LIST */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Paperclip className="h-4 w-4" /> Attachments
        </h2>

        {files.length === 0 ? (
          <p className="text-slate-400 text-sm">No attachments uploaded.</p>
        ) : (
          <div className="space-y-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between bg-slate-800/40 p-3 rounded-lg border border-slate-700"
              >
                <div>
                  <p className="text-slate-200 text-sm">{file.file_name}</p>
                  <p className="text-slate-500 text-xs">
                    {(file.file_size / 1024).toFixed(1)} KB
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* DOWNLOAD */}
                  <button
                    onClick={() => downloadFile(file)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <Download className="h-5 w-5" />
                  </button>

                  {/* DELETE */}
                  <button
                    onClick={() => handleDelete(file)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

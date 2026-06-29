"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabasePlatformClient";

type VendorDocumentRow = {
  id: string;
  vendor_id: string;
  document_type: string | null;
  file_name: string | null;
  file_url: string | null;
  storage_path: string | null;
  status: string | null;
  expiration_date: string | null;
  notes: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  vendor_name: string;
};

type VendorOption = {
  id: string;
  company_name: string | null;
};

type ProfileRow = {
  account_type: string | null;
  role: string | null;
  org_id: string | null;
  email: string | null;
};

type VendorLookupRow = {
  id: string;
  company_name: string | null;
  email: string | null;
};

const DOCUMENT_TYPES = [
  "w9",
  "insurance",
  "license",
  "certification",
  "permit",
  "nda",
  "other",
];

function formatStatus(value: string | null | undefined) {
  if (!value) return "Unknown";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return date.toLocaleDateString();
}

function isExpired(value: string | null) {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date < today;
}

function isAdminRole(role: string | null | undefined) {
  const normalized = String(role || "").trim().toLowerCase();

  return (
    normalized === "master_admin" ||
    normalized === "super_admin" ||
    normalized === "admin" ||
    normalized === "project_manager"
  );
}

export default function VendorDocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<VendorDocumentRow[]>([]);
  const [vendorName, setVendorName] = useState("");
  const [isAdminView, setIsAdminView] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [resolvedVendorId, setResolvedVendorId] = useState<string | null>(null);

  const [documentType, setDocumentType] = useState("w9");
  const [expirationDate, setExpirationDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      try {
        setLoading(true);
        setError(null);
        setUploadMessage(null);
        setDocuments([]);
        setVendorName("");
        setIsAdminView(false);
        setVendors([]);
        setResolvedVendorId(null);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("Unable to load user.");
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("account_type, role, org_id, email")
          .eq("id", user.id)
          .single();

        if (profileError || !profile) {
          throw new Error("Unable to load profile.");
        }

        const currentProfile = profile as ProfileRow;
        const vendorAccess = currentProfile.account_type === "vendor";
        const adminAccess = isAdminRole(currentProfile.role);

        if (!vendorAccess && !adminAccess) {
          throw new Error("You do not have access to vendor documents.");
        }

        if (!currentProfile.org_id) {
          throw new Error("Your account is missing org context.");
        }

        let vendorId: string | null = null;

        if (adminAccess) {
          setIsAdminView(true);

          const { data: vendorRows, error: vendorListError } = await supabase
            .from("infrastructure_vendors")
            .select("id, company_name")
            .eq("org_id", currentProfile.org_id)
            .order("company_name", { ascending: true });

          if (vendorListError) {
            console.error(
              "VENDOR_DOCUMENTS_ADMIN_VENDOR_LIST_ERROR:",
              vendorListError
            );
            throw new Error("Unable to load vendor list.");
          }

          const mappedVendors = (vendorRows || []) as VendorOption[];

          if (!cancelled) {
            setVendors(mappedVendors);
          }
        }

        if (vendorAccess && !adminAccess) {
          const normalizedEmail = String(
            currentProfile.email || user.email || ""
          )
            .trim()
            .toLowerCase();

          if (!normalizedEmail) {
            throw new Error("Vendor email is missing from your account.");
          }

          const { data: vendor, error: vendorError } = await supabase
            .from("infrastructure_vendors")
            .select("id, company_name, email")
            .eq("org_id", currentProfile.org_id)
            .eq("email", normalizedEmail)
            .maybeSingle();

          if (vendorError) {
            console.error("VENDOR_DOCUMENTS_VENDOR_LOOKUP_ERROR:", vendorError);
            throw new Error("Unable to load the vendor company for this account.");
          }

          if (!vendor) {
            throw new Error("Unable to find the vendor company for this account.");
          }

          const currentVendor = vendor as VendorLookupRow;

          vendorId = currentVendor.id;
          setResolvedVendorId(currentVendor.id);
          setVendorName(currentVendor.company_name || "your company");
        }

        let query = supabase.from("infrastructure_vendor_documents").select(`
            id,
            vendor_id,
            document_type,
            file_name,
            file_url,
            storage_path,
            status,
            expiration_date,
            notes,
            reviewed_at,
            created_at,
            vendor:infrastructure_vendors (
              id,
              company_name
            )
          `);

        if (vendorId) {
          query = query.eq("vendor_id", vendorId);
        }

        const { data, error: documentError } = await query;

        if (documentError) {
          console.error("VENDOR_DOCUMENTS_QUERY_ERROR:", documentError);
          throw new Error("Failed to load documents.");
        }

        const mapped: VendorDocumentRow[] =
          data?.flatMap((row: any) => {
            const vendor = Array.isArray(row.vendor) ? row.vendor[0] : row.vendor;

            if (!row?.id) return [];

            return [
              {
                id: row.id,
                vendor_id: row.vendor_id,
                document_type: row.document_type || null,
                file_name: row.file_name || null,
                file_url: row.file_url || null,
                storage_path: row.storage_path || null,
                status: row.status || "pending",
                expiration_date: row.expiration_date || null,
                notes: row.notes || null,
                reviewed_at: row.reviewed_at || null,
                created_at: row.created_at || null,
                vendor_name: vendor?.company_name || "Unknown Vendor",
              },
            ];
          }) || [];

        mapped.sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bTime - aTime;
        });

        if (!cancelled) {
          setDocuments(mapped);
        }
      } catch (err: any) {
        console.error("VENDOR_DOCUMENTS_ERROR:", err);

        if (!cancelled) {
          setError(err?.message || "Failed to load documents.");
          setDocuments([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const counts = useMemo(() => {
    return documents.reduce(
      (acc, doc) => {
        const status = doc.status || "pending";

        if (status === "pending") acc.pending += 1;
        if (status === "approved") acc.approved += 1;
        if (status === "rejected") acc.rejected += 1;
        if (status === "expired") acc.expired += 1;

        if (isExpired(doc.expiration_date)) {
          acc.expiringOrExpired += 1;
        }

        return acc;
      },
      {
        pending: 0,
        approved: 0,
        rejected: 0,
        expired: 0,
        expiringOrExpired: 0,
      }
    );
  }, [documents]);

  const visibleDocuments = useMemo(() => {
    if (!isAdminView) return documents;
    if (!selectedVendorId) return documents;
    return documents.filter((doc) => doc.vendor_id === selectedVendorId);
  }, [documents, isAdminView, selectedVendorId]);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setUploadMessage(null);
      setError(null);

      const effectiveVendorId = isAdminView
        ? selectedVendorId || null
        : resolvedVendorId;

      if (!effectiveVendorId) {
        throw new Error("Please select a vendor before uploading.");
      }

      if (!documentType) {
        throw new Error("Please select a document type.");
      }

      if (!file) {
        throw new Error("Please choose a file to upload.");
      }

      setUploading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Unable to resolve your session.");
      }

      const formData = new FormData();
      formData.append("vendor_id", effectiveVendorId);
      formData.append("document_type", documentType);
      formData.append("file", file);

      if (expirationDate) {
        formData.append("expiration_date", expirationDate);
      }

      if (notes.trim()) {
        formData.append("notes", notes.trim());
      }

      const response = await fetch("/api/vendor/documents/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Upload failed.");
      }

      setUploadMessage("Document uploaded successfully.");
      setExpirationDate("");
      setNotes("");
      setFile(null);

      const fileInput = document.getElementById(
        "vendor-document-file"
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      setRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      console.error("VENDOR_DOCUMENTS_UPLOAD_ERROR:", err);
      setError(err?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-200">
          Vendor Documents
        </h1>

        <p className="text-slate-400">
          {isAdminView
            ? "Admin view of all vendor compliance documents."
            : `Documents assigned to ${vendorName || "your company"}.`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Pending" value={counts.pending} />
        <SummaryCard label="Approved" value={counts.approved} />
        <SummaryCard label="Rejected" value={counts.rejected} />
        <SummaryCard label="Expired" value={counts.expired} />
        <SummaryCard label="Needs Review" value={counts.expiringOrExpired} />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-100">
          Upload Compliance Document
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Upload W9s, insurance certificates, licenses, permits, and other compliance files.
        </p>

        <form onSubmit={handleUpload} className="mt-6 grid gap-4">
          {isAdminView && (
            <div className="grid gap-2">
              <label htmlFor="vendor_id" className="text-sm font-medium text-slate-300">
                Vendor
              </label>
              <select
                id="vendor_id"
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-500"
              >
                <option value="">All Vendors / Select Vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.company_name || vendor.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label
                htmlFor="document_type"
                className="text-sm font-medium text-slate-300"
              >
                Document Type
              </label>
              <select
                id="document_type"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-500"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {formatStatus(type)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="expiration_date"
                className="text-sm font-medium text-slate-300"
              >
                Expiration Date
              </label>
              <input
                id="expiration_date"
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label htmlFor="notes" className="text-sm font-medium text-slate-300">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add notes for this document"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-500"
            />
          </div>

          <div className="grid gap-2">
            <label
              htmlFor="vendor-document-file"
              className="text-sm font-medium text-slate-300"
            >
              File
            </label>
            <input
              id="vendor-document-file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-cyan-500"
            />
          </div>

          {uploadMessage && (
            <div className="rounded-2xl border border-emerald-800 bg-emerald-950/30 p-4 text-emerald-300">
              {uploadMessage}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-800 bg-rose-950/30 p-4 text-rose-300">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={uploading}
              className="rounded-xl border border-slate-600 bg-slate-950 px-5 py-3 text-slate-100 transition hover:border-cyan-500 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Upload Document"}
            </button>

            <button
              type="button"
              onClick={() => {
                setUploadMessage(null);
                setError(null);
                setRefreshKey((prev) => prev + 1);
              }}
              className="rounded-xl border border-slate-600 bg-slate-950 px-5 py-3 text-slate-100 transition hover:border-cyan-500 hover:text-cyan-300"
            >
              Refresh
            </button>
          </div>
        </form>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          Loading documents...
        </div>
      )}

      {!loading && !error && visibleDocuments.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          No documents found.
        </div>
      )}

      {!loading && !error && visibleDocuments.length > 0 && (
        <div className="grid gap-4">
          {visibleDocuments.map((doc) => {
            const expired = isExpired(doc.expiration_date);

            return (
              <div
                key={doc.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-100">
                        {doc.file_name || "Untitled Document"}
                      </h2>
                      <p className="text-sm text-slate-400">
                        Type: {formatStatus(doc.document_type)}
                      </p>
                      {isAdminView && (
                        <p className="mt-1 text-xs text-slate-500">
                          Vendor: {doc.vendor_name}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                        {formatStatus(doc.status)}
                      </span>

                      <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                        Expires: {formatDate(doc.expiration_date)}
                      </span>

                      {expired && (
                        <span className="rounded-full border border-rose-700 bg-rose-950/40 px-3 py-1 text-xs text-rose-300">
                          Expired
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-sm md:text-right">
                    <p className="text-slate-500">Uploaded</p>
                    <p className="text-slate-200">{formatDate(doc.created_at)}</p>
                    <p className="mt-2 text-slate-500">Reviewed</p>
                    <p className="text-slate-200">{formatDate(doc.reviewed_at)}</p>
                  </div>
                </div>

                {(doc.notes || doc.storage_path || doc.file_url) && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Notes
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        {doc.notes || "No notes provided."}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        File Reference
                      </p>
                      <div className="mt-2 break-words space-y-1 text-sm text-slate-300">
                        <p>URL: {doc.file_url || "Not set"}</p>
                        <p>Path: {doc.storage_path || "Not set"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}
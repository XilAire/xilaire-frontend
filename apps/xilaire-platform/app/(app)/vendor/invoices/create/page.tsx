"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabasePlatformClient";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  account_type: string | null;
  org_id: string | null;
};

type VendorRow = {
  id: string;
  org_id: string;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  active?: boolean | null;
  is_active?: boolean | null;
};

type ProjectRow = {
  id: string;
  org_id: string;
  project_name: string | null;
  client_name: string | null;
  status: string | null;
};

type EstimateRow = {
  id: string;
  org_id: string;
  project_id: string;
  vendor_id: string;
  estimate_number: string | null;
  status: string | null;
  amount: number | null;
  submitted_at?: string | null;
  approved_at?: string | null;
};

type InvoiceItemInput = {
  description: string;
  quantity: string;
  unit_price: string;
};

type CreateInvoicePayload = {
  project_id: string;
  estimate_id: string;
  vendor_id?: string;
  invoice_number?: string;
  notes?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function parseMoneyInput(value: string): number {
  const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseQtyInput(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRole(role: string | null | undefined) {
  return String(role ?? "").trim().toLowerCase();
}

function normalizeAccountType(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function isVendorLikeProfile(profile: ProfileRow | null) {
  if (!profile) return false;
  const role = normalizeRole(profile.role);
  const accountType = normalizeAccountType(profile.account_type);

  return role === "vendor" || role === "vendor_admin" || accountType === "vendor";
}

function getEstimateLabel(estimate: EstimateRow) {
  const numberPart = estimate.estimate_number?.trim() || estimate.id.slice(0, 8);
  const amountPart =
    typeof estimate.amount === "number" ? ` • ${money(estimate.amount)}` : "";
  const statusPart = estimate.status ? ` • ${estimate.status}` : "";
  return `${numberPart}${amountPart}${statusPart}`;
}

export default function VendorInvoiceCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const preselectedProjectId = searchParams.get("projectId") || "";
  const preselectedEstimateId = searchParams.get("estimateId") || "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [vendor, setVendor] = useState<VendorRow | null>(null);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [estimates, setEstimates] = useState<EstimateRow[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState(preselectedProjectId);
  const [selectedEstimateId, setSelectedEstimateId] = useState(preselectedEstimateId);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItemInput[]>([
    { description: "", quantity: "1", unit_price: "" },
  ]);

  const [pageError, setPageError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setPageError(null);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(sessionError.message || "Unable to load session.");
        }

        const authUser = session?.user;
        if (!authUser) {
          router.replace("/auth/signin?redirect=/vendor/invoices/create");
          return;
        }

        const { data: profileRow, error: profileError } = await supabase
          .from("profiles")
          .select("id,email,full_name,role,account_type,org_id")
          .eq("id", authUser.id)
          .maybeSingle();

        if (profileError) {
          throw new Error(profileError.message || "Unable to load profile.");
        }

        if (!profileRow) {
          throw new Error("No profile record was found for the signed-in user.");
        }

        if (!isVendorLikeProfile(profileRow)) {
          throw new Error("This page is only available to vendor users.");
        }

        const effectiveOrgId = profileRow.org_id;
        if (!effectiveOrgId) {
          throw new Error("Your profile does not have an org_id.");
        }

        let vendorRow: VendorRow | null = null;

        if (profileRow.email) {
          const { data: fallbackVendor, error: fallbackVendorError } = await supabase
            .from("infrastructure_vendors")
            .select("id,org_id,company_name,contact_name,email,active,is_active")
            .eq("org_id", effectiveOrgId)
            .eq("email", profileRow.email)
            .maybeSingle();

          if (fallbackVendorError) {
            throw new Error(
              fallbackVendorError.message || "Unable to resolve vendor record."
            );
          }

          vendorRow = fallbackVendor ?? null;
        }

        if (!vendorRow) {
          throw new Error(
            "No infrastructure vendor record was found for your account. Current schema requires infrastructure_vendors.email to match profiles.email."
          );
        }

        const vendorIsActive =
          vendorRow.is_active !== false && vendorRow.active !== false;

        if (!vendorIsActive) {
          throw new Error("Your vendor profile is inactive.");
        }

        const { data: assignmentRows, error: assignmentError } = await supabase
          .from("infrastructure_project_vendors")
          .select("project_id")
          .eq("org_id", effectiveOrgId)
          .eq("vendor_id", vendorRow.id);

        if (assignmentError) {
          throw new Error(
            assignmentError.message || "Unable to load project assignments."
          );
        }

        const assignedProjectIds = Array.from(
          new Set((assignmentRows ?? []).map((row: any) => row.project_id).filter(Boolean))
        );

        let projectRows: ProjectRow[] = [];
        if (assignedProjectIds.length > 0) {
          const { data: projectData, error: projectError } = await supabase
            .from("infrastructure_projects")
            .select("id,org_id,project_name,client_name,status,created_at")
            .eq("org_id", effectiveOrgId)
            .in("id", assignedProjectIds)
            .order("created_at", { ascending: false });

          if (projectError) {
            throw new Error(projectError.message || "Unable to load projects.");
          }

          projectRows = (projectData ?? []) as ProjectRow[];
        }

        let estimateRows: EstimateRow[] = [];
        if (assignedProjectIds.length > 0) {
          const { data: estimateData, error: estimateError } = await supabase
            .from("infrastructure_estimates")
            .select(
              "id,org_id,project_id,vendor_id,estimate_number,status,amount,submitted_at,approved_at"
            )
            .eq("org_id", effectiveOrgId)
            .eq("vendor_id", vendorRow.id)
            .in("project_id", assignedProjectIds)
            .in("status", ["approved", "Approved"])
            .order("approved_at", { ascending: false, nullsFirst: false });

          if (estimateError) {
            throw new Error(
              estimateError.message || "Unable to load approved estimates."
            );
          }

          estimateRows = (estimateData ?? []) as EstimateRow[];
        }

        if (!ignore) {
          setProfile(profileRow as ProfileRow);
          setVendor(vendorRow);
          setProjects(projectRows);
          setEstimates(estimateRows);

          const validProjectId =
            preselectedProjectId &&
            projectRows.some((p) => p.id === preselectedProjectId)
              ? preselectedProjectId
              : "";

          const validEstimateId =
            preselectedEstimateId &&
            estimateRows.some((e) => e.id === preselectedEstimateId)
              ? preselectedEstimateId
              : "";

          if (validProjectId) {
            setSelectedProjectId(validProjectId);
          } else if (projectRows.length === 1) {
            setSelectedProjectId(projectRows[0].id);
          }

          if (validEstimateId) {
            setSelectedEstimateId(validEstimateId);
          }
        }
      } catch (error: any) {
        if (!ignore) {
          setPageError(error?.message || "Failed to load invoice create page.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [preselectedEstimateId, preselectedProjectId, router]);

  useEffect(() => {
    if (!selectedProjectId) return;

    const selectedEstimateStillMatches = estimates.some(
      (estimate) =>
        estimate.id === selectedEstimateId && estimate.project_id === selectedProjectId
    );

    if (selectedEstimateStillMatches) return;

    const firstMatchingEstimate = estimates.find(
      (estimate) => estimate.project_id === selectedProjectId
    );

    setSelectedEstimateId(firstMatchingEstimate?.id ?? "");
  }, [selectedProjectId, selectedEstimateId, estimates]);

  const filteredEstimates = useMemo(() => {
    if (!selectedProjectId) return [];
    return estimates.filter((estimate) => estimate.project_id === selectedProjectId);
  }, [estimates, selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const selectedEstimate = useMemo(
    () => estimates.find((estimate) => estimate.id === selectedEstimateId) ?? null,
    [estimates, selectedEstimateId]
  );

  const normalizedItems = useMemo(() => {
    return items.map((item) => {
      const quantity = parseQtyInput(item.quantity);
      const unitPrice = parseMoneyInput(item.unit_price);
      const lineTotal = quantity * unitPrice;

      return {
        description: item.description.trim(),
        quantity,
        unitPrice,
        lineTotal,
      };
    });
  }, [items]);

  const subtotal = useMemo(() => {
    return normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  }, [normalizedItems]);

  function updateItem(index: number, field: keyof InvoiceItemInput, value: string) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { description: "", quantity: "1", unit_price: "" },
    ]);
  }

  function removeItem(index: number) {
    setItems((current) => {
      if (current.length <= 1) return current;
      return current.filter((_, i) => i !== index);
    });
  }

  function validateBeforeSubmit(): string | null {
    if (!profile || !vendor) {
      return "Profile or vendor context is missing.";
    }

    if (!selectedProjectId) {
      return "Please select a project.";
    }

    if (!selectedEstimateId) {
      return "Please select an approved estimate.";
    }

    const usableItems = normalizedItems.filter(
      (item) => item.description && item.quantity > 0 && item.unitPrice >= 0
    );

    if (usableItems.length === 0) {
      return "Please add at least one valid invoice item.";
    }

    const invalidItem = normalizedItems.find((item) => {
      if (!item.description && item.quantity === 0 && item.unitPrice === 0) return false;
      if (!item.description) return true;
      if (item.quantity <= 0) return true;
      if (item.unitPrice < 0) return true;
      return false;
    });

    if (invalidItem) {
      return "Each populated invoice item must include a description, quantity greater than 0, and a valid unit price.";
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSubmitError(null);

    const validationError = validateBeforeSubmit();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    if (!vendor) {
      setSubmitError("Vendor context is missing.");
      return;
    }

    const cleanedItems = normalizedItems
      .filter((item) => item.description && item.quantity > 0)
      .map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }));

    const payload: CreateInvoicePayload = {
      project_id: selectedProjectId,
      estimate_id: selectedEstimateId,
      vendor_id: vendor.id,
      invoice_number: invoiceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      items: cleanedItems,
    };

    try {
      setSubmitting(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const res = await fetch("/api/vendor/invoices/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Invoice creation failed. Please review the form and try again."
        );
      }

      const newInvoiceId = data?.invoice?.id || data?.data?.id || data?.id || null;

      if (newInvoiceId) {
        router.push(`/vendor/invoices/${newInvoiceId}`);
        return;
      }

      router.push("/vendor/invoices");
    } catch (error: any) {
      setSubmitError(error?.message || "Failed to create invoice.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="h-8 w-56 rounded bg-slate-800" />
            <div className="mt-3 h-4 w-96 rounded bg-slate-800" />
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="h-24 rounded-xl bg-slate-800" />
              <div className="h-24 rounded-xl bg-slate-800" />
            </div>
            <div className="mt-6 h-64 rounded-xl bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="rounded-2xl border border-rose-800 bg-rose-950/30 p-6">
            <h1 className="text-2xl font-semibold text-white">
              Unable to load invoice create page
            </h1>
            <p className="mt-3 text-sm text-rose-200">{pageError}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/vendor/invoices"
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800"
              >
                Back to invoices
              </Link>

              <Link
                href="/vendor/projects"
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800"
              >
                Back to projects
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canSubmit =
    !submitting &&
    !!selectedProjectId &&
    !!selectedEstimateId &&
    normalizedItems.some(
      (item) => item.description && item.quantity > 0 && item.unitPrice >= 0
    );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">
              Vendor Portal
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Create Invoice
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              Create an invoice from an approved estimate.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/vendor/invoices"
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800"
            >
              Back to invoices
            </Link>

            {selectedProjectId ? (
              <Link
                href={`/vendor/projects/${selectedProjectId}`}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800"
              >
                Back to project
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Invoice context</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Select the assigned project and approved estimate you want to bill against.
                  </p>
                </div>

                {vendor ? (
                  <div className="rounded-full border border-cyan-900 bg-cyan-950/40 px-3 py-1 text-xs text-cyan-200">
                    {vendor.company_name || vendor.contact_name || vendor.email || "Vendor"}
                  </div>
                ) : null}
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Project
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
                  >
                    <option value="">Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {(project.project_name || "Untitled Project") +
                          (project.client_name ? ` • ${project.client_name}` : "")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Approved estimate
                  </label>
                  <select
                    value={selectedEstimateId}
                    onChange={(e) => setSelectedEstimateId(e.target.value)}
                    disabled={!selectedProjectId}
                    className={cx(
                      "w-full rounded-xl border bg-slate-950 px-4 py-3 text-sm text-white outline-none transition",
                      selectedProjectId
                        ? "border-slate-700 focus:border-cyan-500"
                        : "cursor-not-allowed border-slate-800 text-slate-500"
                    )}
                  >
                    <option value="">
                      {selectedProjectId
                        ? "Select an approved estimate"
                        : "Select a project first"}
                    </option>
                    {filteredEstimates.map((estimate) => (
                      <option key={estimate.id} value={estimate.id}>
                        {getEstimateLabel(estimate)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
              <div>
                <h2 className="text-lg font-semibold text-white">Invoice details</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Add invoice items. The server will recalculate totals and validate them.
                </p>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Invoice number
                  </label>
                  <input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Vendor
                  </label>
                  <input
                    value={
                      vendor?.company_name || vendor?.contact_name || vendor?.email || "Vendor"
                    }
                    readOnly
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400 outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {items.map((item, index) => {
                  const previewQty = parseQtyInput(item.quantity);
                  const previewUnitPrice = parseMoneyInput(item.unit_price);
                  const previewTotal = previewQty * previewUnitPrice;

                  return (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                    >
                      <div className="grid gap-4 lg:grid-cols-[1.6fr_0.5fr_0.7fr_auto]">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-200">
                            Description
                          </label>
                          <input
                            value={item.description}
                            onChange={(e) =>
                              updateItem(index, "description", e.target.value)
                            }
                            placeholder="Invoice item description"
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-200">
                            Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-200">
                            Unit Price
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                            placeholder="0.00"
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
                          />
                        </div>

                        <div className="flex items-end gap-2">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            disabled={items.length <= 1}
                            className={cx(
                              "rounded-xl border px-4 py-3 text-sm transition",
                              items.length <= 1
                                ? "cursor-not-allowed border-slate-800 bg-slate-900 text-slate-600"
                                : "border-rose-800 bg-rose-950/40 text-rose-200 hover:bg-rose-950/70"
                            )}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 text-right text-sm text-slate-400">
                        Line Total: <span className="text-slate-200">{money(previewTotal || 0)}</span>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={addItem}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 transition hover:bg-slate-800"
                >
                  Add Invoice Item
                </button>
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  placeholder="Optional invoice notes"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
                />
              </div>

              {submitError ? (
                <div className="mt-6 rounded-xl border border-rose-800 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
                  {submitError}
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={cx(
                    "rounded-xl px-5 py-3 text-sm font-medium transition",
                    canSubmit
                      ? "bg-cyan-600 text-white hover:bg-cyan-500"
                      : "cursor-not-allowed bg-slate-800 text-slate-500"
                  )}
                >
                  {submitting ? "Creating Invoice..." : "Create Invoice"}
                </button>

                <Link
                  href="/vendor/invoices"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm text-slate-200 transition hover:bg-slate-800"
                >
                  Cancel
                </Link>
              </div>
            </section>
          </form>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-lg font-semibold text-white">Summary</h2>

              <div className="mt-5 space-y-4 text-sm">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-slate-500">Project</p>
                  <p className="mt-1 text-slate-200">
                    {selectedProject?.project_name || "Not selected"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedProject?.client_name || ""}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-slate-500">Estimate</p>
                  <p className="mt-1 text-slate-200">
                    {selectedEstimate?.estimate_number || "Not selected"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedEstimate?.status || ""}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-slate-500">Invoice Subtotal</p>
                  <p className="mt-1 text-xl font-semibold text-white">{money(subtotal)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Total is recalculated server-side from invoice items.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-lg font-semibold text-white">Requirements</h2>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li>Project must be assigned to this vendor.</li>
                <li>Estimate must be approved.</li>
                <li>Each populated item needs description, quantity, and unit price.</li>
                <li>Quantity must be greater than 0.</li>
                <li>Unit price cannot be negative.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
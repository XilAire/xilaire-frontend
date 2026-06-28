"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, PlusCircle } from "lucide-react";

type ProductEditorProps = {
  organizationId: string;
};

type BillingInterval = "week" | "month" | "year";

export default function ProductEditor({ organizationId }: ProductEditorProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [productKey, setProductKey] = useState("");
  const [description, setDescription] = useState("");
  const [featureKey, setFeatureKey] = useState("signals");
  const [amount, setAmount] = useState("");
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("month");
  const [discordRoleId, setDiscordRoleId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleCreateProduct() {
    setError("");
    setSuccess("");

    if (!organizationId) {
      setError("Missing organization ID.");
      return;
    }

    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (!productKey.trim()) {
      setError("Product key is required.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/stripe/create-organization-product",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            organization_id: organizationId,
            product_key: productKey.trim(),
            name: name.trim(),
            description: description.trim(),
            feature_key: featureKey.trim(),
            amount: Number(amount),
            billing_interval: billingInterval,
            discord_role_id: discordRoleId.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create Stripe product.");
      }

      setSuccess("Product created successfully.");

      setName("");
      setProductKey("");
      setDescription("");
      setFeatureKey("signals");
      setAmount("");
      setBillingInterval("month");
      setDiscordRoleId("");

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong creating the product."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">
          Create Organization Product
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Create a Stripe Product and Price, then save it to this organization.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Product Name
          </label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="CASE Signals Monthly"
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Product Key
          </label>
          <input
            value={productKey}
            onChange={(event) => setProductKey(event.target.value)}
            placeholder="case_signals_monthly"
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-300">
            Description
          </label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Monthly access to CASE Signals, Discord alerts, and options-first trade ideas."
            rows={3}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Feature Key
          </label>
          <select
            value={featureKey}
            onChange={(event) => setFeatureKey(event.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          >
            <option value="signals">Signals</option>
            <option value="journal">Journal</option>
            <option value="analytics">Analytics</option>
            <option value="education">Education</option>
            <option value="discord">Discord</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Amount
          </label>
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="29.99"
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Billing Interval
          </label>
          <select
            value={billingInterval}
            onChange={(event) =>
              setBillingInterval(event.target.value as BillingInterval)
            }
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          >
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Discord Role ID
          </label>
          <input
            value={discordRoleId}
            onChange={(event) => setDiscordRoleId(event.target.value)}
            placeholder="Optional Discord role ID"
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mt-4 rounded-xl border border-emerald-900/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      ) : null}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={handleCreateProduct}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PlusCircle className="h-4 w-4" />
          )}
          {loading ? "Creating..." : "Create Stripe Product"}
        </button>
      </div>
    </div>
  );
}
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import LoadingSpinner from "@/components/ui/LoadingSpinner";

type CheckoutButtonProps = {
  priceId?: string;
  plan: string;
  productFamily: "signals" | "journal";
  children: React.ReactNode;
  className?: string;
};

export default function CheckoutButton({
  priceId,
  plan,
  productFamily,
  children,
  className = "",
}: CheckoutButtonProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          plan,
          productFamily,
          priceId,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        router.push(`/auth/signup?plan=${encodeURIComponent(plan)}`);
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Unable to start checkout."
        );
      }

      const checkoutUrl =
        data?.url ??
        data?.checkoutUrl ??
        data?.sessionUrl ??
        null;

      if (!checkoutUrl) {
        throw new Error("Stripe checkout URL was not returned.");
      }

      // Keep spinner active while browser navigates to Stripe.
      window.location.assign(checkoutUrl);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong starting checkout."
      );

      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        aria-busy={loading}
        className={`${className} ${
          loading
            ? "cursor-not-allowed opacity-80 transition-all duration-200"
            : "transition-all duration-200"
        }`}
      >
        {loading ? (
          <LoadingSpinner
            size="sm"
            label="Redirecting to secure checkout..."
          />
        ) : (
          children
        )}
      </button>

      {error && (
        <p className="mt-2 text-center text-xs font-medium text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
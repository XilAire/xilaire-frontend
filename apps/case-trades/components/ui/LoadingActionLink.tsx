"use client";

import Link from "next/link";
import { useState } from "react";

import LoadingSpinner from "@/components/ui/LoadingSpinner";

type LoadingActionLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  loadingLabel?: string;
  target?: string;
  rel?: string;
};

export default function LoadingActionLink({
  href,
  children,
  className = "",
  loadingLabel = "Loading...",
  target,
  rel,
}: LoadingActionLinkProps) {
  const [loading, setLoading] = useState(false);

  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      aria-busy={loading}
      onClick={() => setLoading(true)}
      className={`${className} ${
        loading ? "pointer-events-none cursor-not-allowed opacity-80" : ""
      } transition-all duration-200`}
    >
      {loading ? <LoadingSpinner size="sm" label={loadingLabel} /> : children}
    </Link>
  );
}
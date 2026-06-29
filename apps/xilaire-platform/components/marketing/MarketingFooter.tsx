"use client";

export default function MarketingFooter() {
  return (
    <footer className="py-8 border-t border-slate-200 dark:border-slate-700">
      <div className="mx-auto max-w-6xl flex justify-between px-4 text-xs">
        <span>XilAire Technologies</span>

        <div className="flex gap-4">
          <a href="/legal">Legal Hub</a>
          <a href="/legal/terms">Terms</a>
          <a href="/legal/privacy">Privacy</a>
          <a href="/legal/sla">SLA</a>
          <a href="/contact">Contact</a>
        </div>
      </div>
    </footer>
  );
}

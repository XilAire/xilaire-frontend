// apps/xilaire-platform/app/(marketing)/legal/refund/page.tsx

export const metadata = {
  title: "Refund | XilAire Technologies",
  description:
    "Understand how refunds and billing adjustments are handled for XilAire Technologies subscriptions and services.",
};

export default function RefundPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-3 text-3xl font-bold text-foreground">Refund</h1>

      <p className="mb-4 text-sm text-[color:var(--text-secondary)]">
        Last updated: {new Date().getFullYear()}
      </p>

      <div className="space-y-4 text-sm leading-relaxed text-[color:var(--text-secondary)]">
        <p>
          This Refund page explains how XilAire Technologies handles refunds,
          credits, and billing adjustments for subscriptions and one-time
          services. These terms may be supplemented or modified by your specific
          agreement or order form.
        </p>

        <h2 className="mt-4 text-base font-semibold text-foreground">
          1. Subscription Services
        </h2>
        <p>
          Subscription fees (for example, monthly or annual platform access,
          managed IT, or monitoring services) are generally{" "}
          <span className="font-medium">non-refundable</span> once a billing
          period has started. If you cancel, your subscription will remain
          active until the end of the current paid term.
        </p>

        <h2 className="mt-4 text-base font-semibold text-foreground">
          2. One-Time and Project Services
        </h2>
        <p>
          One-time services such as onboarding, migrations, automation builds,
          consulting, or project work are non-refundable once work has begun,
          unless otherwise agreed in writing. Deposits or retainers may be
          non-refundable as specified in your order.
        </p>

        <h2 className="mt-4 text-base font-semibold text-foreground">
          3. Billing Errors
        </h2>
        <p>
          If you believe you were billed in error, please contact us within{" "}
          <span className="font-medium">7 days</span> of the charge. When a
          genuine billing error is confirmed, we will correct it promptly, which
          may include issuing a refund or account credit.
        </p>

        <h2 className="mt-4 text-base font-semibold text-foreground">
          4. Service Credits vs. Refunds
        </h2>
        <p>
          For issues related to service availability or performance covered by
          our SLA, the remedy—if applicable—is typically{" "}
          <span className="font-medium">service credits</span> applied to future
          invoices, not cash refunds. See the SLA for more details.
        </p>

        <h2 className="mt-4 text-base font-semibold text-foreground">
          5. Third-Party Licenses and Vendors
        </h2>
        <p>
          Some fees may relate to third-party licenses or services (for example,
          Microsoft 365, phone carriers, or security tools). Refund eligibility
          for those items may be governed by the policies of the third-party
          provider and may be limited or unavailable.
        </p>

        <h2 className="mt-4 text-base font-semibold text-foreground">
          6. Chargebacks
        </h2>
        <p>
          If you initiate a chargeback without first attempting to resolve the
          issue with us, we may treat this as a breach of the payment terms and
          may suspend or terminate access to the Services pending resolution.
        </p>

        <h2 className="mt-4 text-base font-semibold text-foreground">
          7. How to Request a Refund or Review
        </h2>
        <p>
          For billing questions, refund requests, or corrections, contact:
        </p>
        <p>
          <span className="font-medium text-foreground">
            billing@xilairetechnologies.com
          </span>
        </p>
        <p>
          Please include your organization name, contact details, invoice
          number, and a brief description of the issue so we can review it
          efficiently.
        </p>

        <p className="mt-6 text-[11px] text-[color:var(--text-muted)]">
          This Refund page is a general summary and may be superseded by
          specific payment or refund terms in a signed agreement, SOW, or order
          form between you and XilAire Technologies.
        </p>
      </div>
    </section>
  );
}

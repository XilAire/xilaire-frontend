// apps/xilaire-platform/app/(marketing)/legal/sla/page.tsx

export const metadata = {
  title: "SLA | XilAire Technologies",
  description:
    "Review the Service Level Agreement (SLA) for uptime targets, response times, and support commitments for XilAire Technologies.",
};

export default function SlaPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-3 text-3xl font-bold text-slate-900">
        Service Level Agreement (SLA)
      </h1>

      <p className="mb-4 text-sm text-slate-600">
        Last updated: {new Date().getFullYear()}
      </p>

      <div className="space-y-4 text-sm leading-relaxed text-slate-700">
        <p>
          This Service Level Agreement (&quot;SLA&quot;) describes the service
          levels that XilAire Technologies aims to provide for eligible
          production services. This SLA is subject to the terms of your
          agreement with XilAire.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          1. Uptime Commitment
        </h2>
        <p>
          For core platform services managed by XilAire (excluding scheduled
          maintenance and events outside our control), we target{" "}
          <span className="font-medium">99.5% monthly uptime</span>. Uptime is
          measured over a calendar month and excludes:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Planned maintenance windows.</li>
          <li>
            Issues caused by customer environments, network, or configuration
            changes.
          </li>
          <li>
            Outages at third-party providers (cloud, carriers, SaaS, etc.)
            outside of XilAire&apos;s reasonable control.
          </li>
          <li>
            Force majeure events such as natural disasters, war, or major
            internet disruptions.
          </li>
        </ul>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          2. Support Hours
        </h2>
        <p>
          Standard support is available during normal business hours, Monday–Friday,
          excluding holidays, unless otherwise agreed in a separate contract.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          3. Response Targets
        </h2>
        <p>We use the following target initial response times:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <span className="font-medium">Priority 1 – Critical outage:</span>{" "}
            Target initial response within 1–2 business hours.
          </li>
          <li>
            <span className="font-medium">Priority 2 – Major degradation:</span>{" "}
            Target initial response within 4 business hours.
          </li>
          <li>
            <span className="font-medium">Priority 3 – Standard request:</span>{" "}
            Target initial response within 1 business day.
          </li>
        </ul>
        <p>
          Response times are targets, not guarantees, and may vary depending on
          ticket volume and complexity.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          4. Maintenance
        </h2>
        <p>
          We may perform routine maintenance, updates, and security patches. For
          planned maintenance that may impact availability, we will attempt to
          schedule during off-peak hours and, where practical, provide prior
          notice.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          5. Service Credits
        </h2>
        <p>
          In the event of a material deviation from the uptime target defined
          above, you may be eligible for service credits as described in your
          specific contract or order form. Service credits (if applicable) are:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            Issued as a credit against future invoices, not as cash refunds.
          </li>
          <li>
            Subject to you notifying XilAire in writing within a defined period
            after the incident (as set in your contract).
          </li>
          <li>
            Your exclusive remedy for service availability issues covered by
            this SLA.
          </li>
        </ul>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          6. Customer Responsibilities
        </h2>
        <p>You agree to:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            Maintain accurate contact information and escalation paths for your
            team.
          </li>
          <li>
            Promptly notify XilAire of incidents and provide sufficient details
            for troubleshooting.
          </li>
          <li>
            Follow platform guidance, security best practices, and change
            management processes we provide.
          </li>
        </ul>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          7. Changes to This SLA
        </h2>
        <p>
          XilAire may update this SLA from time to time. Material updates will
          generally apply from the start of the next subscription or renewal
          term, unless otherwise agreed in writing.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          8. Questions
        </h2>
        <p>
          For questions about this SLA, contact your account representative or
          email{" "}
          <span className="font-medium text-slate-900">
            support@xilairetechnologies.com
          </span>
          .
        </p>

        <p className="mt-6 text-[11px] text-slate-400">
          This SLA outlines general targets and does not override any specific
          commitments documented in a signed master agreement or statement of
          work.
        </p>
      </div>
    </section>
  );
}

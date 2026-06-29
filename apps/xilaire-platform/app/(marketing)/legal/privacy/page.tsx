// apps/xilaire-platform/app/(marketing)/legal/privacy/page.tsx

export const metadata = {
  title: "Privacy | XilAire Technologies",
  description:
    "Learn how XilAire Technologies collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-3 text-3xl font-bold text-slate-900">Privacy Policy</h1>

      <p className="mb-4 text-sm text-slate-600">
        Last updated: {new Date().getFullYear()}
      </p>

      <div className="space-y-4 text-sm leading-relaxed text-slate-700">
        <p>
          This Privacy Policy explains how XilAire Technologies (&quot;XilAire,&quot;
          &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, and protects information in
          connection with our website, platform, and managed services.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          1. Information We Collect
        </h2>
        <p>We may collect the following types of information:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <span className="font-medium">Contact information</span> – such as
            name, email address, phone number, and company name.
          </li>
          <li>
            <span className="font-medium">Account information</span> – login
            credentials, role, and configuration data for your organization.
          </li>
          <li>
            <span className="font-medium">Usage and log data</span> – pages
            visited, actions taken in the platform, IP address, browser type,
            and device information.
          </li>
          <li>
            <span className="font-medium">Support and communications</span> –
            messages you send us, including contact forms, onboarding details,
            and support requests.
          </li>
        </ul>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          2. How We Use Your Information
        </h2>
        <p>We use the information we collect to:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Provide, operate, and maintain our platform and services.</li>
          <li>Configure and manage your cloud, IT, security, and VoIP setup.</li>
          <li>Communicate with you about onboarding, incidents, and updates.</li>
          <li>
            Improve and secure the platform, including monitoring, analytics,
            and troubleshooting.
          </li>
          <li>
            Comply with legal obligations and enforce our agreements and
            policies.
          </li>
        </ul>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          3. How We Share Information
        </h2>
        <p>
          We do not sell your personal information. We may share information
          with:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <span className="font-medium">Service providers</span> that help us
            deliver the platform (e.g., cloud hosting, email, analytics).
          </li>
          <li>
            <span className="font-medium">Partners and vendors</span> when
            necessary to deliver services you have requested (e.g., Microsoft
            365, cloud providers, or security tools).
          </li>
          <li>
            <span className="font-medium">Legal or regulatory authorities</span>{" "}
            when required by law or to protect our rights, users, or systems.
          </li>
        </ul>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          4. Data Security
        </h2>
        <p>
          We implement technical and organizational measures to help protect
          your information, including access controls, encryption where
          appropriate, and monitoring. However, no method of transmission or
          storage is completely secure, and we cannot guarantee absolute
          security.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          5. Data Retention
        </h2>
        <p>
          We retain information for as long as needed to provide services, meet
          legal obligations, resolve disputes, and enforce agreements. Where
          possible, data may be anonymized or aggregated for longer-term
          analytics.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          6. Your Choices
        </h2>
        <p>You may be able to:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            Update or correct certain account information through the platform.
          </li>
          <li>
            Opt out of non-essential marketing communications using unsubscribe
            links or by contacting us.
          </li>
          <li>
            Request additional details about how your organization&apos;s data is
            handled under specific contracts or DPAs.
          </li>
        </ul>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          7. International Considerations
        </h2>
        <p>
          Our services may be provided from or rely on infrastructure located in
          different regions. Data transfers are handled in line with applicable
          data protection laws and our agreements with you or your
          organization.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          8. Changes to This Policy
        </h2>
        <p>
          We may update this Privacy Policy from time to time. When we do, we
          will update the &quot;Last updated&quot; date above. Your continued use
          of the services after changes become effective means you accept the
          updated policy.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          9. Contact Us
        </h2>
        <p>
          If you have questions about this Privacy Policy, contact us at{" "}
          <span className="font-medium text-slate-900">
            privacy@xilairetechnologies.com
          </span>
          .
        </p>

        <p className="mt-6 text-[11px] text-slate-400">
          This document is provided for general informational purposes only and
          does not constitute legal advice.
        </p>
      </div>
    </section>
  );
}

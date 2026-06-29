// apps/xilaire-platform/app/(marketing)/legal/terms/page.tsx

export const metadata = {
  title: "Terms | XilAire Technologies",
  description:
    "Read the Terms of Service that govern use of the XilAire Technologies platform and managed services.",
};

export default function TermsPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-3 text-3xl font-bold text-slate-900">
        Terms of Service
      </h1>

      <p className="mb-4 text-sm text-slate-600">
        Last updated: {new Date().getFullYear()}
      </p>

      <div className="space-y-4 text-sm leading-relaxed text-slate-700">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use
          of the XilAire Technologies platform, website, and related services
          (collectively, the &quot;Services&quot;). By accessing or using the Services,
          you agree to be bound by these Terms.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          1. Accounts and Eligibility
        </h2>
        <p>
          You must be authorized to act on behalf of your organization to use
          XilAire&apos;s Services. You are responsible for maintaining the
          confidentiality of your accounts, credentials, and any activity that
          occurs under them.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          2. Use of the Services
        </h2>
        <p>You agree to:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Use the Services only for lawful business purposes.</li>
          <li>
            Comply with all applicable laws, regulations, and third-party terms.
          </li>
          <li>
            Not attempt to interfere with, disrupt, or misuse the platform or
            infrastructure.
          </li>
          <li>
            Not reverse engineer, decompile, or copy the Services except where
            permitted by law.
          </li>
        </ul>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          3. Customer Data
        </h2>
        <p>
          You retain ownership of data that you or your organization provide to
          XilAire (&quot;Customer Data&quot;). You grant XilAire a limited license to
          use Customer Data solely to deliver, support, and improve the
          Services, and as otherwise described in our agreements and Privacy
          Policy.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          4. Third-Party Services
        </h2>
        <p>
          Our Services may integrate with or rely on third-party services (for
          example, cloud providers, email systems, security tools, or phone
          carriers). Your use of third-party services may be subject to separate
          terms and policies, which are solely between you and the third party.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          5. Fees and Billing
        </h2>
        <p>
          Unless otherwise stated in a separate order or agreement, Services are
          billed according to the pricing and terms presented to you at signup
          or in a proposal. You are responsible for timely payment of all fees,
          taxes, and charges associated with your account.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          6. Intellectual Property
        </h2>
        <p>
          XilAire and its licensors own all rights, title, and interest in and
          to the platform, documentation, and related materials, excluding
          Customer Data and third-party content. No rights are granted to you
          except as expressly set out in these Terms or a separate written
          agreement.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          7. Confidentiality
        </h2>
        <p>
          Each party agrees to protect the other party&apos;s confidential
          information and use it only as reasonably necessary to perform under
          these Terms or a related agreement. Additional confidentiality
          obligations may be set out in a separate contract or NDA.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          8. Disclaimers
        </h2>
        <p>
          The Services are provided on an &quot;as is&quot; and &quot;as available&quot;
          basis. To the fullest extent permitted by law, XilAire disclaims all
          warranties, whether express, implied, statutory, or otherwise,
          including implied warranties of merchantability, fitness for a
          particular purpose, and non-infringement.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          9. Limitation of Liability
        </h2>
        <p>
          To the maximum extent permitted by law, XilAire shall not be liable
          for any indirect, incidental, special, consequential, or punitive
          damages, or for any loss of profits, revenue, data, or business
          opportunities. XilAire&apos;s total aggregate liability arising out of or
          relating to the Services is limited to the amounts paid by you to
          XilAire for the Services during the twelve (12) months preceding the
          event giving rise to the claim, unless otherwise agreed in writing.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          10. Termination
        </h2>
        <p>
          Either party may terminate access to the Services where permitted
          under a separate agreement or if the other party materially breaches
          these Terms and fails to cure within a reasonable time. Upon
          termination, your access to the platform may be disabled, and
          applicable data retention or export terms will apply.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          11. Changes to These Terms
        </h2>
        <p>
          We may update these Terms from time to time. If changes are material,
          we will provide notice where reasonable (for example, through the
          platform or by email). Your continued use of the Services after the
          effective date of changes constitutes acceptance of the updated Terms.
        </p>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          12. Contact
        </h2>
        <p>
          Questions about these Terms can be sent to{" "}
          <span className="font-medium text-slate-900">
            legal@xilairetechnologies.com
          </span>
          .
        </p>

        <p className="mt-6 text-[11px] text-slate-400">
          This summary of Terms is provided for convenience and does not replace
          any fully executed master service agreement or order form between you
          and XilAire Technologies.
        </p>
      </div>
    </section>
  );
}

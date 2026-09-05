import type { Metadata } from "next";

import {
  LegalDocument,
  LegalList,
  LegalNotice,
  LegalSection,
} from "../_shared";

export const metadata: Metadata = {
  title: "Terms of Service | CASE University",
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      description="These Terms govern access to and use of CASE University, including its courses, assessments, certificates, subscriptions, websites, and related services."
    >
      <LegalNotice>
        By accessing or using CASE University, you agree to these Terms and the
        policies incorporated into them. If you do not agree, do not use the
        service.
      </LegalNotice>

      <LegalSection title="1. Educational service">
        <p>
          CASE University provides educational information and learning tools.
          It is not a brokerage, investment adviser, financial adviser, law
          firm, accounting firm, tax adviser, or accredited degree-granting
          institution unless expressly stated otherwise.
        </p>
      </LegalSection>

      <LegalSection title="2. Account responsibilities">
        <LegalList>
          <li>Provide accurate information where required.</li>
          <li>Protect your credentials and account access.</li>
          <li>
            Use your account only as authorized and notify us of suspected
            unauthorized access.
          </li>
          <li>Comply with applicable law and the Acceptable Use Policy.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Subscriptions and paid services">
        <p>
          Certain courses or features may require a paid subscription. Prices,
          billing intervals, included features, renewal terms, and cancellation
          information will be presented through the applicable purchase flow.
          Taxes may apply. Third-party payment processors may process payments.
        </p>
      </LegalSection>

      <LegalSection title="4. Curriculum and availability">
        <p>
          We may add, remove, revise, reorganize, archive, or update courses,
          lessons, assessments, features, and platform functionality. We do not
          guarantee that any particular course or feature will remain available
          indefinitely.
        </p>
      </LegalSection>

      <LegalSection title="5. Certificates">
        <p>
          CASE University certificates reflect completion of specified platform
          requirements. They do not represent a professional license,
          government credential, academic degree, investment-adviser
          qualification, or guarantee of knowledge, employment, investment
          performance, or financial results.
        </p>
      </LegalSection>

      <LegalSection title="6. Intellectual property">
        <p>
          CASE University and its original curriculum, branding, software,
          designs, and other protected materials are owned by or licensed to the
          platform operator. Subject to these Terms, users receive a limited,
          personal, non-exclusive, non-transferable right to use the service for
          lawful educational purposes.
        </p>
      </LegalSection>

      <LegalSection title="7. Prohibited conduct">
        <p>
          You may not misuse the service, circumvent access controls, scrape or
          redistribute protected curriculum at scale, interfere with platform
          security, impersonate others, commit fraud, or use CASE University in
          violation of applicable law. Additional rules appear in the
          Acceptable Use Policy.
        </p>
      </LegalSection>

      <LegalSection title="8. Third-party services">
        <p>
          CASE University may depend on or link to third-party services. We are
          not responsible for third-party services outside our control, and
          their own terms and policies may apply.
        </p>
      </LegalSection>

      <LegalSection title="9. Disclaimers">
        <p>
          The service is provided on an &quot;as is&quot; and &quot;as
          available&quot; basis to the maximum extent permitted by law. We do
          not guarantee uninterrupted availability, error-free operation,
          investment outcomes, market accuracy, or that educational content
          will meet every user&apos;s objectives.
        </p>
      </LegalSection>

      <LegalSection title="10. Limitation of liability">
        <p>
          To the maximum extent permitted by applicable law, CASE University
          and its owners, affiliates, personnel, and service providers will not
          be liable for indirect, incidental, special, consequential, exemplary,
          or punitive damages, or for trading or investment losses arising from
          reliance on educational content. Some jurisdictions do not allow
          certain limitations, so portions of this section may not apply to you.
        </p>
      </LegalSection>

      <LegalSection title="11. Suspension or termination">
        <p>
          Access may be suspended or terminated when reasonably necessary to
          protect the platform, users, or third parties; enforce these Terms;
          address nonpayment; or comply with law.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes">
        <p>
          We may update these Terms. Continued use after an updated version
          becomes effective constitutes acceptance where permitted by law.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact">
        <p>
          Questions about these Terms can be submitted using the Legal Contact
          page.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}

import type { Metadata } from "next";

import {
  LegalDocument,
  LegalSection,
} from "../_shared";

export const metadata: Metadata = {
  title: "Licenses & Attributions | CASE University",
};

export default function LicensesPage() {
  return (
    <LegalDocument
      title="Licenses & Attributions"
      description="Information about CASE University intellectual property, third-party software, trademarks, and educational materials."
    >
      <LegalSection title="CASE University materials">
        <p>
          Unless otherwise indicated, original CASE University branding,
          curriculum, written material, assessments, interface designs, and
          related content are protected by applicable intellectual-property
          laws and may not be reproduced or redistributed except as permitted by
          the Terms of Service or with authorization.
        </p>
      </LegalSection>

      <LegalSection title="Open-source software">
        <p>
          CASE University is built using software components that may be
          distributed under open-source licenses. Those components remain
          subject to their respective license terms. Where a license requires
          attribution or distribution of notices, those requirements control
          for the applicable component.
        </p>
      </LegalSection>

      <LegalSection title="Third-party trademarks">
        <p>
          Company names, product names, brokerage names, exchange names,
          financial symbols, logos, and trademarks referenced for educational
          purposes belong to their respective owners. Reference does not imply
          affiliation, sponsorship, or endorsement.
        </p>
      </LegalSection>

      <LegalSection title="Market and educational references">
        <p>
          Third-party data, screenshots, quotations, charts, or educational
          references, when used, remain subject to applicable licenses, terms,
          copyright rules, and attribution requirements. CASE University does
          not claim ownership of third-party intellectual property.
        </p>
      </LegalSection>

      <LegalSection title="Questions">
        <p>
          For an attribution, licensing, or intellectual-property question,
          contact CASE University using the Legal Contact page.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}

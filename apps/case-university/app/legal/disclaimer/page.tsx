import type { Metadata } from "next";

import {
  LegalDocument,
  LegalList,
  LegalNotice,
  LegalSection,
} from "../_shared";

export const metadata: Metadata = {
  title: "Educational & Investment Disclaimer | CASE University",
};

export default function DisclaimerPage() {
  return (
    <LegalDocument
      eyebrow="Important Financial Disclosure"
      title="Educational & Investment Disclaimer"
      description="Important information about the educational nature of CASE University and the risks associated with investing, trading, securities, margin, and options."
    >
      <LegalNotice>
        CASE University is for education only. Nothing on the platform is
        personalized investment advice or a recommendation to buy, sell, hold,
        or trade any security, option, strategy, or financial product.
      </LegalNotice>

      <LegalSection title="1. Educational purposes only">
        <p>
          Courses, lessons, examples, worksheets, assessments, charts,
          commentary, demonstrations, and other materials are designed to teach
          concepts. They are not individualized recommendations and should not
          be treated as a substitute for advice from qualified professionals who
          understand your circumstances.
        </p>
      </LegalSection>

      <LegalSection title="2. No adviser-client or broker relationship">
        <p>
          Use of CASE University does not create an investment-adviser,
          financial-adviser, broker-dealer, fiduciary, attorney-client,
          accountant-client, or tax-adviser relationship.
        </p>
      </LegalSection>

      <LegalSection title="3. Investing and trading involve risk">
        <LegalList>
          <li>Investments can lose value, including loss of principal.</li>
          <li>Past performance does not guarantee future results.</li>
          <li>
            Market conditions can change rapidly and historical examples may
            not reflect current conditions.
          </li>
          <li>
            Short-term trading can involve substantial volatility, costs,
            taxes, and execution risk.
          </li>
          <li>
            Margin can magnify both gains and losses and may result in forced
            liquidation or losses exceeding the amount initially committed in
            some circumstances.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. Options risk">
        <p>
          Options involve significant risk and are not appropriate for every
          investor. Depending on the strategy, an option can expire worthless,
          lose its premium, create assignment obligations, or expose a trader
          to substantial or theoretically unlimited loss. Educational examples
          involving calls, puts, spreads, LEAPS, scalps, swings, or other
          strategies do not mean those strategies are appropriate for you.
        </p>
      </LegalSection>

      <LegalSection title="5. Examples and simulations">
        <p>
          Hypothetical trades, simulated results, sample portfolios, historical
          charts, or classroom scenarios may omit real-world factors such as
          liquidity, slippage, commissions, taxes, assignment, changing implied
          volatility, execution delays, and behavioral decisions. Hypothetical
          performance has inherent limitations and is not a promise of actual
          results.
        </p>
      </LegalSection>

      <LegalSection title="6. Securities and companies mentioned">
        <p>
          References to particular companies, ETFs, indexes, securities, or
          financial products are educational examples unless expressly stated
          otherwise. Their inclusion does not constitute endorsement,
          solicitation, sponsorship, or a recommendation.
        </p>
      </LegalSection>

      <LegalSection title="7. Information may change">
        <p>
          Markets, laws, tax rules, financial data, product features, brokerage
          requirements, and regulations change. Educational material may become
          outdated. You are responsible for verifying current information before
          making decisions.
        </p>
      </LegalSection>

      <LegalSection title="8. Certificates are educational">
        <p>
          A CASE University certificate documents completion of platform
          requirements only. It is not a professional license, regulatory
          approval, securities credential, investment-adviser designation, or
          guarantee of competence or investment success.
        </p>
      </LegalSection>

      <LegalSection title="9. Make your own decisions">
        <p>
          Consider your objectives, financial circumstances, time horizon, risk
          tolerance, tax situation, and applicable rules before investing or
          trading. When appropriate, consult qualified financial, investment,
          legal, accounting, or tax professionals.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}

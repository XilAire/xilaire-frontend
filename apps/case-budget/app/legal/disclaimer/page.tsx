import type {
  Metadata,
} from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "Financial Disclaimer | CASE Budget",
  description:
    "Review important limitations regarding CASE Budget financial tools, projections, educational content, connected accounts, and professional advice.",
};

const LAST_UPDATED =
  "August 2, 2026";

const policySections = [
  {
    href: "#overview",
    label: "Overview",
  },
  {
    href: "#not-advice",
    label: "Not professional advice",
  },
  {
    href: "#financial-decisions",
    label: "Your financial decisions",
  },
  {
    href: "#accuracy",
    label: "Accuracy and completeness",
  },
  {
    href: "#budgets",
    label: "Budgets and forecasts",
  },
  {
    href: "#transactions",
    label: "Transactions and balances",
  },
  {
    href: "#bills",
    label: "Bills and reminders",
  },
  {
    href: "#debt",
    label: "Debt tools",
  },
  {
    href: "#investments",
    label: "Investments",
  },
  {
    href: "#taxes",
    label: "Tax information",
  },
  {
    href: "#credit",
    label: "Credit information",
  },
  {
    href: "#ai",
    label: "AI-assisted features",
  },
  {
    href: "#third-parties",
    label: "Third-party services",
  },
  {
    href: "#no-guarantees",
    label: "No guarantees",
  },
  {
    href: "#emergencies",
    label: "Financial emergencies",
  },
  {
    href: "#changes",
    label: "Changes",
  },
  {
    href: "#contact",
    label: "Contact",
  },
];

type DisclaimerSummaryCard = {
  title: string;
  description: string;
  icon:
    | "education"
    | "calculation"
    | "decision"
    | "professional";
};

const disclaimerSummaryCards:
  DisclaimerSummaryCard[] = [
    {
      title:
        "Educational tools",
      description:
        "CASE Budget helps organize and explain financial information but does not replace professional guidance.",
      icon:
        "education",
    },
    {
      title:
        "Estimated calculations",
      description:
        "Forecasts, balances, payoff dates, and projections depend on the information available to the platform.",
      icon:
        "calculation",
    },
    {
      title:
        "Your decisions",
      description:
        "You remain responsible for reviewing information and deciding how to manage your money.",
      icon:
        "decision",
    },
    {
      title:
        "Professional guidance",
      description:
        "Consult qualified financial, tax, legal, accounting, credit, insurance, or investment professionals when appropriate.",
      icon:
        "professional",
    },
  ];

export default function FinancialDisclaimerPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <LegalHeader />

      <section className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="max-w-4xl">
            <Link
              href="/legal"
              className="inline-flex items-center gap-2 rounded-lg text-sm font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <ArrowLeftIcon />

              Back to Legal Center
            </Link>

            <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
              Terms and usage
            </p>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
              Financial Disclaimer
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--text-muted)] sm:text-lg">
              This Financial Disclaimer
              explains important limitations
              regarding CASE Budget
              calculations, reports,
              projections, connected financial
              data, educational content, and
              financial-planning tools.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <PolicyBadge
                label="Current disclaimer"
                tone="success"
              />

              <PolicyBadge
                label={`Last updated ${LAST_UPDATED}`}
                tone="neutral"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8 lg:py-14">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <nav
            aria-label="Financial Disclaimer sections"
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4"
          >
            <p className="px-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              On this page
            </p>

            <div className="mt-3 max-h-[70vh] space-y-1 overflow-y-auto pr-1">
              {policySections.map(
                (
                  section,
                ) => (
                  <a
                    key={
                      section.href
                    }
                    href={
                      section.href
                    }
                    className="block rounded-lg px-2 py-2 text-sm font-medium text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  >
                    {
                      section.label
                    }
                  </a>
                ),
              )}
            </div>
          </nav>

          <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]">
              <WarningIcon />
            </div>

            <p className="mt-4 text-sm font-bold text-[var(--text-primary)]">
              Important limitation
            </p>

            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
              CASE Budget is a
              financial organization
              platform. It is not a
              substitute for advice from
              a qualified professional.
            </p>
          </div>
        </aside>

        <article className="min-w-0 space-y-8">
          <DisclaimerIntroduction />

          <PolicySection
            id="overview"
            number="1"
            title="Overview"
          >
            <p>
              CASE Budget is designed to help
              users organize financial
              information, build spending
              plans, review financial activity,
              track goals, and understand
              financial progress.
            </p>

            <p>
              The platform may calculate,
              summarize, categorize, estimate,
              project, or display information
              based on data entered by users,
              imported from connected services,
              or generated through automated
              tools.
            </p>

            <p>
              These features are provided for
              general informational,
              organizational, and educational
              purposes.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {disclaimerSummaryCards.map(
                (
                  card,
                ) => (
                  <DisclaimerSummaryCard
                    key={
                      card.title
                    }
                    card={
                      card
                    }
                  />
                ),
              )}
            </div>

            <PolicyNotice
              title="Review important information independently"
              description="Do not rely on CASE Budget as your only source for balances, due dates, tax records, legal obligations, investment decisions, or financial commitments."
              tone="warning"
            />
          </PolicySection>

          <PolicySection
            id="not-advice"
            number="2"
            title="CASE Budget does not provide professional advice"
          >
            <p>
              CASE Budget does not provide
              individualized professional
              advice and does not act as your
              fiduciary, financial adviser,
              investment adviser, broker,
              accountant, attorney, tax
              professional, credit counselor,
              insurance agent, lender, or bank.
            </p>

            <PolicyList
              items={[
                "Financial advice.",
                "Investment advice or investment recommendations.",
                "Tax advice or tax-return preparation.",
                "Legal advice.",
                "Accounting or auditing services.",
                "Credit-repair or credit-counseling services.",
                "Insurance recommendations.",
                "Banking, lending, brokerage, custody, or payment services.",
                "Debt-settlement or debt-relief services.",
                "Personalized retirement, estate, or benefits planning.",
              ]}
            />

            <p>
              General explanations, examples,
              educational content, automated
              insights, or planning suggestions
              should not be interpreted as
              professional advice tailored to
              your specific circumstances.
            </p>

            <PolicyNotice
              title="Seek qualified advice"
              description="Consult an appropriately licensed or qualified professional before making significant financial, legal, tax, credit, insurance, or investment decisions."
              tone="primary"
            />
          </PolicySection>

          <PolicySection
            id="financial-decisions"
            number="3"
            title="You remain responsible for your financial decisions"
          >
            <p>
              You are responsible for reviewing
              your financial information,
              evaluating your circumstances,
              and deciding whether to act on
              information displayed by CASE
              Budget.
            </p>

            <PolicyList
              items={[
                "Confirm balances and transactions with the relevant financial institution.",
                "Verify payment amounts and due dates directly with billers.",
                "Review tax obligations with a qualified tax professional.",
                "Review contracts and legal obligations with qualified legal counsel.",
                "Evaluate investments based on your own goals, risk tolerance, and professional guidance.",
                "Confirm debt balances, interest rates, fees, and payoff terms with creditors.",
                "Maintain independent copies of important financial and legal records.",
                "Consider emergency reserves, insurance needs, income stability, and other personal circumstances.",
              ]}
            />

            <p>
              XilAire Technologies is not
              responsible for decisions made
              solely or partly in reliance on
              CASE Budget information.
            </p>
          </PolicySection>

          <PolicySection
            id="accuracy"
            number="4"
            title="Accuracy, completeness, and timeliness"
          >
            <p>
              CASE Budget information may be
              incomplete, delayed, inaccurate,
              duplicated, miscategorized, or
              outdated.
            </p>

            <PolicyList
              items={[
                "Users may enter incorrect or incomplete information.",
                "Connected financial institutions may delay or omit transactions.",
                "Pending transactions may change before they clear.",
                "Merchants and financial institutions may provide inconsistent descriptions.",
                "Automatic categorization may be incorrect.",
                "Account balances may not include holds, pending transactions, accrued interest, fees, or recent activity.",
                "Recurring-payment estimates may differ from actual charges.",
                "Calculations may be affected by rounding, date assumptions, or missing records.",
                "Service interruptions may delay synchronization or reporting.",
              ]}
            />

            <PolicyNotice
              title="Financial institution records control"
              description="When CASE Budget information conflicts with records from a bank, lender, broker, biller, tax authority, or other official source, verify the information with that source."
              tone="warning"
            />
          </PolicySection>

          <PolicySection
            id="budgets"
            number="5"
            title="Budgets, forecasts, and projections"
          >
            <p>
              CASE Budget may provide monthly
              budgets, zero-based budget
              calculations, cash-flow
              projections, savings forecasts,
              debt-payoff estimates, net-worth
              projections, and other planning
              tools.
            </p>

            <p>
              These results depend on user
              assumptions and available data.
              Actual outcomes may differ
              materially.
            </p>

            <PolicyList
              items={[
                "Income may be lower, delayed, irregular, or unavailable.",
                "Expenses may be higher or occur earlier than expected.",
                "Interest rates, fees, taxes, insurance costs, and prices may change.",
                "Unexpected expenses may reduce available cash.",
                "Recurring transactions may change in amount or frequency.",
                "Investment returns may be negative or more volatile than projected.",
                "Debt balances and payoff terms may differ from entered values.",
                "Inflation and economic conditions may affect financial outcomes.",
              ]}
            />

            <PolicyNotice
              title="Projections are not guarantees"
              description="A projected savings balance, payoff date, investment value, or net-worth result is an estimate and does not guarantee that the result will occur."
              tone="danger"
            />
          </PolicySection>

          <PolicySection
            id="transactions"
            number="6"
            title="Transactions, accounts, and balances"
          >
            <p>
              Connected-account and
              transaction information may be
              provided by financial
              institutions or third-party data
              providers.
            </p>

            <PolicyList
              items={[
                "Imported information may be delayed.",
                "Pending transactions may be missing or shown differently.",
                "Duplicate transactions may appear.",
                "Refunds, reversals, disputes, holds, and adjustments may not appear immediately.",
                "Account balances may not reflect real-time available funds.",
                "Closed or disconnected accounts may continue displaying previously imported data.",
                "Institution outages may interrupt synchronization.",
                "Manual corrections may be required.",
              ]}
            />

            <p>
              CASE Budget should not be used as
              the sole source for determining
              whether sufficient funds are
              available for a payment,
              withdrawal, transfer, purchase, or
              other transaction.
            </p>
          </PolicySection>

          <PolicySection
            id="bills"
            number="7"
            title="Bills, reminders, and due dates"
          >
            <p>
              CASE Budget may provide bill
              schedules, reminders, overdue
              indicators, recurring-payment
              estimates, and calendar views.
            </p>

            <PolicyList
              items={[
                "Reminders may be delayed, blocked, disabled, or missed.",
                "A biller may change a due date without updating CASE Budget.",
                "Recurring amounts may change.",
                "A payment may fail even when marked as scheduled or paid.",
                "Imported payment information may be delayed.",
                "Time-zone, date, or notification settings may affect reminders.",
                "Email, push, browser, or device notifications may not be delivered.",
              ]}
            />

            <PolicyNotice
              title="Verify bills directly"
              description="You remain responsible for confirming payment amounts, due dates, account status, and successful payment directly with the biller or financial institution."
              tone="warning"
            />
          </PolicySection>

          <PolicySection
            id="debt"
            number="8"
            title="Debt payoff and borrowing tools"
          >
            <p>
              CASE Budget may provide debt
              balances, payoff plans,
              amortization estimates, interest
              calculations, snowball or
              avalanche comparisons, and
              projected payoff dates.
            </p>

            <PolicyList
              items={[
                "Payoff estimates may exclude fees, penalties, variable rates, accrued interest, or creditor-specific calculation rules.",
                "Additional borrowing or missed payments may change the payoff timeline.",
                "Creditors may apply payments differently than expected.",
                "Promotional rates may expire.",
                "Minimum payments may change.",
                "Loan contracts may contain terms not represented in CASE Budget.",
                "Early-payment penalties or other charges may apply.",
              ]}
            />

            <p>
              Contact the creditor for an
              official payoff amount and review
              loan documents before making a
              final payment or refinancing
              decision.
            </p>
          </PolicySection>

          <PolicySection
            id="investments"
            number="9"
            title="Investments and market information"
          >
            <p>
              CASE Budget may allow users to
              track investments, account values,
              contributions, returns, or other
              market-related information.
            </p>

            <PolicyList
              items={[
                "CASE Budget does not recommend securities or investment strategies.",
                "Displayed market values may be delayed or estimated.",
                "Past performance does not guarantee future results.",
                "Investments may lose value, including the entire amount invested.",
                "Tax consequences may vary by account type and transaction.",
                "Asset allocation, diversification, and risk tolerance require individual consideration.",
                "Investment information may not include all fees, dividends, corporate actions, or tax lots.",
              ]}
            />

            <PolicyNotice
              title="No investment recommendation"
              description="Nothing in CASE Budget should be interpreted as a recommendation to buy, sell, hold, or avoid any security, cryptocurrency, fund, option, or other investment."
              tone="danger"
            />
          </PolicySection>

          <PolicySection
            id="taxes"
            number="10"
            title="Tax information"
          >
            <p>
              CASE Budget may organize income,
              expenses, transactions, account
              activity, and reports that could
              be relevant to tax preparation.
            </p>

            <p>
              CASE Budget does not determine
              whether an item is deductible,
              taxable, reportable, depreciable,
              eligible for a credit, or subject
              to a particular tax rule.
            </p>

            <PolicyList
              items={[
                "Tax rules vary by jurisdiction and personal circumstances.",
                "Categories used for budgeting may not match tax classifications.",
                "Imported records may not include all tax-relevant details.",
                "Tax forms and official records may differ from CASE Budget reports.",
                "Business and personal expenses may require separate treatment.",
                "Tax deadlines and requirements may change.",
              ]}
            />

            <PolicyNotice
              title="Do not file taxes solely from CASE Budget reports"
              description="Verify tax information using official records and consult a qualified tax professional when appropriate."
              tone="warning"
            />
          </PolicySection>

          <PolicySection
            id="credit"
            number="11"
            title="Credit scores, credit reports, and lending"
          >
            <p>
              CASE Budget may display debt,
              payment, utilization, or other
              information related to credit
              planning.
            </p>

            <p>
              CASE Budget does not guarantee
              that any action will improve a
              credit score, result in loan
              approval, reduce an interest rate,
              or change information held by a
              credit bureau.
            </p>

            <PolicyList
              items={[
                "Credit scoring models differ.",
                "Lenders use different underwriting standards.",
                "Credit reports may contain errors.",
                "Payment activity may be reported at different times.",
                "Closing or opening accounts may have unexpected effects.",
                "Debt repayment does not guarantee immediate score improvement.",
                "Loan approval depends on factors outside CASE Budget.",
              ]}
            />
          </PolicySection>

          <PolicySection
            id="ai"
            number="12"
            title="Artificial intelligence and automated features"
          >
            <p>
              CASE Budget may use artificial
              intelligence or automated systems
              to categorize transactions,
              summarize financial activity,
              explain patterns, suggest budget
              adjustments, or generate
              educational information.
            </p>

            <PolicyList
              items={[
                "AI-generated outputs may be incorrect, incomplete, outdated, or misleading.",
                "AI tools may misunderstand transaction descriptions or financial context.",
                "Suggested categories or actions may not be appropriate for your situation.",
                "AI responses do not constitute professional advice.",
                "Sensitive decisions require human review.",
                "You should verify generated calculations and explanations.",
                "AI output should not be used as the sole basis for financial, employment, lending, tax, insurance, or legal decisions.",
              ]}
            />

            <PolicyNotice
              title="Human review is required"
              description="Review and validate AI-generated information before applying it to a budget, transaction, report, financial plan, or important decision."
              tone="primary"
            />
          </PolicySection>

          <PolicySection
            id="third-parties"
            number="13"
            title="Third-party services and information"
          >
            <p>
              CASE Budget may depend on
              third-party providers for
              authentication, banking
              connectivity, payments, market
              data, email, analytics,
              infrastructure, and other
              services.
            </p>

            <PolicyList
              items={[
                "Third-party services may be unavailable or delayed.",
                "Providers may change or discontinue features.",
                "Financial institutions may block or restrict connections.",
                "Third-party data may be inaccurate.",
                "External services may have separate terms and privacy policies.",
                "XilAire Technologies does not control every third-party action or decision.",
                "A provider outage may affect CASE Budget functionality.",
              ]}
            />

            <p>
              References or links to third-party
              services do not constitute an
              endorsement or guarantee.
            </p>
          </PolicySection>

          <PolicySection
            id="no-guarantees"
            number="14"
            title="No guarantee of financial outcomes"
          >
            <p>
              XilAire Technologies does not
              guarantee that using CASE Budget
              will produce any particular
              financial result.
            </p>

            <PolicyList
              items={[
                "Increased savings.",
                "Reduced spending.",
                "Debt repayment.",
                "Improved credit.",
                "Investment gains.",
                "Loan approval.",
                "Reduced taxes.",
                "Improved cash flow.",
                "Successful retirement planning.",
                "Increased net worth.",
                "Avoidance of fees, penalties, or missed payments.",
              ]}
            />

            <p>
              Financial results depend on user
              actions, income, expenses, market
              conditions, interest rates,
              creditors, financial institutions,
              laws, taxes, and many other factors
              outside XilAire Technologies&apos;
              control.
            </p>
          </PolicySection>

          <PolicySection
            id="emergencies"
            number="15"
            title="Financial emergencies and urgent situations"
          >
            <p>
              CASE Budget is not an emergency
              financial service and should not
              be relied upon for urgent payment,
              fraud, banking, legal, tax, or
              investment assistance.
            </p>

            <PolicyList
              items={[
                "Contact your bank immediately for suspected fraud or unauthorized transactions.",
                "Contact the biller or creditor for urgent payment or collections issues.",
                "Contact emergency services when personal safety is at risk.",
                "Contact qualified legal counsel for urgent legal deadlines.",
                "Contact a tax professional or tax authority for urgent tax matters.",
                "Contact your broker or investment provider for urgent market or account issues.",
                "Contact the relevant government agency for benefits, identity theft, or regulatory assistance.",
              ]}
            />

            <PolicyNotice
              title="Do not wait for CASE Budget support"
              description="Customer support response times may not be appropriate for emergencies, imminent deadlines, account fraud, foreclosure, eviction, utility shutoff, or other urgent matters."
              tone="danger"
            />
          </PolicySection>

          <PolicySection
            id="changes"
            number="16"
            title="Changes to this disclaimer"
          >
            <p>
              XilAire Technologies may update
              this Financial Disclaimer as CASE
              Budget features, integrations,
              automated tools, regulations, or
              business practices change.
            </p>

            <p>
              Updated versions will display a
              new last-updated date. Material
              changes may also be communicated
              through CASE Budget, email, or
              another appropriate method.
            </p>
          </PolicySection>

          <PolicySection
            id="contact"
            number="17"
            title="Contact us"
          >
            <p>
              Questions regarding this
              Financial Disclaimer may be
              directed to XilAire Technologies.
            </p>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
                  <EmailIcon />
                </div>

                <div className="min-w-0">
                  <p className="font-bold text-[var(--text-primary)]">
                    XilAire Technologies
                  </p>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Legal and Compliance
                  </p>

                  <a
                    href="mailto:legal@xilairetechnologies.com"
                    className="mt-3 inline-flex break-all font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  >
                    legal@xilairetechnologies.com
                  </a>
                </div>
              </div>
            </div>
          </PolicySection>

          <DocumentNavigation />
        </article>
      </div>

      <LegalFooter />
    </main>
  );
}

function DisclaimerIntroduction() {
  return (
    <section className="rounded-2xl border border-[color-mix(in_srgb,var(--warning)_24%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--warning)_7%,var(--surface-default))] p-5 sm:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]">
          <WarningIcon />
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Financial tools require
            your review
          </h2>

          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            CASE Budget can help you
            organize financial information
            and understand possible
            outcomes. It cannot know every
            detail of your finances or
            guarantee that its calculations,
            projections, classifications,
            or suggestions are correct.
          </p>
        </div>
      </div>
    </section>
  );
}

type PolicySectionProps = {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
};

function PolicySection({
  id,
  number,
  title,
  children,
}: PolicySectionProps) {
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 sm:p-7"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-sm font-black text-[var(--primary)]">
          {number}
        </span>

        <h2 className="pt-1 text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">
          {title}
        </h2>
      </div>

      <div className="mt-5 space-y-5 text-sm leading-7 text-[var(--text-muted)]">
        {children}
      </div>
    </section>
  );
}

type PolicyListProps = {
  items: string[];
};

function PolicyList({
  items,
}: PolicyListProps) {
  return (
    <ul className="space-y-3">
      {items.map(
        (
          item,
        ) => (
          <li
            key={item}
            className="flex items-start gap-3"
          >
            <span
              aria-hidden="true"
              className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]"
            />

            <span>
              {item}
            </span>
          </li>
        ),
      )}
    </ul>
  );
}

type DisclaimerSummaryCardProps = {
  card: DisclaimerSummaryCard;
};

function DisclaimerSummaryCard({
  card,
}: DisclaimerSummaryCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <DisclaimerSummaryIcon
          icon={
            card.icon
          }
        />
      </div>

      <p className="mt-4 text-sm font-bold text-[var(--text-primary)]">
        {card.title}
      </p>

      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
        {card.description}
      </p>
    </div>
  );
}

type PolicyNoticeProps = {
  title: string;
  description: string;
  tone:
    | "primary"
    | "warning"
    | "danger";
};

function PolicyNotice({
  title,
  description,
  tone,
}: PolicyNoticeProps) {
  return (
    <div
      className={[
        "rounded-xl border p-4",
        tone ===
        "danger"
          ? "border-[color-mix(in_srgb,var(--danger)_24%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--danger)_6%,var(--surface-muted))]"
          : tone ===
              "warning"
            ? "border-[color-mix(in_srgb,var(--warning)_24%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--warning)_7%,var(--surface-muted))]"
            : "border-[color-mix(in_srgb,var(--primary)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--primary)_6%,var(--surface-muted))]",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            tone ===
            "danger"
              ? "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
              : tone ===
                  "warning"
                ? "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
                : "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]",
          ].join(" ")}
        >
          {tone ===
          "danger" ? (
            <AlertIcon />
          ) : tone ===
              "warning" ? (
            <WarningIcon />
          ) : (
            <InformationIcon />
          )}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

type PolicyBadgeProps = {
  label: string;
  tone:
    | "success"
    | "neutral";
};

function PolicyBadge({
  label,
  tone,
}: PolicyBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold",
        tone ===
        "success"
          ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
          : "border border-[var(--border-subtle)] bg-[var(--surface-default)] text-[var(--text-muted)]",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "h-1.5 w-1.5 rounded-full",
          tone ===
          "success"
            ? "bg-[var(--success)]"
            : "bg-[var(--text-muted)]",
        ].join(" ")}
      />

      {label}
    </span>
  );
}

function DocumentNavigation() {
  return (
    <nav
      aria-label="Legal document navigation"
      className="grid gap-4 sm:grid-cols-2"
    >
      <Link
        href="/legal/acceptable-use"
        className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 outline-none transition hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Previous
        </p>

        <div className="mt-3 flex items-center gap-2 font-bold text-[var(--text-primary)]">
          <ArrowLeftIcon />

          Acceptable Use
        </div>
      </Link>

      <Link
        href="/legal/licenses"
        className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 text-right outline-none transition hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Next
        </p>

        <div className="mt-3 flex items-center justify-end gap-2 font-bold text-[var(--text-primary)]">
          Open Source Licenses

          <ArrowRightIcon />
        </div>
      </Link>
    </nav>
  );
}

function LegalHeader() {
  return (
    <header className="border-b border-[var(--border-subtle)] bg-[var(--surface-default)]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <BrandMark />

        <nav
          aria-label="Financial Disclaimer navigation"
          className="flex items-center gap-2"
        >
          <Link
            href="/legal"
            className="hidden min-h-10 items-center justify-center rounded-xl px-4 text-sm font-bold text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:inline-flex"
          >
            Legal Center
          </Link>

          <Link
            href="/sign-in"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

function LegalFooter() {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-default)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-7 text-sm text-[var(--text-muted)] sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p>
          © 2026 XilAire Technologies.
          All rights reserved.
        </p>

        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
        >
          <Link
            href="/legal"
            className="outline-none transition hover:text-[var(--text-primary)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Legal Center
          </Link>

          <Link
            href="/legal/privacy"
            className="outline-none transition hover:text-[var(--text-primary)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Privacy
          </Link>

          <Link
            href="/legal/terms"
            className="outline-none transition hover:text-[var(--text-primary)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Terms
          </Link>

          <Link
            href="/legal/security"
            className="outline-none transition hover:text-[var(--text-primary)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Security
          </Link>

          <Link
            href="/support"
            className="outline-none transition hover:text-[var(--text-primary)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Support
          </Link>
        </nav>
      </div>
    </footer>
  );
}

function BrandMark() {
  return (
    <Link
      href="/"
      aria-label="CASE Budget home"
      className="inline-flex items-center gap-3 rounded-xl text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-black text-white">
        CB
      </span>

      <span>
        <span className="block text-lg font-black tracking-tight">
          CASE Budget
        </span>

        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
          XilAire Technologies
        </span>
      </span>
    </Link>
  );
}

type DisclaimerSummaryIconProps = {
  icon:
    DisclaimerSummaryCard["icon"];
};

function DisclaimerSummaryIcon({
  icon,
}: DisclaimerSummaryIconProps) {
  switch (icon) {
    case "calculation":
      return (
        <CalculatorIcon />
      );

    case "decision":
      return (
        <DecisionIcon />
      );

    case "professional":
      return (
        <ProfessionalIcon />
      );

    case "education":
    default:
      return (
        <EducationIcon />
      );
  }
}

function EducationIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 10 9-5 9 5-9 5Z" />
      <path d="M7 12v5c3 2 7 2 10 0v-5" />
    </svg>
  );
}

function CalculatorIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="3"
        width="14"
        height="18"
        rx="2"
      />

      <path d="M8 7h8" />
      <path d="M8 11h.01" />
      <path d="M12 11h.01" />
      <path d="M16 11h.01" />
      <path d="M8 15h.01" />
      <path d="M12 15h.01" />
      <path d="M16 15h.01" />
      <path d="M8 19h.01" />
      <path d="M12 19h4" />
    </svg>
  );
}

function DecisionIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v18" />
      <path d="m5 10 7-7 7 7" />
      <path d="m5 14 7 7 7-7" />
    </svg>
  );
}

function ProfessionalIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="4"
      />

      <path d="M4 21a8 8 0 0 1 16 0" />
      <path d="m9 16 3 3 3-3" />
    </svg>
  );
}

function InformationIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3 9 16H3Z" />
      <path d="M12 9v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />

      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
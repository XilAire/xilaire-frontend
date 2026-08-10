import Card, {
  CardContent,
} from "@/components/ui/card/Card";

export type BudgetSummaryCardsProps = {
  plannedIncome: number;
  assignedAmount: number;
  remainingAmount: number;
  spentAmount: number;
};

type SummaryCardTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

type SummaryCardProps = {
  title: string;
  value: string;
  subtitle: string;
  tone: SummaryCardTone;
  icon: SummaryCardIcon;
};

type SummaryCardIcon =
  | "income"
  | "assigned"
  | "remaining"
  | "spent";

const currencyFormatter = new Intl.NumberFormat(
  "en-US",
  {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
);

function joinClassNames(
  ...classNames: Array<
    string | false | null | undefined
  >
) {
  return classNames
    .filter(Boolean)
    .join(" ");
}

function getRemainingCard(
  remainingAmount: number,
): Pick<
  SummaryCardProps,
  "subtitle" | "tone"
> {
  if (remainingAmount < 0) {
    return {
      subtitle: "Over budget",
      tone: "danger",
    };
  }

  if (remainingAmount === 0) {
    return {
      subtitle: "Every dollar assigned",
      tone: "success",
    };
  }

  return {
    subtitle: "Left to budget",
    tone: "warning",
  };
}

function getToneClasses(
  tone: SummaryCardTone,
) {
  switch (tone) {
    case "success":
      return {
        value:
          "text-[var(--success)]",
        iconBackground:
          "bg-[color-mix(in_srgb,var(--success)_12%,transparent)]",
        iconColor:
          "text-[var(--success)]",
        badgeBackground:
          "bg-[color-mix(in_srgb,var(--success)_12%,transparent)]",
        badgeColor:
          "text-[var(--success)]",
      };

    case "warning":
      return {
        value:
          "text-[var(--warning)]",
        iconBackground:
          "bg-[color-mix(in_srgb,var(--warning)_12%,transparent)]",
        iconColor:
          "text-[var(--warning)]",
        badgeBackground:
          "bg-[color-mix(in_srgb,var(--warning)_12%,transparent)]",
        badgeColor:
          "text-[var(--warning)]",
      };

    case "danger":
      return {
        value:
          "text-[var(--danger)]",
        iconBackground:
          "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]",
        iconColor:
          "text-[var(--danger)]",
        badgeBackground:
          "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]",
        badgeColor:
          "text-[var(--danger)]",
      };

    case "info":
      return {
        value:
          "text-[var(--info)]",
        iconBackground:
          "bg-[color-mix(in_srgb,var(--info)_12%,transparent)]",
        iconColor:
          "text-[var(--info)]",
        badgeBackground:
          "bg-[color-mix(in_srgb,var(--info)_12%,transparent)]",
        badgeColor:
          "text-[var(--info)]",
      };

    case "primary":
    default:
      return {
        value:
          "text-[var(--primary)]",
        iconBackground:
          "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]",
        iconColor:
          "text-[var(--primary)]",
        badgeBackground:
          "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]",
        badgeColor:
          "text-[var(--primary)]",
      };
  }
}

export default function BudgetSummaryCards({
  plannedIncome,
  assignedAmount,
  remainingAmount,
  spentAmount,
}: BudgetSummaryCardsProps) {
  const remainingCard =
    getRemainingCard(
      remainingAmount,
    );

  return (
    <section
      aria-label="Budget summary"
      className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4"
    >
      <SummaryCard
        title="Income"
        value={currencyFormatter.format(
          plannedIncome,
        )}
        subtitle="Planned this month"
        tone="success"
        icon="income"
      />

      <SummaryCard
        title="Assigned"
        value={currencyFormatter.format(
          assignedAmount,
        )}
        subtitle="Assigned to categories"
        tone="primary"
        icon="assigned"
      />

      <SummaryCard
        title="Remaining"
        value={currencyFormatter.format(
          remainingAmount,
        )}
        subtitle={
          remainingCard.subtitle
        }
        tone={
          remainingCard.tone
        }
        icon="remaining"
      />

      <SummaryCard
        title="Spent"
        value={currencyFormatter.format(
          spentAmount,
        )}
        subtitle="Spent this month"
        tone="info"
        icon="spent"
      />
    </section>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  tone,
  icon,
}: SummaryCardProps) {
  const toneClasses =
    getToneClasses(tone);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex min-h-[150px] items-center justify-between gap-5 p-5 sm:p-6">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {title}
            </p>

            <p
              className={joinClassNames(
                "mt-3",
                "truncate",
                "text-2xl",
                "font-bold",
                "tracking-tight",
                "sm:text-[1.75rem]",
                toneClasses.value,
              )}
              title={value}
            >
              {value}
            </p>

            <span
              className={joinClassNames(
                "mt-4",
                "inline-flex",
                "max-w-full",
                "items-center",
                "rounded-full",
                "px-3",
                "py-1.5",
                "text-xs",
                "font-semibold",
                toneClasses.badgeBackground,
                toneClasses.badgeColor,
              )}
            >
              <span className="truncate">
                {subtitle}
              </span>
            </span>
          </div>

          <div
            className={joinClassNames(
              "flex",
              "h-12",
              "w-12",
              "shrink-0",
              "items-center",
              "justify-center",
              "rounded-2xl",
              toneClasses.iconBackground,
              toneClasses.iconColor,
            )}
          >
            <SummaryIcon
              icon={icon}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryIcon({
  icon,
}: {
  icon: SummaryCardIcon;
}) {
  switch (icon) {
    case "income":
      return <IncomeIcon />;

    case "assigned":
      return <AssignedIcon />;

    case "remaining":
      return <RemainingIcon />;

    case "spent":
      return <SpentIcon />;
  }
}

function IncomeIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v18" />
      <path d="m17 8-5-5-5 5" />
      <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
    </svg>
  );
}

function AssignedIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
      <circle
        cx="8"
        cy="7"
        r="1.5"
      />
      <circle
        cx="15"
        cy="12"
        r="1.5"
      />
      <circle
        cx="11"
        cy="17"
        r="1.5"
      />
    </svg>
  );
}

function RemainingIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function SpentIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21V3" />
      <path d="m7 16 5 5 5-5" />
      <path d="M5 11V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5" />
    </svg>
  );
}
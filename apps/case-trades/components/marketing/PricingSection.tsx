import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  LineChart,
  ShieldCheck,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";

type ProductFamily = "signals" | "journal";

type Product = {
  name: string;
  price: string;
  period: string;
  description: string;
  href: string;
  cta: string;
  icon: LucideIcon;
  highlighted: boolean;
  productId: string;
  priceId: string;
  discordRoleId: string;
  productFamily: ProductFamily;
  features: string[];
};

const products: Product[] = [
  {
    name: "CASE Signals Weekly",
    price: "$29.99",
    period: "/week",
    description:
      "Weekly access to CASE trade signals, Discord signal role access, and signal board tracking.",
    href: "/auth/signup?plan=signals_weekly",
    cta: "Start Weekly Signals",
    icon: Activity,
    highlighted: false,
    productId: "prod_UipsTUCAFTBTcy",
    priceId: "price_1TjOCeCaixGKpzy1j814mTa7",
    discordRoleId: "1517293772856103082",
    productFamily: "signals",
    features: [
      "CASE Signals Discord access",
      "Options-first trade alerts",
      "Entry price, strike, and expiration",
      "Confidence scoring",
      "Signal board and watch tracking",
    ],
  },
  {
    name: "CASE Signals Monthly",
    price: "$99.99",
    period: "/month",
    description:
      "Monthly access to CASE trade signals with better value for active traders.",
    href: "/auth/signup?plan=signals_monthly",
    cta: "Start Monthly Signals",
    icon: Target,
    highlighted: true,
    productId: "prod_UjGBXMgkbJMiyK",
    priceId: "price_1TjnfYCaixGKpzy1pkKoidt8",
    discordRoleId: "1517291223000416306",
    productFamily: "signals",
    features: [
      "CASE Signals Discord access",
      "Monthly signal access",
      "Options-first trade alerts",
      "Stop-loss and take-profit guidance",
      "Best value for signal subscribers",
    ],
  },
  {
    name: "CASE Journal Starter",
    price: "$19.99",
    period: "/month",
    description:
      "Starter trading journal access for tracking trades, notes, and basic performance history.",
    href: "/auth/signup?plan=journal_starter",
    cta: "Start Journal Starter",
    icon: BookOpen,
    highlighted: false,
    productId: "prod_UjGG3hiBl2rRv6",
    priceId: "price_1TjnjnCaixGKpzy17OO3Y9bx",
    discordRoleId: "1517291803525513216",
    productFamily: "journal",
    features: [
      "Trade journal entries",
      "Basic P/L tracking",
      "Strategy notes",
      "Win/loss review",
      "Starter journal workflow",
    ],
  },
  {
    name: "CASE Journal Pro",
    price: "$49.99",
    period: "/month",
    description:
      "Advanced journaling for traders who want deeper review, discipline tracking, and performance insights.",
    href: "/auth/signup?plan=journal_pro",
    cta: "Start Journal Pro",
    icon: LineChart,
    highlighted: true,
    productId: "prod_UjGKHnTfaQKO0I",
    priceId: "price_1TjnnzCaixGKpzy1kDe2wiCR",
    discordRoleId: "1517292690725666936",
    productFamily: "journal",
    features: [
      "Everything in Journal Starter",
      "Advanced trade review",
      "Performance history",
      "Trading discipline notes",
      "Pro journal workflow",
    ],
  },
  {
    name: "CASE Journal Elite",
    price: "$99.99",
    period: "/month",
    description:
      "Elite journaling for serious traders who want full performance review and premium journal access.",
    href: "/auth/signup?plan=journal_elite",
    cta: "Start Journal Elite",
    icon: Sparkles,
    highlighted: false,
    productId: "prod_UjGOzkYOQKk2wY",
    priceId: "price_1TjnrvCaixGKpzy1SNYhuooh",
    discordRoleId: "1517293224287277147",
    productFamily: "journal",
    features: [
      "Everything in Journal Pro",
      "Elite journal access",
      "Full performance review",
      "Premium trade tracking",
      "Best for serious traders",
    ],
  },
];

const signalProducts = products.filter(
  (product) => product.productFamily === "signals"
);

const journalProducts = products.filter(
  (product) => product.productFamily === "journal"
);

export default function PricingSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          <ShieldCheck className="h-4 w-4" />
          CASE Trades Pricing
        </div>

        <h2 className="text-4xl font-bold tracking-tight md:text-6xl">
          Choose your trading edge.
        </h2>

        <p className="mt-6 text-lg text-slate-400">
          Subscribe to CASE Signals, build discipline with CASE Journal, or
          upgrade into a stronger trading workflow over time.
        </p>
      </div>

      <ProductFamilySection
        badgeIcon={<Activity className="h-4 w-4" />}
        badgeLabel="Signal Subscriptions"
        title="CASE Signals"
        description="Professional trade signals delivered through the CASE platform and Discord role-based access."
        products={signalProducts}
        gridClassName="lg:grid-cols-2"
      />

      <div className="my-16 border-t border-white/10" />

      <ProductFamilySection
        badgeIcon={<BookOpen className="h-4 w-4" />}
        badgeLabel="Journal Subscriptions"
        title="CASE Journal"
        description="Track trades, review execution, measure discipline, and improve your trading process over time."
        products={journalProducts}
        gridClassName="lg:grid-cols-3"
      />

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        <FeatureCard
          icon={<Target />}
          title="Signals with context"
          description="Each signal includes key trade details needed to quickly evaluate the setup."
        />

        <FeatureCard
          icon={<LineChart />}
          title="Execution awareness"
          description="Track signal status, watch trades, and review what happened after the alert."
        />

        <FeatureCard
          icon={<BarChart3 />}
          title="Performance review"
          description="Use the journal to understand your trade behavior and improve your decision-making."
        />
      </div>

      <div className="mt-16 rounded-2xl border border-white/10 bg-slate-900/80 p-8 text-center">
        <h2 className="text-2xl font-semibold">
          Built for disciplined traders.
        </h2>

        <p className="mx-auto mt-3 max-w-2xl text-slate-400">
          CASE Trades helps you organize signals, track execution, journal
          decisions, and review performance in one place.
        </p>

        <div className="mt-6">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Create Account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ProductFamilySection({
  badgeIcon,
  badgeLabel,
  title,
  description,
  products,
  gridClassName,
}: {
  badgeIcon: ReactNode;
  badgeLabel: string;
  title: string;
  description: string;
  products: Product[];
  gridClassName: string;
}) {
  return (
    <div className="mt-16">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm text-slate-300">
          {badgeIcon}
          {badgeLabel}
        </div>

        <h3 className="text-3xl font-bold text-slate-100 md:text-4xl">
          {title}
        </h3>

        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          {description}
        </p>
      </div>

      <div className={`grid gap-6 ${gridClassName}`}>
        {products.map((product) => (
          <ProductCard key={product.name} product={product} />
        ))}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const Icon = product.icon;

  return (
    <div
      className={
        "relative rounded-2xl border p-6 shadow-2xl " +
        (product.highlighted
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-white/10 bg-slate-900/80")
      }
    >
      {product.highlighted && (
        <div className="absolute right-5 top-5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
          Best Value
        </div>
      )}

      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-emerald-400">
        <Icon className="h-6 w-6" />
      </div>

      <h4 className="text-2xl font-semibold">{product.name}</h4>

      <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-400">
        {product.description}
      </p>

      <div className="mt-6 flex items-end gap-1">
        <span className="text-4xl font-bold">{product.price}</span>
        <span className="pb-1 text-slate-400">{product.period}</span>
      </div>

      <Link
        href={product.href}
        className={
          "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition " +
          (product.highlighted
            ? "bg-emerald-600 text-white hover:bg-emerald-500"
            : "border border-white/10 bg-slate-950 text-slate-200 hover:bg-slate-800")
        }
      >
        {product.cta}
        <ArrowRight className="h-4 w-4" />
      </Link>

      <div className="mt-6 space-y-3">
        {product.features.map((feature) => (
          <div key={feature} className="flex gap-3 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span className="text-slate-300">{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
      <div className="mb-4 text-emerald-400 [&>svg]:h-6 [&>svg]:w-6">
        {icon}
      </div>

      <h3 className="text-lg font-semibold text-slate-100">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}
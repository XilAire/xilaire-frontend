import PricingSection from "@/components/marketing/PricingSection";

export const metadata = {
  title: "Pricing | CASE Trades",
  description:
    "Choose a CASE Trades plan for trading signals, journaling, or both.",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <PricingSection />
    </main>
  );
}
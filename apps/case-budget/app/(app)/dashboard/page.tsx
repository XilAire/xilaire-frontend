import type {
  Metadata,
} from "next";

import DashboardOverview from "@/components/dashboard/DashboardOverview";
import PageContainer from "@/components/layout/PageContainer";
import TopBar from "@/components/layout/TopBar";

export const metadata: Metadata = {
  title:
    "Dashboard | CASE Budget",
  description:
    "View your complete CASE Budget financial overview, including budgets, bills, savings, debt, and net worth.",
};

export default function DashboardPage() {
  return (
    <>
      <div className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--topbar-background)] backdrop-blur-xl transition-colors duration-200">
        <TopBar
          title="Dashboard"
          description="Your complete financial picture"
          workspaceName="St. Hilaire Household"
          showSearch
          showNotifications
          showQuickAdd={false}
        />
      </div>

      <PageContainer
        width="xl"
        spacing="md"
      >
        <DashboardOverview
          userName="Calix"
          workspaceName="St. Hilaire Household"
        />
      </PageContainer>
    </>
  );
}
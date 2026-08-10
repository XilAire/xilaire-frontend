import TopBar from "@/components/layout/TopBar";
import WorkspaceSettingsOverview from "@/components/settings/WorkspaceSettingsOverview";

export default function SettingsWorkspacePage() {
  return (
    <>
      <TopBar
        title="Workspace Settings"
        description="Manage the currently selected CASE Budget workspace."
        showQuickAdd={false}
      />

      <WorkspaceSettingsOverview />
    </>
  );
}
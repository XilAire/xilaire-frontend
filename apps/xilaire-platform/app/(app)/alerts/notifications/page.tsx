// apps/xilaire-platform/app/(app)/alerts/notifications/page.tsx

import NotificationAuditTable from "@/components/alerts/NotificationAuditTable";
import { getNotificationAudit } from "@/lib/alerts";

export const dynamic = "force-dynamic";

export default async function NotificationAuditPage() {
  const rows = await getNotificationAudit();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">
        Notification Audit
      </h1>

      <NotificationAuditTable rows={rows} />
    </div>
  );
}

import { PageHeader } from "@/components/layout/page-header";
import { NotificationsView } from "@/components/notifications/notifications-view";
import { requireAdmin } from "@/server/guards";
import { listNotifications } from "@/server/services/notification.service";

export const metadata = { title: "Njoftimet e mia — DormMate" };

export default async function AdminNotificationsPage() {
  const admin = await requireAdmin();
  const items = await listNotifications(admin.id);

  return (
    <>
      <PageHeader
        title="Njoftimet e mia"
        description="Kërkesat e reja dhe aktiviteti i konviktit që administroni."
      />
      <NotificationsView items={items} />
    </>
  );
}

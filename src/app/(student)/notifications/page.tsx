import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { NotificationsView } from "@/components/notifications/notifications-view";
import { getCurrentUser } from "@/server/guards";
import { listNotifications } from "@/server/services/notification.service";

export const metadata = { title: "Njoftimet e mia — DormMate" };

export default async function StudentNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const items = await listNotifications(user.id);

  return (
    <>
      <PageHeader
        title="Njoftimet e mia"
        description="Ndryshimet e statusit, përgjigjet e administratës dhe njoftimet e reja."
      />
      <NotificationsView items={items} />
    </>
  );
}

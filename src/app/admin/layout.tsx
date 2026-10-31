import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { Role } from "@/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/constants";
import { fullName, initials } from "@/lib/utils";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/guards";
import { getUnreadCount } from "@/server/services/notification.service";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  // EF-04 — a student must never reach an administrative screen.
  if (user.role !== Role.ADMIN) redirect("/dashboard");

  const [unreadCount, dormitory] = await Promise.all([
    getUnreadCount(user.id),
    user.dormitoryId
      ? prisma.dormitory.findUnique({
          where: { id: user.dormitoryId },
          select: { name: true },
        })
      : null,
  ]);

  return (
    <AppShell
      variant="admin"
      unreadCount={unreadCount}
      notificationsHref="/admin/notifications"
      user={{
        name: fullName(user),
        initials: initials(user),
        roleLabel: ROLE_LABELS[user.role],
        dormitoryName: dormitory?.name ?? null,
        roomLabel: null,
      }}
    >
      {children}
    </AppShell>
  );
}

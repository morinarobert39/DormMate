import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { Role } from "@/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/constants";
import { fullName, initials } from "@/lib/utils";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/guards";
import { getUnreadCount } from "@/server/services/notification.service";

export default async function StudentLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  // An administrator landing on a student route is sent to their own dashboard rather than
  // shown a student shell (UI Architecture §8 — navigation never exposes another role's screens).
  if (user.role !== Role.STUDENT) redirect("/admin");

  const [unreadCount, dormitory, room] = await Promise.all([
    getUnreadCount(user.id),
    user.dormitoryId
      ? prisma.dormitory.findUnique({
          where: { id: user.dormitoryId },
          select: { name: true },
        })
      : null,
    user.roomId
      ? prisma.location.findUnique({ where: { id: user.roomId }, select: { label: true } })
      : null,
  ]);

  return (
    <AppShell
      variant="student"
      unreadCount={unreadCount}
      notificationsHref="/notifications"
      user={{
        name: fullName(user),
        initials: initials(user),
        roleLabel: ROLE_LABELS[user.role],
        dormitoryName: dormitory?.name ?? null,
        roomLabel: room ? `Dhoma ${room.label}` : null,
      }}
    >
      {children}
    </AppShell>
  );
}

import { NotificationType, type RequestStatus } from "@/generated/prisma/enums";
import { STATUS_LABELS, formatRequestCode } from "@/lib/constants";
import { prisma } from "@/server/db";

/**
 * Business Analysis §10.4 / BR-09 — the system generates a notification automatically whenever a
 * request is created, a status changes, the administration answers, or an announcement is
 * published. Nothing else writes to the notifications table.
 */

export function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function listNotifications(userId: string, limit = 50) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function listRecentNotifications(userId: string, limit = 5) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** Marking read is scoped by userId so one user can never clear another's notifications. */
export async function markAsRead(userId: string, notificationId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

/** A new maintenance request has arrived — tell the administrator it was assigned to. */
export async function notifyRequestCreated(params: {
  adminId: string;
  requestNumber: number;
  type: "MAINTENANCE" | "ADMINISTRATIVE";
  title: string;
  studentName: string;
}) {
  const code = formatRequestCode(params.type, params.requestNumber);
  const href =
    params.type === "MAINTENANCE"
      ? `/admin/maintenance/${params.requestNumber}`
      : `/admin/administrative/${params.requestNumber}`;

  await prisma.notification.create({
    data: {
      userId: params.adminId,
      type: NotificationType.REQUEST_CREATED,
      title: `Kërkesë e re ${code}`,
      message: `${params.studentName}: ${params.title}`,
      link: href,
    },
  });
}

/** BR-09 — every status change notifies the student who filed the request. */
export async function notifyStatusChange(params: {
  studentId: string;
  requestNumber: number;
  type: "MAINTENANCE" | "ADMINISTRATIVE";
  status: RequestStatus;
}) {
  const code = formatRequestCode(params.type, params.requestNumber);
  const href =
    params.type === "MAINTENANCE"
      ? `/maintenance/${params.requestNumber}`
      : `/administrative/${params.requestNumber}`;

  await prisma.notification.create({
    data: {
      userId: params.studentId,
      type: NotificationType.STATUS_CHANGED,
      title: `Kërkesa ${code} — ${STATUS_LABELS[params.status]}`,
      message: `Statusi i kërkesës suaj u ndryshua në "${STATUS_LABELS[params.status]}".`,
      link: href,
    },
  });
}

/** The administration wrote an answer on an administrative request (§10.3). */
export async function notifyAdminResponse(params: {
  studentId: string;
  requestNumber: number;
}) {
  const code = formatRequestCode("ADMINISTRATIVE", params.requestNumber);

  await prisma.notification.create({
    data: {
      userId: params.studentId,
      type: NotificationType.ADMIN_RESPONSE,
      title: `Përgjigje për kërkesën ${code}`,
      message: "Administrata ka shtuar një përgjigje për kërkesën tuaj.",
      link: `/administrative/${params.requestNumber}`,
    },
  });
}

/** An announcement was published — notify every student it targets. */
export async function notifyAnnouncementPublished(params: {
  studentIds: string[];
  announcementId: string;
  title: string;
}) {
  if (params.studentIds.length === 0) return;

  await prisma.notification.createMany({
    data: params.studentIds.map((studentId) => ({
      userId: studentId,
      type: NotificationType.ANNOUNCEMENT_PUBLISHED,
      title: "Njoftim i ri",
      message: params.title,
      link: `/announcements/${params.announcementId}`,
    })),
  });
}

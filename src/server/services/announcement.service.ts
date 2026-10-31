import { AnnouncementScope, Role } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import { AuthorizationError, type SessionUser } from "@/server/guards";
import { notifyAnnouncementPublished } from "@/server/services/notification.service";

/**
 * Announcements (Technical Design §9.7, §10.4).
 *
 * BR-10 — only an administrator may publish. Students read only. An announcement targets a set of
 * dormitories or every dormitory; publishing notifies every student it reaches (BR-09).
 */

const DETAIL_SELECT = {
  id: true,
  title: true,
  body: true,
  scope: true,
  isPublished: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, firstName: true, lastName: true } },
  dormitories: { select: { dormitoryId: true } },
} as const;

/** Announcements this administrator may manage: their own dormitory's, plus global ones. */
export function listAnnouncementsForAdmin(admin: SessionUser & { dormitoryId: string }) {
  return prisma.announcement.findMany({
    where: {
      OR: [
        { scope: AnnouncementScope.GLOBAL },
        { dormitories: { some: { dormitoryId: admin.dormitoryId } } },
      ],
    },
    select: DETAIL_SELECT,
    orderBy: { createdAt: "desc" },
  });
}

/** Read one announcement, enforcing that the reader is actually addressed by it. */
export async function getAnnouncement(user: SessionUser, id: string) {
  const announcement = await prisma.announcement.findUnique({
    where: { id },
    select: DETAIL_SELECT,
  });

  if (!announcement) return null;

  const targetsUser =
    announcement.scope === AnnouncementScope.GLOBAL ||
    announcement.dormitories.some((d) => d.dormitoryId === user.dormitoryId);

  if (!targetsUser) {
    throw new AuthorizationError("Ky njoftim nuk i përket konviktit tuaj.", 404);
  }
  if (user.role === Role.STUDENT && !announcement.isPublished) {
    throw new AuthorizationError("Ky njoftim nuk është publikuar.", 404);
  }

  return announcement;
}

export function listDormitories() {
  return prisma.dormitory.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}

/** Every student an announcement reaches — the notification audience. */
async function resolveAudience(scope: AnnouncementScope, dormitoryIds: string[]) {
  const students = await prisma.user.findMany({
    where: {
      role: Role.STUDENT,
      isActive: true,
      ...(scope === AnnouncementScope.GLOBAL ? {} : { dormitoryId: { in: dormitoryIds } }),
    },
    select: { id: true },
  });
  return students.map((s) => s.id);
}

export async function createAnnouncement(
  admin: SessionUser & { dormitoryId: string },
  input: { title: string; body: string; scope: AnnouncementScope; dormitoryIds: string[] },
) {
  if (admin.role !== Role.ADMIN) {
    throw new AuthorizationError("Vetëm administratori mund të publikojë njoftime.");
  }

  // A dormitory-scoped announcement must name at least one dormitory; default to the
  // administrator's own so a mis-submitted form cannot create an announcement nobody sees.
  const dormitoryIds =
    input.scope === AnnouncementScope.GLOBAL
      ? []
      : input.dormitoryIds.length > 0
        ? input.dormitoryIds
        : [admin.dormitoryId];

  const announcement = await prisma.announcement.create({
    data: {
      title: input.title,
      body: input.body,
      scope: input.scope,
      isPublished: true,
      publishedAt: new Date(),
      authorId: admin.id,
      dormitories: { create: dormitoryIds.map((dormitoryId) => ({ dormitoryId })) },
    },
    select: { id: true, title: true },
  });

  const studentIds = await resolveAudience(input.scope, dormitoryIds);
  await notifyAnnouncementPublished({
    studentIds,
    announcementId: announcement.id,
    title: announcement.title,
  });

  return announcement;
}

export async function updateAnnouncement(
  admin: SessionUser & { dormitoryId: string },
  id: string,
  input: { title: string; body: string; scope: AnnouncementScope; dormitoryIds: string[] },
) {
  if (admin.role !== Role.ADMIN) {
    throw new AuthorizationError("Vetëm administratori mund të modifikojë njoftime.");
  }

  const existing = await prisma.announcement.findUnique({
    where: { id },
    select: { id: true, dormitories: { select: { dormitoryId: true } }, scope: true },
  });
  if (!existing) throw new AuthorizationError("Njoftimi nuk ekziston.", 404);

  const canEdit =
    existing.scope === AnnouncementScope.GLOBAL ||
    existing.dormitories.some((d) => d.dormitoryId === admin.dormitoryId);
  if (!canEdit) throw new AuthorizationError("Nuk keni qasje në këtë njoftim.");

  const dormitoryIds =
    input.scope === AnnouncementScope.GLOBAL
      ? []
      : input.dormitoryIds.length > 0
        ? input.dormitoryIds
        : [admin.dormitoryId];

  // Replace the targeting wholesale — simpler and less error-prone than diffing the join rows.
  await prisma.announcementDormitory.deleteMany({ where: { announcementId: id } });

  return prisma.announcement.update({
    where: { id },
    data: {
      title: input.title,
      body: input.body,
      scope: input.scope,
      dormitories: { create: dormitoryIds.map((dormitoryId) => ({ dormitoryId })) },
    },
    select: { id: true },
  });
}

export async function deleteAnnouncement(
  admin: SessionUser & { dormitoryId: string },
  id: string,
) {
  if (admin.role !== Role.ADMIN) {
    throw new AuthorizationError("Vetëm administratori mund të fshijë njoftime.");
  }

  const existing = await prisma.announcement.findUnique({
    where: { id },
    select: { id: true, scope: true, dormitories: { select: { dormitoryId: true } } },
  });
  if (!existing) throw new AuthorizationError("Njoftimi nuk ekziston.", 404);

  const canDelete =
    existing.scope === AnnouncementScope.GLOBAL ||
    existing.dormitories.some((d) => d.dormitoryId === admin.dormitoryId);
  if (!canDelete) throw new AuthorizationError("Nuk keni qasje në këtë njoftim.");

  await prisma.announcement.delete({ where: { id } });
}

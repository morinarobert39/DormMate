import { Priority, RequestStatus, Role } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import type { SessionUser } from "@/server/guards";

/**
 * Dashboard data (Technical Design §10.6).
 *
 * UI Architecture §11 specifies the "Information First" layout: statistic cards at the top,
 * recent activity below. Each function here returns exactly what one dashboard renders, so the
 * page stays a layout concern and the counting stays here.
 */

/** Student dashboard — UI Architecture §10.2. */
export async function getStudentDashboard(student: SessionUser) {
  const scope = { studentId: student.id };

  const [
    maintenanceTotal,
    maintenancePending,
    maintenanceInProgress,
    maintenanceResolved,
    administrativeOpen,
    recentMaintenance,
    recentAnnouncements,
  ] = await Promise.all([
    prisma.maintenanceRequest.count({ where: scope }),
    prisma.maintenanceRequest.count({ where: { ...scope, status: RequestStatus.PENDING } }),
    prisma.maintenanceRequest.count({ where: { ...scope, status: RequestStatus.IN_PROGRESS } }),
    prisma.maintenanceRequest.count({ where: { ...scope, status: RequestStatus.RESOLVED } }),
    prisma.administrativeRequest.count({
      where: { ...scope, status: { not: RequestStatus.RESOLVED } },
    }),
    prisma.maintenanceRequest.findMany({
      where: scope,
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        location: { select: { label: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    listAnnouncementsForStudent(student, 3),
  ]);

  return {
    stats: {
      total: maintenanceTotal,
      pending: maintenancePending,
      inProgress: maintenanceInProgress,
      resolved: maintenanceResolved,
      administrativeOpen,
    },
    recentMaintenance,
    recentAnnouncements,
  };
}

/** Administrator dashboard — UI Architecture §10.3. */
export async function getAdminDashboard(admin: SessionUser & { dormitoryId: string }) {
  const scope = { dormitoryId: admin.dormitoryId };

  const [
    pending,
    inProgress,
    resolved,
    highPriorityOpen,
    administrativePending,
    residents,
    recentMaintenance,
    recentAdministrative,
    activeAnnouncements,
  ] = await Promise.all([
    prisma.maintenanceRequest.count({ where: { ...scope, status: RequestStatus.PENDING } }),
    prisma.maintenanceRequest.count({ where: { ...scope, status: RequestStatus.IN_PROGRESS } }),
    prisma.maintenanceRequest.count({ where: { ...scope, status: RequestStatus.RESOLVED } }),
    prisma.maintenanceRequest.count({
      where: {
        ...scope,
        status: { not: RequestStatus.RESOLVED },
        priority: { in: [Priority.HIGH, Priority.URGENT] },
      },
    }),
    prisma.administrativeRequest.count({ where: { ...scope, status: RequestStatus.PENDING } }),
    prisma.user.count({
      where: { dormitoryId: admin.dormitoryId, role: Role.STUDENT, isActive: true },
    }),
    prisma.maintenanceRequest.findMany({
      where: scope,
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        location: { select: { label: true, type: true } },
        student: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.administrativeRequest.findMany({
      where: scope,
      select: {
        id: true,
        number: true,
        subject: true,
        status: true,
        createdAt: true,
        student: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.announcement.count({
      where: {
        isPublished: true,
        OR: [{ scope: "GLOBAL" }, { dormitories: { some: { dormitoryId: admin.dormitoryId } } }],
      },
    }),
  ]);

  return {
    stats: {
      pending,
      inProgress,
      resolved,
      active: pending + inProgress,
      highPriorityOpen,
      administrativePending,
      residents,
      activeAnnouncements,
    },
    recentMaintenance,
    recentAdministrative,
  };
}

/**
 * Announcements visible to a student: those addressed to every dormitory, plus those addressed
 * to theirs (Technical Design §9.7).
 */
export function listAnnouncementsForStudent(student: SessionUser, take?: number) {
  return prisma.announcement.findMany({
    where: {
      isPublished: true,
      OR: [
        { scope: "GLOBAL" },
        ...(student.dormitoryId
          ? [{ dormitories: { some: { dormitoryId: student.dormitoryId } } }]
          : []),
      ],
    },
    select: {
      id: true,
      title: true,
      body: true,
      scope: true,
      publishedAt: true,
      createdAt: true,
      author: { select: { firstName: true, lastName: true } },
    },
    orderBy: { publishedAt: "desc" },
    ...(take ? { take } : {}),
  });
}

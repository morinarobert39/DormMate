import { LocationType, RequestStatus, RequestType, Role } from "@/generated/prisma/enums";
import { PAGE_SIZE } from "@/lib/constants";
import type { CreateMaintenanceInput, RequestFilterInput } from "@/lib/validation/request";
import { prisma } from "@/server/db";
import {
  AuthorizationError,
  assertOwnRequest,
  assertSameDormitory,
  type SessionUser,
} from "@/server/guards";
import { notifyRequestCreated, notifyStatusChange } from "@/server/services/notification.service";

/**
 * Maintenance requests — the platform's primary use case (Implementation & Testing §3.3).
 *
 * All business rules live here rather than in pages or route handlers, per Development
 * Architecture §7.2, so the REST surface and the server components enforce the same rules.
 */

/** Shape shared by the list screens. */
const LIST_SELECT = {
  id: true,
  number: true,
  title: true,
  status: true,
  priority: true,
  createdAt: true,
  resolvedAt: true,
  reportedViaQr: true,
  category: { select: { id: true, name: true } },
  location: { select: { id: true, label: true, type: true, floor: true } },
  student: { select: { id: true, firstName: true, lastName: true } },
} as const;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  description: true,
  dormitoryId: true,
  updatedAt: true,
  student: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      personalNumber: true,
      email: true,
      phone: true,
      room: { select: { label: true } },
    },
  },
  assignedAdmin: { select: { id: true, firstName: true, lastName: true } },
  photos: { select: { id: true, path: true } },
} as const;

export type MaintenanceListItem = Awaited<ReturnType<typeof listMaintenance>>["items"][number];

/**
 * Resolve where a problem is being reported, enforcing the room-lock rule.
 *
 * This is the single place a maintenance location is decided, and it never trusts a room id from
 * the client:
 *   - `own-room` ignores any supplied id and uses the student's assigned room.
 *   - `shared` accepts an id but rejects it unless it is a non-ROOM location in the student's
 *     own dormitory.
 *   - `qr` resolves the sticker's token; if it points at a ROOM that is not the student's own,
 *     it is refused (EF-02).
 */
export async function resolveReportLocation(
  student: SessionUser,
  target:
    | { target: "own-room" }
    | { target: "shared"; locationId: string }
    | { target: "qr"; token: string },
): Promise<{ locationId: string; dormitoryId: string; viaQr: boolean }> {
  if (!student.dormitoryId) {
    throw new AuthorizationError("Llogaria juaj nuk është e lidhur me asnjë konvikt.");
  }

  if (target.target === "own-room") {
    if (!student.roomId) {
      throw new AuthorizationError(
        "Llogaria juaj nuk ka një dhomë të caktuar. Kontaktoni administratën.",
      );
    }
    return { locationId: student.roomId, dormitoryId: student.dormitoryId, viaQr: false };
  }

  if (target.target === "shared") {
    const location = await prisma.location.findUnique({
      where: { id: target.locationId },
      select: { id: true, type: true, dormitoryId: true },
    });

    if (!location) throw new AuthorizationError("Lokacioni nuk ekziston.", 404);

    // BR-04 — manual selection covers shared spaces only. A room may never arrive this way,
    // not even the student's own: that path is "own-room".
    if (location.type === LocationType.ROOM) {
      throw new AuthorizationError(
        "Problemet në dhoma raportohen përmes dhomës suaj ose kodit QR.",
      );
    }
    if (location.dormitoryId !== student.dormitoryId) {
      throw new AuthorizationError("Ky lokacion nuk i përket konviktit tuaj.");
    }

    return { locationId: location.id, dormitoryId: location.dormitoryId, viaQr: false };
  }

  // QR scan.
  const resolved = await resolveQrToken(target.token, student);
  return { locationId: resolved.id, dormitoryId: resolved.dormitoryId, viaQr: true };
}

/**
 * Turn a scanned sticker token into a location.
 *
 * EF-01 — an unknown, deactivated or unassigned token cannot start a report.
 * EF-02 — a room sticker only works for the student who lives in that room.
 */
export async function resolveQrToken(token: string, student: SessionUser) {
  const qr = await prisma.qRCode.findUnique({
    where: { token },
    select: {
      isActive: true,
      location: {
        select: { id: true, label: true, type: true, floor: true, dormitoryId: true },
      },
    },
  });

  if (!qr || !qr.isActive || !qr.location) {
    throw new AuthorizationError("Kodi QR është i pavlefshëm ose nuk është i lidhur me një lokacion.", 404);
  }

  if (qr.location.dormitoryId !== student.dormitoryId) {
    throw new AuthorizationError("Ky kod QR i përket një konvikti tjetër.");
  }

  if (qr.location.type === LocationType.ROOM && qr.location.id !== student.roomId) {
    throw new AuthorizationError(
      "Ky kod QR i përket një dhome tjetër. Mund të raportoni vetëm për dhomën tuaj.",
    );
  }

  return qr.location;
}

/** Shared spaces a student may pick from — deliberately never includes rooms (BR-04). */
export async function listSelectableSharedLocations(student: SessionUser) {
  if (!student.dormitoryId) return [];
  return prisma.location.findMany({
    where: { dormitoryId: student.dormitoryId, type: { not: LocationType.ROOM } },
    select: { id: true, label: true, type: true, floor: true },
    orderBy: [{ type: "asc" }, { floor: "asc" }, { label: "asc" }],
  });
}

export function listMaintenanceCategories() {
  return prisma.maintenanceCategory.findMany({
    where: { isActive: true },
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
  });
}

/**
 * List requests, scoped by role.
 *
 * BR-07 — a student sees only their own. BR-08 — an administrator sees only their dormitory's.
 * The scope is applied here, not by the caller, so no screen can accidentally widen it.
 */
export async function listMaintenance(user: SessionUser, filters: RequestFilterInput) {
  const scope =
    user.role === Role.ADMIN
      ? { dormitoryId: user.dormitoryId ?? "__none__" }
      : { studentId: user.id };

  const where = {
    ...scope,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: "insensitive" as const } },
            { description: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.maintenanceRequest.findMany({
      where,
      select: LIST_SELECT,
      orderBy: [{ createdAt: "desc" }],
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.maintenanceRequest.count({ where }),
  ]);

  return { items, total, page: filters.page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Look up by the human-facing number (MR-00042 → 42), enforcing read access. */
export async function getMaintenanceByNumber(user: SessionUser, requestNumber: number) {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { number: requestNumber },
    select: DETAIL_SELECT,
  });

  if (!request) return null;

  if (user.role === Role.ADMIN) {
    assertSameDormitory({ dormitoryId: user.dormitoryId! }, request.dormitoryId);
  } else {
    assertOwnRequest(user, request.student.id);
  }

  const history = await prisma.requestStatusHistory.findMany({
    where: { requestType: RequestType.MAINTENANCE, requestId: request.id },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      note: true,
      changedAt: true,
      changedBy: { select: { firstName: true, lastName: true, role: true } },
    },
    orderBy: { changedAt: "asc" },
  });

  return { ...request, history };
}

/**
 * File a new request.
 *
 * BR-05 — automatically assigned to the administrator of the dormitory the location sits in.
 * The student's own dormitory is never used for assignment; the location's is, so a shared
 * space always routes to the right administrator.
 */
export async function createMaintenance(
  student: SessionUser,
  input: CreateMaintenanceInput,
  target:
    | { target: "own-room" }
    | { target: "shared"; locationId: string }
    | { target: "qr"; token: string },
  photoPaths: string[] = [],
) {
  if (student.role !== Role.STUDENT) {
    throw new AuthorizationError("Vetëm studentët mund të raportojnë probleme.");
  }

  const { locationId, dormitoryId, viaQr } = await resolveReportLocation(student, target);

  const category = await prisma.maintenanceCategory.findUnique({
    where: { id: input.categoryId },
    select: { id: true },
  });
  if (!category) throw new AuthorizationError("Kategoria nuk ekziston.", 404);

  const admin = await prisma.user.findFirst({
    where: { role: Role.ADMIN, dormitoryId, isActive: true },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  const request = await prisma.maintenanceRequest.create({
    data: {
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: RequestStatus.PENDING,
      reportedViaQr: viaQr,
      studentId: student.id,
      locationId,
      dormitoryId,
      categoryId: category.id,
      assignedAdminId: admin?.id ?? null,
      photos: photoPaths.length
        ? { create: photoPaths.map((path) => ({ path })) }
        : undefined,
    },
    select: { id: true, number: true, title: true },
  });

  await prisma.requestStatusHistory.create({
    data: {
      requestType: RequestType.MAINTENANCE,
      requestId: request.id,
      fromStatus: null,
      toStatus: RequestStatus.PENDING,
      changedById: student.id,
    },
  });

  if (admin) {
    await notifyRequestCreated({
      adminId: admin.id,
      requestNumber: request.number,
      type: "MAINTENANCE",
      title: request.title,
      studentName: `${student.firstName} ${student.lastName}`,
    });
  }

  return request;
}

/**
 * Change a request's status.
 *
 * EF-04 — administrators only; the guard runs before anything is written.
 * BR-09 — every change writes history and notifies the student.
 */
export async function updateMaintenanceStatus(
  admin: SessionUser & { dormitoryId: string },
  requestNumber: number,
  status: RequestStatus,
  note?: string,
) {
  if (admin.role !== Role.ADMIN) {
    throw new AuthorizationError("Vetëm administratori mund të ndryshojë statusin.");
  }

  const request = await prisma.maintenanceRequest.findUnique({
    where: { number: requestNumber },
    select: { id: true, number: true, status: true, dormitoryId: true, studentId: true },
  });
  if (!request) throw new AuthorizationError("Kërkesa nuk ekziston.", 404);

  assertSameDormitory(admin, request.dormitoryId);

  if (request.status === status) return request;

  await prisma.maintenanceRequest.update({
    where: { id: request.id },
    data: {
      status,
      resolvedAt: status === RequestStatus.RESOLVED ? new Date() : null,
      assignedAdminId: admin.id,
    },
  });

  await prisma.requestStatusHistory.create({
    data: {
      requestType: RequestType.MAINTENANCE,
      requestId: request.id,
      fromStatus: request.status,
      toStatus: status,
      note: note || null,
      changedById: admin.id,
    },
  });

  await notifyStatusChange({
    studentId: request.studentId,
    requestNumber: request.number,
    type: "MAINTENANCE",
    status,
  });

  return { ...request, status };
}

import { RequestStatus, RequestType, Role } from "@/generated/prisma/enums";
import { PAGE_SIZE } from "@/lib/constants";
import type { CreateAdministrativeInput, RequestFilterInput } from "@/lib/validation/request";
import { prisma } from "@/server/db";
import {
  AuthorizationError,
  assertOwnRequest,
  assertSameDormitory,
  type SessionUser,
} from "@/server/guards";
import {
  notifyAdminResponse,
  notifyRequestCreated,
  notifyStatusChange,
} from "@/server/services/notification.service";

/**
 * Administrative requests (Technical Design §9.6).
 *
 * Same lifecycle as maintenance, but with no location and no QR code — the student picks a
 * category and writes their reason. The administration's written answer lives on the request
 * itself, because BR-06 permits no "rejected" status: a refusal is a resolution plus an
 * explanation.
 */

const LIST_SELECT = {
  id: true,
  number: true,
  subject: true,
  status: true,
  createdAt: true,
  resolvedAt: true,
  adminResponse: true,
  category: { select: { id: true, name: true } },
  student: { select: { id: true, firstName: true, lastName: true } },
} as const;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  description: true,
  dormitoryId: true,
  updatedAt: true,
  attachments: {
    select: {
      id: true,
      url: true,
      filename: true,
      contentType: true,
      size: true,
      createdAt: true,
      uploadedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  },
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
} as const;

export function listAdministrativeCategories() {
  return prisma.administrativeCategory.findMany({
    where: { isActive: true },
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
  });
}

export async function listAdministrative(user: SessionUser, filters: RequestFilterInput) {
  const scope =
    user.role === Role.ADMIN
      ? { dormitoryId: user.dormitoryId ?? "__none__" }
      : { studentId: user.id };

  const where = {
    ...scope,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.q
      ? {
          OR: [
            { subject: { contains: filters.q, mode: "insensitive" as const } },
            { description: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.administrativeRequest.findMany({
      where,
      select: LIST_SELECT,
      orderBy: [{ createdAt: "desc" }],
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.administrativeRequest.count({ where }),
  ]);

  return { items, total, page: filters.page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getAdministrativeByNumber(user: SessionUser, requestNumber: number) {
  const request = await prisma.administrativeRequest.findUnique({
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
    where: { requestType: RequestType.ADMINISTRATIVE, requestId: request.id },
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

export async function createAdministrative(
  student: SessionUser,
  input: CreateAdministrativeInput,
) {
  if (student.role !== Role.STUDENT) {
    throw new AuthorizationError("Vetëm studentët mund të paraqesin kërkesa administrative.");
  }
  if (!student.dormitoryId) {
    throw new AuthorizationError("Llogaria juaj nuk është e lidhur me asnjë konvikt.");
  }

  const category = await prisma.administrativeCategory.findUnique({
    where: { id: input.categoryId },
    select: { id: true },
  });
  if (!category) throw new AuthorizationError("Kategoria nuk ekziston.", 404);

  const admin = await prisma.user.findFirst({
    where: { role: Role.ADMIN, dormitoryId: student.dormitoryId, isActive: true },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  const request = await prisma.administrativeRequest.create({
    data: {
      subject: input.subject,
      description: input.description,
      status: RequestStatus.PENDING,
      studentId: student.id,
      dormitoryId: student.dormitoryId,
      categoryId: category.id,
      assignedAdminId: admin?.id ?? null,
    },
    select: { id: true, number: true, subject: true },
  });

  await prisma.requestStatusHistory.create({
    data: {
      requestType: RequestType.ADMINISTRATIVE,
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
      type: "ADMINISTRATIVE",
      title: request.subject,
      studentName: `${student.firstName} ${student.lastName}`,
    });
  }

  return request;
}

export async function updateAdministrativeStatus(
  admin: SessionUser & { dormitoryId: string },
  requestNumber: number,
  status: RequestStatus,
  note?: string,
) {
  if (admin.role !== Role.ADMIN) {
    throw new AuthorizationError("Vetëm administratori mund të ndryshojë statusin.");
  }

  const request = await prisma.administrativeRequest.findUnique({
    where: { number: requestNumber },
    select: { id: true, number: true, status: true, dormitoryId: true, studentId: true },
  });
  if (!request) throw new AuthorizationError("Kërkesa nuk ekziston.", 404);

  assertSameDormitory(admin, request.dormitoryId);
  if (request.status === status) return request;

  await prisma.administrativeRequest.update({
    where: { id: request.id },
    data: {
      status,
      resolvedAt: status === RequestStatus.RESOLVED ? new Date() : null,
      assignedAdminId: admin.id,
    },
  });

  await prisma.requestStatusHistory.create({
    data: {
      requestType: RequestType.ADMINISTRATIVE,
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
    type: "ADMINISTRATIVE",
    status,
  });

  return { ...request, status };
}

/** The administration's written answer (§10.3). Notifies the student separately from a status change. */
export async function respondToAdministrative(
  admin: SessionUser & { dormitoryId: string },
  requestNumber: number,
  adminResponse: string,
) {
  if (admin.role !== Role.ADMIN) {
    throw new AuthorizationError("Vetëm administratori mund të përgjigjet.");
  }

  const request = await prisma.administrativeRequest.findUnique({
    where: { number: requestNumber },
    select: { id: true, number: true, dormitoryId: true, studentId: true },
  });
  if (!request) throw new AuthorizationError("Kërkesa nuk ekziston.", 404);

  assertSameDormitory(admin, request.dormitoryId);

  await prisma.administrativeRequest.update({
    where: { id: request.id },
    data: { adminResponse, assignedAdminId: admin.id },
  });

  await notifyAdminResponse({
    studentId: request.studentId,
    requestNumber: request.number,
  });

  return request;
}

/**
 * Attach a document to an administrative request.
 *
 * Both sides may attach: a student adds supporting evidence, an administrator delivers the issued
 * document (a "Certifikatë banimi" is literally a request for a file). Access follows the same
 * rules as reading the request — BR-07 for the student, BR-08 for the administrator — so no one
 * can push a file onto a request they cannot open.
 */
export async function attachToAdministrative(
  user: SessionUser,
  requestNumber: number,
  file: { url: string; filename: string; contentType: string; size: number },
) {
  const request = await prisma.administrativeRequest.findUnique({
    where: { number: requestNumber },
    select: { id: true, dormitoryId: true, studentId: true },
  });
  if (!request) throw new AuthorizationError("Kërkesa nuk ekziston.", 404);

  if (user.role === Role.ADMIN) {
    assertSameDormitory({ dormitoryId: user.dormitoryId! }, request.dormitoryId);
  } else {
    assertOwnRequest(user, request.studentId);
    // A resolved request is closed correspondence; reopening it is the administration's call.
    const current = await prisma.administrativeRequest.findUnique({
      where: { id: request.id },
      select: { status: true },
    });
    if (current?.status === RequestStatus.RESOLVED) {
      throw new AuthorizationError("Kërkesa është mbyllur dhe nuk pranon skedarë të rinj.");
    }
  }

  await prisma.administrativeRequestAttachment.create({
    data: {
      requestId: request.id,
      url: file.url,
      filename: file.filename,
      contentType: file.contentType,
      size: file.size,
      uploadedById: user.id,
    },
  });

  // An administrator attaching a document is answering; the student needs to know it arrived.
  if (user.role === Role.ADMIN) {
    await notifyAdminResponse({
      studentId: request.studentId,
      requestNumber,
    });
  }

  return request;
}

/** Remove an attachment. Only the uploader may withdraw their own file. */
export async function removeAdministrativeAttachment(user: SessionUser, attachmentId: string) {
  const attachment = await prisma.administrativeRequestAttachment.findUnique({
    where: { id: attachmentId },
    select: {
      id: true,
      url: true,
      uploadedById: true,
      request: { select: { number: true, dormitoryId: true } },
    },
  });
  if (!attachment) throw new AuthorizationError("Skedari nuk ekziston.", 404);

  if (attachment.uploadedById !== user.id) {
    throw new AuthorizationError("Mund të fshini vetëm skedarët që keni ngarkuar ju.");
  }
  if (user.role === Role.ADMIN) {
    assertSameDormitory({ dormitoryId: user.dormitoryId! }, attachment.request.dormitoryId);
  }

  await prisma.administrativeRequestAttachment.delete({ where: { id: attachment.id } });

  return { url: attachment.url, requestNumber: attachment.request.number };
}

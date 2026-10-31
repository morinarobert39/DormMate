import { hash } from "bcryptjs";

import { LocationType, Role } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import { AuthorizationError, assertSameDormitory, type SessionUser } from "@/server/guards";

/**
 * User management.
 *
 * There is no public sign-up: an administrator creates each student and assigns them a room
 * (Screen Inventory §6 has no Register screen, and BR-02 ties a student to exactly one dormitory
 * and one room). This module is also where a forgotten password is reset, since the prototype
 * has no mail server.
 */

export function listStudents(admin: SessionUser & { dormitoryId: string }) {
  return prisma.user.findMany({
    where: { dormitoryId: admin.dormitoryId, role: Role.STUDENT },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      personalNumber: true,
      email: true,
      phone: true,
      isActive: true,
      createdAt: true,
      room: { select: { id: true, label: true, type: true, floor: true } },
      _count: { select: { maintenanceRequests: true, administrativeRequests: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

/** Rooms in this dormitory, with occupancy, for the assignment dropdown. */
export function listRooms(admin: SessionUser & { dormitoryId: string }) {
  return prisma.location.findMany({
    where: { dormitoryId: admin.dormitoryId, type: LocationType.ROOM },
    select: {
      id: true,
      label: true,
      type: true,
      floor: true,
      _count: { select: { residents: true } },
    },
    orderBy: [{ floor: "asc" }, { label: "asc" }],
  });
}

/** Outstanding password-reset requests raised from the "forgot password" screen. */
export function listPendingResets(admin: SessionUser & { dormitoryId: string }) {
  return prisma.passwordResetRequest.findMany({
    where: { isHandled: false, user: { dormitoryId: admin.dormitoryId } },
    select: {
      id: true,
      createdAt: true,
      user: { select: { id: true, firstName: true, lastName: true, personalNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createStudent(
  admin: SessionUser & { dormitoryId: string },
  input: {
    firstName: string;
    lastName: string;
    personalNumber: string;
    email: string | null;
    phone: string | null;
    roomId: string | null;
    password: string;
  },
) {
  if (admin.role !== Role.ADMIN) {
    throw new AuthorizationError("Vetëm administratori mund të krijojë llogari.");
  }

  const existing = await prisma.user.findUnique({
    where: { personalNumber: input.personalNumber },
    select: { id: true },
  });
  if (existing) {
    throw new AuthorizationError("Ky numër personal është i regjistruar tashmë.");
  }

  if (input.email) {
    const emailClash = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (emailClash) throw new AuthorizationError("Ky email është i zënë.");
  }

  // A room from another dormitory would break BR-02 and the room-lock rule at once.
  if (input.roomId) {
    const room = await prisma.location.findUnique({
      where: { id: input.roomId },
      select: { dormitoryId: true, type: true },
    });
    if (!room || room.type !== LocationType.ROOM) {
      throw new AuthorizationError("Dhoma e zgjedhur nuk është e vlefshme.");
    }
    assertSameDormitory(admin, room.dormitoryId);
  }

  return prisma.user.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      personalNumber: input.personalNumber,
      email: input.email,
      phone: input.phone,
      passwordHash: await hash(input.password, 10),
      role: Role.STUDENT,
      dormitoryId: admin.dormitoryId,
      roomId: input.roomId,
    },
    select: { id: true, firstName: true, lastName: true },
  });
}

async function loadOwnStudent(
  admin: SessionUser & { dormitoryId: string },
  studentId: string,
) {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, dormitoryId: true, role: true },
  });

  if (!student || student.role !== Role.STUDENT) {
    throw new AuthorizationError("Studenti nuk ekziston.", 404);
  }
  // EF-03 — an administrator may not touch another dormitory's students.
  assertSameDormitory(admin, student.dormitoryId ?? "");
  return student;
}

export async function assignRoom(
  admin: SessionUser & { dormitoryId: string },
  studentId: string,
  roomId: string | null,
) {
  await loadOwnStudent(admin, studentId);

  if (roomId) {
    const room = await prisma.location.findUnique({
      where: { id: roomId },
      select: { dormitoryId: true, type: true },
    });
    if (!room || room.type !== LocationType.ROOM) {
      throw new AuthorizationError("Dhoma e zgjedhur nuk është e vlefshme.");
    }
    assertSameDormitory(admin, room.dormitoryId);
  }

  await prisma.user.update({ where: { id: studentId }, data: { roomId } });
}

export async function setStudentActive(
  admin: SessionUser & { dormitoryId: string },
  studentId: string,
  isActive: boolean,
) {
  await loadOwnStudent(admin, studentId);
  await prisma.user.update({ where: { id: studentId }, data: { isActive } });
}

/** Reset a password on the student's behalf and close any outstanding reset request. */
export async function resetStudentPassword(
  admin: SessionUser & { dormitoryId: string },
  studentId: string,
  newPassword: string,
) {
  await loadOwnStudent(admin, studentId);

  await prisma.user.update({
    where: { id: studentId },
    data: { passwordHash: await hash(newPassword, 10) },
  });

  await prisma.passwordResetRequest.updateMany({
    where: { userId: studentId, isHandled: false },
    data: { isHandled: true, handledAt: new Date() },
  });
}

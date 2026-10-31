import { LocationType, Role } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";

/**
 * Locates the seeded fixtures the tests act on. The suite reads the seed data rather than building
 * its own, so a test failure means the behaviour changed — not that a fixture drifted.
 */
export async function loadFixtures() {
  const [dormA, dormB] = await prisma.dormitory.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true },
  });

  const adminA = await prisma.user.findFirstOrThrow({
    where: { role: Role.ADMIN, dormitoryId: dormA.id },
    select: { id: true, dormitoryId: true },
  });
  const adminB = await prisma.user.findFirstOrThrow({
    where: { role: Role.ADMIN, dormitoryId: dormB.id },
    select: { id: true, dormitoryId: true },
  });

  const studentA = await prisma.user.findUniqueOrThrow({
    where: { personalNumber: "2000000001" },
    select: { id: true, roomId: true, dormitoryId: true },
  });
  const otherStudentA = await prisma.user.findUniqueOrThrow({
    where: { personalNumber: "2000000002" },
    select: { id: true, roomId: true, dormitoryId: true },
  });
  const studentB = await prisma.user.findUniqueOrThrow({
    where: { personalNumber: "2000000007" },
    select: { id: true, roomId: true, dormitoryId: true },
  });

  const sharedA = await prisma.location.findFirstOrThrow({
    where: { dormitoryId: dormA.id, type: LocationType.HALLWAY },
    select: { id: true },
  });
  const sharedB = await prisma.location.findFirstOrThrow({
    where: { dormitoryId: dormB.id, type: LocationType.HALLWAY },
    select: { id: true },
  });

  const category = await prisma.maintenanceCategory.findFirstOrThrow({
    select: { id: true },
  });
  const adminCategory = await prisma.administrativeCategory.findFirstOrThrow({
    select: { id: true },
  });

  const ownRoomQr = await prisma.qRCode.findFirstOrThrow({
    where: { locationId: studentA.roomId },
    select: { token: true },
  });
  const otherRoomQr = await prisma.qRCode.findFirstOrThrow({
    where: { locationId: otherStudentA.roomId },
    select: { token: true },
  });
  const sharedQr = await prisma.qRCode.findFirstOrThrow({
    where: { locationId: sharedA.id },
    select: { token: true },
  });

  return {
    dormA,
    dormB,
    adminA,
    adminB,
    studentA,
    otherStudentA,
    studentB,
    sharedA,
    sharedB,
    category,
    adminCategory,
    ownRoomQr,
    otherRoomQr,
    sharedQr,
  };
}

/** Load a full SessionUser the way the guards would, for direct service calls. */
export async function sessionUserFor(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      personalNumber: true,
      email: true,
      phone: true,
      role: true,
      dormitoryId: true,
      roomId: true,
    },
  });
  return user;
}

/** Remove requests created by a test so repeated runs stay deterministic. */
export async function cleanupRequests(titlePrefix: string) {
  const created = await prisma.maintenanceRequest.findMany({
    where: { title: { startsWith: titlePrefix } },
    select: { id: true },
  });

  if (created.length > 0) {
    const ids = created.map((r) => r.id);
    await prisma.requestStatusHistory.deleteMany({
      where: { requestType: "MAINTENANCE", requestId: { in: ids } },
    });
    await prisma.maintenanceRequestPhoto.deleteMany({ where: { requestId: { in: ids } } });
    await prisma.maintenanceRequest.deleteMany({ where: { id: { in: ids } } });
  }

  const adminCreated = await prisma.administrativeRequest.findMany({
    where: { subject: { startsWith: titlePrefix } },
    select: { id: true },
  });

  if (adminCreated.length > 0) {
    const ids = adminCreated.map((r) => r.id);
    await prisma.requestStatusHistory.deleteMany({
      where: { requestType: "ADMINISTRATIVE", requestId: { in: ids } },
    });
    await prisma.administrativeRequest.deleteMany({ where: { id: { in: ids } } });
  }
}

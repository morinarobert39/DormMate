import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { LocationType, RequestStatus } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import { requireAdmin, requireStudent, requireUser } from "@/server/guards";
import {
  createMaintenance,
  getMaintenanceByNumber,
  listMaintenance,
  listSelectableSharedLocations,
  resolveQrToken,
  resolveReportLocation,
  updateMaintenanceStatus,
} from "@/server/services/maintenance.service";

import { cleanupRequests, loadFixtures, sessionUserFor } from "./helpers";
import { setTestUser } from "./setup";

/**
 * The exception flows from Business Analysis v1.0 §13 (EF-01 … EF-05), the access rules
 * BR-07 / BR-08, and the room-lock rule.
 *
 * These run against the real database through the real services — an authorization rule that is
 * only tested against a mock has not been tested.
 */

const PREFIX = "[EF] ";
let fx: Awaited<ReturnType<typeof loadFixtures>>;

beforeAll(async () => {
  fx = await loadFixtures();
  await cleanupRequests(PREFIX);
});

afterAll(async () => {
  await cleanupRequests(PREFIX);
  await prisma.$disconnect();
});

describe("EF-01 — invalid QR code", () => {
  it("refuses a token that does not exist", async () => {
    setTestUser(fx.studentA.id);
    const student = await sessionUserFor(fx.studentA.id);

    await expect(resolveQrToken("this-token-does-not-exist", student)).rejects.toThrow(
      /i pavlefshëm/i,
    );
  });

  it("refuses a deactivated sticker", async () => {
    const qr = await prisma.qRCode.findFirstOrThrow({
      where: { locationId: fx.sharedA.id },
      select: { id: true, token: true },
    });
    await prisma.qRCode.update({ where: { id: qr.id }, data: { isActive: false } });

    try {
      setTestUser(fx.studentA.id);
      const student = await sessionUserFor(fx.studentA.id);
      await expect(resolveQrToken(qr.token, student)).rejects.toThrow(/i pavlefshëm/i);
    } finally {
      await prisma.qRCode.update({ where: { id: qr.id }, data: { isActive: true } });
    }
  });

  it("refuses a code that has been generated but not assigned a location", async () => {
    const orphan = await prisma.qRCode.create({
      data: { token: `test-orphan-${Date.now()}`, createdById: fx.adminA.id },
      select: { id: true, token: true },
    });

    try {
      setTestUser(fx.studentA.id);
      const student = await sessionUserFor(fx.studentA.id);
      await expect(resolveQrToken(orphan.token, student)).rejects.toThrow(/i pavlefshëm/i);
    } finally {
      await prisma.qRCode.delete({ where: { id: orphan.id } });
    }
  });
});

describe("EF-02 — reporting on a room that is not yours (the room-lock rule)", () => {
  it("refuses another student's room QR code", async () => {
    setTestUser(fx.studentA.id);
    const student = await sessionUserFor(fx.studentA.id);

    await expect(resolveQrToken(fx.otherRoomQr.token, student)).rejects.toThrow(
      /dhome tjetër|dhomë tjetër/i,
    );
  });

  it("accepts the student's own room QR code", async () => {
    setTestUser(fx.studentA.id);
    const student = await sessionUserFor(fx.studentA.id);

    const location = await resolveQrToken(fx.ownRoomQr.token, student);
    expect(location.id).toBe(fx.studentA.roomId);
  });

  it("refuses a room id submitted through the shared-location path", async () => {
    setTestUser(fx.studentA.id);
    const student = await sessionUserFor(fx.studentA.id);

    // A hand-crafted payload naming another student's room. The UI cannot express this;
    // the server refuses it anyway.
    await expect(
      resolveReportLocation(student, {
        target: "shared",
        locationId: fx.otherStudentA.roomId!,
      }),
    ).rejects.toThrow(/dhoma raportohen/i);
  });

  it("ignores any supplied id on the own-room path and uses the session's room", async () => {
    setTestUser(fx.studentA.id);
    const student = await sessionUserFor(fx.studentA.id);

    const resolved = await resolveReportLocation(student, { target: "own-room" });
    expect(resolved.locationId).toBe(fx.studentA.roomId);
    expect(resolved.locationId).not.toBe(fx.otherStudentA.roomId);
  });

  it("never offers a room in the selectable shared-location list (BR-04)", async () => {
    setTestUser(fx.studentA.id);
    const student = await sessionUserFor(fx.studentA.id);

    const options = await listSelectableSharedLocations(student);

    expect(options.length).toBeGreaterThan(0);
    expect(options.every((l) => l.type !== LocationType.ROOM)).toBe(true);
    expect(options.every((l) => l.id !== fx.otherStudentA.roomId)).toBe(true);
  });

  it("refuses a shared location belonging to another dormitory", async () => {
    setTestUser(fx.studentA.id);
    const student = await sessionUserFor(fx.studentA.id);

    await expect(
      resolveReportLocation(student, { target: "shared", locationId: fx.sharedB.id }),
    ).rejects.toThrow(/konviktit tuaj/i);
  });
});

describe("EF-03 — an administrator reaching another dormitory", () => {
  it("refuses to open a request from a dormitory they do not manage", async () => {
    setTestUser(fx.studentB.id);
    const studentB = await sessionUserFor(fx.studentB.id);

    const created = await createMaintenance(
      studentB,
      {
        title: `${PREFIX}Kërkesë e konviktit 2`,
        description: "Kërkesë e krijuar në konviktin e dytë për testimin e BR-08.",
        categoryId: fx.category.id,
        priority: "LOW",
      },
      { target: "own-room" },
    );

    const { number } = await prisma.maintenanceRequest.findUniqueOrThrow({
      where: { id: created.id },
      select: { number: true },
    });

    // Administrator of dormitory 1 must not see it.
    setTestUser(fx.adminA.id);
    const adminA = await sessionUserFor(fx.adminA.id);
    await expect(getMaintenanceByNumber(adminA, number)).rejects.toThrow(/konvikti tjetër/i);

    // Nor change its status.
    await expect(
      updateMaintenanceStatus(
        { ...adminA, dormitoryId: fx.dormA.id },
        number,
        RequestStatus.IN_PROGRESS,
      ),
    ).rejects.toThrow(/konvikti tjetër/i);

    // The administrator who owns it can.
    setTestUser(fx.adminB.id);
    const adminB = await sessionUserFor(fx.adminB.id);
    await expect(getMaintenanceByNumber(adminB, number)).resolves.toBeTruthy();
  });

  it("excludes other dormitories from the list (BR-08)", async () => {
    setTestUser(fx.adminA.id);
    const adminA = await sessionUserFor(fx.adminA.id);

    const { items } = await listMaintenance(adminA, { page: 1 });
    const dormitoryIds = await prisma.maintenanceRequest.findMany({
      where: { id: { in: items.map((i) => i.id) } },
      select: { dormitoryId: true },
    });

    expect(dormitoryIds.every((r) => r.dormitoryId === fx.dormA.id)).toBe(true);
  });
});

describe("EF-04 — a student performing an administrator action", () => {
  it("refuses a status change by a student", async () => {
    setTestUser(fx.studentA.id);
    const student = await sessionUserFor(fx.studentA.id);

    const existing = await prisma.maintenanceRequest.findFirstOrThrow({
      where: { studentId: fx.studentA.id },
      select: { number: true },
    });

    await expect(
      updateMaintenanceStatus(
        { ...student, dormitoryId: fx.dormA.id },
        existing.number,
        RequestStatus.RESOLVED,
      ),
    ).rejects.toThrow(/administratori/i);
  });

  it("refuses requireAdmin for a student", async () => {
    setTestUser(fx.studentA.id);
    await expect(requireAdmin()).rejects.toThrow(/të drejta administrative/i);
  });
});

describe("EF-05 — unauthenticated access", () => {
  it("refuses every guard when there is no session", async () => {
    setTestUser(null);
    await expect(requireUser()).rejects.toThrow(/nuk jeni i identifikuar/i);
    await expect(requireStudent()).rejects.toThrow(/nuk jeni i identifikuar/i);
    await expect(requireAdmin()).rejects.toThrow(/nuk jeni i identifikuar/i);
  });

  it("refuses a deactivated account even with a valid session id", async () => {
    await prisma.user.update({ where: { id: fx.studentA.id }, data: { isActive: false } });

    try {
      setTestUser(fx.studentA.id);
      await expect(requireUser()).rejects.toThrow(/nuk jeni i identifikuar/i);
    } finally {
      await prisma.user.update({ where: { id: fx.studentA.id }, data: { isActive: true } });
    }
  });
});

describe("BR-07 — a student may only read their own requests", () => {
  it("refuses another student's request", async () => {
    const othersRequest = await prisma.maintenanceRequest.findFirstOrThrow({
      where: { studentId: fx.otherStudentA.id },
      select: { number: true },
    });

    setTestUser(fx.studentA.id);
    const student = await sessionUserFor(fx.studentA.id);

    await expect(getMaintenanceByNumber(student, othersRequest.number)).rejects.toThrow(
      /qasje në këtë kërkesë/i,
    );
  });

  it("returns only the student's own requests in the list", async () => {
    setTestUser(fx.studentA.id);
    const student = await sessionUserFor(fx.studentA.id);

    const { items } = await listMaintenance(student, { page: 1 });
    const owners = await prisma.maintenanceRequest.findMany({
      where: { id: { in: items.map((i) => i.id) } },
      select: { studentId: true },
    });

    expect(owners.every((r) => r.studentId === fx.studentA.id)).toBe(true);
  });
});

describe("BR-06 — exactly three statuses", () => {
  it("the enum contains only Pending, In Progress and Resolved", () => {
    expect(Object.values(RequestStatus).sort()).toEqual(
      ["IN_PROGRESS", "PENDING", "RESOLVED"].sort(),
    );
  });
});

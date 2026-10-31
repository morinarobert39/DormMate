import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { RequestStatus, RequestType } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import { getCurrentUser, requireAdmin, requireStudent } from "@/server/guards";
import {
  createMaintenance,
  getMaintenanceByNumber,
  updateMaintenanceStatus,
} from "@/server/services/maintenance.service";

import { cleanupRequests, loadFixtures, sessionUserFor } from "./helpers";
import { setTestUser } from "./setup";

/**
 * The three test cases documented in Implementation & Testing v1.0 §7.
 * These are named in the thesis, so they exist here by the same identifiers.
 */

const PREFIX = "[TC] ";
let fx: Awaited<ReturnType<typeof loadFixtures>>;

beforeAll(async () => {
  fx = await loadFixtures();
  await cleanupRequests(PREFIX);
});

afterAll(async () => {
  await cleanupRequests(PREFIX);
  await prisma.$disconnect();
});

describe("TC-01 — Login", () => {
  it("resolves the signed-in student and routes them to the student role", async () => {
    setTestUser(fx.studentA.id);
    const user = await getCurrentUser();

    expect(user).not.toBeNull();
    expect(user!.role).toBe("STUDENT");
    expect(user!.dormitoryId).toBe(fx.dormA.id);

    // A student is accepted by requireStudent and refused by requireAdmin.
    await expect(requireStudent()).resolves.toBeDefined();
    await expect(requireAdmin()).rejects.toThrow();
  });

  it("resolves an administrator to the administrator role with a dormitory", async () => {
    setTestUser(fx.adminA.id);
    const admin = await requireAdmin();

    expect(admin.role).toBe("ADMIN");
    expect(admin.dormitoryId).toBe(fx.dormA.id);
  });

  it("rejects an unauthenticated caller (EF-05)", async () => {
    setTestUser(null);
    await expect(getCurrentUser()).resolves.toBeNull();
    await expect(requireStudent()).rejects.toThrow(/nuk jeni i identifikuar/i);
  });
});

describe("TC-02 — Creating a maintenance request", () => {
  it("saves the request and routes it to the administrator of that dormitory (BR-05)", async () => {
    setTestUser(fx.studentA.id);
    const student = await sessionUserFor(fx.studentA.id);

    const created = await createMaintenance(
      student,
      {
        title: `${PREFIX}Rubineti pikon`,
        description: "Uji rrjedh vazhdimisht nga rubineti i lavamanit.",
        categoryId: fx.category.id,
        priority: "MEDIUM",
      },
      { target: "own-room" },
    );

    const stored = await prisma.maintenanceRequest.findUniqueOrThrow({
      where: { id: created.id },
      select: {
        status: true,
        locationId: true,
        dormitoryId: true,
        assignedAdminId: true,
        studentId: true,
      },
    });

    expect(stored.status).toBe(RequestStatus.PENDING);
    expect(stored.locationId).toBe(fx.studentA.roomId);
    expect(stored.dormitoryId).toBe(fx.dormA.id);
    // BR-05 — auto-assigned to the dormitory's administrator.
    expect(stored.assignedAdminId).toBe(fx.adminA.id);

    // The request appears to the administrator who owns that dormitory.
    setTestUser(fx.adminA.id);
    const admin = await sessionUserFor(fx.adminA.id);
    const number = (
      await prisma.maintenanceRequest.findUniqueOrThrow({
        where: { id: created.id },
        select: { number: true },
      })
    ).number;

    await expect(getMaintenanceByNumber(admin, number)).resolves.toBeTruthy();
  });

  it("records the opening entry in the status history", async () => {
    setTestUser(fx.studentA.id);
    const student = await sessionUserFor(fx.studentA.id);

    const created = await createMaintenance(
      student,
      {
        title: `${PREFIX}Historia fillestare`,
        description: "Verifikimi i hyrjes së parë në historik.",
        categoryId: fx.category.id,
        priority: "LOW",
      },
      { target: "own-room" },
    );

    const history = await prisma.requestStatusHistory.findMany({
      where: { requestType: RequestType.MAINTENANCE, requestId: created.id },
    });

    expect(history).toHaveLength(1);
    expect(history[0].fromStatus).toBeNull();
    expect(history[0].toStatus).toBe(RequestStatus.PENDING);
  });
});

describe("TC-03 — Changing the status", () => {
  it("updates the status, writes history, and notifies the student (BR-09)", async () => {
    setTestUser(fx.studentA.id);
    const student = await sessionUserFor(fx.studentA.id);

    const created = await createMaintenance(
      student,
      {
        title: `${PREFIX}Ndryshimi i statusit`,
        description: "Kërkesë e krijuar për të verifikuar ndryshimin e statusit.",
        categoryId: fx.category.id,
        priority: "HIGH",
      },
      { target: "own-room" },
    );

    const { number } = await prisma.maintenanceRequest.findUniqueOrThrow({
      where: { id: created.id },
      select: { number: true },
    });

    const notificationsBefore = await prisma.notification.count({
      where: { userId: fx.studentA.id },
    });

    setTestUser(fx.adminA.id);
    const admin = await sessionUserFor(fx.adminA.id);
    await updateMaintenanceStatus(
      { ...admin, dormitoryId: fx.dormA.id },
      number,
      RequestStatus.IN_PROGRESS,
      "Ekipi u nis drejt dhomës.",
    );

    const afterProgress = await prisma.maintenanceRequest.findUniqueOrThrow({
      where: { id: created.id },
      select: { status: true, resolvedAt: true },
    });
    expect(afterProgress.status).toBe(RequestStatus.IN_PROGRESS);
    expect(afterProgress.resolvedAt).toBeNull();

    await updateMaintenanceStatus(
      { ...admin, dormitoryId: fx.dormA.id },
      number,
      RequestStatus.RESOLVED,
    );

    const afterResolved = await prisma.maintenanceRequest.findUniqueOrThrow({
      where: { id: created.id },
      select: { status: true, resolvedAt: true },
    });
    expect(afterResolved.status).toBe(RequestStatus.RESOLVED);
    // resolvedAt is what the thesis measures resolution time from.
    expect(afterResolved.resolvedAt).toBeInstanceOf(Date);

    const history = await prisma.requestStatusHistory.findMany({
      where: { requestType: RequestType.MAINTENANCE, requestId: created.id },
      orderBy: { changedAt: "asc" },
    });
    expect(history.map((h) => h.toStatus)).toEqual([
      RequestStatus.PENDING,
      RequestStatus.IN_PROGRESS,
      RequestStatus.RESOLVED,
    ]);

    const notificationsAfter = await prisma.notification.count({
      where: { userId: fx.studentA.id },
    });
    expect(notificationsAfter).toBe(notificationsBefore + 2);
  });
});

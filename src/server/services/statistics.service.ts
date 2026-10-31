import { RequestStatus } from "@/generated/prisma/enums";
import { STATUS_LABELS } from "@/lib/constants";
import { resolutionHours } from "@/lib/utils";
import { prisma } from "@/server/db";
import type { SessionUser } from "@/server/guards";

/**
 * Statistics (§10.6, Screen Inventory §6).
 *
 * This module produces the empirical material the thesis evaluates H1 with: whether centralising
 * reporting actually shortens resolution time versus the paper process. Average resolution time
 * and the weekly trend are the headline figures; the breakdowns explain where the time goes.
 */

export type StatisticsData = Awaited<ReturnType<typeof getStatistics>>;

export async function getStatistics(admin: SessionUser & { dormitoryId: string }) {
  const scope = { dormitoryId: admin.dormitoryId };

  const [byStatusRaw, byCategoryRaw, byPriorityRaw, resolved, all, adminByStatusRaw, viaQr] =
    await Promise.all([
      prisma.maintenanceRequest.groupBy({
        by: ["status"],
        where: scope,
        _count: { _all: true },
      }),
      prisma.maintenanceRequest.groupBy({
        by: ["categoryId"],
        where: scope,
        _count: { _all: true },
      }),
      prisma.maintenanceRequest.groupBy({
        by: ["priority"],
        where: scope,
        _count: { _all: true },
      }),
      prisma.maintenanceRequest.findMany({
        where: { ...scope, status: RequestStatus.RESOLVED, resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true, categoryId: true },
      }),
      prisma.maintenanceRequest.findMany({
        where: scope,
        select: { createdAt: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.administrativeRequest.groupBy({
        by: ["status"],
        where: scope,
        _count: { _all: true },
      }),
      prisma.maintenanceRequest.count({ where: { ...scope, reportedViaQr: true } }),
    ]);

  const categories = await prisma.maintenanceCategory.findMany({
    select: { id: true, name: true },
  });
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  // --- Status breakdown ---------------------------------------------------
  const statusCounts = new Map(byStatusRaw.map((r) => [r.status, r._count._all]));
  const byStatus = [
    RequestStatus.PENDING,
    RequestStatus.IN_PROGRESS,
    RequestStatus.RESOLVED,
  ].map((status) => ({
    status,
    label: STATUS_LABELS[status],
    count: statusCounts.get(status) ?? 0,
  }));

  // --- Category breakdown -------------------------------------------------
  const byCategory = byCategoryRaw
    .map((r) => ({
      name: categoryName.get(r.categoryId) ?? "—",
      count: r._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  const byPriority = byPriorityRaw.map((r) => ({
    priority: r.priority,
    count: r._count._all,
  }));

  // --- Resolution time ----------------------------------------------------
  const durations = resolved
    .map((r) => resolutionHours(r.createdAt, r.resolvedAt))
    .filter((h): h is number => h !== null);

  const averageHours =
    durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

  const sorted = [...durations].sort((a, b) => a - b);
  const medianHours =
    sorted.length > 0
      ? sorted.length % 2 === 1
        ? sorted[(sorted.length - 1) / 2]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : null;

  const fastestHours = sorted.length > 0 ? sorted[0] : null;
  const slowestHours = sorted.length > 0 ? sorted[sorted.length - 1] : null;

  // --- Average resolution time per category -------------------------------
  const byCategoryDurations = new Map<string, number[]>();
  for (const r of resolved) {
    const hours = resolutionHours(r.createdAt, r.resolvedAt);
    if (hours === null) continue;
    const key = categoryName.get(r.categoryId) ?? "—";
    byCategoryDurations.set(key, [...(byCategoryDurations.get(key) ?? []), hours]);
  }
  const resolutionByCategory = [...byCategoryDurations.entries()]
    .map(([name, hours]) => ({
      name,
      averageHours: hours.reduce((a, b) => a + b, 0) / hours.length,
      count: hours.length,
    }))
    .sort((a, b) => b.averageHours - a.averageHours);

  // --- Weekly trend -------------------------------------------------------
  // Eight buckets of seven days, oldest first, so the chart reads left to right.
  const now = new Date();
  const weeks: { label: string; reported: number; resolved: number }[] = [];

  for (let i = 7; i >= 0; i--) {
    const end = new Date(now);
    end.setDate(end.getDate() - i * 7);
    end.setHours(23, 59, 59, 999);

    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    weeks.push({
      label: `${String(start.getDate()).padStart(2, "0")}/${String(start.getMonth() + 1).padStart(2, "0")}`,
      reported: all.filter((r) => r.createdAt >= start && r.createdAt <= end).length,
      resolved: resolved.filter(
        (r) => r.resolvedAt !== null && r.resolvedAt >= start && r.resolvedAt <= end,
      ).length,
    });
  }

  const totalMaintenance = all.length;

  return {
    totals: {
      maintenance: totalMaintenance,
      resolved: statusCounts.get(RequestStatus.RESOLVED) ?? 0,
      open: totalMaintenance - (statusCounts.get(RequestStatus.RESOLVED) ?? 0),
      administrative: adminByStatusRaw.reduce((sum, r) => sum + r._count._all, 0),
      viaQr,
      viaQrShare: totalMaintenance > 0 ? Math.round((viaQr / totalMaintenance) * 100) : 0,
      resolutionRate:
        totalMaintenance > 0
          ? Math.round(((statusCounts.get(RequestStatus.RESOLVED) ?? 0) / totalMaintenance) * 100)
          : 0,
    },
    resolution: { averageHours, medianHours, fastestHours, slowestHours, sample: durations.length },
    byStatus,
    byCategory,
    byPriority,
    resolutionByCategory,
    weeks,
  };
}

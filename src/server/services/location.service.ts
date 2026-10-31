import { LocationType, Role } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import { AuthorizationError, assertSameDormitory, type SessionUser } from "@/server/guards";

/**
 * Location management (§9.3).
 *
 * Locations are the physical anchor of the whole system: a request points at one, a QR sticker
 * points at one, and a student lives in one. Everything here is scoped to the administrator's own
 * dormitory (BR-08).
 */

export function listLocations(admin: SessionUser & { dormitoryId: string }) {
  return prisma.location.findMany({
    where: { dormitoryId: admin.dormitoryId },
    select: {
      id: true,
      label: true,
      type: true,
      floor: true,
      qrCode: { select: { id: true, isActive: true } },
      _count: { select: { residents: true, maintenanceRequests: true } },
    },
    orderBy: [{ type: "asc" }, { floor: "asc" }, { label: "asc" }],
  });
}

export async function createLocation(
  admin: SessionUser & { dormitoryId: string },
  input: { label: string; type: LocationType; floor: number | null },
) {
  if (admin.role !== Role.ADMIN) {
    throw new AuthorizationError("Vetëm administratori mund të shtojë lokacione.");
  }

  const existing = await prisma.location.findFirst({
    where: { dormitoryId: admin.dormitoryId, type: input.type, label: input.label },
    select: { id: true },
  });
  if (existing) {
    throw new AuthorizationError("Ky lokacion ekziston tashmë në konviktin tuaj.");
  }

  return prisma.location.create({
    data: {
      dormitoryId: admin.dormitoryId,
      label: input.label,
      type: input.type,
      floor: input.floor,
    },
    select: { id: true, label: true },
  });
}

/**
 * Removing a location is refused when anything still depends on it — a resident living in the
 * room, or a request pointing at it. Deleting either would rewrite history, and the request
 * archive is the thesis's evidence base.
 */
export async function deleteLocation(
  admin: SessionUser & { dormitoryId: string },
  locationId: string,
) {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: {
      id: true,
      dormitoryId: true,
      _count: { select: { residents: true, maintenanceRequests: true } },
    },
  });

  if (!location) throw new AuthorizationError("Lokacioni nuk ekziston.", 404);
  assertSameDormitory(admin, location.dormitoryId);

  if (location._count.residents > 0) {
    throw new AuthorizationError(
      "Lokacioni nuk mund të fshihet sepse ka studentë të caktuar në të.",
    );
  }
  if (location._count.maintenanceRequests > 0) {
    throw new AuthorizationError(
      "Lokacioni nuk mund të fshihet sepse ka kërkesa të lidhura me të.",
    );
  }

  await prisma.location.delete({ where: { id: locationId } });
}

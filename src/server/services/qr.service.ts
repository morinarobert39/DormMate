import { randomBytes } from "node:crypto";

import QRCodeLib from "qrcode";

import { LocationType } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import { AuthorizationError, assertSameDormitory, type SessionUser } from "@/server/guards";
import { storeBuffer } from "@/server/services/storage.service";

/**
 * QR code management (Development Architecture §5.2).
 *
 * The administrator generates a code and assigns its location — two decisions, one screen. A code
 * with no location is inert: `resolveQrToken` in the maintenance service refuses it, so a sheet of
 * blank stickers can be printed ahead of time and assigned as they go up on doors.
 *
 * Tokens are random, not derived from the location id. A predictable token would let anyone
 * enumerate rooms and file reports against doors they have never seen.
 */

function newToken(): string {
  return randomBytes(9).toString("base64url");
}

/**
 * The origin a sticker points at.
 *
 * A printed QR code is permanent in a way a link never is: once it is on a door, an origin that is
 * wrong, missing a scheme, or plain `http` cannot be corrected without reprinting and re-sticking
 * every sticker in the building. So this normalises hard rather than trusting configuration:
 *
 *   - `APP_URL` wins when set, but a bare host ("dormmate.vercel.app") gets a scheme, and any
 *     non-local host is forced to https — an http sticker makes every phone show a
 *     "not secure" warning at the exact moment a student is deciding whether to trust the site.
 *   - Vercel injects the deployment host automatically, so a forgotten `APP_URL` still produces
 *     scannable stickers instead of silently baking in `localhost`.
 */
export function resolveAppOrigin(): string {
  const configured = process.env.APP_URL?.trim();

  if (configured) {
    const withScheme = /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;
    const url = new URL(withScheme);
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    // Local development is the only place plain http is legitimate.
    if (!isLocal) url.protocol = "https:";
    return url.origin;
  }

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? null;
  if (vercelHost) return `https://${vercelHost.replace(/^https?:\/\//, "")}`;

  return "http://localhost:3000";
}

/** The absolute URL a sticker encodes. Must be reachable from a phone to be scannable. */
export function qrTargetUrl(token: string): string {
  return `${resolveAppOrigin()}/r/${token}`;
}

const QR_RENDER_OPTIONS = {
  errorCorrectionLevel: "M" as const,
  margin: 1,
  width: 320,
  color: { dark: "#101a2b", light: "#ffffff" },
};

/** PNG data URL. The fallback when a code has no stored image yet. */
export async function renderQrDataUrl(token: string): Promise<string> {
  return QRCodeLib.toDataURL(qrTargetUrl(token), QR_RENDER_OPTIONS);
}

/**
 * Render the PNG and put it in storage, returning its URL.
 *
 * Keyed by token, so regenerating a location's code writes a new object rather than overwriting
 * the image behind a sticker that may still be on a door.
 */
async function storeQrImage(token: string): Promise<string | null> {
  try {
    const buffer = await QRCodeLib.toBuffer(qrTargetUrl(token), QR_RENDER_OPTIONS);
    return await storeBuffer(buffer, {
      key: `qr/${token}.png`,
      contentType: "image/png",
    });
  } catch (error) {
    // A storage outage must not stop an administrator generating codes: the token is what
    // matters, and the print sheet falls back to rendering the PNG inline.
    console.error("Failed to store QR image:", error);
    return null;
  }
}

export async function listQrCodes(admin: SessionUser & { dormitoryId: string }) {
  return prisma.qRCode.findMany({
    where: {
      OR: [
        { location: { dormitoryId: admin.dormitoryId } },
        // Unassigned codes are not tied to a dormitory yet, so scope them by their creator.
        { locationId: null, createdById: admin.id },
      ],
    },
    select: {
      id: true,
      token: true,
      isActive: true,
      createdAt: true,
      location: { select: { id: true, label: true, type: true, floor: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });
}

/** Locations in this dormitory that have no active code yet — the assignment candidates. */
export async function listUnassignedLocations(admin: SessionUser & { dormitoryId: string }) {
  return prisma.location.findMany({
    where: { dormitoryId: admin.dormitoryId, qrCode: null },
    select: { id: true, label: true, type: true, floor: true },
    orderBy: [{ type: "asc" }, { floor: "asc" }, { label: "asc" }],
  });
}

/**
 * Generate a code and assign it to a location in one step.
 * A location holds at most one code (`locationId` is unique), so this refuses duplicates.
 */
export async function generateQrForLocation(
  admin: SessionUser & { dormitoryId: string },
  locationId: string,
) {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { id: true, dormitoryId: true, qrCode: { select: { id: true } } },
  });

  if (!location) throw new AuthorizationError("Lokacioni nuk ekziston.", 404);
  assertSameDormitory(admin, location.dormitoryId);

  if (location.qrCode) {
    throw new AuthorizationError("Ky lokacion tashmë ka një kod QR.");
  }

  const token = newToken();
  const imageUrl = await storeQrImage(token);

  return prisma.qRCode.create({
    data: { token, imageUrl, locationId: location.id, createdById: admin.id },
    select: { id: true, token: true },
  });
}

/** Generate codes for every location in the dormitory that lacks one. */
export async function generateMissingQrCodes(admin: SessionUser & { dormitoryId: string }) {
  const locations = await listUnassignedLocations(admin);
  if (locations.length === 0) return 0;

  const rows = await Promise.all(
    locations.map(async (l) => {
      const token = newToken();
      return {
        token,
        imageUrl: await storeQrImage(token),
        locationId: l.id,
        createdById: admin.id,
      };
    }),
  );

  await prisma.qRCode.createMany({ data: rows });

  return locations.length;
}

/**
 * Issue a fresh token for a location, invalidating the sticker currently on the door.
 * Used when a sticker is defaced, photographed and shared, or simply lost.
 */
export async function regenerateQrCode(
  admin: SessionUser & { dormitoryId: string },
  qrCodeId: string,
) {
  const qr = await prisma.qRCode.findUnique({
    where: { id: qrCodeId },
    select: { id: true, location: { select: { dormitoryId: true } } },
  });

  if (!qr) throw new AuthorizationError("Kodi QR nuk ekziston.", 404);
  if (qr.location) assertSameDormitory(admin, qr.location.dormitoryId);

  const token = newToken();
  const imageUrl = await storeQrImage(token);

  return prisma.qRCode.update({
    where: { id: qr.id },
    data: { token, imageUrl, isActive: true },
    select: { id: true, token: true },
  });
}

export async function setQrActive(
  admin: SessionUser & { dormitoryId: string },
  qrCodeId: string,
  isActive: boolean,
) {
  const qr = await prisma.qRCode.findUnique({
    where: { id: qrCodeId },
    select: { id: true, location: { select: { dormitoryId: true } } },
  });

  if (!qr) throw new AuthorizationError("Kodi QR nuk ekziston.", 404);
  if (qr.location) assertSameDormitory(admin, qr.location.dormitoryId);

  await prisma.qRCode.update({ where: { id: qr.id }, data: { isActive } });
}

/** Everything the printable sheet needs, with the PNGs already rendered. */
export async function getPrintableStickers(
  admin: SessionUser & { dormitoryId: string },
  filter?: { type?: LocationType },
) {
  const codes = await prisma.qRCode.findMany({
    where: {
      isActive: true,
      location: {
        dormitoryId: admin.dormitoryId,
        ...(filter?.type ? { type: filter.type } : {}),
      },
    },
    select: {
      id: true,
      token: true,
      imageUrl: true,
      location: { select: { label: true, type: true, floor: true } },
    },
    orderBy: [{ location: { type: "asc" } }, { location: { label: "asc" } }],
  });

  const dormitory = await prisma.dormitory.findUnique({
    where: { id: admin.dormitoryId },
    select: { name: true, code: true },
  });

  return Promise.all(
    codes.map(async (c) => ({
      id: c.id,
      token: c.token,
      location: c.location!,
      // Prefer the stored PNG; fall back to inlining for codes generated before image storage
      // existed, so an older dormitory's sheet still prints.
      dataUrl: c.imageUrl ?? (await renderQrDataUrl(c.token)),
      dormitory,
    })),
  );
}

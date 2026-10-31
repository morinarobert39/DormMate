import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { del, put } from "@vercel/blob";

/**
 * File storage.
 *
 * Vercel runs the application on a read-only filesystem, so writing uploads into `public/` — which
 * works locally — fails in production and would take the whole report submission down with it.
 * Every upload therefore goes through this module, which picks a backend once:
 *
 *   - `BLOB_READ_WRITE_TOKEN` present  → Vercel Blob (production, and any local run that sets it)
 *   - otherwise                        → `public/uploads`, so the project still runs offline with
 *                                        no cloud account attached
 *
 * Callers only ever see the returned URL, so nothing else in the codebase has to know which
 * backend is live.
 */

export type StoredFile = {
  /** Public URL — a Blob URL in production, a `/uploads/...` path locally. */
  url: string;
  filename: string;
  contentType: string;
  size: number;
};

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Documents an administrator may attach to an administrative request (e.g. a certificate PDF). */
export const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export class UploadError extends Error {}

function extensionFor(contentType: string, originalName: string): string {
  const known = EXTENSIONS[contentType];
  if (known) return known;
  const fromName = path.extname(originalName).replace(".", "").toLowerCase();
  return fromName || "bin";
}

/**
 * Blob keys are prefixed and randomised rather than taken from the uploaded filename.
 * A student's photo of a broken lock should not be reachable by guessing "lock.jpg", and two
 * students uploading `IMG_0001.jpg` must not collide.
 */
function buildKey(prefix: string, contentType: string, originalName: string): string {
  const ext = extensionFor(contentType, originalName);
  return `${prefix}/${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
}

/** Validate then store a single uploaded file. */
export async function storeUpload(
  file: File,
  options: { prefix: string; allowedTypes: Set<string>; maxBytes?: number },
): Promise<StoredFile> {
  const maxBytes = options.maxBytes ?? MAX_UPLOAD_BYTES;

  if (!options.allowedTypes.has(file.type)) {
    throw new UploadError("Formati i skedarit nuk lejohet.");
  }
  if (file.size > maxBytes) {
    throw new UploadError(
      `Skedari është më i madh se ${Math.round(maxBytes / (1024 * 1024))} MB.`,
    );
  }
  if (file.size === 0) {
    throw new UploadError("Skedari është i zbrazët.");
  }

  const key = buildKey(options.prefix, file.type, file.name);

  if (isBlobConfigured()) {
    const blob = await put(key, file, {
      access: "public",
      contentType: file.type,
      // The key is already unique; letting Blob add its own suffix would make the stored URL
      // impossible to derive from the key we recorded.
      addRandomSuffix: false,
    });
    return { url: blob.url, filename: file.name, contentType: file.type, size: file.size };
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", options.prefix);
  await mkdir(uploadDir, { recursive: true });
  const localName = path.basename(key);
  await writeFile(path.join(uploadDir, localName), Buffer.from(await file.arrayBuffer()));

  return {
    url: `/uploads/${options.prefix}/${localName}`,
    filename: file.name,
    contentType: file.type,
    size: file.size,
  };
}

/** Store raw bytes we generated ourselves, such as a rendered QR PNG. */
export async function storeBuffer(
  buffer: Buffer,
  options: { key: string; contentType: string },
): Promise<string> {
  if (isBlobConfigured()) {
    const blob = await put(options.key, buffer, {
      access: "public",
      contentType: options.contentType,
      addRandomSuffix: false,
      // A regenerated QR for the same location intentionally replaces the previous image.
      allowOverwrite: true,
    });
    return blob.url;
  }

  const target = path.join(process.cwd(), "public", "uploads", options.key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  return `/uploads/${options.key}`;
}

/**
 * Best-effort delete. A storage failure must never prevent the database row from being removed,
 * because an orphaned file is harmless while a record that cannot be deleted is not.
 */
export async function removeStored(url: string): Promise<void> {
  try {
    if (isBlobConfigured() && url.startsWith("http")) {
      await del(url);
      return;
    }
    if (url.startsWith("/uploads/")) {
      await unlink(path.join(process.cwd(), "public", url.replace(/^\//, "")));
    }
  } catch {
    // Intentionally ignored.
  }
}

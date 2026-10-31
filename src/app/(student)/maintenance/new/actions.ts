"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createMaintenanceSchema } from "@/lib/validation/request";
import { AuthorizationError, requireStudent } from "@/server/guards";
import { createMaintenance } from "@/server/services/maintenance.service";
import { IMAGE_TYPES, UploadError, storeUpload } from "@/server/services/storage.service";

export type ReportFormState = { error?: string; fieldErrors?: Record<string, string> };

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

/**
 * Business Analysis §10.1 makes photos optional on a maintenance report.
 * Where the bytes actually land is the storage service's decision, not this action's.
 */
async function savePhotos(files: File[]): Promise<string[]> {
  const usable = files.filter((f) => f && f.size > 0).slice(0, MAX_PHOTOS);
  if (usable.length === 0) return [];

  const stored = await Promise.all(
    usable.map((file) =>
      storeUpload(file, {
        prefix: "maintenance",
        allowedTypes: IMAGE_TYPES,
        maxBytes: MAX_PHOTO_BYTES,
      }),
    ),
  );

  return stored.map((s) => s.url);
}

export async function submitMaintenanceReport(
  _prev: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  let requestNumber: number;

  try {
    const student = await requireStudent();

    const parsed = createMaintenanceSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description"),
      categoryId: formData.get("categoryId"),
      priority: formData.get("priority"),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { fieldErrors };
    }

    // The location target. Note what is NOT read here: when the student chose their own room,
    // no id crosses the wire at all — the service resolves it from the session. A room id can
    // therefore never be supplied by the client for the "own-room" path.
    const targetKind = String(formData.get("target") ?? "own-room");
    const token = formData.get("token");
    const locationId = formData.get("locationId");

    const target =
      targetKind === "qr" && typeof token === "string" && token
        ? ({ target: "qr", token } as const)
        : targetKind === "shared"
          ? ({ target: "shared", locationId: String(locationId ?? "") } as const)
          : ({ target: "own-room" } as const);

    if (target.target === "shared" && !target.locationId) {
      return { fieldErrors: { locationId: "Zgjidhni një lokacion." } };
    }

    const photoPaths = await savePhotos(formData.getAll("photos") as File[]);

    const request = await createMaintenance(student, parsed.data, target, photoPaths);
    requestNumber = request.number;
  } catch (error) {
    // Only messages we wrote ourselves are safe to show. Anything else — a driver fault, a
    // storage failure — is logged for the server and replaced with plain language, per
    // Technical Design §14: an error must never expose technical detail to the user.
    if (error instanceof AuthorizationError || error instanceof UploadError) {
      return { error: error.message };
    }
    console.error("submitMaintenanceReport failed:", error);
    return { error: "Kërkesa nuk mund të dërgohej. Provoni përsëri." };
  }

  // redirect() throws, so it must sit outside the try block.
  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
  redirect(`/maintenance/${requestNumber}?created=1`);
}

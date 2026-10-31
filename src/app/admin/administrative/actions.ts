"use server";

import { revalidatePath } from "next/cache";

import { respondSchema, updateStatusSchema } from "@/lib/validation/request";
import { AuthorizationError, requireAdmin, requireUser } from "@/server/guards";
import {
  attachToAdministrative,
  removeAdministrativeAttachment,
  respondToAdministrative,
  updateAdministrativeStatus,
} from "@/server/services/administrative.service";
import {
  DOCUMENT_TYPES,
  UploadError,
  removeStored,
  storeUpload,
} from "@/server/services/storage.service";

export type StatusFormState = { error?: string; success?: string };

export async function changeAdministrativeStatus(
  _prev: StatusFormState,
  formData: FormData,
): Promise<StatusFormState> {
  try {
    const admin = await requireAdmin();

    const requestNumber = Number(formData.get("number"));
    if (!Number.isInteger(requestNumber)) return { error: "Kërkesa nuk u gjet." };

    const parsed = updateStatusSchema.safeParse({
      status: formData.get("status"),
      note: formData.get("note") || undefined,
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Statusi është i pavlefshëm." };
    }

    await updateAdministrativeStatus(admin, requestNumber, parsed.data.status, parsed.data.note);

    revalidatePath(`/admin/administrative/${requestNumber}`);
    revalidatePath("/admin/administrative");
    revalidatePath("/admin");

    return { success: "Statusi u përditësua dhe studenti u njoftua." };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Statusi nuk mund të përditësohej." };
  }
}

/**
 * The written answer. Kept separate from the status change because BR-06 has no "rejected"
 * status: a refusal is a RESOLVED request whose response explains why.
 */
export async function respondToRequest(
  _prev: StatusFormState,
  formData: FormData,
): Promise<StatusFormState> {
  try {
    const admin = await requireAdmin();

    const requestNumber = Number(formData.get("number"));
    if (!Number.isInteger(requestNumber)) return { error: "Kërkesa nuk u gjet." };

    const parsed = respondSchema.safeParse({ adminResponse: formData.get("adminResponse") });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Përgjigjja është e pavlefshme." };
    }

    await respondToAdministrative(admin, requestNumber, parsed.data.adminResponse);

    revalidatePath(`/admin/administrative/${requestNumber}`);
    revalidatePath("/admin/administrative");

    return { success: "Përgjigjja u ruajt dhe studenti u njoftua." };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Përgjigjja nuk mund të ruhej." };
  }
}

/**
 * Attach a document. Shared by both roles — `requireUser` rather than `requireAdmin`, with the
 * service applying whichever access rule fits the caller.
 */
export async function uploadAdministrativeAttachment(
  _prev: StatusFormState,
  formData: FormData,
): Promise<StatusFormState> {
  try {
    const user = await requireUser();

    const requestNumber = Number(formData.get("number"));
    if (!Number.isInteger(requestNumber)) return { error: "Kërkesa nuk u gjet." };

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Zgjidhni një skedar për ta ngarkuar." };
    }

    const stored = await storeUpload(file, {
      prefix: `administrative/${requestNumber}`,
      allowedTypes: DOCUMENT_TYPES,
    });

    await attachToAdministrative(user, requestNumber, stored);

    revalidatePath(`/admin/administrative/${requestNumber}`);
    revalidatePath(`/administrative/${requestNumber}`);

    return { success: "Skedari u bashkëngjit." };
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof UploadError) {
      return { error: error.message };
    }
    console.error("uploadAdministrativeAttachment failed:", error);
    return { error: "Skedari nuk mund të ngarkohej. Provoni përsëri." };
  }
}

export async function deleteAdministrativeAttachment(
  _prev: StatusFormState,
  formData: FormData,
): Promise<StatusFormState> {
  try {
    const user = await requireUser();

    const attachmentId = String(formData.get("attachmentId") ?? "");
    if (!attachmentId) return { error: "Skedari nuk u gjet." };

    const { url, requestNumber } = await removeAdministrativeAttachment(user, attachmentId);
    // The row is gone either way; a leftover object in storage is harmless.
    await removeStored(url);

    revalidatePath(`/admin/administrative/${requestNumber}`);
    revalidatePath(`/administrative/${requestNumber}`);

    return { success: "Skedari u fshi." };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    console.error("deleteAdministrativeAttachment failed:", error);
    return { error: "Skedari nuk mund të fshihej." };
  }
}

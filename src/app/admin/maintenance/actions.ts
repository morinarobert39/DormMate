"use server";

import { revalidatePath } from "next/cache";

import { updateStatusSchema } from "@/lib/validation/request";
import { AuthorizationError, requireAdmin } from "@/server/guards";
import { updateMaintenanceStatus } from "@/server/services/maintenance.service";

export type StatusFormState = { error?: string; success?: string };

/**
 * EF-04 — `requireAdmin` runs before anything else, so a student POSTing this action directly
 * is rejected regardless of what the UI shows them.
 */
export async function changeMaintenanceStatus(
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

    await updateMaintenanceStatus(admin, requestNumber, parsed.data.status, parsed.data.note);

    revalidatePath(`/admin/maintenance/${requestNumber}`);
    revalidatePath("/admin/maintenance");
    revalidatePath("/admin");

    return { success: "Statusi u përditësua dhe studenti u njoftua." };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Statusi nuk mund të përditësohej. Provoni përsëri." };
  }
}

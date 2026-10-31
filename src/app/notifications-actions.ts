"use server";

import { revalidatePath } from "next/cache";

import { AuthorizationError, requireUser } from "@/server/guards";
import { markAllAsRead, markAsRead } from "@/server/services/notification.service";

export type NotificationFormState = { error?: string };

/**
 * Shared by the student and administrator notification screens. Both service functions scope
 * by the caller's own id, so one user can never mark another's notifications read.
 */

function revalidateBoth() {
  revalidatePath("/notifications");
  revalidatePath("/admin/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

export async function markOneReadAction(
  _prev: NotificationFormState,
  formData: FormData,
): Promise<NotificationFormState> {
  try {
    const user = await requireUser();
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Njoftimi nuk u gjet." };

    await markAsRead(user.id, id);
    revalidateBoth();
    return {};
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Veprimi dështoi." };
  }
}

export async function markAllReadAction(
  _prev: NotificationFormState,
  _formData: FormData,
): Promise<NotificationFormState> {
  try {
    const user = await requireUser();
    await markAllAsRead(user.id);
    revalidateBoth();
    return {};
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Veprimi dështoi." };
  }
}

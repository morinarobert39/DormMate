"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AnnouncementScope } from "@/generated/prisma/enums";
import { AuthorizationError, requireAdmin } from "@/server/guards";
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from "@/server/services/announcement.service";

export type AnnouncementFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const announcementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Titulli duhet të ketë së paku 5 karaktere.")
    .max(150, "Titulli është shumë i gjatë."),
  body: z
    .string()
    .trim()
    .min(10, "Përmbajtja duhet të ketë së paku 10 karaktere.")
    .max(5000, "Përmbajtja është shumë e gjatë."),
  scope: z.enum(AnnouncementScope),
});

function parseForm(formData: FormData) {
  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    scope: formData.get("scope"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false as const, fieldErrors };
  }

  const dormitoryIds = formData.getAll("dormitoryIds").map(String).filter(Boolean);
  return { ok: true as const, data: { ...parsed.data, dormitoryIds } };
}

export async function createAnnouncementAction(
  _prev: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  try {
    const admin = await requireAdmin();
    const parsed = parseForm(formData);
    if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

    await createAnnouncement(admin, parsed.data);
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Njoftimi nuk mund të publikohej." };
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/announcements");
  redirect("/admin/announcements?created=1");
}

export async function updateAnnouncementAction(
  _prev: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  try {
    const admin = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Njoftimi nuk u gjet." };

    const parsed = parseForm(formData);
    if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

    await updateAnnouncement(admin, id, parsed.data);
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Njoftimi nuk mund të përditësohej." };
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/announcements");
  redirect("/admin/announcements?updated=1");
}

export async function deleteAnnouncementAction(
  _prev: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  try {
    const admin = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Njoftimi nuk u gjet." };

    await deleteAnnouncement(admin, id);
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Njoftimi nuk mund të fshihej." };
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/announcements");
  redirect("/admin/announcements?deleted=1");
}

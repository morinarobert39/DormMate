"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { LocationType } from "@/generated/prisma/enums";
import { AuthorizationError, requireAdmin } from "@/server/guards";
import { createLocation, deleteLocation } from "@/server/services/location.service";

export type LocationFormState = { error?: string; success?: string };

const locationSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Emërtimi është i detyrueshëm.")
    .max(64, "Emërtimi është shumë i gjatë."),
  type: z.enum(LocationType),
  floor: z
    .union([z.coerce.number().int().min(0).max(50), z.literal("")])
    .transform((v) => (v === "" ? null : (v as number))),
});

export async function createLocationAction(
  _prev: LocationFormState,
  formData: FormData,
): Promise<LocationFormState> {
  try {
    const admin = await requireAdmin();

    const parsed = locationSchema.safeParse({
      label: formData.get("label"),
      type: formData.get("type"),
      floor: formData.get("floor") ?? "",
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Të dhënat nuk janë të vlefshme." };
    }

    await createLocation(admin, parsed.data);
    revalidatePath("/admin/locations");
    revalidatePath("/admin/qr-codes");
    return { success: "Lokacioni u shtua." };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Lokacioni nuk mund të shtohej." };
  }
}

export async function deleteLocationAction(
  _prev: LocationFormState,
  formData: FormData,
): Promise<LocationFormState> {
  try {
    const admin = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Lokacioni nuk u gjet." };

    await deleteLocation(admin, id);
    revalidatePath("/admin/locations");
    revalidatePath("/admin/qr-codes");
    return { success: "Lokacioni u fshi." };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Lokacioni nuk mund të fshihej." };
  }
}

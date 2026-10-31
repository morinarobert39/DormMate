"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { AuthorizationError, requireAdmin } from "@/server/guards";
import {
  assignRoom,
  createStudent,
  resetStudentPassword,
  setStudentActive,
} from "@/server/services/user.service";

export type UserFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

const createStudentSchema = z.object({
  firstName: z.string().trim().min(2, "Emri është i detyrueshëm.").max(64),
  lastName: z.string().trim().min(2, "Mbiemri është i detyrueshëm.").max(64),
  personalNumber: z
    .string()
    .trim()
    .min(4, "Numri personal duhet të ketë së paku 4 karaktere.")
    .max(32, "Numri personal është shumë i gjatë."),
  email: z
    .union([z.email("Email-i nuk është i vlefshëm."), z.literal("")])
    .transform((v) => (v === "" ? null : v)),
  phone: z
    .string()
    .trim()
    .max(32)
    .transform((v) => (v === "" ? null : v)),
  roomId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),
  password: z
    .string()
    .min(8, "Fjalëkalimi duhet të ketë së paku 8 karaktere.")
    .max(72, "Fjalëkalimi është shumë i gjatë."),
});

export async function createStudentAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  try {
    const admin = await requireAdmin();

    const parsed = createStudentSchema.safeParse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      personalNumber: formData.get("personalNumber"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      roomId: formData.get("roomId"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { fieldErrors };
    }

    const student = await createStudent(admin, parsed.data);
    revalidatePath("/admin/users");
    return { success: `Llogaria për ${student.firstName} ${student.lastName} u krijua.` };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Llogaria nuk mund të krijohej." };
  }
}

export async function assignRoomAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  try {
    const admin = await requireAdmin();
    const studentId = String(formData.get("studentId") ?? "");
    const roomId = String(formData.get("roomId") ?? "");

    await assignRoom(admin, studentId, roomId || null);
    revalidatePath("/admin/users");
    return { success: "Dhoma u caktua." };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Dhoma nuk mund të caktohej." };
  }
}

export async function toggleStudentActiveAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  try {
    const admin = await requireAdmin();
    const studentId = String(formData.get("studentId") ?? "");
    const isActive = formData.get("isActive") === "true";

    await setStudentActive(admin, studentId, isActive);
    revalidatePath("/admin/users");
    return { success: isActive ? "Llogaria u aktivizua." : "Llogaria u çaktivizua." };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Veprimi dështoi." };
  }
}

/** Closes the loop on the "forgot password" screen, which has no mail server behind it. */
export async function resetPasswordAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  try {
    const admin = await requireAdmin();
    const studentId = String(formData.get("studentId") ?? "");
    const password = String(formData.get("password") ?? "");

    if (password.length < 8) {
      return { error: "Fjalëkalimi duhet të ketë së paku 8 karaktere." };
    }

    await resetStudentPassword(admin, studentId, password);
    revalidatePath("/admin/users");
    return { success: "Fjalëkalimi u ndryshua. Komunikojani studentit fjalëkalimin e ri." };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Fjalëkalimi nuk mund të ndryshohej." };
  }
}

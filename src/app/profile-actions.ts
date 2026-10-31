"use server";

import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { changePasswordSchema } from "@/lib/validation/auth";
import { prisma } from "@/server/db";
import { AuthorizationError, requireUser } from "@/server/guards";

export type ProfileFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Profile module (§10.8): view personal data, update the few contact fields a user owns, and
 * change the password.
 *
 * Name, personal number, dormitory and room are deliberately NOT editable — BR-02 ties a student
 * to one dormitory and room, and only an administrator may change that assignment.
 */
const contactSchema = z.object({
  email: z
    .union([z.email("Email-i nuk është i vlefshëm."), z.literal("")])
    .transform((v) => (v === "" ? null : v)),
  phone: z
    .string()
    .trim()
    .max(32, "Numri i telefonit është shumë i gjatë.")
    .transform((v) => (v === "" ? null : v)),
});

export async function updateContactAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  try {
    const user = await requireUser();

    const parsed = contactSchema.safeParse({
      email: formData.get("email"),
      phone: formData.get("phone"),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { fieldErrors };
    }

    // email is unique in the schema; a clash would otherwise surface as a raw Prisma error.
    if (parsed.data.email) {
      const clash = await prisma.user.findFirst({
        where: { email: parsed.data.email, NOT: { id: user.id } },
        select: { id: true },
      });
      if (clash) return { fieldErrors: { email: "Ky email është i zënë nga një përdorues tjetër." } };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { email: parsed.data.email, phone: parsed.data.phone },
    });

    revalidatePath("/profile");
    revalidatePath("/admin/profile");
    return { success: "Të dhënat u përditësuan." };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Të dhënat nuk mund të përditësoheshin." };
  }
}

export async function changePasswordAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  try {
    const user = await requireUser();

    const parsed = changePasswordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { fieldErrors };
    }

    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!record) return { error: "Përdoruesi nuk u gjet." };

    const valid = await compare(parsed.data.currentPassword, record.passwordHash);
    if (!valid) {
      return { fieldErrors: { currentPassword: "Fjalëkalimi aktual nuk është i saktë." } };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hash(parsed.data.newPassword, 10) },
    });

    return { success: "Fjalëkalimi u ndryshua me sukses." };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Fjalëkalimi nuk mund të ndryshohej." };
  }
}

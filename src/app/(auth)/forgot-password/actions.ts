"use server";

import { forgotPasswordSchema } from "@/lib/validation/auth";
import { prisma } from "@/server/db";

export type ForgotPasswordState = {
  error?: string;
  success?: string;
};

/**
 * There is no mail server in this prototype, so "forgot password" raises a reset request that the
 * dormitory administrator clears from the User Management screen.
 *
 * The response is identical whether or not the personal number exists — otherwise this form would
 * let anyone test which personal numbers are registered.
 */
export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({
    personalNumber: formData.get("personalNumber"),
  });

  if (!parsed.success) {
    return { error: "Numri personal është i detyrueshëm." };
  }

  const user = await prisma.user.findUnique({
    where: { personalNumber: parsed.data.personalNumber },
    select: { id: true },
  });

  if (user) {
    const existing = await prisma.passwordResetRequest.findFirst({
      where: { userId: user.id, isHandled: false },
      select: { id: true },
    });

    if (!existing) {
      await prisma.passwordResetRequest.create({ data: { userId: user.id } });
    }
  }

  return {
    success:
      "Kërkesa u regjistrua. Administrata e konviktit do t'ju kontaktojë për fjalëkalimin e ri.",
  };
}

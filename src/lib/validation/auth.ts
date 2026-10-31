import { z } from "zod";

export const loginSchema = z.object({
  personalNumber: z
    .string()
    .trim()
    .min(1, "Numri personal është i detyrueshëm.")
    .max(32, "Numri personal është shumë i gjatë."),
  password: z.string().min(1, "Fjalëkalimi është i detyrueshëm."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  personalNumber: z.string().trim().min(1, "Numri personal është i detyrueshëm."),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Fjalëkalimi aktual është i detyrueshëm."),
    newPassword: z
      .string()
      .min(8, "Fjalëkalimi i ri duhet të ketë së paku 8 karaktere.")
      .max(72, "Fjalëkalimi është shumë i gjatë."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Fjalëkalimet nuk përputhen.",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

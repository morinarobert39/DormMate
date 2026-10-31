"use server";

import { AuthError } from "next-auth";

import { loginSchema } from "@/lib/validation/auth";
import { signIn } from "@/server/auth";

export type LoginState = {
  error?: string;
  fieldErrors?: Partial<Record<"personalNumber" | "password", string>>;
};

/**
 * Only same-origin relative paths may be used as a post-login destination, so a crafted
 * `?callbackUrl=https://evil.example` cannot turn the login screen into an open redirect.
 */
function safeCallbackUrl(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value : "";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    personalNumber: formData.get("personalNumber"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        personalNumber: flattened.personalNumber?.[0],
        password: flattened.password?.[0],
      },
    };
  }

  try {
    await signIn("credentials", {
      personalNumber: parsed.data.personalNumber,
      password: parsed.data.password,
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (error) {
    // A successful sign-in throws NEXT_REDIRECT, which must be allowed to propagate.
    if (error instanceof AuthError) {
      return { error: "Numri personal ose fjalëkalimi nuk është i saktë." };
    }
    throw error;
  }

  return {};
}

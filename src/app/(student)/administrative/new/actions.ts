"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdministrativeSchema } from "@/lib/validation/request";
import { AuthorizationError, requireStudent } from "@/server/guards";
import { createAdministrative } from "@/server/services/administrative.service";

export type AdminRequestFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function submitAdministrativeRequest(
  _prev: AdminRequestFormState,
  formData: FormData,
): Promise<AdminRequestFormState> {
  let requestNumber: number;

  try {
    const student = await requireStudent();

    const parsed = createAdministrativeSchema.safeParse({
      subject: formData.get("subject"),
      description: formData.get("description"),
      categoryId: formData.get("categoryId"),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { fieldErrors };
    }

    const request = await createAdministrative(student, parsed.data);
    requestNumber = request.number;
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    return { error: "Kërkesa nuk mund të dërgohej. Provoni përsëri." };
  }

  revalidatePath("/administrative");
  revalidatePath("/dashboard");
  redirect(`/administrative/${requestNumber}?created=1`);
}

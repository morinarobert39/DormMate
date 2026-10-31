"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess, Input } from "@/components/ui/field";
import { requestPasswordResetAction, type ForgotPasswordState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Duke dërguar..." : "Dërgo kërkesën"}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordResetAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <Field label="Numri Personal" htmlFor="personalNumber" required>
        <Input
          id="personalNumber"
          name="personalNumber"
          autoComplete="username"
          inputMode="numeric"
          autoFocus
        />
      </Field>

      <SubmitButton />
    </form>
  );
}

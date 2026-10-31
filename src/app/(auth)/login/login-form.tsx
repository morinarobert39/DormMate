"use client";

import { LogIn } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";
import { loginAction, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      <LogIn className="size-4" />
      {pending ? "Duke u kyçur..." : "Kyçu"}
    </Button>
  );
}

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <FormError message={state.error} />

      <Field
        label="Numri Personal"
        htmlFor="personalNumber"
        required
        error={state.fieldErrors?.personalNumber}
      >
        <Input
          id="personalNumber"
          name="personalNumber"
          autoComplete="username"
          inputMode="numeric"
          autoFocus
          placeholder="p.sh. 1234567890"
          invalid={Boolean(state.fieldErrors?.personalNumber)}
        />
      </Field>

      <Field
        label="Fjalëkalimi"
        htmlFor="password"
        required
        error={state.fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          invalid={Boolean(state.fieldErrors?.password)}
        />
      </Field>

      <SubmitButton />
    </form>
  );
}

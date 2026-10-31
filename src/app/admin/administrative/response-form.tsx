"use client";

import { MessageSquare } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess, Textarea } from "@/components/ui/field";

import { respondToRequest, type StatusFormState } from "./actions";

/** The administration's written answer to an administrative request (§10.3). */
export function ResponseForm({
  requestNumber,
  existingResponse,
}: {
  requestNumber: number;
  existingResponse: string | null;
}) {
  const [state, formAction, pending] = useActionState<StatusFormState, FormData>(
    respondToRequest,
    {},
  );

  return (
    <form action={formAction} className="space-y-3 p-4">
      <input type="hidden" name="number" value={requestNumber} />

      <Field
        label={existingResponse ? "Përditëso përgjigjen" : "Shkruani përgjigjen"}
        htmlFor="adminResponse"
        hint="Studenti njoftohet automatikisht sapo ta ruani."
      >
        <Textarea
          id="adminResponse"
          name="adminResponse"
          rows={5}
          maxLength={2000}
          defaultValue={existingResponse ?? ""}
          placeholder="p.sh. Certifikata është përgatitur dhe mund të tërhiqet në zyrën e administratës..."
        />
      </Field>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <Button type="submit" disabled={pending}>
        <MessageSquare className="size-4" />
        {pending ? "Duke ruajtur..." : "Ruaj përgjigjen"}
      </Button>
    </form>
  );
}

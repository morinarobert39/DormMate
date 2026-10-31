"use client";

import { Send } from "lucide-react";
import { useActionState } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { UI_TEXT } from "@/lib/constants";

import { submitAdministrativeRequest, type AdminRequestFormState } from "./actions";

/**
 * Administrative request form (§10.5).
 * No location and no QR — a category and a written reason are all this process needs (§9.6).
 */
export function AdministrativeRequestForm({
  categories,
}: {
  categories: { id: string; name: string; description: string | null }[];
}) {
  const [state, formAction, pending] = useActionState<AdminRequestFormState, FormData>(
    submitAdministrativeRequest,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardHeader title="Detajet e kërkesës" />
        <CardBody className="space-y-4">
          <Field
            label="Kategoria"
            htmlFor="categoryId"
            required
            error={state.fieldErrors?.categoryId}
            hint="Zgjidhni llojin e kërkesës që dëshironi të paraqisni."
          >
            <Select
              id="categoryId"
              name="categoryId"
              defaultValue=""
              invalid={Boolean(state.fieldErrors?.categoryId)}
            >
              <option value="" disabled>
                — Zgjidhni —
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Subjekti" htmlFor="subject" required error={state.fieldErrors?.subject}>
            <Input
              id="subject"
              name="subject"
              maxLength={120}
              placeholder="p.sh. Certifikatë banimi për bursë"
              invalid={Boolean(state.fieldErrors?.subject)}
            />
          </Field>

          <Field
            label="Arsyeja"
            htmlFor="description"
            required
            error={state.fieldErrors?.description}
            hint="Shpjegoni arsyen e kërkesës në mënyrë sa më të qartë."
          >
            <Textarea
              id="description"
              name="description"
              rows={6}
              maxLength={2000}
              placeholder="Përshkruani arsyen e kërkesës suaj..."
              invalid={Boolean(state.fieldErrors?.description)}
            />
          </Field>
        </CardBody>
      </Card>

      <FormError message={state.error} />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          <Send className="size-4" />
          {pending ? "Duke dërguar..." : "Dërgo kërkesën"}
        </Button>
        <ButtonLink href="/administrative" variant="secondary">
          {UI_TEXT.cancel}
        </ButtonLink>
      </div>
    </form>
  );
}

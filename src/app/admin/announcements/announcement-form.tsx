"use client";

import { Megaphone } from "lucide-react";
import { useActionState, useState } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, FormError, Input, Textarea } from "@/components/ui/field";
import { AnnouncementScope } from "@/generated/prisma/enums";
import { UI_TEXT } from "@/lib/constants";
import { cn } from "@/lib/utils";

import {
  createAnnouncementAction,
  updateAnnouncementAction,
  type AnnouncementFormState,
} from "./actions";

type Dormitory = { id: string; name: string; code: string };

/**
 * Create / edit an announcement (§10.6).
 * Scope decides the audience: one or more dormitories, or every dormitory (§9.7).
 */
export function AnnouncementForm({
  dormitories,
  adminDormitoryId,
  existing,
}: {
  dormitories: Dormitory[];
  adminDormitoryId: string;
  existing?: {
    id: string;
    title: string;
    body: string;
    scope: AnnouncementScope;
    dormitoryIds: string[];
  };
}) {
  const [state, formAction, pending] = useActionState<AnnouncementFormState, FormData>(
    existing ? updateAnnouncementAction : createAnnouncementAction,
    {},
  );

  const [scope, setScope] = useState<AnnouncementScope>(
    existing?.scope ?? AnnouncementScope.DORMITORY,
  );
  const [selected, setSelected] = useState<string[]>(
    existing?.dormitoryIds ?? [adminDormitoryId],
  );

  function toggleDormitory(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <form action={formAction} className="space-y-4">
      {existing ? <input type="hidden" name="id" value={existing.id} /> : null}
      <input type="hidden" name="scope" value={scope} />
      {scope === AnnouncementScope.DORMITORY
        ? selected.map((id) => (
            <input key={id} type="hidden" name="dormitoryIds" value={id} />
          ))
        : null}

      <Card>
        <CardHeader title="Përmbajtja e njoftimit" />
        <CardBody className="space-y-4">
          <Field label="Titulli" htmlFor="title" required error={state.fieldErrors?.title}>
            <Input
              id="title"
              name="title"
              maxLength={150}
              defaultValue={existing?.title}
              placeholder="p.sh. Ndërprerje e ujit të martën"
              invalid={Boolean(state.fieldErrors?.title)}
            />
          </Field>

          <Field
            label="Përmbajtja"
            htmlFor="body"
            required
            error={state.fieldErrors?.body}
            hint="Shkruani njoftimin qartë dhe përfshini datat ose oraret nëse ka."
          >
            <Textarea
              id="body"
              name="body"
              rows={8}
              maxLength={5000}
              defaultValue={existing?.body}
              placeholder="Shkruani përmbajtjen e njoftimit..."
              invalid={Boolean(state.fieldErrors?.body)}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Kujt i drejtohet" />
        <CardBody className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <ScopeOption
              selected={scope === AnnouncementScope.DORMITORY}
              onSelect={() => setScope(AnnouncementScope.DORMITORY)}
              title="Konvikte të zgjedhura"
              description="Vetëm studentët e konvikteve që zgjidhni"
            />
            <ScopeOption
              selected={scope === AnnouncementScope.GLOBAL}
              onSelect={() => setScope(AnnouncementScope.GLOBAL)}
              title="Të gjitha konviktet"
              description="Çdo student i platformës"
            />
          </div>

          {scope === AnnouncementScope.DORMITORY ? (
            <div className="space-y-2 border-t border-ink-100 pt-3">
              {dormitories.map((d) => (
                <label
                  key={d.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-card px-2 py-1.5 hover:bg-ink-50"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(d.id)}
                    onChange={() => toggleDormitory(d.id)}
                    className="size-4 rounded border-ink-300 text-brand-600"
                  />
                  <span className="text-sm text-ink-800">{d.name}</span>
                  <span className="font-mono text-xs text-ink-400">{d.code}</span>
                </label>
              ))}
              {selected.length === 0 ? (
                <p className="text-xs text-pending-fg">
                  Nëse nuk zgjidhni asnjë konvikt, njoftimi do t&apos;i drejtohet konviktit tuaj.
                </p>
              ) : null}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <FormError message={state.error} />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          <Megaphone className="size-4" />
          {pending ? "Duke ruajtur..." : existing ? "Ruaj ndryshimet" : "Publiko njoftimin"}
        </Button>
        <ButtonLink href="/admin/announcements" variant="secondary">
          {UI_TEXT.cancel}
        </ButtonLink>
      </div>
    </form>
  );
}

function ScopeOption({
  selected,
  onSelect,
  title,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "rounded-card border p-3 text-left transition-colors",
        selected
          ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
          : "border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50",
      )}
    >
      <span className="block text-sm font-medium text-ink-900">{title}</span>
      <span className="block text-xs text-ink-500">{description}</span>
    </button>
  );
}

"use client";

import { DoorClosed, Lock, QrCode, Send, Users } from "lucide-react";
import { useActionState, useState } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { LocationPlate } from "@/components/ui/location-plate";
import type { LocationType, Priority } from "@/generated/prisma/enums";
import { LOCATION_TYPE_LABELS, PRIORITY_LABELS, PRIORITY_ORDER, UI_TEXT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { submitMaintenanceReport, type ReportFormState } from "./actions";

type LocationOption = {
  id: string;
  label: string;
  type: LocationType;
  floor: number | null;
};

/**
 * The maintenance report form.
 *
 * The location control is the important part. A student reports on either:
 *   - their own room, which is displayed as a locked plate and submits no id at all; or
 *   - a shared space, chosen from a list that contains only shared spaces in their dormitory.
 *
 * There is deliberately no control anywhere on this screen that can name another student's room,
 * so misreporting onto someone else's door is not something the interface can express. The server
 * re-checks regardless (EF-02).
 */
export function ReportForm({
  ownRoom,
  sharedLocations,
  categories,
  scanned,
}: {
  ownRoom: LocationOption | null;
  sharedLocations: LocationOption[];
  categories: { id: string; name: string; description: string | null }[];
  scanned: { token: string; location: LocationOption } | null;
}) {
  const [state, formAction, pending] = useActionState<ReportFormState, FormData>(
    submitMaintenanceReport,
    {},
  );

  // A scan fixes the location; otherwise the student chooses their room or a shared space.
  const [target, setTarget] = useState<"own-room" | "shared">("own-room");
  const effectiveTarget = scanned ? "qr" : target;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="target" value={effectiveTarget} />
      {scanned ? <input type="hidden" name="token" value={scanned.token} /> : null}

      <Card>
        <CardHeader title="Lokacioni i problemit" />
        <CardBody className="space-y-4">
          {scanned ? (
            <div className="flex flex-wrap items-center gap-3 rounded-card border border-brand-100 bg-brand-50 p-3">
              <QrCode className="size-5 shrink-0 text-brand-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-ink-900">
                  Lokacioni u identifikua nga kodi QR
                </p>
                <p className="text-xs text-ink-600">
                  Nuk keni nevojë ta zgjidhni manualisht.
                </p>
              </div>
              <LocationPlate location={scanned.location} size="lg" showDormitory={false} />
            </div>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <TargetOption
                  selected={target === "own-room"}
                  onSelect={() => setTarget("own-room")}
                  icon={<DoorClosed className="size-4" />}
                  title="Dhoma ime"
                  description="Problem brenda dhomës suaj"
                  disabled={!ownRoom}
                />
                <TargetOption
                  selected={target === "shared"}
                  onSelect={() => setTarget("shared")}
                  icon={<Users className="size-4" />}
                  title="Hapësirë e përbashkët"
                  description="Korridor, tualet, dush, hyrje"
                />
              </div>

              {target === "own-room" ? (
                ownRoom ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-card border border-ink-200 bg-ink-50 p-3">
                    <LocationPlate location={ownRoom} size="lg" showDormitory={false} />
                    <p className="flex items-center gap-1.5 text-xs text-ink-500">
                      <Lock className="size-3.5" />
                      Dhoma juaj caktohet automatikisht dhe nuk mund të ndryshohet.
                    </p>
                  </div>
                ) : (
                  <FormError message="Llogaria juaj nuk ka një dhomë të caktuar. Kontaktoni administratën." />
                )
              ) : (
                <Field
                  label="Zgjidhni hapësirën"
                  htmlFor="locationId"
                  required
                  error={state.fieldErrors?.locationId}
                  hint="Lista përmban vetëm hapësirat e përbashkëta të konviktit tuaj."
                >
                  <Select id="locationId" name="locationId" defaultValue="">
                    <option value="" disabled>
                      — Zgjidhni —
                    </option>
                    {sharedLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {LOCATION_TYPE_LABELS[l.type]} — {l.label}
                        {l.floor !== null ? ` (Kati ${l.floor})` : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Detajet e problemit" />
        <CardBody className="space-y-4">
          <Field
            label="Titulli"
            htmlFor="title"
            required
            error={state.fieldErrors?.title}
            hint="Përshkrim i shkurtër, p.sh. “Rubineti pikon”."
          >
            <Input
              id="title"
              name="title"
              maxLength={120}
              placeholder="Përshkruani shkurt problemin"
              invalid={Boolean(state.fieldErrors?.title)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Kategoria"
              htmlFor="categoryId"
              required
              error={state.fieldErrors?.categoryId}
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

            <Field label="Prioriteti" htmlFor="priority" error={state.fieldErrors?.priority}>
              <Select id="priority" name="priority" defaultValue="MEDIUM">
                {PRIORITY_ORDER.map((p: Priority) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Përshkrimi"
            htmlFor="description"
            required
            error={state.fieldErrors?.description}
            hint="Sa më shumë detaje, aq më shpejt mund të zgjidhet problemi."
          >
            <Textarea
              id="description"
              name="description"
              rows={5}
              maxLength={2000}
              placeholder="Përshkruani problemin në detaje: çfarë ndodh, kur ka filluar, sa shpesh ndodh..."
              invalid={Boolean(state.fieldErrors?.description)}
            />
          </Field>

          <Field
            label="Fotografi (opsionale)"
            htmlFor="photos"
            hint="Deri në 3 fotografi, JPG/PNG/WEBP, maksimum 4 MB secila."
          >
            <input
              id="photos"
              name="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="block w-full text-sm text-ink-600 file:mr-3 file:rounded-card file:border-0 file:bg-ink-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink-700 hover:file:bg-ink-200"
            />
          </Field>
        </CardBody>
      </Card>

      <FormError message={state.error} />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending || (effectiveTarget === "own-room" && !ownRoom)}>
          <Send className="size-4" />
          {pending ? "Duke dërguar..." : "Dërgo kërkesën"}
        </Button>
        <ButtonLink href="/maintenance" variant="secondary">
          {UI_TEXT.cancel}
        </ButtonLink>
      </div>
    </form>
  );
}

function TargetOption({
  selected,
  onSelect,
  icon,
  title,
  description,
  disabled,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex items-start gap-3 rounded-card border p-3 text-left transition-colors",
        selected
          ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
          : "border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className={cn("mt-0.5", selected ? "text-brand-600" : "text-ink-400")}>{icon}</span>
      <span>
        <span className="block text-sm font-medium text-ink-900">{title}</span>
        <span className="block text-xs text-ink-500">{description}</span>
      </span>
    </button>
  );
}

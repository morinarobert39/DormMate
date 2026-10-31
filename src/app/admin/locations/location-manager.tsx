"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState } from "react";

import { Chip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardBody } from "@/components/ui/card";
import { Field, FormError, FormSuccess, Input, Select } from "@/components/ui/field";
import { LocationPlate } from "@/components/ui/location-plate";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { LocationType } from "@/generated/prisma/enums";
import { LOCATION_TYPE_LABELS } from "@/lib/constants";

import { createLocationAction, deleteLocationAction, type LocationFormState } from "./actions";

type LocationRow = {
  id: string;
  label: string;
  type: LocationType;
  floor: number | null;
  qrCode: { id: string; isActive: boolean } | null;
  _count: { residents: number; maintenanceRequests: number };
};

export function LocationForm() {
  const [state, formAction, pending] = useActionState<LocationFormState, FormData>(
    createLocationAction,
    {},
  );

  return (
    <CardBody>
      <form action={formAction} className="space-y-4">
        <Field label="Lloji" htmlFor="type" required>
          <Select id="type" name="type" defaultValue={LocationType.ROOM}>
            {Object.values(LocationType).map((t) => (
              <option key={t} value={t}>
                {LOCATION_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Emërtimi"
          htmlFor="label"
          required
          hint="p.sh. A204 për një dhomë, ose “Korridori 2” për një hapësirë të përbashkët."
        >
          <Input id="label" name="label" maxLength={64} placeholder="A204" />
        </Field>

        <Field label="Kati" htmlFor="floor" hint="Lëreni bosh nëse nuk aplikohet.">
          <Input id="floor" name="floor" type="number" min={0} max={50} placeholder="2" />
        </Field>

        <FormError message={state.error} />
        <FormSuccess message={state.success} />

        <Button type="submit" disabled={pending}>
          <Plus className="size-4" />
          {pending ? "Duke shtuar..." : "Shto lokacionin"}
        </Button>
      </form>
    </CardBody>
  );
}

export function LocationTable({ locations }: { locations: LocationRow[] }) {
  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            <Th>Lokacioni</Th>
            <Th>Lloji</Th>
            <Th>Kodi QR</Th>
            <Th>Banorë</Th>
            <Th>Kërkesa</Th>
            <Th className="text-right">Veprime</Th>
          </tr>
        </thead>
        <tbody>
          {locations.map((l) => (
            <Tr key={l.id}>
              <Td>
                <LocationPlate location={l} showDormitory={false} />
              </Td>
              <Td className="text-ink-600">{LOCATION_TYPE_LABELS[l.type]}</Td>
              <Td>
                {l.qrCode ? (
                  l.qrCode.isActive ? (
                    <span className="text-xs font-medium text-resolved-fg">Aktiv</span>
                  ) : (
                    <span className="text-xs text-ink-500">Joaktiv</span>
                  )
                ) : (
                  <Chip>Pa kod</Chip>
                )}
              </Td>
              <Td className="tabular">{l._count.residents}</Td>
              <Td className="tabular">{l._count.maintenanceRequests}</Td>
              <Td>
                <div className="flex justify-end">
                  <DeleteLocationButton
                    id={l.id}
                    blocked={l._count.residents > 0 || l._count.maintenanceRequests > 0}
                  />
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </TableWrap>
  );
}

/**
 * Deletion is disabled outright when a location still has residents or requests — the service
 * refuses it anyway, and disabling the control explains why before the click rather than after.
 */
function DeleteLocationButton({ id, blocked }: { id: string; blocked: boolean }) {
  const [state, formAction, pending] = useActionState<LocationFormState, FormData>(
    deleteLocationAction,
    {},
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      {state.error ? <span className="text-xs text-urgent-fg">{state.error}</span> : null}
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={pending || blocked}
        title={
          blocked
            ? "Nuk mund të fshihet: ka banorë ose kërkesa të lidhura."
            : "Fshi lokacionin"
        }
      >
        <Trash2 className="size-3.5" />
      </Button>
    </form>
  );
}

"use client";

import { Power, PowerOff, RefreshCw, Sparkles } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/badge";
import { CardBody } from "@/components/ui/card";
import { Field, FormError, FormSuccess, Select } from "@/components/ui/field";
import { LocationPlate } from "@/components/ui/location-plate";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import type { LocationType } from "@/generated/prisma/enums";
import { LOCATION_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

import {
  assignQrToLocation,
  generateAllMissing,
  regenerateToken,
  toggleQrActive,
  type QrFormState,
} from "./actions";

type LocationOption = { id: string; label: string; type: LocationType; floor: number | null };

type QrRow = {
  id: string;
  token: string;
  isActive: boolean;
  createdAt: Date;
  location: LocationOption | null;
};

/** Generate-and-assign panel. Both actions live here so the success message has one home. */
export function QrGenerator({ unassigned }: { unassigned: LocationOption[] }) {
  const [assignState, assignAction, assigning] = useActionState<QrFormState, FormData>(
    assignQrToLocation,
    {},
  );
  const [bulkState, bulkAction, bulking] = useActionState<QrFormState, FormData>(
    generateAllMissing,
    {},
  );

  return (
    <CardBody className="space-y-4">
      <form action={assignAction} className="flex flex-wrap items-end gap-3">
        <Field
          label="Cakto lokacionin"
          htmlFor="locationId"
          className="min-w-64 flex-1"
          hint="Kodi gjenerohet dhe lidhet menjëherë me lokacionin e zgjedhur."
        >
          <Select id="locationId" name="locationId" defaultValue="" disabled={unassigned.length === 0}>
            <option value="" disabled>
              {unassigned.length === 0 ? "Të gjitha lokacionet kanë kod" : "— Zgjidhni lokacionin —"}
            </option>
            {unassigned.map((l) => (
              <option key={l.id} value={l.id}>
                {LOCATION_TYPE_LABELS[l.type]} — {l.label}
                {l.floor !== null ? ` (Kati ${l.floor})` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" disabled={assigning || unassigned.length === 0}>
          {assigning ? "Duke gjeneruar..." : "Gjenero kod"}
        </Button>
      </form>

      {unassigned.length > 0 ? (
        <form action={bulkAction} className="border-t border-ink-100 pt-3">
          <p className="mb-2 text-sm text-ink-600">
            {unassigned.length} lokacione ende nuk kanë kod QR.
          </p>
          <Button type="submit" variant="secondary" size="sm" disabled={bulking}>
            <Sparkles className="size-4" />
            {bulking ? "Duke gjeneruar..." : `Gjenero për të gjitha (${unassigned.length})`}
          </Button>
        </form>
      ) : null}

      <FormError message={assignState.error ?? bulkState.error} />
      <FormSuccess message={assignState.success ?? bulkState.success} />
    </CardBody>
  );
}

/** The code register: what exists, where it points, and whether the sticker still works. */
export function QrTable({ codes, highlightToken }: { codes: QrRow[]; highlightToken?: string }) {
  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            <Th>Lokacioni</Th>
            <Th>Token</Th>
            <Th>Statusi</Th>
            <Th>Krijuar</Th>
            <Th className="text-right">Veprime</Th>
          </tr>
        </thead>
        <tbody>
          {codes.map((c) => (
            <Tr key={c.id} className={highlightToken === c.token ? "bg-brand-50" : undefined}>
              <Td>
                {c.location ? (
                  <LocationPlate location={c.location} showDormitory={false} />
                ) : (
                  <Chip>I pacaktuar</Chip>
                )}
              </Td>
              <Td>
                <code className="font-mono text-xs text-ink-500">{c.token}</code>
              </Td>
              <Td>
                {c.isActive ? (
                  <span className="inline-flex items-center rounded-chip bg-resolved-bg px-2 py-0.5 text-xs font-semibold text-resolved-fg">
                    Aktiv
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-chip bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">
                    Joaktiv
                  </span>
                )}
              </Td>
              <Td className="tabular whitespace-nowrap text-ink-500">{formatDate(c.createdAt)}</Td>
              <Td>
                <div className="flex items-center justify-end gap-1.5">
                  <RowAction
                    action={regenerateToken}
                    fields={{ qrCodeId: c.id }}
                    label="Rigjenero"
                    icon={<RefreshCw className="size-3.5" />}
                  />
                  <RowAction
                    action={toggleQrActive}
                    fields={{ qrCodeId: c.id, isActive: String(!c.isActive) }}
                    label={c.isActive ? "Çaktivizo" : "Aktivizo"}
                    icon={
                      c.isActive ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />
                    }
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

function RowAction({
  action,
  fields,
  label,
  icon,
}: {
  action: (prev: QrFormState, formData: FormData) => Promise<QrFormState>;
  fields: Record<string, string>;
  label: string;
  icon: React.ReactNode;
}) {
  const [, formAction, pending] = useActionState<QrFormState, FormData>(action, {});
  return (
    <form action={formAction}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" variant="ghost" size="sm" disabled={pending} title={label}>
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </Button>
    </form>
  );
}

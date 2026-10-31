"use client";

import { KeyRound, Power, PowerOff, UserPlus } from "lucide-react";
import { useActionState, useState } from "react";

import { Chip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardBody } from "@/components/ui/card";
import { Field, FormError, FormSuccess, Input, Select } from "@/components/ui/field";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import type { LocationType } from "@/generated/prisma/enums";
import { fullName } from "@/lib/utils";

import {
  assignRoomAction,
  createStudentAction,
  resetPasswordAction,
  toggleStudentActiveAction,
  type UserFormState,
} from "./actions";

type Room = {
  id: string;
  label: string;
  type: LocationType;
  floor: number | null;
  _count: { residents: number };
};

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  personalNumber: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  room: { id: string; label: string; type: LocationType; floor: number | null } | null;
  _count: { maintenanceRequests: number; administrativeRequests: number };
};

/** Create a student account and assign the room in one form (BR-02). */
export function CreateStudentForm({ rooms }: { rooms: Room[] }) {
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(
    createStudentAction,
    {},
  );

  return (
    <CardBody>
      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Emri" htmlFor="firstName" required error={state.fieldErrors?.firstName}>
            <Input id="firstName" name="firstName" invalid={Boolean(state.fieldErrors?.firstName)} />
          </Field>
          <Field label="Mbiemri" htmlFor="lastName" required error={state.fieldErrors?.lastName}>
            <Input id="lastName" name="lastName" invalid={Boolean(state.fieldErrors?.lastName)} />
          </Field>
        </div>

        <Field
          label="Numri personal"
          htmlFor="personalNumber"
          required
          error={state.fieldErrors?.personalNumber}
          hint="Studenti kyçet me këtë numër."
        >
          <Input
            id="personalNumber"
            name="personalNumber"
            invalid={Boolean(state.fieldErrors?.personalNumber)}
          />
        </Field>

        <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" invalid={Boolean(state.fieldErrors?.email)} />
        </Field>

        <Field label="Telefoni" htmlFor="phone" error={state.fieldErrors?.phone}>
          <Input id="phone" name="phone" type="tel" />
        </Field>

        <Field label="Dhoma" htmlFor="roomId" hint="Mund të caktohet edhe më vonë.">
          <Select id="roomId" name="roomId" defaultValue="">
            <option value="">— Pa dhomë —</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
                {r.floor !== null ? ` (Kati ${r.floor})` : ""} · {r._count.residents} banorë
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Fjalëkalimi fillestar"
          htmlFor="password"
          required
          error={state.fieldErrors?.password}
          hint="Së paku 8 karaktere. Komunikojani studentit."
        >
          <Input
            id="password"
            name="password"
            type="text"
            invalid={Boolean(state.fieldErrors?.password)}
          />
        </Field>

        <FormError message={state.error} />
        <FormSuccess message={state.success} />

        <Button type="submit" disabled={pending}>
          <UserPlus className="size-4" />
          {pending ? "Duke krijuar..." : "Krijo llogarinë"}
        </Button>
      </form>
    </CardBody>
  );
}

export function StudentTable({ students, rooms }: { students: Student[]; rooms: Room[] }) {
  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            <Th>Studenti</Th>
            <Th>Numri personal</Th>
            <Th>Dhoma</Th>
            <Th>Kërkesa</Th>
            <Th>Statusi</Th>
            <Th className="text-right">Veprime</Th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <Tr key={s.id}>
              <Td>
                <span className="font-medium text-ink-900">{fullName(s)}</span>
                {s.email ? <div className="text-xs text-ink-500">{s.email}</div> : null}
              </Td>
              <Td className="font-mono text-xs">{s.personalNumber}</Td>
              <Td>
                <RoomAssigner student={s} rooms={rooms} />
              </Td>
              <Td className="tabular">
                {s._count.maintenanceRequests + s._count.administrativeRequests}
              </Td>
              <Td>
                {s.isActive ? (
                  <span className="text-xs font-medium text-resolved-fg">Aktiv</span>
                ) : (
                  <Chip>Joaktiv</Chip>
                )}
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-1">
                  <PasswordReset studentId={s.id} />
                  <ActiveToggle studentId={s.id} isActive={s.isActive} />
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </TableWrap>
  );
}

/** Inline room reassignment — submits on change, since there is nothing else to confirm. */
function RoomAssigner({ student, rooms }: { student: Student; rooms: Room[] }) {
  const [state, formAction] = useActionState<UserFormState, FormData>(assignRoomAction, {});

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="studentId" value={student.id} />
      <Select
        name="roomId"
        defaultValue={student.room?.id ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        aria-label={`Dhoma e studentit ${fullName(student)}`}
        className="w-auto py-1 text-xs"
      >
        <option value="">— Pa dhomë —</option>
        {rooms.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </Select>
      {state.error ? <span className="text-xs text-urgent-fg">{state.error}</span> : null}
    </form>
  );
}

function ActiveToggle({ studentId, isActive }: { studentId: string; isActive: boolean }) {
  const [, formAction, pending] = useActionState<UserFormState, FormData>(
    toggleStudentActiveAction,
    {},
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="isActive" value={String(!isActive)} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={pending}
        title={isActive ? "Çaktivizo llogarinë" : "Aktivizo llogarinë"}
      >
        {isActive ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />}
      </Button>
    </form>
  );
}

function PasswordReset({ studentId }: { studentId: string }) {
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(
    resetPasswordAction,
    {},
  );
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        title="Rivendos fjalëkalimin"
      >
        <KeyRound className="size-3.5" />
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="studentId" value={studentId} />
      <Input
        name="password"
        type="text"
        placeholder="Fjalëkalimi i ri"
        className="h-8 w-36 py-1 text-xs"
        autoFocus
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "..." : "Ruaj"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Anulo
      </Button>
      {state.error ? <span className="text-xs text-urgent-fg">{state.error}</span> : null}
      {state.success ? <span className="text-xs text-resolved-fg">U ndryshua</span> : null}
    </form>
  );
}

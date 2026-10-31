"use client";

import { KeyRound, Save } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, FormError, FormSuccess, Input } from "@/components/ui/field";
import { LocationPlate } from "@/components/ui/location-plate";
import type { LocationType } from "@/generated/prisma/enums";

import {
  changePasswordAction,
  updateContactAction,
  type ProfileFormState,
} from "@/app/profile-actions";

export type ProfileData = {
  firstName: string;
  lastName: string;
  personalNumber: string;
  email: string | null;
  phone: string | null;
  roleLabel: string;
  dormitoryName: string | null;
  room: { label: string; type: LocationType; floor: number | null } | null;
};

/** Profile screen (§10.8), shared by both roles. */
export function ProfileView({ profile }: { profile: ProfileData }) {
  const [contactState, contactAction, savingContact] = useActionState<ProfileFormState, FormData>(
    updateContactAction,
    {},
  );
  const [passwordState, passwordAction, savingPassword] = useActionState<
    ProfileFormState,
    FormData
  >(changePasswordAction, {});

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader title="Të dhënat personale" />
        <CardBody className="space-y-3 text-sm">
          <ReadOnly label="Emri dhe mbiemri" value={`${profile.firstName} ${profile.lastName}`} />
          <ReadOnly label="Numri personal" value={profile.personalNumber} mono />
          <ReadOnly label="Roli" value={profile.roleLabel} />
          {profile.dormitoryName ? (
            <ReadOnly label="Konvikti" value={profile.dormitoryName} />
          ) : null}
          {profile.room ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-500">Dhoma</span>
              <LocationPlate location={profile.room} showDormitory={false} />
            </div>
          ) : null}

          <p className="border-t border-ink-100 pt-3 text-xs text-ink-500">
            Emri, numri personal, konvikti dhe dhoma caktohen nga administrata dhe nuk mund të
            ndryshohen nga ju.
          </p>
        </CardBody>
      </Card>

      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader title="Të dhënat e kontaktit" />
          <form action={contactAction}>
            <CardBody className="space-y-4">
              <Field label="Email" htmlFor="email" error={contactState.fieldErrors?.email}>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={profile.email ?? ""}
                  placeholder="emri.mbiemri@student.uni-pr.edu"
                  invalid={Boolean(contactState.fieldErrors?.email)}
                />
              </Field>

              <Field
                label="Numri i telefonit"
                htmlFor="phone"
                error={contactState.fieldErrors?.phone}
              >
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={profile.phone ?? ""}
                  placeholder="+383 4x xxx xxx"
                  invalid={Boolean(contactState.fieldErrors?.phone)}
                />
              </Field>

              <FormError message={contactState.error} />
              <FormSuccess message={contactState.success} />

              <Button type="submit" disabled={savingContact}>
                <Save className="size-4" />
                {savingContact ? "Duke ruajtur..." : "Ruaj"}
              </Button>
            </CardBody>
          </form>
        </Card>

        <Card>
          <CardHeader title="Ndrysho fjalëkalimin" />
          <form action={passwordAction}>
            <CardBody className="space-y-4">
              <Field
                label="Fjalëkalimi aktual"
                htmlFor="currentPassword"
                required
                error={passwordState.fieldErrors?.currentPassword}
              >
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  invalid={Boolean(passwordState.fieldErrors?.currentPassword)}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Fjalëkalimi i ri"
                  htmlFor="newPassword"
                  required
                  error={passwordState.fieldErrors?.newPassword}
                  hint="Së paku 8 karaktere."
                >
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    invalid={Boolean(passwordState.fieldErrors?.newPassword)}
                  />
                </Field>

                <Field
                  label="Konfirmo fjalëkalimin"
                  htmlFor="confirmPassword"
                  required
                  error={passwordState.fieldErrors?.confirmPassword}
                >
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    invalid={Boolean(passwordState.fieldErrors?.confirmPassword)}
                  />
                </Field>
              </div>

              <FormError message={passwordState.error} />
              <FormSuccess message={passwordState.success} />

              <Button type="submit" disabled={savingPassword}>
                <KeyRound className="size-4" />
                {savingPassword ? "Duke ndryshuar..." : "Ndrysho fjalëkalimin"}
              </Button>
            </CardBody>
          </form>
        </Card>
      </div>
    </div>
  );
}

function ReadOnly({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-500">{label}</span>
      <span className={mono ? "font-mono text-xs text-ink-900" : "font-medium text-ink-900"}>
        {value}
      </span>
    </div>
  );
}

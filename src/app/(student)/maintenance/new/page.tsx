import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { FormError } from "@/components/ui/field";
import { requireStudent } from "@/server/guards";
import { prisma } from "@/server/db";
import {
  listMaintenanceCategories,
  listSelectableSharedLocations,
  resolveQrToken,
} from "@/server/services/maintenance.service";

import { ReportForm } from "./report-form";

export const metadata = { title: "Raporto problem — DormMate" };

/**
 * New maintenance report (UI Architecture §10.4).
 *
 * Reached either directly, or from `/r/[token]` after a QR scan — in which case `?token=` is
 * present and the location is resolved and locked before the form renders.
 */
export default async function NewMaintenancePage({
  searchParams,
}: PageProps<"/maintenance/new">) {
  const student = await requireStudent();
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : null;

  const [categories, sharedLocations, ownRoom] = await Promise.all([
    listMaintenanceCategories(),
    listSelectableSharedLocations(student),
    student.roomId
      ? prisma.location.findUnique({
          where: { id: student.roomId },
          select: { id: true, label: true, type: true, floor: true },
        })
      : null,
  ]);

  // A scanned sticker fixes the location. An invalid or foreign token is refused here rather
  // than silently ignored (EF-01, EF-02).
  let scanned: { token: string; location: NonNullable<typeof ownRoom> } | null = null;
  let scanError: string | null = null;

  if (token) {
    try {
      const location = await resolveQrToken(token, student);
      scanned = {
        token,
        location: {
          id: location.id,
          label: location.label,
          type: location.type,
          floor: location.floor,
        },
      };
    } catch (error) {
      scanError = error instanceof Error ? error.message : "Kodi QR është i pavlefshëm.";
    }
  }

  if (!student.dormitoryId) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Raporto një problem"
        description="Plotësoni formularin dhe administrata do të njoftohet menjëherë."
      />

      {scanError ? (
        <div className="mb-4">
          <FormError message={scanError} />
        </div>
      ) : null}

      <ReportForm
        ownRoom={ownRoom}
        sharedLocations={sharedLocations}
        categories={categories}
        scanned={scanned}
      />
    </div>
  );
}

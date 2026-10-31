import { Printer, QrCode } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, EmptyState, StatCard } from "@/components/ui/card";
import { requireAdmin } from "@/server/guards";
import { listQrCodes, listUnassignedLocations } from "@/server/services/qr.service";

import { QrGenerator, QrTable } from "./qr-manager";

export const metadata = { title: "Kodet QR — DormMate" };

/**
 * QR Code Management (Development Architecture §5.2).
 *
 * The administrator generates a code, assigns it a location, and prints the sheet that goes on
 * the doors, corridors, toilets and showers.
 */
export default async function AdminQrCodesPage({ searchParams }: PageProps<"/admin/qr-codes">) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const highlightToken = typeof sp.token === "string" ? sp.token : undefined;

  const [codes, unassigned] = await Promise.all([
    listQrCodes(admin),
    listUnassignedLocations(admin),
  ]);

  const active = codes.filter((c) => c.isActive).length;

  return (
    <>
      <PageHeader
        title="Kodet QR"
        description="Gjeneroni kodet, caktoni lokacionin e secilit dhe printoni fletën për ngjitje."
        action={
          <ButtonLink href="/admin/qr-codes/print" variant="secondary">
            <Printer className="size-4" />
            Printo fletën
          </ButtonLink>
        }
      />

      {highlightToken ? (
        <div className="mb-4 rounded-card border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-ink-700">
          Kodi i skanuar <code className="font-mono text-xs">{highlightToken}</code> është theksuar
          në listën më poshtë.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Kode gjithsej" value={codes.length} icon={<QrCode className="size-4" />} />
        <StatCard label="Aktive" value={active} accent="resolved" />
        <StatCard
          label="Lokacione pa kod"
          value={unassigned.length}
          accent={unassigned.length > 0 ? "pending" : "neutral"}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Gjenero kod të ri" />
          <QrGenerator unassigned={unassigned} />
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title={`Regjistri i kodeve (${codes.length})`} />
          {codes.length === 0 ? (
            <EmptyState
              icon={<QrCode className="size-8" />}
              title="Asnjë kod QR"
              description="Gjeneroni kodin e parë duke zgjedhur një lokacion."
            />
          ) : (
            <QrTable codes={codes} highlightToken={highlightToken} />
          )}
        </Card>
      </div>
    </>
  );
}

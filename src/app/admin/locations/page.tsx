import { Building } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, EmptyState, StatCard } from "@/components/ui/card";
import { LocationType } from "@/generated/prisma/enums";
import { requireAdmin } from "@/server/guards";
import { listLocations } from "@/server/services/location.service";

import { LocationForm, LocationTable } from "./location-manager";

export const metadata = { title: "Lokacionet — DormMate" };

/** Locations are the physical anchor for QR codes, requests and room assignments (§9.3). */
export default async function AdminLocationsPage() {
  const admin = await requireAdmin();
  const locations = await listLocations(admin);

  const rooms = locations.filter((l) => l.type === LocationType.ROOM).length;
  const shared = locations.length - rooms;
  const withoutQr = locations.filter((l) => !l.qrCode).length;

  return (
    <>
      <PageHeader
        title="Lokacionet"
        description="Dhomat dhe hapësirat e përbashkëta të konviktit që administroni."
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Dhoma" value={rooms} icon={<Building className="size-4" />} />
        <StatCard label="Hapësira të përbashkëta" value={shared} />
        <StatCard
          label="Pa kod QR"
          value={withoutQr}
          accent={withoutQr > 0 ? "pending" : "neutral"}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Shto lokacion" />
          <LocationForm />
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title={`Lokacionet (${locations.length})`} />
          {locations.length === 0 ? (
            <EmptyState
              icon={<Building className="size-8" />}
              title="Asnjë lokacion"
              description="Shtoni dhomat dhe hapësirat e përbashkëta të konviktit."
            />
          ) : (
            <LocationTable locations={locations} />
          )}
        </Card>
      </div>
    </>
  );
}

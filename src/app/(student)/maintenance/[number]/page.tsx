import { ArrowLeft, CheckCircle2, QrCode } from "lucide-react";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Chip, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormSuccess } from "@/components/ui/field";
import { LocationPlate } from "@/components/ui/location-plate";
import { StatusTimeline } from "@/components/ui/status-timeline";
import { formatRequestCode } from "@/lib/constants";
import { formatDateTime, formatDuration, resolutionHours } from "@/lib/utils";
import { AuthorizationError, getCurrentUser } from "@/server/guards";
import { getMaintenanceByNumber } from "@/server/services/maintenance.service";

export const metadata = { title: "Detajet e kërkesës — DormMate" };

/** Student's view of one maintenance request, with its full status history. */
export default async function MaintenanceDetailPage({
  params,
  searchParams,
}: PageProps<"/maintenance/[number]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { number } = await params;
  const parsed = Number(number);
  if (!Number.isInteger(parsed)) notFound();

  const sp = await searchParams;
  const justCreated = sp.created === "1";

  let request;
  try {
    request = await getMaintenanceByNumber(user, parsed);
  } catch (error) {
    // BR-07 — someone else's request is not theirs to read.
    if (error instanceof AuthorizationError) notFound();
    throw error;
  }
  if (!request) notFound();

  const code = formatRequestCode("MAINTENANCE", request.number);
  const duration = resolutionHours(request.createdAt, request.resolvedAt);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={request.title}
        description={`${code} · Raportuar më ${formatDateTime(request.createdAt)}`}
        action={
          <ButtonLink href="/maintenance" variant="secondary">
            <ArrowLeft className="size-4" />
            Kthehu
          </ButtonLink>
        }
      />

      {justCreated ? (
        <div className="mb-4">
          <FormSuccess
            message={`Kërkesa ${code} u dërgua me sukses. Administrata u njoftua dhe do ta shqyrtojë së shpejti.`}
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Përshkrimi i problemit" />
            <CardBody>
              <p className="text-sm whitespace-pre-wrap text-ink-700">{request.description}</p>
            </CardBody>
          </Card>

          {request.photos.length > 0 ? (
            <Card>
              <CardHeader title={`Fotografitë (${request.photos.length})`} />
              <CardBody>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {request.photos.map((photo) => (
                    <a
                      key={photo.id}
                      href={photo.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block aspect-4/3 overflow-hidden rounded-card border border-ink-200"
                    >
                      <Image
                        src={photo.path}
                        alt="Fotografi e problemit të raportuar"
                        fill
                        sizes="(max-width: 640px) 50vw, 200px"
                        className="object-cover transition-transform hover:scale-105"
                      />
                    </a>
                  ))}
                </div>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Historiku i kërkesës" />
            <StatusTimeline entries={request.history} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Përmbledhje" />
            <CardBody className="space-y-3 text-sm">
              <Row label="Statusi">
                <StatusBadge status={request.status} />
              </Row>
              <Row label="Prioriteti">
                <PriorityBadge priority={request.priority} />
              </Row>
              <Row label="Kategoria">
                <Chip>{request.category.name}</Chip>
              </Row>
              <Row label="Lokacioni">
                <LocationPlate location={request.location} showDormitory={false} />
              </Row>
              <Row label="Raportuar">
                <span className="text-ink-700">{formatDateTime(request.createdAt)}</span>
              </Row>
              {request.reportedViaQr ? (
                <Row label="Metoda">
                  <span className="inline-flex items-center gap-1.5 text-ink-700">
                    <QrCode className="size-4 text-ink-400" />
                    Kod QR
                  </span>
                </Row>
              ) : null}
              {request.resolvedAt ? (
                <>
                  <Row label="Zgjidhur">
                    <span className="inline-flex items-center gap-1.5 text-resolved-fg">
                      <CheckCircle2 className="size-4" />
                      {formatDateTime(request.resolvedAt)}
                    </span>
                  </Row>
                  <Row label="Koha e zgjidhjes">
                    <span className="tabular font-medium text-ink-900">
                      {formatDuration(duration)}
                    </span>
                  </Row>
                </>
              ) : null}
            </CardBody>
          </Card>

          {request.assignedAdmin ? (
            <Card>
              <CardHeader title="Trajtuar nga" />
              <CardBody>
                <p className="text-sm font-medium text-ink-900">
                  {request.assignedAdmin.firstName} {request.assignedAdmin.lastName}
                </p>
                <p className="text-xs text-ink-500">Administrator i konviktit</p>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-500">{label}</span>
      {children}
    </div>
  );
}

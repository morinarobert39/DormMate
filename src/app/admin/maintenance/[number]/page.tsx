import { ArrowLeft, Mail, Phone, QrCode } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Chip, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { LocationPlate } from "@/components/ui/location-plate";
import { StatusTimeline } from "@/components/ui/status-timeline";
import { formatRequestCode } from "@/lib/constants";
import { formatDateTime, formatDuration, fullName, resolutionHours } from "@/lib/utils";
import { AuthorizationError, requireAdmin } from "@/server/guards";
import { getMaintenanceByNumber } from "@/server/services/maintenance.service";

import { StatusControl } from "../status-control";

export const metadata = { title: "Detajet e kërkesës — DormMate" };

/** Administrator's view: everything the student sees, plus the controls to act on it. */
export default async function AdminMaintenanceDetailPage({
  params,
}: PageProps<"/admin/maintenance/[number]">) {
  const admin = await requireAdmin();

  const { number } = await params;
  const parsed = Number(number);
  if (!Number.isInteger(parsed)) notFound();

  let request;
  try {
    request = await getMaintenanceByNumber(admin, parsed);
  } catch (error) {
    // EF-03 — another dormitory's request is indistinguishable from one that does not exist.
    if (error instanceof AuthorizationError) notFound();
    throw error;
  }
  if (!request) notFound();

  const code = formatRequestCode("MAINTENANCE", request.number);
  const duration = resolutionHours(request.createdAt, request.resolvedAt);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={request.title}
        description={`${code} · Raportuar më ${formatDateTime(request.createdAt)}`}
        action={
          <ButtonLink href="/admin/maintenance" variant="secondary">
            <ArrowLeft className="size-4" />
            Kthehu
          </ButtonLink>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Përshkrimi i problemit"
              action={
                <span className="flex items-center gap-2">
                  <PriorityBadge priority={request.priority} />
                  <StatusBadge status={request.status} />
                </span>
              }
            />
            <CardBody className="space-y-4">
              <p className="text-sm whitespace-pre-wrap text-ink-700">{request.description}</p>
              <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
                <LocationPlate location={request.location} showDormitory={false} />
                <Chip>{request.category.name}</Chip>
                {request.reportedViaQr ? (
                  <Chip>
                    <QrCode className="mr-1 size-3" />
                    Kod QR
                  </Chip>
                ) : null}
              </div>
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
            <CardHeader title="Ndrysho statusin" />
            <StatusControl requestNumber={request.number} currentStatus={request.status} />
          </Card>

          <Card>
            <CardHeader title="Studenti" />
            <CardBody className="space-y-2 text-sm">
              <p className="font-medium text-ink-900">{fullName(request.student)}</p>
              <p className="font-mono text-xs text-ink-500">{request.student.personalNumber}</p>
              {request.student.room ? (
                <p className="text-ink-600">Dhoma {request.student.room.label}</p>
              ) : null}
              {request.student.email ? (
                <p className="flex items-center gap-1.5 text-ink-600">
                  <Mail className="size-3.5 text-ink-400" />
                  <a href={`mailto:${request.student.email}`} className="hover:text-brand-600">
                    {request.student.email}
                  </a>
                </p>
              ) : null}
              {request.student.phone ? (
                <p className="flex items-center gap-1.5 text-ink-600">
                  <Phone className="size-3.5 text-ink-400" />
                  {request.student.phone}
                </p>
              ) : null}
            </CardBody>
          </Card>

          {request.resolvedAt ? (
            <Card>
              <CardHeader title="Koha e zgjidhjes" />
              <CardBody>
                <p className="tabular text-2xl font-semibold text-resolved-fg">
                  {formatDuration(duration)}
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  Zgjidhur më {formatDateTime(request.resolvedAt)}
                </p>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

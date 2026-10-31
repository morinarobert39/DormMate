import { ArrowLeft, Mail, MessageSquare, Phone } from "lucide-react";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Chip, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Attachments } from "@/components/ui/attachments";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusTimeline } from "@/components/ui/status-timeline";
import { formatRequestCode } from "@/lib/constants";
import { formatDateTime, fullName } from "@/lib/utils";
import { AuthorizationError, requireAdmin } from "@/server/guards";
import { getAdministrativeByNumber } from "@/server/services/administrative.service";

import { changeAdministrativeStatus } from "../actions";
import { ResponseForm } from "../response-form";
import { StatusControl } from "../../maintenance/status-control";

export const metadata = { title: "Detajet e kërkesës — DormMate" };

export default async function AdminAdministrativeDetailPage({
  params,
}: PageProps<"/admin/administrative/[number]">) {
  const admin = await requireAdmin();

  const { number } = await params;
  const parsed = Number(number);
  if (!Number.isInteger(parsed)) notFound();

  let request;
  try {
    request = await getAdministrativeByNumber(admin, parsed);
  } catch (error) {
    if (error instanceof AuthorizationError) notFound();
    throw error;
  }
  if (!request) notFound();

  const code = formatRequestCode("ADMINISTRATIVE", request.number);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={request.subject}
        description={`${code} · Paraqitur më ${formatDateTime(request.createdAt)}`}
        action={
          <ButtonLink href="/admin/administrative" variant="secondary">
            <ArrowLeft className="size-4" />
            Kthehu
          </ButtonLink>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Arsyeja e kërkesës"
              action={
                <span className="flex items-center gap-2">
                  <Chip>{request.category.name}</Chip>
                  <StatusBadge status={request.status} />
                </span>
              }
            />
            <CardBody>
              <p className="text-sm whitespace-pre-wrap text-ink-700">{request.description}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Përgjigjja zyrtare"
              action={
                request.adminResponse ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-resolved-fg">
                    <MessageSquare className="size-3.5" />
                    E dërguar
                  </span>
                ) : null
              }
            />
            <ResponseForm
              requestNumber={request.number}
              existingResponse={request.adminResponse}
            />
          </Card>

          <Card>
            <CardHeader title="Skedarët e bashkëngjitur" />
            <Attachments
              requestNumber={request.number}
              attachments={request.attachments}
              currentUserId={admin.id}
              canUpload
            />
          </Card>

          <Card>
            <CardHeader title="Historiku i kërkesës" />
            <StatusTimeline entries={request.history} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Ndrysho statusin" />
            <StatusControl
              requestNumber={request.number}
              currentStatus={request.status}
              action={changeAdministrativeStatus}
            />
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
        </div>
      </div>
    </div>
  );
}

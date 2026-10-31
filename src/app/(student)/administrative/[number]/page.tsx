import { ArrowLeft, MessageSquare } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Chip, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Attachments } from "@/components/ui/attachments";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormSuccess } from "@/components/ui/field";
import { StatusTimeline } from "@/components/ui/status-timeline";
import { formatRequestCode } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { AuthorizationError, getCurrentUser } from "@/server/guards";
import { getAdministrativeByNumber } from "@/server/services/administrative.service";

export const metadata = { title: "Detajet e kërkesës — DormMate" };

export default async function AdministrativeDetailPage({
  params,
  searchParams,
}: PageProps<"/administrative/[number]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { number } = await params;
  const parsed = Number(number);
  if (!Number.isInteger(parsed)) notFound();

  const sp = await searchParams;
  const justCreated = sp.created === "1";

  let request;
  try {
    request = await getAdministrativeByNumber(user, parsed);
  } catch (error) {
    if (error instanceof AuthorizationError) notFound();
    throw error;
  }
  if (!request) notFound();

  const code = formatRequestCode("ADMINISTRATIVE", request.number);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={request.subject}
        description={`${code} · Paraqitur më ${formatDateTime(request.createdAt)}`}
        action={
          <ButtonLink href="/administrative" variant="secondary">
            <ArrowLeft className="size-4" />
            Kthehu
          </ButtonLink>
        }
      />

      {justCreated ? (
        <div className="mb-4">
          <FormSuccess
            message={`Kërkesa ${code} u dërgua me sukses. Administrata do ta shqyrtojë së shpejti.`}
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Arsyeja e kërkesës"
              action={<StatusBadge status={request.status} />}
            />
            <CardBody>
              <p className="text-sm whitespace-pre-wrap text-ink-700">{request.description}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Përgjigjja e administratës" />
            <CardBody>
              {request.adminResponse ? (
                <div className="flex gap-3">
                  <MessageSquare className="mt-0.5 size-4 shrink-0 text-brand-600" />
                  <p className="text-sm whitespace-pre-wrap text-ink-800">
                    {request.adminResponse}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-ink-500">
                  Ende nuk ka përgjigje. Do të njoftoheni sapo administrata të përgjigjet.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Skedarët e bashkëngjitur" />
            <Attachments
              requestNumber={request.number}
              attachments={request.attachments}
              currentUserId={user.id}
              // A resolved request is closed correspondence — the service refuses new files, so
              // the control is hidden rather than shown and then rejected.
              canUpload={request.status !== "RESOLVED"}
            />
          </Card>

          <Card>
            <CardHeader title="Historiku i kërkesës" />
            <StatusTimeline entries={request.history} />
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Përmbledhje" />
          <CardBody className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-500">Statusi</span>
              <StatusBadge status={request.status} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-500">Kategoria</span>
              <Chip>{request.category.name}</Chip>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-500">Paraqitur</span>
              <span className="text-ink-700">{formatDateTime(request.createdAt)}</span>
            </div>
            {request.resolvedAt ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-500">Përfunduar</span>
                <span className="text-resolved-fg">{formatDateTime(request.resolvedAt)}</span>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

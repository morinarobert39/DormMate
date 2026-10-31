import { ArrowLeft, Megaphone } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Chip } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { ANNOUNCEMENT_SCOPE_LABELS } from "@/lib/constants";
import { formatDateTime, fullName } from "@/lib/utils";
import { AuthorizationError, getCurrentUser } from "@/server/guards";
import { getAnnouncement } from "@/server/services/announcement.service";

export const metadata = { title: "Njoftim — DormMate" };

export default async function AnnouncementDetailPage({
  params,
}: PageProps<"/announcements/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  let announcement;
  try {
    announcement = await getAnnouncement(user, id);
  } catch (error) {
    if (error instanceof AuthorizationError) notFound();
    throw error;
  }
  if (!announcement) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={announcement.title}
        description={`${fullName(announcement.author)} · ${formatDateTime(
          announcement.publishedAt ?? announcement.createdAt,
        )}`}
        action={
          <ButtonLink href="/announcements" variant="secondary">
            <ArrowLeft className="size-4" />
            Kthehu
          </ButtonLink>
        }
      />

      <Card>
        <CardBody>
          <div className="mb-4 flex items-center gap-2 border-b border-ink-100 pb-3">
            <Megaphone className="size-4 text-brand-600" />
            <Chip>{ANNOUNCEMENT_SCOPE_LABELS[announcement.scope]}</Chip>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-700">
            {announcement.body}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

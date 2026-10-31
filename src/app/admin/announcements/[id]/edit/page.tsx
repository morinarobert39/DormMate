import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { AuthorizationError, requireAdmin } from "@/server/guards";
import { getAnnouncement, listDormitories } from "@/server/services/announcement.service";

import { AnnouncementForm } from "../../announcement-form";

export const metadata = { title: "Modifiko njoftimin — DormMate" };

export default async function EditAnnouncementPage({
  params,
}: PageProps<"/admin/announcements/[id]/edit">) {
  const admin = await requireAdmin();
  const { id } = await params;

  let announcement;
  try {
    announcement = await getAnnouncement(admin, id);
  } catch (error) {
    if (error instanceof AuthorizationError) notFound();
    throw error;
  }
  if (!announcement) notFound();

  const dormitories = await listDormitories();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Modifiko njoftimin"
        description="Ndryshimet janë të dukshme menjëherë për studentët."
      />
      <AnnouncementForm
        dormitories={dormitories}
        adminDormitoryId={admin.dormitoryId}
        existing={{
          id: announcement.id,
          title: announcement.title,
          body: announcement.body,
          scope: announcement.scope,
          dormitoryIds: announcement.dormitories.map((d) => d.dormitoryId),
        }}
      />
    </div>
  );
}

import { PageHeader } from "@/components/layout/page-header";
import { requireAdmin } from "@/server/guards";
import { listDormitories } from "@/server/services/announcement.service";

import { AnnouncementForm } from "../announcement-form";

export const metadata = { title: "Njoftim i ri — DormMate" };

export default async function NewAnnouncementPage() {
  const admin = await requireAdmin();
  const dormitories = await listDormitories();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Njoftim i ri"
        description="Njoftimi publikohet menjëherë dhe studentët e prekur njoftohen automatikisht."
      />
      <AnnouncementForm dormitories={dormitories} adminDormitoryId={admin.dormitoryId} />
    </div>
  );
}

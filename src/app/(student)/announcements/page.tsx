import { Megaphone } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Chip } from "@/components/ui/badge";
import { Card, EmptyState } from "@/components/ui/card";
import { ANNOUNCEMENT_SCOPE_LABELS } from "@/lib/constants";
import { formatDateTime, fullName } from "@/lib/utils";
import { getCurrentUser } from "@/server/guards";
import { listAnnouncementsForStudent } from "@/server/services/dashboard.service";

export const metadata = { title: "Njoftimet — DormMate" };

/** Students read announcements; only administrators publish them (BR-10). */
export default async function StudentAnnouncementsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const announcements = await listAnnouncementsForStudent(user);

  return (
    <>
      <PageHeader
        title="Njoftimet"
        description="Njoftimet zyrtare të publikuara nga administrata e konviktit."
      />

      {announcements.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Megaphone className="size-8" />}
            title="Asnjë njoftim"
            description="Kur administrata të publikojë një njoftim, do të shfaqet këtu."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} className="transition-colors hover:border-ink-300">
              <Link href={`/announcements/${a.id}`} className="block p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-base font-semibold text-ink-900">{a.title}</h2>
                  <Chip>{ANNOUNCEMENT_SCOPE_LABELS[a.scope]}</Chip>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-ink-600">{a.body}</p>
                <p className="mt-3 text-xs text-ink-400">
                  {fullName(a.author)} · {formatDateTime(a.publishedAt ?? a.createdAt)}
                </p>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

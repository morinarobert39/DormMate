import { Megaphone, Pencil, Plus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Chip } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { FormSuccess } from "@/components/ui/field";
import { ANNOUNCEMENT_SCOPE_LABELS } from "@/lib/constants";
import { formatDateTime, fullName } from "@/lib/utils";
import { requireAdmin } from "@/server/guards";
import { listAnnouncementsForAdmin } from "@/server/services/announcement.service";

import { DeleteAnnouncementButton } from "./delete-button";

export const metadata = { title: "Njoftimet — DormMate" };

export default async function AdminAnnouncementsPage({
  searchParams,
}: PageProps<"/admin/announcements">) {
  const admin = await requireAdmin();
  const announcements = await listAnnouncementsForAdmin(admin);
  const sp = await searchParams;

  const flash =
    sp.created === "1"
      ? "Njoftimi u publikua dhe studentët u njoftuan."
      : sp.updated === "1"
        ? "Njoftimi u përditësua."
        : sp.deleted === "1"
          ? "Njoftimi u fshi."
          : null;

  return (
    <>
      <PageHeader
        title="Menaxhimi i njoftimeve"
        description="Publikoni, modifikoni dhe fshini njoftimet zyrtare."
        action={
          <ButtonLink href="/admin/announcements/new">
            <Plus className="size-4" />
            Njoftim i ri
          </ButtonLink>
        }
      />

      {flash ? (
        <div className="mb-4">
          <FormSuccess message={flash} />
        </div>
      ) : null}

      {announcements.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Megaphone className="size-8" />}
            title="Asnjë njoftim"
            description="Publikoni njoftimin e parë për studentët e konviktit."
            action={
              <ButtonLink href="/admin/announcements/new" size="sm">
                <Plus className="size-4" />
                Njoftim i ri
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id}>
              <div className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-base font-semibold text-ink-900">{a.title}</h2>
                  <div className="flex items-center gap-2">
                    <Chip>{ANNOUNCEMENT_SCOPE_LABELS[a.scope]}</Chip>
                    <Link
                      href={`/admin/announcements/${a.id}/edit`}
                      className="inline-flex items-center gap-1 rounded-card px-2 py-1 text-xs font-medium text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                    >
                      <Pencil className="size-3.5" />
                      Modifiko
                    </Link>
                    <DeleteAnnouncementButton id={a.id} title={a.title} />
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-ink-600">{a.body}</p>
                <p className="mt-3 text-xs text-ink-400">
                  {fullName(a.author)} · {formatDateTime(a.publishedAt ?? a.createdAt)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

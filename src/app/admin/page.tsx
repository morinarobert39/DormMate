import { AlertTriangle, CheckCircle2, Clock, FileText, Loader2, Megaphone, Users } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { PriorityBadge, STATUS_RAIL, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, EmptyState, StatCard } from "@/components/ui/card";
import { LocationPlate } from "@/components/ui/location-plate";
import { RailCell, RequestCode, Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { formatRequestCode } from "@/lib/constants";
import { formatRelativeTime, fullName } from "@/lib/utils";
import { requireAdmin } from "@/server/guards";
import { getAdminDashboard } from "@/server/services/dashboard.service";

export const metadata = { title: "Paneli administrativ — DormMate" };

/**
 * Administrator dashboard (UI Architecture §10.3, wireframe Figura 10.2).
 * Everything shown is scoped to the single dormitory this administrator manages (BR-08).
 */
export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const { stats, recentMaintenance, recentAdministrative } = await getAdminDashboard(admin);

  return (
    <>
      <PageHeader
        title="Paneli administrativ"
        description="Pasqyrë e aktivitetit të konviktit që administroni."
        action={
          <ButtonLink href="/admin/announcements/new" variant="secondary">
            <Megaphone className="size-4" />
            Publiko njoftim
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Kërkesa aktive"
          value={stats.active}
          icon={<Loader2 className="size-4" />}
          href="/admin/maintenance"
        />
        <StatCard
          label="Në pritje"
          value={stats.pending}
          accent="pending"
          icon={<Clock className="size-4" />}
          href="/admin/maintenance?status=PENDING"
        />
        <StatCard
          label="Prioritet i lartë"
          value={stats.highPriorityOpen}
          accent="urgent"
          icon={<AlertTriangle className="size-4" />}
          href="/admin/maintenance?priority=URGENT"
        />
        <StatCard
          label="Të zgjidhura"
          value={stats.resolved}
          accent="resolved"
          icon={<CheckCircle2 className="size-4" />}
          href="/admin/maintenance?status=RESOLVED"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Kërkesa administrative"
          value={stats.administrativePending}
          accent="pending"
          icon={<FileText className="size-4" />}
          href="/admin/administrative?status=PENDING"
        />
        <StatCard
          label="Banorë aktivë"
          value={stats.residents}
          icon={<Users className="size-4" />}
          href="/admin/users"
        />
        <StatCard
          label="Njoftime aktive"
          value={stats.activeAnnouncements}
          icon={<Megaphone className="size-4" />}
          href="/admin/announcements"
        />
        <StatCard
          label="Në proces"
          value={stats.inProgress}
          accent="progress"
          icon={<Loader2 className="size-4" />}
          href="/admin/maintenance?status=IN_PROGRESS"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Kërkesat e fundit të mirëmbajtjes"
            action={
              <Link
                href="/admin/maintenance"
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                Menaxho
              </Link>
            }
          />
          {recentMaintenance.length === 0 ? (
            <EmptyState title="Asnjë kërkesë ende" description="Kërkesat e reja do të shfaqen këtu." />
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Kodi</Th>
                    <Th>Problemi</Th>
                    <Th>Studenti</Th>
                    <Th>Lokacioni</Th>
                    <Th>Statusi</Th>
                    <Th>Koha</Th>
                  </tr>
                </thead>
                <tbody>
                  {recentMaintenance.map((r) => (
                    <Tr key={r.id}>
                      <RailCell rail={STATUS_RAIL[r.status]}>
                        <RequestCode
                          code={formatRequestCode("MAINTENANCE", r.number)}
                          href={`/admin/maintenance/${r.number}`}
                        />
                      </RailCell>
                      <Td>
                        <Link
                          href={`/admin/maintenance/${r.number}`}
                          className="font-medium text-ink-900 hover:text-brand-600"
                        >
                          {r.title}
                        </Link>
                        <div className="mt-1">
                          <PriorityBadge priority={r.priority} />
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap">{fullName(r.student)}</Td>
                      <Td>
                        <LocationPlate
                          location={{ ...r.location, floor: null }}
                          showDormitory={false}
                        />
                      </Td>
                      <Td>
                        <StatusBadge status={r.status} />
                      </Td>
                      <Td className="whitespace-nowrap text-ink-500">
                        {formatRelativeTime(r.createdAt)}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Kërkesa administrative"
            action={
              <Link
                href="/admin/administrative"
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                Menaxho
              </Link>
            }
          />
          {recentAdministrative.length === 0 ? (
            <EmptyState title="Asnjë kërkesë administrative" />
          ) : (
            <ul className="divide-y divide-ink-100">
              {recentAdministrative.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/admin/administrative/${r.number}`}
                    className="block px-4 py-3 transition-colors hover:bg-ink-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <RequestCode code={formatRequestCode("ADMINISTRATIVE", r.number)} />
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 text-sm font-medium text-ink-900">{r.subject}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {fullName(r.student)} · {formatRelativeTime(r.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

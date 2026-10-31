import { Bell, CheckCircle2, Clock, FileText, Loader2, Plus, Wrench } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge, PriorityBadge, STATUS_RAIL } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState, StatCard } from "@/components/ui/card";
import { LocationPlate } from "@/components/ui/location-plate";
import { RailCell, RequestCode, Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { formatRequestCode } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/utils";
import { getCurrentUser } from "@/server/guards";
import { getStudentDashboard } from "@/server/services/dashboard.service";

export const metadata = { title: "Paneli — DormMate" };

/**
 * Student dashboard (UI Architecture §10.2, wireframe Figura 10.1).
 * "Information First": statistic cards on top, recent requests and announcements below.
 */
export default async function StudentDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { stats, recentMaintenance, recentAnnouncements } = await getStudentDashboard(user);

  return (
    <>
      <PageHeader
        title={`Mirë se vini, ${user.firstName}`}
        description="Përmbledhje e kërkesave dhe njoftimeve tuaja."
        action={
          <ButtonLink href="/maintenance/new">
            <Plus className="size-4" />
            Raporto problem
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Gjithsej kërkesa"
          value={stats.total}
          icon={<Wrench className="size-4" />}
          href="/maintenance"
        />
        <StatCard
          label="Në pritje"
          value={stats.pending}
          accent="pending"
          icon={<Clock className="size-4" />}
          href="/maintenance?status=PENDING"
        />
        <StatCard
          label="Në proces"
          value={stats.inProgress}
          accent="progress"
          icon={<Loader2 className="size-4" />}
          href="/maintenance?status=IN_PROGRESS"
        />
        <StatCard
          label="Të zgjidhura"
          value={stats.resolved}
          accent="resolved"
          icon={<CheckCircle2 className="size-4" />}
          href="/maintenance?status=RESOLVED"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Kërkesat e fundit"
            action={
              <Link
                href="/maintenance"
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                Shiko të gjitha
              </Link>
            }
          />
          {recentMaintenance.length === 0 ? (
            <EmptyState
              icon={<Wrench className="size-8" />}
              title="Ende nuk keni raportuar asnjë problem"
              description="Kur raportoni një problem, ai do të shfaqet këtu bashkë me statusin e tij."
              action={
                <ButtonLink href="/maintenance/new" size="sm">
                  <Plus className="size-4" />
                  Raporto problem
                </ButtonLink>
              }
            />
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Kodi</Th>
                    <Th>Problemi</Th>
                    <Th>Lokacioni</Th>
                    <Th>Statusi</Th>
                    <Th>Raportuar</Th>
                  </tr>
                </thead>
                <tbody>
                  {recentMaintenance.map((r) => (
                    <Tr key={r.id}>
                      <RailCell rail={STATUS_RAIL[r.status]}>
                        <RequestCode
                          code={formatRequestCode("MAINTENANCE", r.number)}
                          href={`/maintenance/${r.number}`}
                        />
                      </RailCell>
                      <Td>
                        <Link
                          href={`/maintenance/${r.number}`}
                          className="font-medium text-ink-900 hover:text-brand-600"
                        >
                          {r.title}
                        </Link>
                        <div className="mt-1">
                          <PriorityBadge priority={r.priority} />
                        </div>
                      </Td>
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

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Njoftimet e fundit"
              action={
                <Link
                  href="/announcements"
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  Të gjitha
                </Link>
              }
            />
            {recentAnnouncements.length === 0 ? (
              <EmptyState icon={<Bell className="size-7" />} title="Asnjë njoftim" />
            ) : (
              <ul className="divide-y divide-ink-100">
                {recentAnnouncements.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/announcements/${a.id}`}
                      className="block px-4 py-3 transition-colors hover:bg-ink-50"
                    >
                      <p className="text-sm font-medium text-ink-900">{a.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{a.body}</p>
                      <p className="mt-1 text-[11px] text-ink-400">
                        {formatRelativeTime(a.publishedAt ?? a.createdAt)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Kërkesa administrative" />
            <CardBody>
              <p className="text-sm text-ink-600">
                Keni <span className="font-semibold text-ink-900">{stats.administrativeOpen}</span>{" "}
                kërkesa administrative në trajtim.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ButtonLink href="/administrative/new" size="sm">
                  <Plus className="size-4" />
                  Kërkesë e re
                </ButtonLink>
                <ButtonLink href="/administrative" size="sm" variant="secondary">
                  <FileText className="size-4" />
                  Shiko listën
                </ButtonLink>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

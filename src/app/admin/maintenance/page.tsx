import { QrCode, Wrench } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { PriorityBadge, STATUS_RAIL, StatusBadge } from "@/components/ui/badge";
import { Card, EmptyState } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { LocationPlate } from "@/components/ui/location-plate";
import { Pagination } from "@/components/ui/pagination";
import { RequestCards } from "@/components/ui/request-cards";
import { RailCell, RequestCode, Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { formatRequestCode } from "@/lib/constants";
import { formatDate, fullName } from "@/lib/utils";
import { requestFilterSchema } from "@/lib/validation/request";
import { requireAdmin } from "@/server/guards";
import {
  listMaintenance,
  listMaintenanceCategories,
} from "@/server/services/maintenance.service";

export const metadata = { title: "Menaxhimi i mirëmbajtjes — DormMate" };

/** Administrator management view — scoped to their own dormitory by the service (BR-08). */
export default async function AdminMaintenancePage({
  searchParams,
}: PageProps<"/admin/maintenance">) {
  const admin = await requireAdmin();

  const sp = await searchParams;
  const filters = requestFilterSchema.parse({
    status: sp.status,
    categoryId: sp.categoryId,
    priority: sp.priority,
    q: sp.q,
    page: sp.page ?? 1,
  });

  const [{ items, total, page, pageCount }, categories] = await Promise.all([
    listMaintenance(admin, filters),
    listMaintenanceCategories(),
  ]);

  function buildHref(nextPage: number) {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.q) params.set("q", filters.q);
    params.set("page", String(nextPage));
    return `/admin/maintenance?${params.toString()}`;
  }

  return (
    <>
      <PageHeader
        title="Menaxhimi i mirëmbajtjes"
        description="Shqyrtoni kërkesat e konviktit tuaj dhe përditësoni statusin e tyre."
      />

      <Card>
        <FilterBar categories={categories} showPriority basePath="/admin/maintenance" />

        {items.length === 0 ? (
          <EmptyState
            icon={<Wrench className="size-8" />}
            title="Asnjë kërkesë"
            description="Nuk u gjet asnjë kërkesë me këto filtra."
          />
        ) : (
          <>
            <RequestCards
              items={items.map((r) => ({
                id: r.id,
                href: `/admin/maintenance/${r.number}`,
                code: formatRequestCode("MAINTENANCE", r.number),
                title: r.title,
                status: r.status,
                category: r.category.name,
                date: r.createdAt,
                priority: r.priority,
                location: r.location,
                person: fullName(r.student),
                viaQr: r.reportedViaQr,
              }))}
            />

            <TableWrap className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>Kodi</Th>
                    <Th>Problemi</Th>
                    <Th>Studenti</Th>
                    <Th>Lokacioni</Th>
                    <Th>Prioriteti</Th>
                    <Th>Statusi</Th>
                    <Th>Data</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <Tr key={r.id}>
                      <RailCell rail={STATUS_RAIL[r.status]}>
                        <span className="flex items-center gap-1.5">
                          <RequestCode
                            code={formatRequestCode("MAINTENANCE", r.number)}
                            href={`/admin/maintenance/${r.number}`}
                          />
                          {r.reportedViaQr ? (
                            <QrCode className="size-3.5 text-ink-400" aria-label="Raportuar me QR" />
                          ) : null}
                        </span>
                      </RailCell>
                      <Td>
                        <Link
                          href={`/admin/maintenance/${r.number}`}
                          className="font-medium text-ink-900 hover:text-brand-600"
                        >
                          {r.title}
                        </Link>
                        <div className="mt-0.5 text-xs text-ink-500">{r.category.name}</div>
                      </Td>
                      <Td className="whitespace-nowrap">{fullName(r.student)}</Td>
                      <Td>
                        <LocationPlate location={r.location} showDormitory={false} />
                      </Td>
                      <Td>
                        <PriorityBadge priority={r.priority} />
                      </Td>
                      <Td>
                        <StatusBadge status={r.status} />
                      </Td>
                      <Td className="tabular whitespace-nowrap text-ink-500">
                        {formatDate(r.createdAt)}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
            <Pagination page={page} pageCount={pageCount} total={total} buildHref={buildHref} />
          </>
        )}
      </Card>
    </>
  );
}

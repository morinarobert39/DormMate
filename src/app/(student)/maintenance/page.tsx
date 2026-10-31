import { Plus, QrCode, Wrench } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { PriorityBadge, STATUS_RAIL, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { LocationPlate } from "@/components/ui/location-plate";
import { Pagination } from "@/components/ui/pagination";
import { RequestCards } from "@/components/ui/request-cards";
import { RailCell, RequestCode, Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { formatRequestCode } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { requestFilterSchema } from "@/lib/validation/request";
import { getCurrentUser } from "@/server/guards";
import {
  listMaintenance,
  listMaintenanceCategories,
} from "@/server/services/maintenance.service";

export const metadata = { title: "Mirëmbajtja — DormMate" };

/** Student view of their own maintenance history (BR-07). */
export default async function StudentMaintenancePage({
  searchParams,
}: PageProps<"/maintenance">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const filters = requestFilterSchema.parse({
    status: sp.status,
    categoryId: sp.categoryId,
    priority: sp.priority,
    q: sp.q,
    page: sp.page ?? 1,
  });

  const [{ items, total, page, pageCount }, categories] = await Promise.all([
    listMaintenance(user, filters),
    listMaintenanceCategories(),
  ]);

  function buildHref(nextPage: number) {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.q) params.set("q", filters.q);
    params.set("page", String(nextPage));
    return `/maintenance?${params.toString()}`;
  }

  return (
    <>
      <PageHeader
        title="Kërkesat e mirëmbajtjes"
        description="Të gjitha problemet që keni raportuar dhe statusi i tyre."
        action={
          <ButtonLink href="/maintenance/new">
            <Plus className="size-4" />
            Raporto problem
          </ButtonLink>
        }
      />

      <Card>
        <FilterBar categories={categories} showPriority basePath="/maintenance" />

        {items.length === 0 ? (
          <EmptyState
            icon={<Wrench className="size-8" />}
            title="Asnjë kërkesë"
            description="Nuk u gjet asnjë kërkesë me këto filtra. Skanoni kodin QR në dhomën tuaj ose raportoni manualisht."
            action={
              <ButtonLink href="/maintenance/new" size="sm">
                <Plus className="size-4" />
                Raporto problem
              </ButtonLink>
            }
          />
        ) : (
          <>
            <RequestCards
              items={items.map((r) => ({
                id: r.id,
                href: `/maintenance/${r.number}`,
                code: formatRequestCode("MAINTENANCE", r.number),
                title: r.title,
                status: r.status,
                category: r.category.name,
                date: r.createdAt,
                priority: r.priority,
                location: r.location,
                viaQr: r.reportedViaQr,
              }))}
            />

            <TableWrap className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>Kodi</Th>
                    <Th>Problemi</Th>
                    <Th>Kategoria</Th>
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
                            href={`/maintenance/${r.number}`}
                          />
                          {r.reportedViaQr ? (
                            <QrCode className="size-3.5 text-ink-400" aria-label="Raportuar me QR" />
                          ) : null}
                        </span>
                      </RailCell>
                      <Td>
                        <Link
                          href={`/maintenance/${r.number}`}
                          className="font-medium text-ink-900 hover:text-brand-600"
                        >
                          {r.title}
                        </Link>
                      </Td>
                      <Td className="whitespace-nowrap text-ink-600">{r.category.name}</Td>
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

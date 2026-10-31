import { FileText } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { STATUS_RAIL, StatusBadge } from "@/components/ui/badge";
import { Card, EmptyState } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { Pagination } from "@/components/ui/pagination";
import { RequestCards } from "@/components/ui/request-cards";
import { RailCell, RequestCode, Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { formatRequestCode } from "@/lib/constants";
import { formatDate, fullName } from "@/lib/utils";
import { requestFilterSchema } from "@/lib/validation/request";
import { requireAdmin } from "@/server/guards";
import {
  listAdministrative,
  listAdministrativeCategories,
} from "@/server/services/administrative.service";

export const metadata = { title: "Kërkesat administrative — DormMate" };

export default async function AdminAdministrativePage({
  searchParams,
}: PageProps<"/admin/administrative">) {
  const admin = await requireAdmin();

  const sp = await searchParams;
  const filters = requestFilterSchema.parse({
    status: sp.status,
    categoryId: sp.categoryId,
    q: sp.q,
    page: sp.page ?? 1,
  });

  const [{ items, total, page, pageCount }, categories] = await Promise.all([
    listAdministrative(admin, filters),
    listAdministrativeCategories(),
  ]);

  function buildHref(nextPage: number) {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.q) params.set("q", filters.q);
    params.set("page", String(nextPage));
    return `/admin/administrative?${params.toString()}`;
  }

  return (
    <>
      <PageHeader
        title="Kërkesat administrative"
        description="Shqyrtoni kërkesat e studentëve dhe jepni përgjigje zyrtare."
      />

      <Card>
        <FilterBar categories={categories} basePath="/admin/administrative" />

        {items.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-8" />}
            title="Asnjë kërkesë"
            description="Nuk u gjet asnjë kërkesë me këto filtra."
          />
        ) : (
          <>
            <RequestCards
              items={items.map((r) => ({
                id: r.id,
                href: `/admin/administrative/${r.number}`,
                code: formatRequestCode("ADMINISTRATIVE", r.number),
                title: r.subject,
                status: r.status,
                category: r.category.name,
                date: r.createdAt,
                person: fullName(r.student),
              }))}
            />

            <TableWrap className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>Kodi</Th>
                    <Th>Subjekti</Th>
                    <Th>Studenti</Th>
                    <Th>Kategoria</Th>
                    <Th>Përgjigje</Th>
                    <Th>Statusi</Th>
                    <Th>Data</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <Tr key={r.id}>
                      <RailCell rail={STATUS_RAIL[r.status]}>
                        <RequestCode
                          code={formatRequestCode("ADMINISTRATIVE", r.number)}
                          href={`/admin/administrative/${r.number}`}
                        />
                      </RailCell>
                      <Td>
                        <Link
                          href={`/admin/administrative/${r.number}`}
                          className="font-medium text-ink-900 hover:text-brand-600"
                        >
                          {r.subject}
                        </Link>
                      </Td>
                      <Td className="whitespace-nowrap">{fullName(r.student)}</Td>
                      <Td className="whitespace-nowrap text-ink-600">{r.category.name}</Td>
                      <Td>
                        {r.adminResponse ? (
                          <span className="text-xs font-medium text-resolved-fg">Po</span>
                        ) : (
                          <span className="text-xs text-ink-400">—</span>
                        )}
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

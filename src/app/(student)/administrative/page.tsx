import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { STATUS_RAIL, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { Pagination } from "@/components/ui/pagination";
import { RequestCards } from "@/components/ui/request-cards";
import { RailCell, RequestCode, Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { formatRequestCode } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { requestFilterSchema } from "@/lib/validation/request";
import { getCurrentUser } from "@/server/guards";
import {
  listAdministrative,
  listAdministrativeCategories,
} from "@/server/services/administrative.service";

export const metadata = { title: "Kërkesat administrative — DormMate" };

export default async function StudentAdministrativePage({
  searchParams,
}: PageProps<"/administrative">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const filters = requestFilterSchema.parse({
    status: sp.status,
    categoryId: sp.categoryId,
    q: sp.q,
    page: sp.page ?? 1,
  });

  const [{ items, total, page, pageCount }, categories] = await Promise.all([
    listAdministrative(user, filters),
    listAdministrativeCategories(),
  ]);

  function buildHref(nextPage: number) {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.q) params.set("q", filters.q);
    params.set("page", String(nextPage));
    return `/administrative?${params.toString()}`;
  }

  return (
    <>
      <PageHeader
        title="Kërkesat administrative"
        description="Kërkesat tuaja zyrtare drejtuar administratës dhe përgjigjet e tyre."
        action={
          <ButtonLink href="/administrative/new">
            <Plus className="size-4" />
            Kërkesë e re
          </ButtonLink>
        }
      />

      <Card>
        <FilterBar categories={categories} basePath="/administrative" />

        {items.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-8" />}
            title="Asnjë kërkesë administrative"
            description="Paraqisni kërkesa për certifikata, ndërrim dhome, dokumentacion dhe të tjera."
            action={
              <ButtonLink href="/administrative/new" size="sm">
                <Plus className="size-4" />
                Kërkesë e re
              </ButtonLink>
            }
          />
        ) : (
          <>
            <RequestCards
              items={items.map((r) => ({
                id: r.id,
                href: `/administrative/${r.number}`,
                code: formatRequestCode("ADMINISTRATIVE", r.number),
                title: r.subject,
                status: r.status,
                category: r.category.name,
                date: r.createdAt,
              }))}
            />

            <TableWrap className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>Kodi</Th>
                    <Th>Subjekti</Th>
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
                          href={`/administrative/${r.number}`}
                        />
                      </RailCell>
                      <Td>
                        <Link
                          href={`/administrative/${r.number}`}
                          className="font-medium text-ink-900 hover:text-brand-600"
                        >
                          {r.subject}
                        </Link>
                      </Td>
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

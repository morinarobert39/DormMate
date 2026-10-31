import { BarChart3, CheckCircle2, Clock, QrCode } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader, StatCard } from "@/components/ui/card";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { formatDuration } from "@/lib/utils";
import { requireAdmin } from "@/server/guards";
import { getStatistics } from "@/server/services/statistics.service";

import { StatisticsCharts } from "./statistics-charts";

export const metadata = { title: "Statistikat — DormMate" };

/**
 * Statistics screen (Screen Inventory §6).
 *
 * The resolution-time figures here are the measurable output the thesis needs: H1 claims the
 * platform shortens the time between a problem being reported and resolved, and this is where
 * that number comes from.
 */
export default async function AdminStatisticsPage() {
  const admin = await requireAdmin();
  const data = await getStatistics(admin);

  return (
    <>
      <PageHeader
        title="Statistikat"
        description="Treguesit kryesorë të performancës për konviktin që administroni."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Koha mesatare e zgjidhjes"
          value={formatDuration(data.resolution.averageHours)}
          icon={<Clock className="size-4" />}
        />
        <StatCard
          label="Norma e zgjidhjes"
          value={`${data.totals.resolutionRate}%`}
          accent="resolved"
          icon={<CheckCircle2 className="size-4" />}
        />
        <StatCard
          label="Kërkesa gjithsej"
          value={data.totals.maintenance}
          icon={<BarChart3 className="size-4" />}
        />
        <StatCard
          label="Raportuar me QR"
          value={`${data.totals.viaQrShare}%`}
          accent="progress"
          icon={<QrCode className="size-4" />}
        />
      </div>

      <div className="mt-4">
        <StatisticsCharts data={data} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Koha e zgjidhjes — përmbledhje" />
          {data.resolution.sample === 0 ? (
            <CardBody>
              <p className="text-sm text-ink-500">
                Ende nuk ka kërkesa të zgjidhura për të llogaritur kohën e zgjidhjes.
              </p>
            </CardBody>
          ) : (
            <TableWrap>
              <Table>
                <tbody>
                  <MetricRow label="Mesatarja" value={formatDuration(data.resolution.averageHours)} />
                  <MetricRow label="Mesorja (median)" value={formatDuration(data.resolution.medianHours)} />
                  <MetricRow label="Më e shpejta" value={formatDuration(data.resolution.fastestHours)} />
                  <MetricRow label="Më e ngadalta" value={formatDuration(data.resolution.slowestHours)} />
                  <MetricRow label="Kërkesa të matura" value={String(data.resolution.sample)} />
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Card>

        <Card>
          <CardHeader title="Të dhënat sipas kategorisë" />
          {data.byCategory.length === 0 ? (
            <CardBody>
              <p className="text-sm text-ink-500">Ende nuk ka të dhëna.</p>
            </CardBody>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Kategoria</Th>
                    <Th>Kërkesa</Th>
                    <Th>Koha mesatare</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCategory.map((c) => {
                    const resolution = data.resolutionByCategory.find((r) => r.name === c.name);
                    return (
                      <Tr key={c.name}>
                        <Td>{c.name}</Td>
                        <Td className="tabular">{c.count}</Td>
                        <Td className="tabular text-ink-600">
                          {resolution ? formatDuration(resolution.averageHours) : "—"}
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Card>
      </div>
    </>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <Tr>
      <Td className="text-ink-500">{label}</Td>
      <Td className="tabular text-right font-semibold text-ink-900">{value}</Td>
    </Tr>
  );
}

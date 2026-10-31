"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { StatisticsData } from "@/server/services/statistics.service";
import { formatDuration } from "@/lib/utils";

/**
 * Statistics charts.
 *
 * Colour is assigned by the job it does, not by series index:
 *   - the status chart reuses the reserved status palette (amber / blue / green) so a bar means
 *     the same thing here as a badge does everywhere else in the product;
 *   - single-series charts use one brand hue and carry no legend — the title names the series;
 *   - the trend chart is the only categorical pair, validated for colour-vision separation
 *     (ΔE 30.7 deutan, 17.4 tritan against a white surface).
 *
 * Every chart is paired with the underlying numbers in the tables below it, so nothing is
 * conveyed by colour alone (UI Architecture §13).
 */

const INK = { grid: "#eef1f6", axis: "#8493a9", text: "#5a6b85" };

const STATUS_FILL: Record<string, string> = {
  PENDING: "#d97706",
  IN_PROGRESS: "#2e6bd6",
  RESOLVED: "#16a34a",
};

const BRAND = "#1b4db1";
const RESOLVED = "#16a34a";

const AXIS_PROPS = {
  stroke: INK.axis,
  tick: { fill: INK.text, fontSize: 12 },
  tickLine: false,
  axisLine: { stroke: INK.grid },
} as const;

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; dataKey?: string }[];
  label?: string;
  formatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-card border border-ink-200 bg-white px-3 py-2 shadow-sm">
      {label ? <p className="mb-1 text-xs font-medium text-ink-900">{label}</p> : null}
      {payload.map((entry) => (
        <p key={entry.dataKey ?? entry.name} className="flex items-center gap-2 text-xs">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: entry.color }}
            aria-hidden
          />
          <span className="text-ink-500">{entry.name}</span>
          <span className="tabular ml-auto font-semibold text-ink-900">
            {formatter && typeof entry.value === "number"
              ? formatter(entry.value)
              : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}

export function StatisticsCharts({ data }: { data: StatisticsData }) {
  const hasResolved = data.resolution.sample > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Kërkesat e raportuara dhe të zgjidhura (8 javët e fundit)" />
        <CardBody>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.weeks} margin={{ top: 8, right: 16, bottom: 4, left: -12 }}>
              <CartesianGrid stroke={INK.grid} vertical={false} />
              <XAxis dataKey="label" {...AXIS_PROPS} />
              <YAxis allowDecimals={false} {...AXIS_PROPS} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: INK.grid, strokeWidth: 2 }} />
              <Legend
                iconType="plainline"
                wrapperStyle={{ fontSize: 12, color: INK.text, paddingTop: 8 }}
              />
              <Line
                type="monotone"
                dataKey="reported"
                name="Të raportuara"
                stroke={BRAND}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: BRAND }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="resolved"
                name="Të zgjidhura"
                stroke={RESOLVED}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: RESOLVED }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Kërkesat sipas statusit" />
          <CardBody>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={data.byStatus}
                layout="vertical"
                margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
              >
                <CartesianGrid stroke={INK.grid} horizontal={false} />
                <XAxis type="number" allowDecimals={false} {...AXIS_PROPS} />
                <YAxis type="category" dataKey="label" width={90} {...AXIS_PROPS} />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: INK.grid, fillOpacity: 0.5 }}
                />
                <Bar dataKey="count" name="Kërkesa" radius={[0, 4, 4, 0]} barSize={22}>
                  {data.byStatus.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_FILL[entry.status]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Kërkesat sipas kategorisë" />
          <CardBody>
            {data.byCategory.length === 0 ? (
              <p className="py-12 text-center text-sm text-ink-500">Ende nuk ka të dhëna.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, data.byCategory.length * 32)}>
                <BarChart
                  data={data.byCategory}
                  layout="vertical"
                  margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
                >
                  <CartesianGrid stroke={INK.grid} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} {...AXIS_PROPS} />
                  <YAxis type="category" dataKey="name" width={110} {...AXIS_PROPS} />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: INK.grid, fillOpacity: 0.5 }}
                  />
                  <Bar
                    dataKey="count"
                    name="Kërkesa"
                    fill={BRAND}
                    radius={[0, 4, 4, 0]}
                    barSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {hasResolved && data.resolutionByCategory.length > 0 ? (
        <Card>
          <CardHeader title="Koha mesatare e zgjidhjes sipas kategorisë" />
          <CardBody>
            <ResponsiveContainer
              width="100%"
              height={Math.max(200, data.resolutionByCategory.length * 32)}
            >
              <BarChart
                data={data.resolutionByCategory}
                layout="vertical"
                margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
              >
                <CartesianGrid stroke={INK.grid} horizontal={false} />
                <XAxis
                  type="number"
                  {...AXIS_PROPS}
                  tickFormatter={(v: number) => `${Math.round(v)}h`}
                />
                <YAxis type="category" dataKey="name" width={110} {...AXIS_PROPS} />
                <Tooltip
                  content={<ChartTooltip formatter={(v) => formatDuration(v)} />}
                  cursor={{ fill: INK.grid, fillOpacity: 0.5 }}
                />
                <Bar
                  dataKey="averageHours"
                  name="Mesatarja"
                  fill={BRAND}
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

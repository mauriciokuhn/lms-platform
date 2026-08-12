"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface WeeklyXpPoint {
  label: string;
  date: string;
  xp: number;
  lessons: number;
}

/**
 * Amber bar chart showing XP earned per day over the last week.
 * Lazy-loaded on the dashboard via next/dynamic (ssr: false).
 */
export function WeeklyXpChart({ data }: { data: WeeklyXpPoint[] }) {
  if (data.length === 0) return null;

  const max = Math.max(1, ...data.map((d) => d.xp));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#a1a1aa" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={36}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.05)" }}
          content={({ active, payload }) => {
            if (!active || !payload || payload.length === 0) return null;
            const point = payload[0].payload as WeeklyXpPoint;
            return (
              <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-900">
                <p className="font-semibold text-zinc-900 dark:text-white">
                  {point.label} · {point.date.slice(5)}
                </p>
                <p className="mt-1 text-amber-600 dark:text-amber-400">
                  {point.xp} XP {point.xp > 0 && `(${point.lessons} ${point.lessons === 1 ? "aula" : "aulas"})`}
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="xp" radius={[6, 6, 0, 0]} maxBarSize={38}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.xp === max ? "#f59e0b" : "#fcd34d"}
              fillOpacity={d.xp === 0 ? 0.3 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

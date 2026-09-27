"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { categoryLabel } from "@/lib/categories";
import type { AttackCategoryKey } from "@/lib/types";

export function CategoryComparisonChart({
  data,
  baselineLabel,
  currentLabel,
}: {
  data: Array<{ category: AttackCategoryKey; baseline: number; current: number }>;
  baselineLabel: string;
  currentLabel: string;
}) {
  const chartData = data.map((d) => ({ name: categoryLabel(d.category), [baselineLabel]: d.baseline, [currentLabel]: d.current }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(260, chartData.length * 42)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2634" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} stroke="#5b6577" fontSize={11} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" stroke="#5b6577" fontSize={11} width={170} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: "#0b0f16", border: "1px solid #1e2634", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#e6ebf2" }}
          formatter={(value) => [`${value}%`, ""]}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "#8a96a8" }} />
        <Bar dataKey={baselineLabel} fill="#5b6577" radius={[0, 3, 3, 0]} maxBarSize={12} />
        <Bar dataKey={currentLabel} fill="#22d3ee" radius={[0, 3, 3, 0]} maxBarSize={12} />
      </BarChart>
    </ResponsiveContainer>
  );
}

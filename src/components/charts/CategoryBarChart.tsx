"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { categoryLabel } from "@/lib/categories";
import type { AttackCategoryKey } from "@/lib/types";

function colorFor(value: number): string {
  if (value >= 95) return "#34d399";
  if (value >= 85) return "#fbbf24";
  return "#f87171";
}

export function CategoryBarChart({ data }: { data: Array<{ category: AttackCategoryKey; coverage: number }> }) {
  const chartData = data.map((d) => ({ name: categoryLabel(d.category), coverage: d.coverage }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 34)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2634" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} stroke="#5b6577" fontSize={11} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" stroke="#5b6577" fontSize={11} width={170} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: "#0b0f16", border: "1px solid #1e2634", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#e6ebf2" }}
          formatter={(value) => [`${value}%`, "Coverage"]}
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
        />
        <Bar dataKey="coverage" radius={[0, 4, 4, 0]} maxBarSize={16}>
          {chartData.map((d, i) => (
            <Cell key={i} fill={colorFor(d.coverage)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

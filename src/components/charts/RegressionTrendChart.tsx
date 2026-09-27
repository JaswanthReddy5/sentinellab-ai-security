"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function RegressionTrendChart({ data }: { data: Array<{ label: string; regressions: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2634" vertical={false} />
        <XAxis dataKey="label" stroke="#5b6577" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#5b6577" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
        <Tooltip
          contentStyle={{ background: "#0b0f16", border: "1px solid #1e2634", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#e6ebf2" }}
          formatter={(value) => [value, "New bypasses"]}
        />
        <Bar dataKey="regressions" fill="#fb7185" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

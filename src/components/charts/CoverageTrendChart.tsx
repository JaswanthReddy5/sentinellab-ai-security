"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function CoverageTrendChart({ data }: { data: Array<{ label: string; coverage: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="coverageFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2634" vertical={false} />
        <XAxis dataKey="label" stroke="#5b6577" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#5b6577" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={40} />
        <Tooltip
          contentStyle={{ background: "#0b0f16", border: "1px solid #1e2634", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#e6ebf2" }}
          formatter={(value) => [`${value}%`, "Security coverage"]}
        />
        <Area type="monotone" dataKey="coverage" stroke="#22d3ee" strokeWidth={2} fill="url(#coverageFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

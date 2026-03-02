"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  day: string;
  earnings: number;
}

export default function EarningsChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
          width={50}
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip
          contentStyle={{
            background: "#FAFAFA",
            border: "1px solid #E5E7EB",
            borderRadius: 0,
            fontSize: 12,
          }}
          formatter={(value: number) => [`$${value.toFixed(4)}`, "Earnings"]}
        />
        <Bar dataKey="earnings" fill="#003FFF" radius={0} />
      </BarChart>
    </ResponsiveContainer>
  );
}

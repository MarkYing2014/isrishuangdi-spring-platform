"use client";

/**
 * Downtime Pareto Chart
 * 停机原因帕累托图
 */

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import type { ParetoItem } from "@/lib/manufacturing/types";
import { STOP_REASON_LABELS } from "@/lib/manufacturing/types";

interface DowntimeParetoProps {
  data: ParetoItem[];
  className?: string;
}

const COLORS = [
  "#ef4444", // rose-500
  "#f97316", // orange-500
  "#eab308", // yellow-500
  "#22c55e", // green-500
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#6b7280", // gray-500
];

export function DowntimePareto({ data, className = "" }: DowntimeParetoProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      reason: STOP_REASON_LABELS[item.reasonCode]?.zh ?? item.reasonCode,
      reasonCode: item.reasonCode,
      minutes: item.minutes,
      count: item.count ?? 0,
    }));
  }, [data]);

  const totalMinutes = useMemo(() => {
    return data.reduce((sum, item) => sum + item.minutes, 0);
  }, [data]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Downtime Pareto / 停机原因
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            Total: {totalMinutes} min
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis 
                type="number"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}m`}
              />
              <YAxis 
                type="category"
                dataKey="reason"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={55}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded p-2 shadow-sm text-xs">
                        <div className="font-medium">{data.reason}</div>
                        <div className="text-rose-600">{data.minutes} 分钟</div>
                        {data.count > 0 && (
                          <div className="text-muted-foreground">{data.count} 次</div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="minutes" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default DowntimePareto;

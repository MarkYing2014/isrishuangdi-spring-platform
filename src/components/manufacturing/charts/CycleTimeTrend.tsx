"use client";

/**
 * Cycle Time Trend Chart
 * 节拍时间趋势图
 */

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import type { TrendPoint } from "@/lib/manufacturing/types";

interface CycleTimeTrendProps {
  data: TrendPoint[];
  targetCt?: number;
  className?: string;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export function CycleTimeTrend({ data, targetCt, className = "" }: CycleTimeTrendProps) {
  const chartData = useMemo(() => {
    return data.map((point) => ({
      time: formatTime(point.t),
      ct: point.value,
      machineId: point.machineId,
    }));
  }, [data]);

  const avgCt = useMemo(() => {
    if (data.length === 0) return 0;
    return data.reduce((sum, p) => sum + p.value, 0) / data.length;
  }, [data]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Cycle Time Trend / 节拍趋势
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            Avg: {avgCt.toFixed(2)}s
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
                tickFormatter={(v) => `${v}s`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded p-2 shadow-sm text-xs">
                        <div className="font-medium">{data.time}</div>
                        <div className="text-blue-600">CT: {data.ct.toFixed(2)}s</div>
                        {data.machineId && (
                          <div className="text-muted-foreground">{data.machineId}</div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="ct"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              {targetCt && (
                <ReferenceLine
                  y={targetCt}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{ value: "Target", fontSize: 10, fill: "#10b981" }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default CycleTimeTrend;

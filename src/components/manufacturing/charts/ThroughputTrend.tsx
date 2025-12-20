"use client";

/**
 * Throughput Trend Chart
 * 产量趋势图
 */

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import type { ThroughputPoint } from "@/lib/manufacturing/types";

interface ThroughputTrendProps {
  data: ThroughputPoint[];
  className?: string;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export function ThroughputTrend({ data, className = "" }: ThroughputTrendProps) {
  const chartData = useMemo(() => {
    return data.map((point) => ({
      time: formatTime(point.t),
      good: point.qtyGood,
      scrap: point.qtyScrap,
      total: point.qtyGood + point.qtyScrap,
    }));
  }, [data]);

  const latestGood = data.length > 0 ? data[data.length - 1].qtyGood : 0;
  const latestScrap = data.length > 0 ? data[data.length - 1].qtyScrap : 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Throughput / 产量趋势
          </span>
          <span className="text-sm font-normal">
            <span className="text-emerald-600">{latestGood} 良品</span>
            {" / "}
            <span className="text-rose-600">{latestScrap} 报废</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded p-2 shadow-sm text-xs">
                        <div className="font-medium">{data.time}</div>
                        <div className="text-emerald-600">良品: {data.good}</div>
                        <div className="text-rose-600">报废: {data.scrap}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="good"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="scrap"
                stackId="1"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default ThroughputTrend;

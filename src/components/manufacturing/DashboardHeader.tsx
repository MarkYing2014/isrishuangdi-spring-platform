"use client";

/**
 * Dashboard Header Component
 * 仪表板头部组件
 * 
 * 包含筛选器：工厂、产线、班次、时间范围
 */

import { Factory, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { TimeRange, PlantConfig, ShiftConfig } from "@/lib/manufacturing/types";
import { TIME_RANGE_OPTIONS } from "@/lib/manufacturing/types";

interface DashboardHeaderProps {
  plants: PlantConfig[];
  shifts: ShiftConfig[];
  selectedPlantId: string;
  selectedLineId?: string;
  selectedShiftId?: string;
  selectedRange: TimeRange;
  currentShift?: { id: string; name: string };
  onPlantChange: (plantId: string) => void;
  onLineChange: (lineId: string | undefined) => void;
  onShiftChange: (shiftId: string | undefined) => void;
  onRangeChange: (range: TimeRange) => void;
  onRefresh: () => void;
  autoRefresh: boolean;
  onAutoRefreshChange: (enabled: boolean) => void;
  loading?: boolean;
  lastUpdated?: string;
}

export function DashboardHeader({
  plants,
  shifts,
  selectedPlantId,
  selectedLineId,
  selectedRange,
  currentShift,
  onPlantChange,
  onLineChange,
  onRangeChange,
  onRefresh,
  autoRefresh,
  onAutoRefreshChange,
  loading,
  lastUpdated,
}: DashboardHeaderProps) {
  const selectedPlant = plants.find((p) => p.plantId === selectedPlantId);
  const lines = selectedPlant?.lines ?? [];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Factory className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">
          Production Dashboard / 生产监控
        </h1>
        {currentShift && (
          <Badge variant="outline" className="ml-2">
            {currentShift.name}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Plant Selector */}
        <Select value={selectedPlantId} onValueChange={onPlantChange}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="工厂" />
          </SelectTrigger>
          <SelectContent>
            {plants.map((plant) => (
              <SelectItem key={plant.plantId} value={plant.plantId}>
                {plant.name.zh}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Line Selector */}
        <Select 
          value={selectedLineId ?? "all"} 
          onValueChange={(v) => onLineChange(v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="产线" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部产线</SelectItem>
            {lines.map((line) => (
              <SelectItem key={line.lineId} value={line.lineId}>
                {line.name.zh}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Time Range Selector */}
        <Select value={selectedRange} onValueChange={(v) => onRangeChange(v as TimeRange)}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="时间范围" />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label.zh}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Auto Refresh Toggle */}
        <Button
          variant={autoRefresh ? "default" : "outline"}
          size="sm"
          className="h-9"
          onClick={() => onAutoRefreshChange(!autoRefresh)}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? "animate-spin" : ""}`} />
          {autoRefresh ? "自动刷新" : "手动"}
        </Button>

        {/* Manual Refresh */}
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>

        {/* Last Updated */}
        {lastUpdated && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {new Date(lastUpdated).toLocaleTimeString("zh-CN")}
          </span>
        )}
      </div>
    </div>
  );
}

export default DashboardHeader;

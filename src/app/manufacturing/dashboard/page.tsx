"use client";

/**
 * Manufacturing Dashboard Page
 * 生产监控仪表板页面
 * 
 * 实时显示生产状态、KPI、设备状态、异常事件、工单进度
 */

import { useCallback, useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  DashboardHeader,
  KpiStrip,
  MachineStatusGrid,
  AndonFeed,
  WorkOrderTable,
  CycleTimeTrend,
  ThroughputTrend,
  DowntimePareto,
} from "@/components/manufacturing";

import type { 
  DashboardSummaryResponse, 
  TimeRange,
  MachineTile,
  AndonEvent,
  WorkOrderRow,
} from "@/lib/manufacturing/types";
import { MOCK_PLANTS, MOCK_SHIFTS } from "@/lib/manufacturing/mock";

export default function ManufacturingDashboardPage() {
  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [plantId, setPlantId] = useState("P01");
  const [lineId, setLineId] = useState<string | undefined>(undefined);
  const [range, setRange] = useState<TimeRange>("1h");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Risk level for demo (can be controlled via URL param or UI)
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("low");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        plantId,
        range,
        risk: riskLevel,
        seed: String(Date.now()),
      });
      if (lineId) params.set("lineId", lineId);

      const res = await fetch(`/api/manufacturing/summary?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [plantId, lineId, range, riskLevel]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Event handlers
  const handleMachineClick = useCallback((machine: MachineTile) => {
    console.log("Machine clicked:", machine);
    // TODO: Open machine detail modal or navigate to machine page
  }, []);

  const handleAndonAcknowledge = useCallback((eventId: string) => {
    console.log("Acknowledge event:", eventId);
    // TODO: Call API to acknowledge event
  }, []);

  const handleAndonEventClick = useCallback((event: AndonEvent) => {
    console.log("Andon event clicked:", event);
    // TODO: Open event detail modal
  }, []);

  const handleWorkOrderClick = useCallback((workOrder: WorkOrderRow) => {
    console.log("Work order clicked:", workOrder);
    // TODO: Navigate to work order detail or open modal
    // Could link to design calculator: /tools/calculator?designCode=${workOrder.designCode}
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with filters */}
      <DashboardHeader
        plants={MOCK_PLANTS}
        shifts={MOCK_SHIFTS}
        selectedPlantId={plantId}
        selectedLineId={lineId}
        selectedRange={range}
        currentShift={data?.shift}
        onPlantChange={setPlantId}
        onLineChange={setLineId}
        onShiftChange={() => {}}
        onRangeChange={setRange}
        onRefresh={fetchData}
        autoRefresh={autoRefresh}
        onAutoRefreshChange={setAutoRefresh}
        loading={loading}
        lastUpdated={data?.kpis.lastUpdatedAt}
      />

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Demo Risk Level Selector */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Demo Mode:</span>
        <button
          className={`px-2 py-1 rounded text-xs ${riskLevel === "low" ? "bg-emerald-500 text-white" : "bg-muted"}`}
          onClick={() => setRiskLevel("low")}
        >
          Low Risk
        </button>
        <button
          className={`px-2 py-1 rounded text-xs ${riskLevel === "medium" ? "bg-amber-500 text-white" : "bg-muted"}`}
          onClick={() => setRiskLevel("medium")}
        >
          Medium Risk
        </button>
        <button
          className={`px-2 py-1 rounded text-xs ${riskLevel === "high" ? "bg-rose-500 text-white" : "bg-muted"}`}
          onClick={() => setRiskLevel("high")}
        >
          High Risk
        </button>
      </div>

      {data && (
        <>
          {/* KPI Strip */}
          <KpiStrip kpis={data.kpis} />

          {/* Machine Status Grid */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Machine Status / 设备状态</h2>
            <MachineStatusGrid
              machines={data.machines}
              onMachineClick={handleMachineClick}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <CycleTimeTrend data={data.ctTrend} targetCt={3.0} />
            <ThroughputTrend data={data.throughputTrend} />
            <DowntimePareto data={data.downtimePareto} />
          </div>

          {/* Andon & Work Orders Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <AndonFeed
              events={data.andon}
              onAcknowledge={handleAndonAcknowledge}
              onEventClick={handleAndonEventClick}
              maxHeight="350px"
              className="lg:col-span-1"
            />
            <WorkOrderTable
              workOrders={data.workOrders}
              onRowClick={handleWorkOrderClick}
              className="lg:col-span-2"
            />
          </div>
        </>
      )}

      {/* Loading State */}
      {loading && !data && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-2">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      )}
    </div>
  );
}

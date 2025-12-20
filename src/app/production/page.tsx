"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Cog, RefreshCw } from "lucide-react";

import { LanguageText } from "@/components/language-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { DashboardVM, LiveRiskStatus, MachineRiskCard, Alert } from "@/lib/liveRiskBrain/types";
import type { DashboardSummaryResponse, TimeRange } from "@/lib/manufacturing/types";
import { TIME_RANGE_OPTIONS, MOCK_PLANTS } from "@/lib/manufacturing";
import {
  KpiStrip,
  MachineStatusGrid,
  AndonFeed,
  WorkOrderTable,
  CycleTimeTrend,
  ThroughputTrend,
  DowntimePareto,
} from "@/components/manufacturing";

function riskBadgeColor(status: LiveRiskStatus): string {
  switch (status) {
    case "ENGINEERING_OK":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "MANUFACTURING_RISK":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "HIGH_RISK":
      return "bg-rose-100 text-rose-800 border-rose-200";
  }
}

function statusIndicatorClass(status: string): string {
  const base = "h-2 w-2 rounded-full";
  switch (status) {
    case "RUNNING":
      return `${base} bg-emerald-600`;
    case "STOPPED":
      return `${base} bg-slate-400`;
    case "ALARM":
      return `${base} bg-rose-600`;
    case "SETUP":
      return `${base} bg-blue-600`;
    default:
      return `${base} bg-slate-400`;
  }
}

function machineIconClass(status: string): string {
  switch (status) {
    case "RUNNING":
      return "text-emerald-700 motion-reduce:animate-none animate-spin";
    case "ALARM":
      return "text-rose-700";
    case "SETUP":
      return "text-blue-700";
    case "STOPPED":
    default:
      return "text-slate-500";
  }
}

function statusBadgeColor(status: string): string {
  switch (status) {
    case "RUNNING":
      return "bg-emerald-100 text-emerald-800";
    case "STOPPED":
      return "bg-slate-100 text-slate-600";
    case "ALARM":
      return "bg-rose-100 text-rose-800";
    case "SETUP":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function severityBadgeColor(severity: string): string {
  switch (severity) {
    case "ERROR":
      return "bg-rose-100 text-rose-800 border-rose-200";
    case "WARNING":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "INFO":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function MachineCardComponent({ machine }: { machine: MachineRiskCard }) {
  return (
    <div className="relative rounded-lg border bg-background p-4 space-y-3">
      {machine.status === "ALARM" ? (
        <div className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-rose-200 motion-reduce:hidden animate-pulse" />
      ) : null}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted/30">
            <Cog
              className={`h-4 w-4 ${machineIconClass(machine.status)}`}
              style={
                machine.status === "RUNNING"
                  ? ({ animationDuration: "2.2s" } as React.CSSProperties)
                  : undefined
              }
            />
          </div>
          <div className="font-semibold truncate">{machine.machineId}</div>
        </div>
        <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeColor(machine.status)}`}>
          {(machine.status === "RUNNING" || machine.status === "ALARM") && (
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-60 motion-reduce:hidden animate-ping ${
                  machine.status === "ALARM" ? "bg-rose-400" : "bg-emerald-400"
                }`}
              />
              <span className={`relative inline-flex ${statusIndicatorClass(machine.status)}`} />
            </span>
          )}
          {machine.status !== "RUNNING" && machine.status !== "ALARM" && (
            <span className={statusIndicatorClass(machine.status)} />
          )}
          {machine.status}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          <LanguageText en="Risk" zh="风险" />
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${riskBadgeColor(machine.liveRiskStatus)}`}>
          {machine.liveRiskScore}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">
            <LanguageText en="Cycle" zh="节拍" />
          </span>
          <div className="font-medium">
            {machine.cycleTimeMs}ms
            {machine.cycleTimeDeltaPct > 0.05 && (
              <span className="ml-1 text-amber-600">+{(machine.cycleTimeDeltaPct * 100).toFixed(0)}%</span>
            )}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Cpk</span>
          <div className={`font-medium ${machine.lastCpk !== null && machine.lastCpk < 1.0 ? "text-rose-600" : machine.lastCpk !== null && machine.lastCpk < 1.33 ? "text-amber-600" : ""}`}>
            {machine.lastCpk?.toFixed(2) ?? "—"}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">
            <LanguageText en="Scrap" zh="报废" />
          </span>
          <div className={`font-medium ${machine.scrapRate > 0.03 ? "text-rose-600" : machine.scrapRate > 0.01 ? "text-amber-600" : ""}`}>
            {(machine.scrapRate * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Nelson</span>
          <div className={`font-medium ${machine.lastNelsonViolations >= 2 ? "text-rose-600" : machine.lastNelsonViolations >= 1 ? "text-amber-600" : ""}`}>
            {machine.lastNelsonViolations}
          </div>
        </div>
      </div>

      {machine.tempDrift && (
        <div className="text-xs text-amber-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          <LanguageText en="Temperature drift" zh="温度漂移" />
        </div>
      )}

      {machine.topDrivers.length > 0 && (
        <div className="border-t pt-2 space-y-1">
          <div className="text-xs text-muted-foreground font-medium">
            <LanguageText en="Top Drivers" zh="主要原因" />
          </div>
          {machine.topDrivers.slice(0, 2).map((d, idx) => (
            <div key={idx} className="text-xs text-muted-foreground">
              • <LanguageText en={d.title.en} zh={d.title.zh} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert }: { alert: Alert }) {
  return (
    <div className={`rounded-lg border p-3 space-y-1 ${severityBadgeColor(alert.severity)}`}>
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">
          <LanguageText en={alert.title.en} zh={alert.title.zh} />
        </span>
        <span className="text-xs">{alert.machineId}</span>
      </div>
      <div className="text-xs opacity-80">
        <LanguageText en={alert.evidence.en} zh={alert.evidence.zh} />
      </div>
      {alert.suggestedActions.length > 0 && (
        <div className="text-xs">
          → <LanguageText en={alert.suggestedActions[0].en} zh={alert.suggestedActions[0].zh} />
        </div>
      )}
    </div>
  );
}

export default function ProductionPage() {
  // Live Risk Brain state
  const [dashboard, setDashboard] = useState<DashboardVM | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riskPreset, setRiskPreset] = useState<"OK" | "WARN" | "HIGH">("OK");
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Manufacturing Dashboard state
  const [mfgData, setMfgData] = useState<DashboardSummaryResponse | null>(null);
  const [mfgLoading, setMfgLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("1h");
  const [activeTab, setActiveTab] = useState<string>("risk");

  // Fetch Live Risk Brain data
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/production/dashboard?mode=demo&risk=${riskPreset}&seed=${Date.now()}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch dashboard");
      }
      const data = await res.json();
      setDashboard(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [riskPreset]);

  // Fetch Manufacturing Dashboard data
  const fetchMfgData = useCallback(async () => {
    setMfgLoading(true);
    try {
      const riskLevel = riskPreset === "OK" ? "low" : riskPreset === "WARN" ? "medium" : "high";
      const res = await fetch(`/api/manufacturing/summary?plantId=P01&range=${timeRange}&risk=${riskLevel}&seed=${Date.now()}`);
      if (!res.ok) throw new Error("Failed to fetch manufacturing data");
      const data = await res.json();
      setMfgData(data);
    } catch (e) {
      console.error("Manufacturing data fetch error:", e);
    } finally {
      setMfgLoading(false);
    }
  }, [riskPreset, timeRange]);

  // Fetch both on mount and when params change
  useEffect(() => {
    fetchDashboard();
    fetchMfgData();
  }, [fetchDashboard, fetchMfgData]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchDashboard();
      fetchMfgData();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboard, fetchMfgData]);

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
          <LanguageText en="Module • Production Monitoring" zh="模块 • 生产监控" />
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          <LanguageText en="Production Monitoring" zh="生产监控" />
        </h1>
        <p className="text-muted-foreground">
          <LanguageText
            en="Real-time shopfloor status with Live Risk Brain integration. Demo mode generates realistic production data."
            zh="实时车间状态与 Live Risk Brain 集成。演示模式生成逼真的生产数据。"
          />
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={riskPreset} onValueChange={(v) => setRiskPreset(v as "OK" | "WARN" | "HIGH")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OK">
              <LanguageText en="Normal (OK)" zh="正常 (OK)" />
            </SelectItem>
            <SelectItem value="WARN">
              <LanguageText en="Warning (WARN)" zh="警告 (WARN)" />
            </SelectItem>
            <SelectItem value="HIGH">
              <LanguageText en="High Risk (HIGH)" zh="高风险 (HIGH)" />
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label.zh}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={() => { fetchDashboard(); fetchMfgData(); }} disabled={loading || mfgLoading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-1 ${loading || mfgLoading ? "animate-spin" : ""}`} />
          <LanguageText en="Refresh" zh="刷新" />
        </Button>

        <Button
          onClick={() => setAutoRefresh(!autoRefresh)}
          variant={autoRefresh ? "default" : "outline"}
        >
          <LanguageText en={autoRefresh ? "Auto: ON" : "Auto: OFF"} zh={autoRefresh ? "自动：开" : "自动：关"} />
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          {error}
        </div>
      )}

      {/* KPI Strip - Always visible when mfgData is available */}
      {mfgData && <KpiStrip kpis={mfgData.kpis} />}

      {/* Tabs for switching between Risk View and Operations View */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="risk">
            <LanguageText en="Risk Analysis" zh="风险分析" />
          </TabsTrigger>
          <TabsTrigger value="operations">
            <LanguageText en="Operations" zh="生产运营" />
          </TabsTrigger>
        </TabsList>

        {/* Risk Analysis Tab - Original Live Risk Brain content */}
        <TabsContent value="risk" className="mt-6">
          {dashboard && (
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      <LanguageText en="Factory Overview" zh="全厂概览" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div className="rounded-lg border bg-emerald-50 p-3 text-center">
                        <div className="text-2xl font-bold text-emerald-700">{dashboard.factorySummary.runningCount}</div>
                        <div className="text-xs text-emerald-600">
                          <LanguageText en="Running" zh="运行中" />
                        </div>
                      </div>
                      <div className="rounded-lg border bg-slate-50 p-3 text-center">
                        <div className="text-2xl font-bold text-slate-600">{dashboard.factorySummary.stoppedCount}</div>
                        <div className="text-xs text-slate-500">
                          <LanguageText en="Stopped" zh="停机" />
                        </div>
                      </div>
                      <div className="rounded-lg border bg-rose-50 p-3 text-center">
                        <div className="text-2xl font-bold text-rose-700">{dashboard.factorySummary.alarmCount}</div>
                        <div className="text-xs text-rose-600">
                          <LanguageText en="Alarm" zh="报警" />
                        </div>
                      </div>
                      <div className="rounded-lg border bg-blue-50 p-3 text-center">
                        <div className="text-2xl font-bold text-blue-700">{dashboard.factorySummary.setupCount}</div>
                        <div className="text-xs text-blue-600">
                          <LanguageText en="Setup" zh="调机" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="text-sm text-muted-foreground">
                          <LanguageText en="Overall Live Risk" zh="总体实时风险" />
                        </div>
                        <div className={`mt-1 inline-block rounded-full border px-3 py-1 text-sm font-semibold ${riskBadgeColor(dashboard.factorySummary.overallLiveRisk)}`}>
                          {dashboard.factorySummary.overallLiveRisk} ({dashboard.factorySummary.overallScore})
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          <LanguageText en="Throughput" zh="产量" />
                        </div>
                        <div className="text-lg font-semibold">{dashboard.factorySummary.throughputNow.toLocaleString()}/h</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      <LanguageText en="Machine Status (Risk View)" zh="机台状态（风险视图）" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {dashboard.machines.map((m) => (
                        <MachineCardComponent key={m.machineId} machine={m} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      <LanguageText en="Risk Alerts" zh="风险告警" />
                      {dashboard.alerts.length > 0 && (
                        <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                          {dashboard.alerts.length}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {dashboard.alerts.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        <LanguageText en="No active alerts" zh="暂无告警" />
                      </div>
                    ) : (
                      dashboard.alerts.slice(0, 8).map((a) => (
                        <AlertCard key={a.id} alert={a} />
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      <LanguageText en="Live Risk Brain" zh="实时风险大脑" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      <LanguageText
                        en="✓ Production + Quality + Engineering"
                        zh="✓ 生产 + 质量 + 工程"
                      />
                    </p>
                    <p>
                      <LanguageText
                        en="✓ Explainable drivers"
                        zh="✓ 可解释的原因"
                      />
                    </p>
                    <p>
                      <LanguageText
                        en="✓ Real-time risk scoring"
                        zh="✓ 实时风险评分"
                      />
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Operations Tab - New Manufacturing Dashboard content */}
        <TabsContent value="operations" className="mt-6">
          {mfgData && (
            <div className="space-y-6">
              {/* Machine Status Grid */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  <LanguageText en="Machine Status" zh="设备状态" />
                </h3>
                <MachineStatusGrid machines={mfgData.machines} />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <CycleTimeTrend data={mfgData.ctTrend} targetCt={3.0} />
                <ThroughputTrend data={mfgData.throughputTrend} />
                <DowntimePareto data={mfgData.downtimePareto} />
              </div>

              {/* Andon & Work Orders Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <AndonFeed
                  events={mfgData.andon}
                  maxHeight="350px"
                  className="lg:col-span-1"
                />
                <WorkOrderTable
                  workOrders={mfgData.workOrders}
                  className="lg:col-span-2"
                />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}

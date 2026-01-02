"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Cog, RefreshCw } from "lucide-react";

import { LanguageText } from "@/components/language-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Trash2 } from "lucide-react";

import type { DashboardSummaryResponse, TimeRange, MachineState, MachineTile } from "@/lib/manufacturing/types";
import { TIME_RANGE_OPTIONS } from "@/lib/manufacturing";
import type { DashboardVM, LiveRiskStatus, MachineRiskCard, Alert } from "@/lib/liveRiskBrain/types";
import {
  KpiStrip,
  MachineStatusGrid,
  AndonFeed,
  WorkOrderTable,
  CycleTimeTrend,
  ThroughputTrend,
  DowntimePareto,
} from "@/components/manufacturing";
import { CameraMonitorCard } from "@/components/production";
import { loadFactoryConfig } from "@/lib/factory/storage";
import { FactoryConfig, DeviceStatus } from "@/lib/factory/types";
import { WorkOrder, SimRequest, SimResult, SimKPIs, DeviceSimState } from "@/lib/factory/simTypes";
import { simulate } from "@/lib/factory/simulator";
import { loadWorkOrders, saveWorkOrders } from "@/lib/factory/woStorage";
import { RestPollingAdapter } from "@/lib/factory/live/adapters/RestPollingAdapter";
import { LiveStore } from "@/lib/factory/live/liveStore";
import { LiveSnapshot } from "@/lib/factory/live/liveTypes";
import Link from "next/link";
import { Settings, Play, Sliders, ListTodo, Plus, Clock, Save as SaveIcon } from "lucide-react";

function mapDeviceStatusToMachineState(status: string): MachineState {
  switch (status) {
    case "RUNNING": return "RUN";
    case "DOWN": return "STOP";
    case "SETUP": return "SETUP";
    case "IDLE": return "WAIT";
    case "MAINT": return "OFF";
    default: return "WAIT";
  }
}

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

export function ProductionDashboard() {
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
  const [factoryConfig, setFactoryConfig] = useState<FactoryConfig | null>(null);
  const [mode, setMode] = useState<"LIVE" | "SIM">("LIVE");
  
  // Simulation Settings
  const [simHorizon, setSimHorizon] = useState(480); // 8h
  const [simStepSec, setSimStepSec] = useState(30);
  const [simSeed, setSimSeed] = useState(1234);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [liveSnapshot, setLiveSnapshot] = useState<LiveSnapshot | null>(null);

  useEffect(() => {
    setFactoryConfig(loadFactoryConfig());
    setWorkOrders(loadWorkOrders());
  }, []);

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

  // Simulation Engine Call
  const runSimulation = useCallback(() => {
    if (!factoryConfig) return;
    setIsSimulating(true);
    
    // Artificial slight delay for feel
    setTimeout(() => {
      const result = simulate({
        startISO: new Date().toISOString(),
        horizonMin: simHorizon,
        stepSec: simStepSec,
        factory: factoryConfig,
        workOrders: workOrders,
        seed: simSeed
      });
      setSimResult(result);
      setIsSimulating(false);
      setActiveTab("operations");
    }, 100);
  }, [factoryConfig, simHorizon, simStepSec, simSeed, workOrders]);

  // Fetch both on mount and when params change
  useEffect(() => {
    if (mode === "LIVE") {
      fetchDashboard();
      fetchMfgData();
    } else {
      runSimulation();
    }
  }, [fetchDashboard, fetchMfgData, runSimulation, mode]);

  // LIVE Mode Subscription (P2)
  useEffect(() => {
    if (mode !== "LIVE" || !factoryConfig) return;

    const store = new LiveStore(factoryConfig);
    const adapter = new RestPollingAdapter();
    
    adapter.connect();
    const unsubscribe = adapter.subscribe((evt) => {
      store.processEvent(evt);
      // Rate-limited UI update via throttle? For now just set state
      setLiveSnapshot(store.getSnapshot());
    });

    return () => {
      unsubscribe();
      adapter.disconnect();
    };
  }, [mode, factoryConfig]);

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
          {mode === "SIM" && (
            <Badge className="ml-3 bg-indigo-600 text-white border-0 py-1">
              <Clock className="h-3 w-3 mr-1" /> SIMULATION
            </Badge>
          )}
        </h1>
        <p className="text-muted-foreground">
          <LanguageText
            en={mode === "LIVE" ? "Real-time shopfloor status driven by Factory Configuration." : "Deterministic simulation mode. Run what-if scenarios based on your factory config."}
            zh={mode === "LIVE" ? "由工厂配置驱动的实时车间状态。" : "确定性仿真模式。基于工厂配置运行假设分析假设方案。"}
          />
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 p-4 rounded-xl border border-muted-foreground/10">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "LIVE" | "SIM")} className="w-64">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="LIVE"><LanguageText en="Live" zh="实时" /></TabsTrigger>
            <TabsTrigger value="SIM"><LanguageText en="Sim" zh="仿真" /></TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-3">
          {mode === "LIVE" ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 border-r pr-4 border-muted-foreground/20">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">
                  {liveSnapshot?.health.connected ? (
                    <>
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      {liveSnapshot.health.degraded ? "DEGRADED" : "CONNECTED"}
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 rounded-full bg-zinc-400" />
                      OFFLINE
                    </>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground tabular-nums">
                  Last: {liveSnapshot?.health.lastUpdateTs ? new Date(liveSnapshot.health.lastUpdateTs).toLocaleTimeString() : "—"}
                </div>
              </div>

              <Select value={riskPreset} onValueChange={(v) => setRiskPreset(v as "OK" | "WARN" | "HIGH")}>
                <SelectTrigger className="w-40 bg-zinc-900/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OK"><LanguageText en="Normal (OK)" zh="正常 (OK)" /></SelectItem>
                  <SelectItem value="WARN"><LanguageText en="Warning (WARN)" zh="警告 (WARN)" /></SelectItem>
                  <SelectItem value="HIGH"><LanguageText en="High Risk (HIGH)" zh="高风险 (HIGH)" /></SelectItem>
                </SelectContent>
              </Select>

              <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                <SelectTrigger className="w-36 bg-zinc-900/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label.zh}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={() => { fetchDashboard(); fetchMfgData(); }} disabled={loading || mfgLoading} variant="outline" className="bg-zinc-900/50">
                <RefreshCw className={`h-4 w-4 mr-1 ${loading || mfgLoading ? "animate-spin" : ""}`} />
                <LanguageText en="Refresh" zh="刷新" />
              </Button>

              <Button
                onClick={() => {
                  setRiskPreset("HIGH");
                  setAutoRefresh(true);
                  setActiveTab("operations");
                  fetchDashboard();
                  fetchMfgData();
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <LanguageText en="▶ Start Live Demo" zh="▶ 启动现场演示" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 border-r pr-4 border-muted-foreground/20">
                <Sliders className="h-4 w-4 text-muted-foreground" />
                <Select value={simHorizon.toString()} onValueChange={(v) => setSimHorizon(parseInt(v))}>
                  <SelectTrigger className="w-24 border-0 bg-transparent h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">1h</SelectItem>
                    <SelectItem value="240">4h</SelectItem>
                    <SelectItem value="480">8h</SelectItem>
                    <SelectItem value="1440">24h</SelectItem>
                  </SelectContent>
                </Select>
                <div className="h-4 w-[1px] bg-muted-foreground/20" />
                <Select value={simStepSec.toString()} onValueChange={(v) => setSimStepSec(parseInt(v))}>
                  <SelectTrigger className="w-24 border-0 bg-transparent h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10s Step</SelectItem>
                    <SelectItem value="30">30s Step</SelectItem>
                    <SelectItem value="60">60s Step</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={runSimulation} disabled={isSimulating} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Play className={`h-4 w-4 ${isSimulating ? "animate-pulse" : ""}`} />
                <LanguageText en="Start Simulation" zh="启动仿真" />
              </Button>
            </div>
          )}
</div>

        <Link href="/tools/factory-config">
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            <LanguageText en="Factory Settings" zh="工厂设置" />
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          {error}
        </div>
      )}

      {/* Shift Badge + KPI Strip */}
      {(mode === "LIVE" ? mfgData : simResult) && (
        <div className="space-y-4">
          {/* Current Shift Badge */}
          {mode === "LIVE" && mfgData?.shift && (
            <div className="flex items-center gap-3">
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
                mfgData.shift.id === "NIGHT" 
                  ? "bg-indigo-100 text-indigo-800 border border-indigo-200" 
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}>
                <span className={`h-2 w-2 rounded-full ${mfgData.shift.id === "NIGHT" ? "bg-indigo-500" : "bg-amber-500"}`} />
                <span>{mfgData.shift.name}</span>
                <span className="text-xs opacity-70">
                  ({mfgData.shift.startTime} - {mfgData.shift.endTime})
                </span>
              </div>
            </div>
          )}
          
          <KpiStrip kpis={
            mode === "LIVE" 
              ? (liveSnapshot 
                  ? { 
                      ...liveSnapshot.kpis, 
                      actualQty: liveSnapshot.kpis.actualGoodQty,
                      ctAvgSec: liveSnapshot.kpis.avgCtSec,
                      activeAlarmsCount: liveSnapshot.kpis.alarms.length,
                      availability: 0.92 
                    } as any
                  : mfgData?.kpis || {} as any)
              : {
                  planQty: simResult!.kpis.planQty,
                  actualQty: simResult!.kpis.actualGoodQty,
                  oee: simResult!.kpis.oee,
                  fpy: simResult!.kpis.fpy,
                  uph: simResult!.kpis.uph,
                  ctAvgSec: simResult!.kpis.avgCtSec,
                  activeAlarmsCount: simResult!.kpis.alarms.length,
                  scrapRate: simResult!.kpis.totalScrap / (simResult!.kpis.actualGoodQty + simResult!.kpis.totalScrap || 1),
                  availability: simResult!.kpis.oee / (0.95 * simResult!.kpis.fpy || 1)
                } as any
          } />
        </div>
      )}

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
                      {factoryConfig && factoryConfig.devices.map((configDevice) => {
                        let displayMachine: MachineRiskCard;
                        
                        if (mode === "LIVE") {
                          const mRaw = dashboard?.machines.find(dm => dm.machineId === configDevice.id);
                          const mLive = liveSnapshot?.devices[configDevice.id];
                          
                          if (!mRaw && !mLive && !configDevice.enabled) return null;

                          displayMachine = {
                            machineId: configDevice.id,
                            status: mLive?.status || mRaw?.status || "IDLE",
                            liveRiskStatus: mLive?.healthStatus === "DOWN" ? "HIGH_RISK" : (mRaw?.liveRiskStatus || "ENGINEERING_OK"),
                            liveRiskScore: mRaw?.liveRiskScore || (mLive ? 50 : 0),
                            topDrivers: [
                              ...(mRaw?.topDrivers || []),
                              ...(mLive?.isStale ? [{ dimension: "manufacturing", title: { en: "Data stale > 30s", zh: "数据延迟 > 30秒" } }] : [])
                            ],
                            cycleTimeMs: configDevice.ctSec * 1000,
                            cycleTimeDeltaPct: mRaw?.cycleTimeDeltaPct || 0,
                            lastCpk: mRaw?.lastCpk || 1.33,
                            scrapRate: mLive?.scrapCount !== undefined && mLive.producedCount > 0 ? mLive.scrapCount / mLive.producedCount : (mRaw?.scrapRate || 0),
                            lastNelsonViolations: mRaw?.lastNelsonViolations || 0,
                            tempDrift: mRaw?.tempDrift || false
                          } as any;
                        } else if (mode === "SIM" && simResult) {
                          const s = simResult.devices.find(ds => ds.deviceId === configDevice.id)!;
                          displayMachine = {
                            machineId: s.deviceId,
                            status: s.status as any,
                            liveRiskStatus: s.status === "DOWN" ? "HIGH_RISK" : "ENGINEERING_OK",
                            liveRiskScore: s.utilization * 100,
                            topDrivers: s.lastEvent ? [{ dimension: "manufacturing", title: { en: s.lastEvent, zh: s.lastEvent } }] : [],
                            cycleTimeMs: configDevice.ctSec * 1000,
                            cycleTimeDeltaPct: 0,
                            lastCpk: 1.33,
                            scrapRate: s.producedCount > 0 ? s.scrapCount / s.producedCount : 0,
                            lastNelsonViolations: 0,
                            tempDrift: false
                          } as any;
                        } else {
                          return null;
                        }

                        return <MachineCardComponent key={configDevice.id} machine={displayMachine} />;
                      })}
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
                <MachineStatusGrid machines={
                  mode === "LIVE" 
                    ? (factoryConfig!.devices.filter(d => d.enabled).map(configDevice => {
                        const mRaw = mfgData?.machines.find(dm => dm.machineId === configDevice.id);
                        const mLive = liveSnapshot?.devices[configDevice.id];
                        
                        return {
                          machineId: configDevice.id,
                          name: configDevice.label,
                          state: mapDeviceStatusToMachineState(mLive?.status || mRaw?.state || "IDLE"),
                          lineId: "L1",
                          ctSec: mLive ? (mLive.cycleTimeSec || configDevice.ctSec) : (mRaw?.ctSec || configDevice.ctSec),
                          workOrderId: mLive?.activeWorkOrderId || mRaw?.workOrderId,
                          lastEventAt: new Date().toISOString(),
                          currentQty: mLive?.goodCount || mRaw?.currentQty || 0,
                          targetQty: mRaw?.targetQty || 1000,
                          designCode: mLive?.activeWorkOrderId ? "LIVE-PART" : mRaw?.designCode
                        } as MachineTile;
                      }))
                    : (simResult ? simResult.devices.map(s => {
                        const d = factoryConfig!.devices.find(fd => fd.id === s.deviceId)!;
                        return {
                          machineId: s.deviceId,
                          name: d.label,
                          state: mapDeviceStatusToMachineState(s.status),
                          lineId: "L1",
                          ctSec: d.ctSec,
                          workOrderId: s.activeWorkOrderId,
                          lastEventAt: new Date().toISOString(),
                          currentQty: s.goodCount,
                          targetQty: 1000,
                          designCode: s.designCode
                        } as MachineTile;
                      }) : [])
                } />
              </div>

              {/* Charts Row */}
              {mode === "LIVE" && mfgData && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <CycleTimeTrend data={mfgData.ctTrend} targetCt={3.0} />
                  <ThroughputTrend data={mfgData.throughputTrend} />
                  <DowntimePareto data={mfgData.downtimePareto} />
                </div>
              )}

              {/* Andon & Work Orders Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <AndonFeed
                  events={
                    mode === "LIVE" 
                      ? mfgData?.andon || []
                      : simResult?.kpis.alarms.map((a, i) => ({
                          id: a.id,
                          type: a.severity === "FAIL" ? "STOP" : "QUALITY",
                          severity: a.severity === "FAIL" ? "CRITICAL" : a.severity === "WARN" ? "MAJOR" : "MINOR",
                          machineId: a.deviceId || "FACTORY",
                          timestamp: new Date().toISOString(),
                          message: { en: a.message, zh: a.message },
                          status: "ACTIVE"
                        } as any)) || []
                  }
                  maxHeight="350px"
                  className="lg:col-span-1"
                />
                <WorkOrderTable
                  workOrders={
                    mode === "LIVE"
                      ? mfgData?.workOrders || []
                      : workOrders.map(wo => {
                          const batches = simResult?.devices.filter(d => d.activeWorkOrderId === wo.id);
                          const progress = batches && batches.length > 0 ? Math.max(...batches.map(b => b.progress01)) * 100 : 0;
                          return {
                            workOrderId: wo.id,
                            designCode: wo.designCode,
                            customer: "SEOS Simulation",
                            qty: wo.qty,
                            completedQty: simResult?.devices.reduce((sum, d) => d.activeWorkOrderId === wo.id ? sum + d.goodCount : sum, 0) || 0,
                            status: progress > 0 ? "IN_PROGRESS" : "PENDING",
                            priority: wo.priority === 5 ? "URGENT" : "NORMAL",
                            dueDate: wo.dueISO || "-"
                          } as any;
                        })
                  }
                  className="lg:col-span-2"
                />
              </div>

              {/* Camera & Engineering Specs Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CameraMonitorCard
                  lineId={mfgData.machines[0]?.lineId}
                  workOrderId={mfgData.workOrders[0]?.workOrderId}
                  className="md:col-span-2"
                  initialMode={autoRefresh ? "demo" : "local"}
                />
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      <LanguageText en="Engineering Specs vs Actual" zh="工程规格 vs 实测" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-4">
                    <div className="rounded-lg bg-muted/40 p-3">
                       <div className="flex justify-between items-center mb-1">
                          <span className="text-muted-foreground"><LanguageText en="Part Name" zh="零件名称" /></span>
                          <span className="font-semibold">C-291-Custom</span>
                       </div>
                       <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>Rev: 2.1</span>
                          <span>Mat: SUS304</span>
                       </div>
                    </div>
                    
                    <div className="space-y-3">
                       <div>
                          <div className="flex justify-between mb-1">
                             <span>OD <span className="text-muted-foreground">(Outer Dia)</span></span>
                             <span className="font-mono text-emerald-600">24.02 mm</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-500 w-[55%] relative">
                                <div className="absolute top-0 right-0 w-0.5 h-full bg-black/20" /> {/* Center mark */}
                             </div>
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                             <span>23.80</span>
                             <span className="font-semibold text-primary">Target: 24.00</span>
                             <span>24.20</span>
                          </div>
                       </div>
                       
                       <div>
                          <div className="flex justify-between mb-1">
                             <span>FL <span className="text-muted-foreground">(Free Len)</span></span>
                             <span className="font-mono text-amber-600">45.88 mm</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                             <div className="h-full bg-amber-500 w-[85%] relative" />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                             <span>44.00</span>
                             <span>Target: 45.00</span>
                             <span>46.00</span>
                          </div>
                       </div>
                    </div>
                    
                    <div className="pt-2 border-t text-xs text-muted-foreground">
                       <p>
                          <LanguageText 
                            en="Connects directly to Engineering Calculator V2.1 rules."
                            zh="直接关联工程计算器 V2.1 规则。" 
                          />
                       </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Simulation Tools Sheet (P1) */}
      {mode === "SIM" && (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="fixed bottom-6 right-6 h-12 rounded-full shadow-lg gap-2 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100">
              <ListTodo className="h-5 w-5 text-indigo-600" />
              <LanguageText en="Sim Tools" zh="仿真工具" />
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle><LanguageText en="Simulation Planner" zh="仿真计划器" /></SheetTitle>
              <SheetDescription>
                <LanguageText en="Manage work orders and simulation parameters." zh="管理工单和仿真参数。" />
              </SheetDescription>
            </SheetHeader>

            <div className="py-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <ListTodo className="h-4 w-4" />
                    <LanguageText en="Work Orders" zh="生产工单" />
                  </h4>
                  <Button size="sm" variant="ghost" className="h-7 text-indigo-600" onClick={() => {
                    const newWO: WorkOrder = {
                      id: `WO-${workOrders.length + 101}`,
                      designCode: "NEW-PART",
                      qty: 1000,
                      route: ["CNC_COILING", "INSPECTION"],
                      priority: 3
                    };
                    setWorkOrders([...workOrders, newWO]);
                  }}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>

                <div className="space-y-2">
                  {workOrders.map((wo, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-muted/30 relative group">
                      <Button 
                        variant="ghost" size="icon" 
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setWorkOrders(workOrders.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3 w-3 text-rose-500" />
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase">ID</Label>
                          <Input value={wo.id} onChange={(e) => {
                            const next = [...workOrders];
                            next[idx] = { ...wo, id: e.target.value };
                            setWorkOrders(next);
                          }} className="h-7 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase">Design Code</Label>
                          <Input value={wo.designCode} onChange={(e) => {
                            const next = [...workOrders];
                            next[idx] = { ...wo, designCode: e.target.value };
                            setWorkOrders(next);
                          }} className="h-7 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase">Qty</Label>
                          <Input type="number" value={wo.qty} onChange={(e) => {
                            const next = [...workOrders];
                            next[idx] = { ...wo, qty: parseInt(e.target.value) };
                            setWorkOrders(next);
                          }} className="h-7 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase">Priority</Label>
                          <Select value={wo.priority?.toString()} onValueChange={(v) => {
                            const next = [...workOrders];
                            next[idx] = { ...wo, priority: parseInt(v) };
                            setWorkOrders(next);
                          }}>
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5].map(p => <SelectItem key={p} value={p.toString()}>{p}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Sliders className="h-4 w-4" />
                  <LanguageText en="Sim Metadata" zh="仿真元数据" />
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Random Seed</Label>
                    <Input type="number" value={simSeed} onChange={(e) => setSimSeed(parseInt(e.target.value))} className="h-8" />
                  </div>
                  <div className="space-y-1 pt-5">
                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => saveWorkOrders(workOrders)}>
                      <SaveIcon className="h-3 w-3" />
                      Save WO List
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Button onClick={() => { runSimulation(); }} disabled={isSimulating} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                  <Play className={`h-4 w-4 ${isSimulating ? "animate-pulse" : ""}`} />
                  <LanguageText en="Re-run Simulation" zh="重新运行仿真" />
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </section>
  );
}

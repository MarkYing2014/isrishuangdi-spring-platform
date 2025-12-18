"use client";

import { useCallback, useEffect, useState } from "react";

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

import type { DashboardVM, LiveRiskStatus, MachineRiskCard, Alert } from "@/lib/liveRiskBrain/types";

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
    <div className="rounded-lg border bg-background p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{machine.machineId}</div>
        <div className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeColor(machine.status)}`}>
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
          <span>⚠</span>
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
  const [dashboard, setDashboard] = useState<DashboardVM | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riskPreset, setRiskPreset] = useState<"OK" | "WARN" | "HIGH">("OK");
  const [autoRefresh, setAutoRefresh] = useState(false);

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

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboard]);

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

        <Button onClick={fetchDashboard} disabled={loading} variant="outline">
          <LanguageText en={loading ? "Loading..." : "Refresh"} zh={loading ? "加载中..." : "刷新"} />
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
                  <LanguageText en="Machine Status" zh="机台状态" />
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
                  <LanguageText en="Alerts" zh="告警" />
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
                  <LanguageText en="What's Different" zh="差异点" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <LanguageText
                    en="✓ Live Risk Brain: Production + Quality + Engineering"
                    zh="✓ Live Risk Brain：生产 + 质量 + 工程"
                  />
                </p>
                <p>
                  <LanguageText
                    en="✓ Explainable drivers, not just numbers"
                    zh="✓ 可解释的原因，而非仅数字"
                  />
                </p>
                <p>
                  <LanguageText
                    en="✓ Demo-first, production-ready architecture"
                    zh="✓ 演示优先，生产就绪架构"
                  />
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </section>
  );
}

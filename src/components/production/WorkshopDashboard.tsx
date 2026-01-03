"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Factory,
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  Boxes,
} from "lucide-react";
import {
  generateWorkshopState,
  type DemoScenario,
  type WorkshopState,
  type ProductionLine,
  type DefectItem,
  type OverallStatus,
  type LineStatus,
} from "@/lib/demo/workshopSimulator";

function getStatusBgClass(status: OverallStatus): string {
  switch (status) {
    case "on_track": return "bg-emerald-500";
    case "at_risk": return "bg-amber-500";
    case "delayed": return "bg-red-500";
  }
}

function getStatusLabel(status: OverallStatus, isZh: boolean): string {
  switch (status) {
    case "on_track": return isZh ? "正常运行" : "ON TRACK";
    case "at_risk": return isZh ? "存在风险" : "AT RISK";
    case "delayed": return isZh ? "延误告警" : "DELAYED";
  }
}

function getLineColor(status: LineStatus): string {
  switch (status) {
    case "normal": return "#22c55e";
    case "warning": return "#f59e0b";
    case "fault": return "#ef4444";
  }
}

function getLineBg(status: LineStatus): string {
  switch (status) {
    case "normal": return "bg-emerald-500/20 border-emerald-500/50";
    case "warning": return "bg-amber-500/20 border-amber-500/50";
    case "fault": return "bg-red-500/20 border-red-500/50 animate-pulse";
  }
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-slate-400" />;
}

function getAlertIcon(type: string) {
  switch (type) {
    case "blocking": return <AlertCircle className="h-4 w-4 text-red-400" />;
    case "warning": return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    default: return <Info className="h-4 w-4 text-sky-400" />;
  }
}

// =============== Factory Floor SVG Map ===============
function FactoryFloorMap({ lines = [], isZh = true }: { lines: ProductionLine[]; isZh?: boolean }) {
  return (
    <svg viewBox="0 0 400 280" className="w-full h-full" style={{ minHeight: 240 }}>
      {/* Background */}
      <rect x="0" y="0" width="400" height="280" fill="#1a1a2e" rx="8" />
      
      {/* Title */}
      <text x="200" y="24" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">
        {isZh ? "车间布局" : "Factory Floor"}
      </text>

      {/* Raw Material Area */}
      <rect x="150" y="40" width="100" height="30" fill="#3b82f6" fillOpacity="0.3" stroke="#3b82f6" strokeWidth="1" rx="4" />
      <text x="200" y="60" textAnchor="middle" fill="#60a5fa" fontSize="10">{isZh ? "原料区" : "Raw"}</text>

      {/* Flow arrows */}
      <path d="M 200 75 L 200 95" stroke="#475569" strokeWidth="2" markerEnd="url(#arrowhead)" />
      <path d="M 200 95 L 80 95 L 80 115" stroke="#475569" strokeWidth="1.5" />
      <path d="M 200 95 L 200 115" stroke="#475569" strokeWidth="1.5" />
      <path d="M 200 95 L 320 95 L 320 115" stroke="#475569" strokeWidth="1.5" />

      {/* Production Lines */}
      {lines.map((line, i) => {
        const x = 60 + i * 120;
        const color = getLineColor(line.status);
        return (
          <g key={line.id}>
            <rect 
              x={x} y={120} width={80} height={70} 
              fill={color} fillOpacity="0.15" 
              stroke={color} strokeWidth="2" rx="6"
            />
            <circle cx={x + 70} cy={130} r="6" fill={color} />
            <text x={x + 40} y={140} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
              {isZh ? line.nameZh : line.name}
            </text>
            <text x={x + 40} y={158} textAnchor="middle" fill="#94a3b8" fontSize="10">
              OEE: {line.oee}%
            </text>
            <text x={x + 40} y={175} textAnchor="middle" fill="#64748b" fontSize="9">
              {line.throughput} pcs/h
            </text>
          </g>
        );
      })}

      {/* Flow to output */}
      <path d="M 80 195 L 80 210 L 200 210" stroke="#475569" strokeWidth="1.5" />
      <path d="M 200 195 L 200 210" stroke="#475569" strokeWidth="1.5" />
      <path d="M 320 195 L 320 210 L 200 210" stroke="#475569" strokeWidth="1.5" />
      <path d="M 200 210 L 200 225" stroke="#475569" strokeWidth="2" markerEnd="url(#arrowhead)" />

      {/* Finished Goods Area */}
      <rect x="100" y="230" width="200" height="35" fill="#22c55e" fillOpacity="0.2" stroke="#22c55e" strokeWidth="1" rx="4" />
      <text x="200" y="252" textAnchor="middle" fill="#4ade80" fontSize="10">{isZh ? "成品仓库" : "Finished"}</text>

      {/* Legend */}
      <g transform="translate(290, 240)">
        <circle cx="0" cy="0" r="5" fill="#22c55e" />
        <text x="10" y="4" fill="#94a3b8" fontSize="8">{isZh ? "正常" : "OK"}</text>
        <circle cx="0" cy="15" r="5" fill="#f59e0b" />
        <text x="10" y="19" fill="#94a3b8" fontSize="8">{isZh ? "警告" : "Warn"}</text>
        <circle cx="50" cy="0" r="5" fill="#ef4444" />
        <text x="60" y="4" fill="#94a3b8" fontSize="8">{isZh ? "故障" : "Fault"}</text>
      </g>

      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
        </marker>
      </defs>
    </svg>
  );
}

// =============== OEE Comparison Bars ===============
function OEEComparisonPanel({ lines = [], isZh = true }: { lines: ProductionLine[]; isZh?: boolean }) {
  const sortedLines = [...lines].sort((a, b) => b.oee - a.oee);

  return (
    <div className="space-y-3">
      <div className="text-xs text-slate-400 mb-2">{isZh ? "OEE 横向对比" : "OEE Comparison"}</div>
      {sortedLines.map((line, i) => (
        <div key={line.id} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 flex items-center gap-1">
              {i === 0 && <span className="text-amber-400">★</span>}
              {isZh ? line.nameZh : line.name}
            </span>
            <span className={line.oee >= 80 ? "text-emerald-400" : line.oee >= 70 ? "text-amber-400" : "text-red-400"}>
              {line.oee}%
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                line.oee >= 80 ? "bg-emerald-500" : line.oee >= 70 ? "bg-amber-500" : "bg-red-500"
              }`}
              style={{ width: `${line.oee}%` }}
            />
          </div>
        </div>
      ))}
      <div className="text-xs text-slate-500 mt-2">{isZh ? "目标: 80% | 行业優秀: 85%+" : "Target: 80% | Best: 85%+"}</div>
    </div>
  );
}

// =============== FPY Defect Heatmap ===============
function DefectHeatmap({ defects = [], isZh = true }: { defects: DefectItem[]; isZh?: boolean }) {
  const sortedDefects = [...defects].sort((a, b) => b.count - a.count).slice(0, 3);
  const maxCount = sortedDefects[0]?.count || 1;

  return (
    <div className="space-y-3">
      <div className="text-xs text-slate-400 mb-2">{isZh ? "Top 3 不良问题" : "Top 3 Defects"}</div>
      {sortedDefects.length === 0 ? (
        <div className="text-xs text-slate-500 text-center py-4">{isZh ? "暂无缺陷记录 ✓" : "No defects ✓"}</div>
      ) : (
        sortedDefects.map((defect) => (
          <div key={defect.id} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">{isZh ? defect.typeZh : defect.type}</span>
              <span className="text-slate-400">{defect.lineName}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    defect.severity === "critical" ? "bg-red-500" : 
                    defect.severity === "major" ? "bg-amber-500" : "bg-slate-400"
                  }`}
                  style={{ width: `${(defect.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 w-8">{defect.count}{isZh ? "件" : ""}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// =============== WIP Monitor ===============
function WIPMonitor({ lines = [], isZh = true }: { lines: ProductionLine[]; isZh?: boolean }) {
  return (
    <div className="space-y-3">
      <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
        <Boxes className="h-3 w-3" />
        {isZh ? "WIP / 在制品监控" : "WIP Monitor"}
      </div>
      {lines.map((line) => (
        <div key={line.id} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300">{isZh ? line.nameZh : line.name}</span>
            <span className={
              line.wipStatus === "critical" ? "text-red-400" :
              line.wipStatus === "warning" ? "text-amber-400" : "text-slate-400"
            }>
              {line.wipLevel}%
              {line.wipStatus === "critical" && " ⚠"}
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                line.wipStatus === "critical" ? "bg-red-500 animate-pulse" :
                line.wipStatus === "warning" ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${line.wipLevel}%` }}
            />
          </div>
        </div>
      ))}
      <div className="text-xs text-slate-500 mt-2">{isZh ? "警告: >70% | 停线: >90%" : "Warn: >70% | Stop: >90%"}</div>
    </div>
  );
}

// =============== Main Dashboard ===============
export function WorkshopDashboard() {
  const [scenario, setScenario] = useState<DemoScenario>("warning");
  const [state, setState] = useState<WorkshopState | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isZh, setIsZh] = useState(true);

  useEffect(() => {
    setState(generateWorkshopState(scenario));
  }, [scenario]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!state) return null;

  const formatTime = (date: Date) => 
    date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div style={{ 
      backgroundColor: "#0a0a0f", 
      color: "white", 
      minHeight: "100vh", 
      padding: "16px",
      fontFamily: "system-ui, sans-serif"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Factory className="h-8 w-8 text-sky-400" />
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>
              {isZh ? state.workshopNameZh : state.workshopName}
            </h1>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
              {isZh ? "数字孪生看板" : "Digital Twin Dashboard"}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          {/* Language Toggle */}
          <button
            onClick={() => setIsZh(!isZh)}
            className="px-3 py-1 text-xs border border-slate-600 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            {isZh ? "EN" : "中"}
          </button>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "24px", fontFamily: "monospace", fontWeight: "bold", color: "#e2e8f0" }}>
              {formatTime(currentTime)}
            </div>
            <Badge variant="outline" className="border-sky-500/50 text-sky-400">
              {isZh ? `${state.shift}班` : `Shift ${state.shift}`}
            </Badge>
          </div>
          <div className={`px-6 py-3 rounded-lg ${getStatusBgClass(state.overallStatus)} text-white font-bold text-lg shadow-lg`}>
            {getStatusLabel(state.overallStatus, isZh)}
          </div>
        </div>
      </div>

      {/* Demo Selector */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <span style={{ fontSize: "12px", color: "#64748b" }}>DEMO:</span>
        <Select value={scenario} onValueChange={(v) => setScenario(v as DemoScenario)}>
          <SelectTrigger className="w-36 h-7 text-xs bg-slate-800 border-slate-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">🟢 Normal</SelectItem>
            <SelectItem value="warning">🟡 Warning</SelectItem>
            <SelectItem value="critical">🔴 Critical</SelectItem>
          </SelectContent>
        </Select>
        <span style={{ fontSize: "11px", color: "#475569" }}>
          {isZh ? "← 选择场景演示不同工厂状态" : "← Select scenario"}
        </span>
      </div>

      {/* Main Content: 2-column layout */}
      <div style={{ display: "flex", gap: "16px" }}>
        {/* Left: Factory Floor Map */}
        <div style={{ flex: "0 0 55%", minWidth: "400px" }}>
          <Card className="bg-[#1a1a2e] border-slate-700/50 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-200">
                🏭 {isZh ? "车间数字孪生布局" : "Digital Twin Map"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FactoryFloorMap lines={state.lines} isZh={isZh} />
              <div className="mt-4 text-xs text-slate-500 text-center">
                {isZh ? "“看布局，找瓶颈，哪条线停救哪条。”" : "See layout, find bottleneck, rescue the stopped line."}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Metrics Panels */}
        <div style={{ flex: "1 1 45%", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* OEE Comparison */}
          <Card className="bg-[#1a1a2e] border-slate-700/50">
            <CardContent className="pt-4">
              <OEEComparisonPanel lines={state.lines} isZh={isZh} />
            </CardContent>
          </Card>

          {/* FPY Defect Heatmap */}
          <Card className="bg-[#1a1a2e] border-slate-700/50">
            <CardContent className="pt-4">
              <DefectHeatmap defects={state.defects} isZh={isZh} />
            </CardContent>
          </Card>

          {/* WIP Monitor */}
          <Card className="bg-[#1a1a2e] border-slate-700/50">
            <CardContent className="pt-4">
              <WIPMonitor lines={state.lines} isZh={isZh} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alert Feed */}
      <Card className="mt-4 bg-[#1a1a2e] border-slate-700/50">
        <CardContent className="py-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold text-slate-400">异常告警 / Alerts</span>
          </div>
          <div className="space-y-2 max-h-28 overflow-y-auto">
            {state.alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`flex items-start gap-2 text-sm p-2 rounded ${
                  alert.type === "blocking" ? "bg-red-500/10" : 
                  alert.type === "warning" ? "bg-amber-500/10" : "bg-sky-500/10"
                }`}
              >
                {getAlertIcon(alert.type)}
                <div className="flex-1">
                  <span className="text-slate-300">{isZh ? alert.messageZh : alert.message}</span>
                  {alert.action && (
                    <span className="text-xs text-slate-500 ml-2">
                      → {isZh ? alert.actionZh : alert.action}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-600">
                  {alert.timestamp.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-4 text-center text-xs text-slate-600">
        ⚠ DEMO Dashboard - Simulated data for presentation
      </div>
    </div>
  );
}

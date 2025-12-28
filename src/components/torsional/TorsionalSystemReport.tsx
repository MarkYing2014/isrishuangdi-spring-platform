"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX, 
  Activity, 
  Target, 
  Scale, 
  Settings, 
  Download, 
  FileText, 
  Printer, 
  Info,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { 
  TorsionalSpringSystemDesign, 
  TorsionalSystemResult 
} from "@/lib/torsional/torsionalSystemTypes";
import { TORSIONAL_SYSTEM_POLICY_V1 } from "@/lib/torsional/torsionalSystemPolicy";
import { useLanguage } from "@/components/language-context";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { buildTorsionalSystemDesignRuleReport } from "@/lib/torsional/torsionalSystemRules";
import { auditStageTransitions, type StageTransitionAuditResult, type TransitionSeverity } from "@/lib/torsional/torsionalStageAudit";
import { DesignRulePanel } from "@/components/design-rules/DesignRulePanel";
import { TorsionalAuditCurveChart } from "@/components/torsional-audit/TorsionalAuditCurveChart";

/**
 * ReportHeader
 */
function ReportHeader({ design }: { design: TorsionalSpringSystemDesign }) {
  const { language } = useLanguage();
  const isZh = language === "zh";

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-900 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white tracking-tight">
            {isZh ? "离合器弹簧包工程报告" : "Torsional Spring Pack – Engineering Report"}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 font-mono uppercase">
            <span>Part: TSP-{Date.now().toString().slice(-6)}</span>
            <span>Rev: 1.0.1</span>
            <span>Date: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-blue-600 border-0 hover:bg-blue-700 text-[10px] uppercase font-bold px-2 py-0.5">OEM Engineering</Badge>
          <Badge variant="outline" className="text-white border-slate-700 text-[10px] uppercase font-bold px-2 py-0.5 tracking-wider">Policy: V1 LOCKED</Badge>
          {design.thetaOperatingSource && (
              <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/50 text-[10px] uppercase font-bold px-2 py-0.5">
                  Source: {design.thetaOperatingSource}
              </Badge>
          )}
        </div>
      </div>
      <div className="px-6 py-3 bg-slate-50 border-b flex items-center gap-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>τ_allow = 0.65·Sy</span>
        </div>
        <div className="w-px h-3 bg-slate-300" />
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
          <Info className="w-3 h-3 text-blue-500" />
          <span>C ∈ [4, 20]</span>
        </div>
        <div className="w-px h-3 bg-slate-200" />
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-bold uppercase">
          <Target className="w-3 h-3" />
          <span>Stop: 1000x stiffness</span>
        </div>
      </div>
    </Card>
  );
}

/**
 * KPI Card
 */
function KPICard({ 
  label, 
  value, 
  subtext, 
  status = "default" 
}: { 
  label: string; 
  value: string | number; 
  subtext?: string;
  status?: "default" | "success" | "warning" | "error" | "info"
}) {
  const statusColors = {
    default: "border-slate-200",
    success: "border-emerald-200 bg-emerald-50/30",
    warning: "border-amber-200 bg-amber-50/30",
    error: "border-rose-200 bg-rose-50/30",
    info: "border-blue-200 bg-blue-50/30"
  };

  const textColors = {
    default: "text-slate-900",
    success: "text-emerald-700",
    warning: "text-amber-700",
    error: "text-rose-700",
    info: "text-blue-700"
  };

  return (
    <Card className={`shadow-none ${statusColors[status]} transition-all hover:shadow-sm`}>
      <CardContent className="p-4 space-y-1">
        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">{label}</p>
        <p className={`text-2xl font-black font-mono tracking-tight ${textColors[status]}`}>{value}</p>
        {subtext && <p className="text-[9px] font-medium text-slate-400 line-clamp-1">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * StageLegendCard
 * OEM Standard: Stage (Design) + State (Operating)
 */
function StageLegendCard({ design, result }: { design: TorsionalSpringSystemDesign, result: TorsionalSystemResult }) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  
  // Count activated stages
  const activatedCount = result.perGroup.filter(g => g.springDeltaX > 0).length;
  const totalStages = Math.max(...design.groups.map(g => g.stage), 1);

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="py-2 px-4 border-b bg-slate-50 flex flex-row items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          {isZh ? "分级图例" : "Stage Legend"}
        </span>
        <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 font-bold text-emerald-600 bg-emerald-50 border-emerald-200">
          {isZh ? `激活: ${activatedCount}/${totalStages}` : `Active: ${activatedCount}/${totalStages}`}
        </Badge>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-slate-100">
        {design.groups.map((group, i) => {
          const groupResult = result.perGroup.find(pg => pg.groupId === group.id);
          const deltaX = groupResult?.springDeltaX || 0;
          const isActive = deltaX > 0;
          const isThisGroupStopping = groupResult?.isStopping || (groupResult?.utilization || 0) > 1.0;
          
          // Stage = Design Attribute (fixed base color)
          const stageBaseColor = group.stageColor || "#94a3b8";
          
          // State = Operating Attribute
          let stateLabel: string;
          let stateBadgeClass: string;
          
          if (isThisGroupStopping) {
            stateLabel = isZh ? "止挡" : "STOP";
            stateBadgeClass = "text-rose-600 bg-rose-50 border-rose-200";
          } else if (isActive) {
            stateLabel = isZh ? "工作" : "WORKING";
            stateBadgeClass = "text-emerald-600 bg-emerald-50 border-emerald-200";
          } else {
            stateLabel = isZh ? "待机" : "COAST";
            stateBadgeClass = "text-slate-400 bg-slate-50 border-slate-200";
          }

          // Calculate stop angle for this group
          const thetaRange = (group.L_free - group.L_solid - group.clearance) / group.R * (180 / Math.PI);
          const thetaStop = group.theta_start + thetaRange;

          return (
            <div key={group.id} className={`p-3 space-y-1 transition-colors ${isActive ? '' : 'opacity-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Stage Color Indicator (Always shows Stage base color) */}
                  <div 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ 
                      backgroundColor: isThisGroupStopping ? "#ef4444" : stageBaseColor,
                      boxShadow: `0 0 0 1px ${stageBaseColor}`
                    }} 
                  />
                  <span className="text-[10px] font-black uppercase text-slate-700">
                    S{group.stage} - {group.stageName || `Stage ${i+1}`}
                  </span>
                </div>
                <Badge variant="outline" className={`text-[8px] px-1 py-0 h-4 font-bold ${stateBadgeClass}`}>
                  {stateLabel}
                </Badge>
              </div>
              <p className="text-[9px] text-slate-500 font-medium leading-tight pl-4 italic">
                {group.role || "Torsional damping element"}
              </p>
              {/* OEM System-Level Parameters (not spring geometry) */}
              <div className="flex items-center gap-3 pl-4 pt-1 text-[8px] font-mono text-slate-400">
                <span>R: {group.R}mm</span>
                <span>θ: {group.theta_start}°~{thetaStop.toFixed(0)}°</span>
                <span>n: {group.n}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
      {/* OEM Clarification - Same Spring Specs */}
      <div className="px-3 py-2 bg-amber-50/50 border-t text-[8px] text-amber-700 leading-relaxed">
        <strong>{isZh ? "工程说明：" : "Engineering Note:"}</strong> {isZh 
          ? "各 Stage 可采用相同弹簧规格以保证制造一致性。分级扭矩特性由安装半径、介入角度及数量等系统参数决定。"
          : "Stages may share same spring specs for manufacturing consistency. Staged torque is achieved via system parameters: radius, engagement angle, and count."
        }
      </div>
    </Card>
  );
}

/**
 * StageTransitionAuditCard
 * OEM-Grade Stage Switching Analysis
 */
function StageTransitionAuditCard({ design, result }: { design: TorsionalSpringSystemDesign, result: TorsionalSystemResult }) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  
  const auditResult = useMemo(() => auditStageTransitions(design, result), [design, result]);
  
  const severityColors: Record<TransitionSeverity, string> = {
    PASS: "text-emerald-600 bg-emerald-50",
    WARN: "text-amber-600 bg-amber-50",
    FAIL: "text-rose-600 bg-rose-50"
  };
  
  const severityIcons: Record<TransitionSeverity, React.ReactNode> = {
    PASS: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
    WARN: <ShieldAlert className="w-4 h-4 text-amber-500" />,
    FAIL: <ShieldX className="w-4 h-4 text-rose-500" />
  };
  
  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="py-2 px-4 border-b bg-slate-50 flex flex-row items-center justify-between">
        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" />
          {isZh ? "阶段切换审计" : "Stage Transition Audit"}
        </CardTitle>
        <Badge className={`text-[8px] px-1.5 py-0 h-4 font-bold ${severityColors[auditResult.overall]}`}>
          {auditResult.overall}
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        {/* Summary */}
        <div className="px-4 py-3 border-b bg-slate-50/50">
          <p className="text-[10px] text-slate-600 leading-relaxed">
            {isZh ? auditResult.summaryZh : auditResult.summaryEn}
          </p>
        </div>
        
        {/* Findings Table */}
        <div className="divide-y divide-slate-100">
          {auditResult.findings.length === 0 ? (
            <div className="px-4 py-3 text-[10px] text-slate-400 italic">
              {isZh ? "无阶段切换点" : "No stage transitions detected"}
            </div>
          ) : (
            auditResult.findings.map((f, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                {severityIcons[f.severity]}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-700">
                      {f.fromStage ? `S${f.fromStage} → S${f.toStage}` : `→ S${f.toStage}`}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">
                      @ {f.thetaDeg.toFixed(1)}°
                    </span>
                    <Badge variant="outline" className={`text-[7px] px-1 py-0 h-3.5 font-bold ${severityColors[f.severity]}`}>
                      ΔK/K: {(Math.abs(f.jumpRatio) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-0.5 truncate">
                    {isZh ? f.messageZh : f.messageEn}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* OEM Rating Legend */}
        <div className="px-4 py-2 bg-slate-50 border-t text-[8px] text-slate-400 flex items-center gap-4">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>≤30% Smooth</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>30-60% NVH Risk</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>≥60% Harsh</span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * TorsionalSystemReport Component
 */
export function TorsionalSystemReport({ 
  design, 
  result 
}: { 
  design: TorsionalSpringSystemDesign;
  result: TorsionalSystemResult;
}) {
  const { language } = useLanguage();
  const isZh = language === "zh";

  const auditReport = useMemo(() => buildTorsionalSystemDesignRuleReport(design, result), [design, result]);
  const sf_min = useMemo(() => {
    const utils = result.perGroup.map(g => g.utilization);
    const maxUtil = Math.max(...utils, 0.01);
    return (1 / maxUtil).toFixed(2);
  }, [result]);

  const maxStressGroup = useMemo(() => {
    return result.perGroup.reduce((prev, curr) => curr.utilization > prev.utilization ? curr : prev, result.perGroup[0]);
  }, [result]);

  // Chart Data preparation
  const loadSharingData = useMemo(() => {
    return result.perGroup.map((g, i) => ({
      name: `G${i+1}`,
      value: g.torque
    }));
  }, [result]);

  const stressComparisonData = useMemo(() => {
    return result.perGroup.map((g, i) => ({
        name: `G${i+1}`,
        stress: Math.round(g.stress),
        util: Math.round(g.utilization * 100)
    }));
  }, [result]);

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6 max-w-[1280px] mx-auto pb-12">
      <ReportHeader design={design} />

      {/* High-Priority Engineering Warnings */}
      {result.warnings.length > 0 && (
        <div className="space-y-2">
          {result.warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-bold animate-pulse shadow-sm">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{isZh ? "工程碰撞/限制警告：" : "Engineering Constraint Warning:"} {w}</span>
            </div>
          ))}
        </div>
      )}

      {/* 2. Executive Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard 
          label={isZh ? "全局状态" : "OVERALL STATUS"} 
          value={auditReport.summary.status} 
          subtext={isZh ? "基于全策略审核" : "Based on Factory V1 Policy"}
          status={auditReport.summary.status === "FAIL" ? "error" : auditReport.summary.status === "WARN" ? "warning" : "success"}
        />
        <KPICard 
          label={isZh ? "最大扭矩" : "MAX TORQUE"} 
          value={result.isPastStop ? "RIGID STOP" : `${result.totalTorque.load.toFixed(0)} Nm`} 
          subtext={result.isPastStop ? "Bottomed out" : "Elastic loading range"}
          status={result.isPastStop ? "error" : "default"}
        />
        <KPICard 
          label={isZh ? "当前刚度" : "SYSTEM K"} 
          value={result.isPastStop ? "INFINITE" : `${result.totalStiffness.toFixed(1)}`} 
          subtext={result.isPastStop ? "Mechanical limit" : "System Effective (Nm/deg)"}
          status={result.isPastStop ? "warning" : "info"}
        />
        <KPICard 
          label={isZh ? "参与级数" : "ACTIVATED STAGES"} 
          value={`${result.perGroup.filter(g => g.springDeltaX > 0).length} / ${Math.max(...design.groups.map(g => g.stage), 1)}`} 
          subtext={isZh ? "分段载荷路径" : "Radial load paths"}
          status="success"
        />
        <KPICard 
          label={isZh ? "最小安全系数" : "MIN SAFETY FACTOR"} 
          value={sf_min} 
          subtext={`Min SF for ${maxStressGroup?.groupId}`}
          status={parseFloat(sf_min) < 1.0 ? "error" : parseFloat(sf_min) < 1.2 ? "warning" : "success"}
        />
        <KPICard 
          label={isZh ? "迟滞扭矩" : "HYSTERESIS (Tf)"} 
          value={`±${design.frictionTorque.toFixed(1)} Nm`} 
          subtext="Coulomb damping model"
        />
        <KPICard 
          label={isZh ? "主控组" : "GOVERNING GROUP"} 
          value={maxStressGroup?.groupId.toUpperCase() || "N/A"} 
          subtext="Highest stress utilization"
        />
        <KPICard 
           label="GOVERNING LIMIT"
           value={result.governing.governingCode}
           subtext={`Stage ${result.governing.governingStageId} @ ${result.governing.governingStrokeMm.toFixed(1)}mm`}
           status={result.governing.governingCode === "LIFE_LIMIT" ? "warning" : result.governing.governingCode === "SYSTEM_STOP" ? "default" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-12 gap-6">
        {/* Left Column (8 units) */}
        <div className="2xl:col-span-8 space-y-6">
          
          {/* 3. System Definition & Groups */}
          <Card className="border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b py-3 px-6">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-500" />
                {isZh ? "系统定义与分级详情" : "System Definition & Group Details"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="grid grid-cols-2 lg:grid-cols-4 border-b text-[11px] font-mono text-slate-500 uppercase">
                  <div className="p-4 border-r">
                    <p className="opacity-60 mb-1">{isZh ? "弹簧组数" : "Groups"}</p>
                    <p className="text-slate-900 font-black">{design.groups.length}</p>
                  </div>
                  <div className="p-4 border-r">
                    <p className="opacity-60 mb-1">{isZh ? "半径分布" : "Radii (mm)"}</p>
                    <p className="text-slate-900 font-black">{design.groups.map(g => g.R).join(" / ")}</p>
                  </div>
                  <div className="p-4 border-r">
                    <p className="opacity-60 mb-1">{isZh ? "起始角度" : "Engagement (deg)"}</p>
                    <p className="text-slate-900 font-black">{design.groups.map(g => g.theta_start).join(" / ")}</p>
                  </div>
                  <div className="p-4">
                    <p className="opacity-60 mb-1">{isZh ? "系统物理止挡" : "Sys Stop (deg)"}</p>
                    <p className="text-rose-600 font-black">{result.thetaStop.toFixed(2)}°</p>
                  </div>
               </div>

               <Accordion type="single" collapsible className="w-full">
                  {design.groups.map((group, idx) => {
                    const groupRes = result.perGroup.find(r => r.groupId === group.id);
                    return (
                      <AccordionItem key={group.id} value={group.id} className="border-b last:border-0">
                        <AccordionTrigger className="px-6 py-4 hover:bg-slate-50/80 transition-all hover:no-underline group">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-4">
                              <Badge className="bg-slate-200 text-slate-700 h-5 px-1.5 font-mono border-0">#{idx + 1}</Badge>
                              <span className="font-bold text-sm tracking-tight">{group.name}</span>
                              <div className="hidden lg:flex items-center gap-4 text-[10px] text-slate-400 font-mono">
                                <span>n={group.n}</span>
                                <span>R={group.R}mm</span>
                                <span>k={group.k}N/mm</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                               {groupRes && (
                                 <Badge variant={groupRes.utilization > 1 ? "destructive" : "secondary"} className="h-5 text-[10px]">
                                   Util: {(groupRes.utilization * 100).toFixed(0)}%
                                 </Badge>
                               )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 py-6 bg-slate-50/30">
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                              <div className="space-y-4">
                                <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest border-b pb-1">Geometry</h5>
                                <div className="grid grid-cols-2 gap-y-2 text-xs">
                                   <div className="text-slate-500">Wire d:</div><div className="font-mono text-right">{group.d} mm</div>
                                   <div className="text-slate-500">Mean Dm:</div><div className="font-mono text-right">{group.Dm} mm</div>
                                   <div className="text-slate-500">Free L_free:</div><div className="font-mono text-right">{group.L_free} mm</div>
                                   <div className="text-slate-500">Index C:</div><div className="font-mono text-right">{(group.Dm/group.d).toFixed(2)}</div>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest border-b pb-1">Travel (Angular)</h5>
                                <div className="grid grid-cols-2 gap-y-2 text-xs">
                                   <div className="text-slate-500">θ_start:</div><div className="font-mono text-right">{group.theta_start.toFixed(1)}°</div>
                                   <div className="text-slate-500">θ_stop:</div><div className="font-mono text-right">{((group.L_free-group.L_solid-group.clearance)/group.R * 180/Math.PI + group.theta_start).toFixed(2)}°</div>
                                   <div className="text-slate-500">Active range:</div><div className="font-mono text-right text-blue-600 font-bold">{((group.L_free-group.L_solid-group.clearance)/group.R * 180/Math.PI).toFixed(2)}°</div>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest border-b pb-1">Performance @ Work</h5>
                                <div className="grid grid-cols-2 gap-y-2 text-xs">
                                   <div className="text-slate-500">Stress τ:</div><div className="font-mono text-right font-bold text-slate-900">{groupRes?.stress.toFixed(0)} MPa</div>
                                   <div className="text-slate-500">Force/Spring:</div><div className="font-mono text-right">{groupRes?.force.toFixed(1)} N</div>
                                   <div className="text-slate-500">Torque Share:</div><div className="font-mono text-right font-bold text-blue-600">{groupRes?.torque.toFixed(1)} Nm</div>
                                </div>
                              </div>
                           </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
               </Accordion>
            </CardContent>
          </Card>

          {/* 4. Engineering Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Torque-Angle Performance Chart - component has its own Card wrapper */}
            <TorsionalAuditCurveChart 
                systemCurve={{
                    points: result.curves.map(c => ({ 
                        thetaDeg: c.theta, 
                        torqueNmm: c.torqueLoad 
                    })),
                    thetaSafeSystemDeg: result.thetaSafeSystemDeg
                }}
                playheadTheta={design.referenceAngle}
                operatingTheta={design.thetaOperatingCustomerDeg}
                thetaPhysicalStop={result.thetaHardSystemDeg}
                thetaSafeLife={result.thetaSafeSystemDeg}
            />

            <Card className="border-slate-200">
              <CardHeader className="py-3 px-6 border-b">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-500" />
                  Stiffness Stage Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[380px] p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.curves} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="theta" 
                      type="number" 
                      domain={[0, 'auto']} 
                      fontSize={10}
                    />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    />
                    <Line type="stepAfter" dataKey="stiffness" stroke="#f59e0b" strokeWidth={2} dot={false} name="Kθ (Nm/deg)" />
                    <ReferenceLine x={design.referenceAngle} stroke="#ef4444" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Right Column (4 units) */}
        <div className="2xl:col-span-4 space-y-6">
          
          {/* OEM Stage Legend */}
          <StageLegendCard design={design} result={result} />

          {/* Engineering Audit */}
          <DesignRulePanel 
            report={auditReport} 
            title={isZh ? "工厂设计审计 (V1)" : "Design Policy Audit (V1)"} 
          />

          {/* Stage Transition Audit */}
          <StageTransitionAuditCard design={design} result={result} />

          {/* Load Sharing Analytics */}
          <Card className="border-slate-200 shadow-sm">
             <CardHeader className="py-3 px-6 border-b">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Load Sharing & Stress
                </CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-8">
                {/* Pie Chart for Load Sharing */}
                <div className="space-y-2">
                   <p className="text-[10px] font-bold text-slate-400 uppercase text-center">Torque Distribution @ Work</p>
                   <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={loadSharingData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                            fontSize={10}
                          >
                            {loadSharingData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                {/* Bar Chart for Stress Comparison */}
                <div className="space-y-2">
                   <p className="text-[10px] font-bold text-slate-400 uppercase text-center">Shear Stress Utilization (%)</p>
                   <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stressComparisonData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                           <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                           <YAxis fontSize={10} axisLine={false} tickLine={false} domain={[0, 120]} />
                           <Tooltip contentStyle={{ fontSize: '10px' }} />
                           <Bar dataKey="util" radius={[4, 4, 0, 0]} name="Util %">
                              {stressComparisonData.map((entry, index) => (
                                <Cell key={`cell-bar-${index}`} fill={entry.util > 100 ? '#ef4444' : entry.util > 85 ? '#f59e0b' : '#3b82f6'} />
                              ))}
                           </Bar>
                           <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="3 3" />
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             </CardContent>
          </Card>

          {/* Export & Actions */}
          <Card className="border-slate-200 bg-slate-50/50">
             <CardHeader className="py-3 px-6 border-b">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Documentation & Export
                </CardTitle>
             </CardHeader>
             <CardContent className="p-4 space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2 h-9 text-xs font-bold" onClick={() => window.print()}>
                   <Printer className="w-4 h-4 text-slate-500" />
                   Print Engineering Report
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2 h-9 text-xs font-bold">
                   <FileText className="w-4 h-4 text-blue-500" />
                   Export Technical Data (CSV)
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2 h-9 text-xs font-bold">
                   <Download className="w-4 h-4 text-emerald-500" />
                   Download PDF Datasheet
                </Button>
             </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

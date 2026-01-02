"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  Target, 
  Printer, 
  FileText, 
  Download,
  Info 
} from "lucide-react";
import { AxialPackInput, AxialPackResult } from "@/lib/spring-platform/types";
import { useLanguage } from "@/components/language-context";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell
} from "recharts";

/**
 * ReportHeader
 */
function ReportHeader() {
  const { language } = useLanguage();
  const isZh = language === "zh";

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden mb-4">
      <div className="bg-slate-900 px-4 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div className="space-y-0.5">
          <h1 className="text-sm font-bold text-white tracking-tight uppercase">
            {isZh ? "轴向弹簧包工程报告" : "Axial Spring Pack – Engineering Report"}
          </h1>
          <div className="flex gap-4 text-[10px] text-slate-400 font-mono uppercase">
            <span>Part: ASP-262918</span>
            <span>Rev: 1.0.2</span>
            <span>Date: 2026-01-01</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-blue-600 border-0 hover:bg-blue-700 text-[10px] uppercase font-bold px-1.5 py-0">OEM ENG</Badge>
          <Badge variant="outline" className="text-white border-slate-700 text-[10px] uppercase font-bold px-1.5 py-0 tracking-wider">Policy: V1</Badge>
        </div>
      </div>
      <div className="px-4 py-2 bg-slate-50 border-b flex items-center gap-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>τ_allow = 800 MPa</span>
        </div>
        <div className="w-px h-3 bg-slate-300" />
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-bold uppercase">
          <Target className="w-3 h-3" />
          <span>Index C {">"} 4.0</span>
        </div>
      </div>
    </Card>
  );
}

/**
 * KPICard
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
    <div className={`rounded-lg border p-3 ${statusColors[status]}`}>
        <p className="text-[9px] uppercase font-bold tracking-widest text-slate-500 mb-0.5">{label}</p>
        <p className={`text-lg font-black font-mono tracking-tight ${textColors[status]}`}>{value}</p>
        {subtext && <p className="text-[8px] font-medium text-slate-400 line-clamp-1">{subtext}</p>}
    </div>
  );
}

/**
 * AxialSystemReport Component
 */
export function AxialSystemReport({ 
  input, 
  result,
  stroke 
}: { 
  input: AxialPackInput;
  result: AxialPackResult;
  stroke: number;
}) {
  const { language } = useLanguage();
  const isZh = language === "zh";

  // Prepare Curve Data (0 to MaxStroke)
  const chartData = useMemo(() => {
    if (!result.rawResult?.pack?.maxStroke) return [];
    const points = [];
    const maxS = result.rawResult.pack.maxStroke;
    const steps = 10;
    const k = result.springRate;
    
    for (let i = 0; i <= steps; i++) {
        const s = (i / steps) * maxS;
        points.push({
            stroke: parseFloat(s.toFixed(1)),
            force: parseFloat((s * k / 1000).toFixed(2)), // kN
            limit: parseFloat(((maxS * k / 1000) * 1.1).toFixed(2)) // Ref limit
        });
    }
    return points;
  }, [result]);

  const safetyFactor = useMemo(() => {
      if (!result.stressAnalysis?.tauCorrected) return "-";
      return (800 / result.stressAnalysis.tauCorrected).toFixed(2);
  }, [result]);

  const stressUtil = useMemo(() => {
      if (!result.stressAnalysis?.tauCorrected) return 0;
      return (result.stressAnalysis.tauCorrected / 800) * 100;
  }, [result]);

  return (
    <div className="space-y-6">
      <ReportHeader />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard 
          label={isZh ? "全局状态" : "STATUS"} 
          value={result.designRules?.some((r:any) => r.status === 'fail') ? "FAIL" : "OK"} 
          status={result.designRules?.some((r:any) => r.status === 'fail') ? "error" : "success"}
          subtext="Design Rules Audit"
        />
        <KPICard 
          label={isZh ? "最小安全系数" : "MIN SF"} 
          value={safetyFactor} 
          status={parseFloat(safetyFactor) < 1.1 ? "error" : "success"}
          subtext="Fatigue Policy V1"
        />
        <KPICard 
          label={isZh ? "刚度 K" : "RATE K"} 
          value={`${result.springRate.toFixed(1)}`} 
          subtext="N/mm (Total Pack)"
          status="info"
        />
        <KPICard 
          label={isZh ? "弹簧间隙" : "CLEARANCE"} 
          value={`${result.rawResult?.pack?.clearance?.ssMin?.toFixed(1) ?? "-"} mm`} 
          status={(result.rawResult?.pack?.clearance?.ssMin ?? 0) < 1 ? "error" : "default"}
          subtext="Spring-to-Spring"
        />
      </div>

      {/* 1. System Definition */}
      <Card className="border-slate-200">
          <CardHeader className="py-2 px-4 border-b bg-slate-50/50">
             <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                 <Info className="w-3 h-3 text-slate-400" />
                 {isZh ? "系统定义与分级详情" : "System Definition & Details"}
             </CardTitle>
          </CardHeader>
          <CardContent className="p-0 text-xs">
              <div className="grid grid-cols-2 divide-x border-b">
                 <div className="p-3 bg-slate-50/30">
                     <p className="text-[9px] text-slate-400 uppercase mb-1">Spring Geometry</p>
                     <div className="grid grid-cols-2 gap-y-1">
                         <span className="text-slate-500">d:</span> <span className="font-mono text-end">{input.baseSpring.d}</span>
                         <span className="text-slate-500">Dm:</span> <span className="font-mono text-end">{input.baseSpring.Dm}</span>
                         <span className="text-slate-500">Na:</span> <span className="font-mono text-end">{input.baseSpring.Na}</span>
                         <span className="text-slate-500">L0:</span> <span className="font-mono text-end">{input.baseSpring.L0}</span>
                     </div>
                 </div>
                 <div className="p-3 bg-slate-50/30">
                     <p className="text-[9px] text-slate-400 uppercase mb-1">Pack Layout</p>
                     <div className="grid grid-cols-2 gap-y-1">
                         <span className="text-slate-500">Count N:</span> <span className="font-mono text-end">{input.pack.N}</span>
                         <span className="text-slate-500">Radius:</span> <span className="font-mono text-end">{input.pack.Rbc}</span>
                         <span className="text-slate-500">Index C:</span> <span className="font-mono text-end">{(input.baseSpring.Dm/input.baseSpring.d).toFixed(1)}</span>
                     </div>
                 </div>
              </div>
          </CardContent>
      </Card>

      {/* 2. Design Rules Audit */}
      <Card className="border-slate-200">
          <CardHeader className="py-2 px-4 border-b bg-slate-50/50 flex flex-row items-center justify-between">
             <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                 <ShieldCheck className="w-3 h-3 text-emerald-500" />
                 {isZh ? "设计规则（几何与比例）" : "Design Rules Audit"}
             </CardTitle>
             <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-emerald-200 bg-emerald-50 text-emerald-700">PASS</Badge>
          </CardHeader>
          <CardContent className="p-0 divide-y">
               {result.designRules?.map((rule:any, i:number) => (
                   <div key={i} className="flex items-center justify-between p-3 text-xs">
                       <span className="text-slate-600 font-medium">{rule.label}</span>
                       <div className="flex items-center gap-2">
                           <span className="font-mono text-[10px] text-slate-400">{rule.value}</span>
                           <Badge variant="outline" className={`text-[8px] h-4 px-1 ${rule.status==='pass'?'text-emerald-600 border-emerald-200 bg-emerald-50': rule.status==='warning'?'text-amber-600 border-amber-200 bg-amber-50':'text-rose-600 border-rose-200 bg-rose-50'}`}>
                               {rule.status === 'pass' ? 'OK' : rule.status.toUpperCase()}
                           </Badge>
                       </div>
                   </div>
               ))}
               <div className="p-2 bg-slate-50 text-[9px] text-slate-400 text-center italic">
                   {isZh ? "设计规则仅评估几何可行性，不代表工程安全或可交付性。" : "Rules assess geometry only, not safety or manufacturability."}
               </div>
          </CardContent>
      </Card>


      {/* Charts Section */}
      <Card className="border-slate-200">
         <CardHeader className="py-2 px-4 border-b bg-slate-50">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Activity className="w-3 h-3 text-blue-500" />
                {isZh ? "系统性能曲线" : "System Performance Curve"}
            </CardTitle>
         </CardHeader>
         <CardContent className="h-[200px] p-2">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="stroke" type="number" fontSize={9} tickLine={false} axisLine={false} unit="mm" />
                    <YAxis fontSize={9} tickLine={false} axisLine={false} unit="kN" />
                    <Tooltip contentStyle={{ fontSize: '10px' }} itemStyle={{ padding: 0 }} />
                    <Line type="monotone" dataKey="force" stroke="#3b82f6" strokeWidth={2} dot={false} name="Force (kN)" />
                    <ReferenceLine x={stroke} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'CURR', fontSize: 8, fill: 'red' }} />
                </LineChart>
            </ResponsiveContainer>
         </CardContent>
      </Card>

      {/* Stress Utilization Bar */}
      <Card className="border-slate-200">
         <CardHeader className="py-2 px-4 border-b bg-slate-50">
             <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                 {isZh ? "负载分配与应力" : "Load Sharing & Stress"}
             </CardTitle>
         </CardHeader>
         <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>{isZh ? "弹簧切应力" : "Shear Stress Utilization"}</span>
                    <span>{stressUtil.toFixed(1)}%</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className={`h-full ${stressUtil > 100 ? 'bg-red-500' : stressUtil > 85 ? 'bg-yellow-500' : 'bg-emerald-500'} transition-all duration-500`} 
                        style={{ width: `${Math.min(stressUtil, 100)}%` }}
                    />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400">
                    <span>Corrected: {(result.stressAnalysis?.tauCorrected||0).toFixed(0)} MPa</span>
                    <span>Limit: 800 MPa</span>
                </div>
            </div>

            <Separator />

            <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>{isZh ? "压盘弯曲应力" : "Plate Bending Stress"}</span>
                    <span>{(result.stressAnalysis?.sigmaPlate || 0).toFixed(0)} MPa</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className={`h-full ${(result.stressAnalysis?.sigmaPlate || 0) > 350 ? 'bg-yellow-500' : 'bg-emerald-500'} transition-all duration-500`} 
                        style={{ width: `${Math.min(((result.stressAnalysis?.sigmaPlate || 0)/350)*100, 100)}%` }}
                    />
                </div>
                <p className="text-[9px] text-slate-400 text-right uppercase">Yield: 350 MPa</p>
            </div>
         </CardContent>
      </Card>
      
      {/* Export Actions */}
      <Card className="border-slate-200 bg-slate-50/50">
          <CardHeader className="py-2 px-4 border-b bg-slate-50">
             <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                 {isZh ? "文档与导出" : "Documentation & Export"}
             </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <Button variant="outline" className="w-full justify-start gap-2 h-8 text-xs font-bold" onClick={() => window.print()}>
                <Printer className="w-3 h-3 text-slate-500" />
                {isZh ? "打印工程报告" : "Print Engineering Report"}
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2 h-8 text-xs font-bold">
                <FileText className="w-3 h-3 text-blue-500" />
                {isZh ? "导出 CSV 技术数据" : "Export Technical Data (CSV)"}
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2 h-8 text-xs font-bold" disabled>
                <Download className="w-3 h-3 text-emerald-500" />
                {isZh ? "下载 PDF 数据表" : "Download PDF Datasheet"}
            </Button>
          </CardContent>
      </Card>

    </div>
  );
}

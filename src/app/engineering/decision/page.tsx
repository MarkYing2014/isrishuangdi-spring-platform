"use client";

import React, { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Activity, 
  BarChart3, 
  ChevronRight, 
  DollarSign, 
  FileCheck, 
  Layers, 
  LayoutDashboard, 
  PackageCheck, 
  Table 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DecisionPanel } from "@/components/ui/decision/DecisionPanel";
import { estimateSupplierCost } from "@/lib/costing/costEstimator";
import { rankSuppliers, RankedSupplier } from "@/lib/costing/supplierRanking";
import { resolveInspectionStrategy } from "@/lib/manufacturing/inspection/gaugeRequirementResolver";

export default function EngineeringDecisionPage() {
    return (
        <Suspense fallback={<div className="p-8">Loading Engineering Decision Center...</div>}>
            <DecisionContent />
        </Suspense>
    );
}

function DecisionContent() {
    const searchParams = useSearchParams();
    const dataStr = searchParams.get("data");
    const language = (searchParams.get("lang") || "en") as "en" | "zh";
    const isZh = language === "zh";

    // 1. Parse Data (Mocked similarly to RFQ page)
    const summary = useMemo(() => {
        if (!dataStr) return null;
        try {
            return JSON.parse(decodeURIComponent(dataStr));
        } catch (e) {
            return null;
        }
    }, [dataStr]);

    // 2. Derive OS Components
    const { inspection, rankedSuppliers, bestSupplier } = useMemo(() => {
        if (!summary || !summary.deliverability) return { inspection: null, rankedSuppliers: [], bestSupplier: null };
        
        const ins = resolveInspectionStrategy(summary.deliverability);
        const quotes = summary.deliverability.supplierMatches.map((m: any) => 
            estimateSupplierCost(m, summary, summary.deliverability)
        );
        const ranked = rankSuppliers(quotes, summary.deliverability.supplierMatches, summary.deliverability);
        
        return { 
            inspection: ins, 
            rankedSuppliers: ranked, 
            bestSupplier: ranked[0] 
        };
    }, [summary]);

    if (!summary) return <div className="p-8">No decision data available.</div>;

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <LayoutDashboard className="h-8 w-8 text-primary" />
                        {isZh ? "工程决策系统 (SEOS)" : "Engineering Decision OS"}
                    </h1>
                    <p className="text-slate-500 font-medium">
                        {isZh ? "设计 → 交付 → 检具 → 成本 → 释放" : "Design → Deliverability → Inspection → Cost → Release"}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Badge variant="outline" className="text-xs bg-white py-2 px-4 shadow-sm">
                        {isZh ? "单号" : "ID"}: {summary.designVersion || "ARC-2024-TMP"}
                    </Badge>
                    <Badge className="bg-primary text-white py-2 px-4 shadow-md">
                        {isZh ? "版本" : "Ver"}: V1.0.2
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Context & Physics */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Engineering Snapshot */}
                    <Card className="glass-morphism border-slate-200">
                        <CardHeader className="pb-3 border-b border-slate-100">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Activity className="h-3.5 w-3.5" />
                                {isZh ? "工程简报" : "Engineering Snapshot"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <Metric value={summary.performance?.maxLoad} unit="N" label={isZh ? "最大载荷" : "Max Load"} />
                                <Metric value={summary.performance?.utilization} unit="%" label={isZh ? "应力利用率" : "Stress Util."} />
                            </div>
                            <div className="p-3 bg-slate-100/50 rounded-lg border border-slate-200 space-y-1">
                                <div className="text-[10px] text-slate-400 font-bold uppercase">{isZh ? "材料" : "Material"}</div>
                                <div className="text-sm font-bold text-slate-700">{summary.material}</div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Inspection Strategy */}
                    <Card className="glass-morphism border-slate-200">
                        <CardHeader className="pb-3 border-b border-slate-100">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <FileCheck className="h-3.5 w-3.5" />
                                {isZh ? "检测与检具策略" : "Inspection & Gauge Strategy"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                            {inspection?.requirements.map((req, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <Badge variant="secondary" className="h-5 text-[9px] shrink-0">{req.level}</Badge>
                                    <div className="text-[11px] font-medium text-slate-600">{isZh ? req.reasonZh : req.reasonEn}</div>
                                </div>
                            ))}
                            <div className="pt-2 flex items-center justify-between text-xs font-bold text-primary">
                                <span>{isZh ? "校准要求" : "Calibration Req"}:</span>
                                <span>{inspection?.calibrationRequired ? "YES" : "NO"}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Center/Right Column: Suppliers & Costs */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Supplier Comparison */}
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50 py-3 border-b border-slate-100">
                            <CardTitle className="text-sm font-black flex items-center gap-2">
                                <Table className="h-4 w-4" />
                                {isZh ? "供应商决策对比" : "Supplier Decision Comparison"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100/30 text-[10px] uppercase font-bold text-slate-500">
                                    <tr>
                                        <th className="text-left px-4 py-3">{isZh ? "供应商" : "Supplier"}</th>
                                        <th className="text-center px-4 py-3">{isZh ? "决策评分" : "Decision Score"}</th>
                                        <th className="text-right px-4 py-3">{isZh ? "预估总价" : "Total Cost"}</th>
                                        <th className="text-right px-4 py-3">{isZh ? "交期" : "Lead Time"}</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {rankedSuppliers.map((supplier) => (
                                        <tr key={supplier.supplierId} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-slate-800">{supplier.supplierName}</div>
                                                <div className="text-[10px] text-slate-400 font-medium">{supplier.recommendation}</div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="text-lg font-black text-primary">{supplier.decisionScore}</div>
                                                <div className="w-20 h-1 bg-slate-100 mx-auto rounded-full overflow-hidden mt-1">
                                                    <div className="h-full bg-primary" style={{ width: `${supplier.decisionScore * 100}%` }} />
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right font-black text-slate-900">
                                                {supplier.breakdown.totalCost} {supplier.breakdown.currency}
                                            </td>
                                            <td className="px-4 py-4 text-right font-medium text-slate-600">
                                                {supplier.leadTimeWeeks} {isZh ? "周" : "Weeks"}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>

                    {/* Layered Cost Breakdown for Best Supplier */}
                    {bestSupplier && (
                        <Card className="border-slate-200 border-l-4 border-l-primary shadow-lg overflow-hidden">
                            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-primary" />
                                    {isZh ? `成本构成细节: ${bestSupplier.supplierName}` : `Layered Cost: ${bestSupplier.supplierName}`}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 pb-6">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                    <CostItem label={isZh ? "材料" : "Material"} value={bestSupplier.breakdown.materialCost} color="text-slate-600" />
                                    <CostItem label={isZh ? "加工" : "Process"} value={bestSupplier.breakdown.processingCost} color="text-slate-600" />
                                    <CostItem label={isZh ? "检测" : "Inspect"} value={bestSupplier.breakdown.inspectionCost} color="text-blue-600" />
                                    <CostItem label={isZh ? "检具" : "Gauge"} value={bestSupplier.breakdown.gaugeCost} color="text-blue-600" />
                                    <CostItem label={isZh ? "认证" : "Cert"} value={bestSupplier.breakdown.certificationCost} color="text-slate-600 transition-opacity" />
                                    <CostItem label={isZh ? "风险溢价" : "Risk"} value={bestSupplier.breakdown.riskPremium} color="text-amber-600 font-black" />
                                </div>
                                <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-500 font-bold uppercase text-xs">
                                        <PackageCheck className="h-4 w-4" />
                                        {isZh ? "预估交期" : "Est. Delivery"}
                                    </div>
                                    <div className="text-xl font-black text-slate-900">
                                        {bestSupplier.leadTimeWeeks} {isZh ? "工作周" : "Work Weeks"}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Final Decision Panel */}
                    <DecisionPanel 
                        language={language}
                        context={{
                            physicsStatus: summary.reviewVerdict === "PASS" ? "PASS" : (summary.reviewIssues?.length > 0 ? "FAIL" : "PASS"),
                            deliverabilityStatus: summary.deliverability?.status || "PASS",
                            gaugeStrategyReady: !!inspection,
                            supplierMatchLevel: (bestSupplier?.recommendation === "RECOMMENDED" ? "FULL" : (bestSupplier?.recommendation === "ACCEPTABLE_WITH_WAIVER" ? "PARTIAL" : "NO_MATCH")),
                            costApproved: true,
                            hasWaiver: false
                        }}
                        onRelease={() => alert("Work Order RELEASED for production.")}
                        onWaiver={() => alert("Waiver Request SUBMITTED.")}
                        onBlock={() => alert("Project BLOCKED.")}
                    />
                </div>
            </div>
        </div>
    );
}

function Metric({ value, unit, label }: { value: any, unit: string, label: string }) {
    return (
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</span>
            <span className="text-lg font-black text-slate-800 tracking-tight">
                {value ?? "--"}<span className="text-[10px] ml-0.5 font-bold text-slate-400">{unit}</span>
            </span>
        </div>
    );
}

function CostItem({ label, value, color }: { label: string, value: number, color: string }) {
    return (
        <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">{label}</span>
            <div className={`text-sm font-bold flex items-center gap-0.5 ${color}`}>
                <DollarSign className="h-3 w-3" />
                {value.toFixed(2)}
            </div>
        </div>
    );
}

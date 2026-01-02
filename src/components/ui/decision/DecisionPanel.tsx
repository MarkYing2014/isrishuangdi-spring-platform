"use client";

import React, { useState } from "react";
import { CheckCircle2, ShieldAlert, XCircle, Signature, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkOrderState, validateRelease, WorkOrderContext } from "@/lib/manufacturing/workOrderStateMachine";

interface DecisionPanelProps {
    language: "en" | "zh";
    context: WorkOrderContext;
    onRelease: (reason?: string) => void;
    onWaiver: (reason: string) => void;
    onBlock: (reason: string) => void;
}

export function DecisionPanel({
    language,
    context,
    onRelease,
    onWaiver,
    onBlock
}: DecisionPanelProps) {
    const isZh = language === "zh";
    const transition = validateRelease(context);
    const [actionReason, setActionReason] = useState("");

    const getStatusConfig = (state: WorkOrderState) => {
        switch (state) {
            case "RELEASED": return { color: "bg-green-500", icon: CheckCircle2, text: isZh ? "准予发布" : "APPROVED" };
            case "WAIVER_PENDING": return { color: "bg-yellow-500", icon: ShieldAlert, text: isZh ? "待审批" : "WAIVER REQ" };
            case "BLOCKED": return { color: "bg-red-500", icon: XCircle, text: isZh ? "已阻断" : "BLOCKED" };
            default: return { color: "bg-slate-500", icon: AlertCircle, text: isZh ? "进行中" : "IN PROGRESS" };
        }
    };

    const config = getStatusConfig(transition.nextState);

    return (
        <Card className="border-2 border-slate-200 shadow-xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Signature className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg font-bold">
                            {isZh ? "工程决策面板" : "Engineering Decision Panel"}
                        </CardTitle>
                    </div>
                    <Badge className={`${config.color} text-white px-3 py-1 flex gap-1 items-center`}>
                        <config.icon className="h-3.5 w-3.5" />
                        {config.text}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                {/* 1. Status Check Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatusIndicator label={isZh ? "设计审计" : "Physics"} status={context.physicsStatus} language={language} />
                    <StatusIndicator label={isZh ? "交付审计" : "Deliverability"} status={context.deliverabilityStatus} language={language} />
                    <StatusIndicator label={isZh ? "检具就绪" : "Gauges"} status={context.gaugeStrategyReady ? "PASS" : "FAIL"} language={language} />
                    <StatusIndicator label={isZh ? "供应商" : "Supplier"} status={context.supplierMatchLevel === "FULL" ? "PASS" : (context.supplierMatchLevel === "PARTIAL" ? "WARN" : "FAIL")} language={language} />
                </div>

                {/* 2. Validation Message */}
                <div className={`p-4 rounded-lg flex gap-3 ${transition.allowed ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                    {transition.allowed ? <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" /> : <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />}
                    <div className="text-sm">
                        <div className="font-bold underline mb-1">{isZh ? "决策建议" : "Decision Logic"}</div>
                        <div>{isZh ? transition.reasonZh : transition.reasonEn}</div>
                    </div>
                </div>

                {/* 3. Decision Reason Entry */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {isZh ? "决策说明 / 审批意见" : "Decision Justification / Comments"}
                    </label>
                    <textarea 
                        className="w-full min-h-[80px] p-3 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        placeholder={isZh ? "请输入偏差原因、特采说明或批准释放理由..." : "Enter waiver justification, special instructions, or release rationale..."}
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                    />
                </div>
            </CardContent>

            <CardFooter className="bg-slate-50 border-t border-slate-100 p-6 flex flex-wrap gap-4 justify-center md:justify-end">
                <Button 
                    variant="outline" 
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 min-w-[120px]"
                    onClick={() => onBlock(actionReason)}
                >
                    <XCircle className="h-4 w-4 mr-2" />
                    {isZh ? "彻底阻断" : "BLOCK"}
                </Button>

                <Button 
                    variant="outline" 
                    className="border-yellow-200 text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700 min-w-[120px]"
                    onClick={() => onWaiver(actionReason)}
                >
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    {isZh ? "申请偏差" : "REQUEST WAIVER"}
                </Button>

                <Button 
                    disabled={!transition.allowed && !context.hasWaiver}
                    className="bg-green-600 hover:bg-green-700 text-white min-w-[160px] shadow-lg shadow-green-200"
                    onClick={() => onRelease(actionReason)}
                >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {isZh ? "发布生产" : "RELEASE TO PROD"}
                </Button>
            </CardFooter>
        </Card>
    );
}

function StatusIndicator({ label, status, language }: { label: string, status: "PASS" | "WARN" | "FAIL", language: string }) {
    const isZh = language === "zh";
    const colors = {
        PASS: "text-green-600 bg-green-50 border-green-100",
        WARN: "text-amber-600 bg-amber-50 border-amber-100",
        FAIL: "text-red-600 bg-red-50 border-red-100"
    };

    return (
        <div className={`flex flex-col items-center justify-center p-2 rounded-lg border ${colors[status]} transition-all`}>
            <span className="text-[10px] font-bold uppercase opacity-60 mb-1">{label}</span>
            <span className="text-xs font-bold tracking-tighter">
                {status === "PASS" ? (isZh ? "通过" : "PASS") : (status === "WARN" ? (isZh ? "警告" : "WARN") : (isZh ? "不通过" : "FAIL"))}
            </span>
        </div>
    );
}

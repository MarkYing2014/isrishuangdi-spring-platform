
"use client";

import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { RFQState, EngineeringSummary } from "@/lib/rfq/types";
import { LanguageText } from "@/components/language-context";

interface RFQHeaderProps {
    summary: EngineeringSummary;
    rfqState: RFQState;
}

export function RFQHeader({ summary, rfqState }: RFQHeaderProps) {
    const isPass = summary.reviewVerdict === "PASS";
    const isCond = summary.reviewVerdict === "CONDITIONAL";

    return (
        <header className="border-b bg-white p-4 shadow-sm mb-6">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <LanguageText en="Engineering RFQ Center" zh="工程询价中心" />
                        <Badge variant="outline" className="font-normal text-xs uppercase">
                            {summary.springType}
                        </Badge>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        <LanguageText 
                            en="From validated design to manufacturing quotation" 
                            zh="从经过验证的设计到制造报价" 
                        />
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-xs font-mono text-muted-foreground">
                            <LanguageText en="Design Version" zh="设计版本" />
                        </div>
                        <div className="font-bold text-sm tracking-tight">{summary.designVersion}</div>
                    </div>
                    
                    <div className="h-8 w-px bg-slate-200" />
                    
                    <div className="flex items-center gap-2">
                        {isPass ? (
                            <Badge className="bg-emerald-600 pl-1 pr-2 py-1 flex gap-1 items-center">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <LanguageText en="Review: PASS" zh="评审: 通过" />
                            </Badge>
                        ) : isCond ? (
                            <Badge className="bg-amber-500 pl-1 pr-2 py-1 flex gap-1 items-center text-black hover:bg-amber-600">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <LanguageText en="Review: CONDITIONAL" zh="评审: 条件通过" />
                            </Badge>
                        ) : (
                             <Badge variant="destructive" className="pl-1 pr-2 py-1 flex gap-1 items-center">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <LanguageText en="Review: FAIL" zh="评审: 失败" />
                            </Badge>
                        )}
                        
                        {rfqState.status === "DRAFT" ? (
                             <Badge variant="secondary" className="bg-slate-100 text-slate-500">
                                <LanguageText en="Draft" zh="草稿" />
                             </Badge>
                        ) : rfqState.status === "CONFIRMED" ? (
                             <Badge className="bg-blue-600">
                                <LanguageText en="Confirmed" zh="已确认" />
                             </Badge>
                        ) : (
                             <Badge className="bg-purple-600">
                                <LanguageText en="Submitted" zh="已提交" />
                             </Badge>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

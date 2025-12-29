
import React from "react";
import { QualityStep, StepperSnapshot, StepStatus } from "@/lib/quality/types";
import { Check, Lock, AlertTriangle, AlertCircle, PlayCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language-context";

interface QualityStepperNavProps {
    snapshot: StepperSnapshot;
    onStepClick: (step: QualityStep) => void;
}

export function QualityStepperNav({ snapshot, onStepClick }: QualityStepperNavProps) {
    const { language } = useLanguage();
    const isZh = language === "zh";

    return (
        <div className="w-full bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-1 flex-1">
                {snapshot.steps.map((step, idx) => {
                    const isLast = idx === snapshot.steps.length - 1;
                    return (
                        <React.Fragment key={step.key}>
                            <StepItem 
                                step={step} 
                                isActive={step.key === snapshot.activeStep}
                                onClick={() => onStepClick(step.key)}
                                isZh={isZh}
                            />
                            {!isLast && (
                                <ChevronRight className="w-4 h-4 text-slate-300 mx-2 flex-shrink-0" />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
            
            {/* Legend / Status (Optional) */}
            <div className="text-xs text-slate-400 font-mono">
                {snapshot.gateState !== "READY" && (
                    <span className={cn(
                        "px-2 py-1 rounded",
                        snapshot.gateState === "BLOCKED" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                    )}>
                        GATE: {snapshot.gateState}
                    </span>
                )}
            </div>
        </div>
    );
}

function StepItem({ step, isActive, onClick, isZh }: { step: StepperSnapshot["steps"][0], isActive: boolean, onClick: () => void, isZh: boolean }) {
    const { status, title, key } = step;

    // Derived Visuals
    let icon = <div className="w-3 h-3 rounded-full bg-slate-200" />;
    let baseClass = "text-slate-500 cursor-not-allowed";
    let borderClass = "border-transparent";

    if (isActive) {
        icon = <PlayCircle className="w-4 h-4 text-blue-600 animate-pulse" />;
        baseClass = "text-blue-700 font-bold cursor-default";
        borderClass = "border-blue-100 bg-blue-50";
    } else if (status === "DONE") {
        icon = <Check className="w-4 h-4 text-green-600" />;
        baseClass = "text-slate-700 hover:text-blue-600 cursor-pointer";
        borderClass = "border-transparent hover:bg-slate-50";
    } else if (status === "AVAILABLE") {
         icon = <div className="w-3 h-3 rounded-full border-2 border-slate-400" />;
         baseClass = "text-slate-600 hover:text-blue-600 cursor-pointer font-medium";
         borderClass = "border-slate-100 hover:border-blue-200";
    } else if (status === "LOCKED") {
        icon = <Lock className="w-3 h-3 text-slate-300" />;
        baseClass = "text-slate-300 cursor-not-allowed";
    } else if (status === "BLOCKED") {
        icon = <AlertCircle className="w-4 h-4 text-red-500" />;
        baseClass = "text-red-400 cursor-not-allowed";
        borderClass = "border-red-50 bg-red-50/50";
    }
    
    // Warn Confirm Special Visual (If step is "ANALYSIS" and gate is conditional, logic handled in store, but maybe UI hint?)
    // Actually store returns status AVAILABLE for conditional. 
    // We can add a visual hint if we want, but sticking to standard statuses is cleaner.

    return (
        <div 
            onClick={() => {
                if (status === "LOCKED" || status === "BLOCKED") return;
                onClick();
            }}
            className={cn(
                "flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all duration-200 select-none",
                baseClass,
                borderClass
            )}
            title={status}
        >
            {icon}
            <span className="text-sm">{isZh ? title.zh : title.en}</span>
        </div>
    );
}


import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { useLanguage } from "@/components/language-context";

interface GateConfirmModalProps {
    warnCount: number;
    onCancel: () => void;
    onConfirm: () => void;
}

export function GateConfirmModal({ warnCount, onCancel, onConfirm }: GateConfirmModalProps) {
    const { language } = useLanguage();
    const isZh = language === "zh";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px] border border-amber-200 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 text-amber-600 mb-4">
                        <AlertTriangle className="w-6 h-6" />
                        <h3 className="font-bold text-lg">{isZh ? "质量警告" : "Quality Warning"}</h3>
                    </div>
                    <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="text-slate-600 text-sm mb-6 leading-relaxed">
                    {isZh ? (
                        <>
                            检测到 <strong>{warnCount}</strong> 条数据存在非致命问题（Warning）。
                            <br/><br/>
                            您可以选择忽略这些警告并继续分析，但在最终报告中这些行将被标记为异常。
                        </>
                    ) : (
                        <>
                            Detected <strong>{warnCount}</strong> rows with warnings.
                            <br/><br/>
                            You can proceed, but these rows will be flagged in the final analysis report.
                        </>
                    )}
                </div>

                <div className="flex justify-end space-x-3">
                    <button 
                        onClick={onCancel}
                        className="px-4 py-2 rounded text-slate-600 hover:bg-slate-100 text-sm font-medium"
                    >
                        {isZh ? "取消" : "Cancel"}
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-md shadow-amber-200 transition-colors"
                    >
                        {isZh ? "接受并在分析中使用" : "Accept & Proceed"}
                    </button>
                </div>
            </div>
        </div>
    );
}

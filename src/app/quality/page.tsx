"use client";

import React from "react";
import { QualitySheetCanvas } from "@/components/quality/QualitySheetCanvas";

export default function QualityPage() {
  return (
    <div className="flex flex-col h-screen bg-slate-50">
        <div className="h-10 bg-slate-900 text-white flex items-center px-4 text-xs font-medium justify-between shadow-sm">
            <span>Spring Engineering Platform / Quality Management (Bypass Module)</span>
            <span className="text-slate-400">Independent Environment</span>
        </div>
        <div className="flex-1 overflow-hidden p-4">
            <QualitySheetCanvas />
        </div>
    </div>
  );
}

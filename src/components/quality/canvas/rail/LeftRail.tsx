"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { QualityMappingPanel } from "../../QualityMappingPanel";
// Future: Import IssuesPanel, FiltersPanel

export function LeftRail() {
  const [activeTab, setActiveTab] = useState<"MAPPING" | "ISSUES">("MAPPING");

  return (
    <div className="w-[320px] flex flex-col border-r h-full bg-slate-50">
        {/* Tabs */}
        <div className="flex border-b bg-white">
            <button 
               onClick={() => setActiveTab("MAPPING")}
               className={cn("flex-1 py-2 text-xs font-medium border-b-2 transition", activeTab === "MAPPING" ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-slate-500 hover:text-slate-700")}
            >
                Field Mapping
            </button>
            <button 
               onClick={() => setActiveTab("ISSUES")}
               className={cn("flex-1 py-2 text-xs font-medium border-b-2 transition", activeTab === "ISSUES" ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-slate-500 hover:text-slate-700")}
            >
                Issues / Audit
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
            {activeTab === "MAPPING" && <QualityMappingPanel />}
            {activeTab === "ISSUES" && (
                <div className="p-4 text-center text-slate-400 text-xs mt-10">
                    Issue Navigation coming soon
                </div>
            )}
        </div>
    </div>
  );
}

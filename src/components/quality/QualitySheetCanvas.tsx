"use client";

import React from "react";
import { QualityTopBar } from "./canvas/QualityTopBar";
import { QualityLeftRail } from "./canvas/QualityLeftRail";
import { SheetViewport } from "./canvas/SheetViewport";
import { QualityBottomBar } from "./canvas/QualityBottomBar";

import { QualityAnalysisOverlay } from "./canvas/QualityAnalysisOverlay";
import { useQualityStore } from "@/lib/quality/qualityStore";

export function QualitySheetCanvas() {
  const activeStep = useQualityStore(state => state.activeStep);
  const setActiveStep = useQualityStore(state => state.setActiveStep);

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden relative">
        {/* Top */}
        <QualityTopBar />

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden">
            {/* Left Rail */}
            <div className="w-[300px] border-r border-slate-200 bg-slate-50 flex flex-col">
                <QualityLeftRail />
            </div>
            
            {/* Viewport */}
            <div className="flex-1 relative overflow-hidden bg-white">
                <SheetViewport />
            </div>
        </div>

        {/* Bottom */}
        <QualityBottomBar />
        
        {/* Analysis Overlay */}
        {activeStep === "ANALYSIS" && (
            <QualityAnalysisOverlay onClose={() => setActiveStep("VALIDATION")} />
        )}
    </div>
  );
}

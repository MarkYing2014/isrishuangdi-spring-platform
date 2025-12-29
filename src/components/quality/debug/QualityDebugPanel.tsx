
import React from "react";
import { useQualityStore } from "@/lib/quality/qualityStore";
import { RawInspector } from "./RawInspector";
import { SeriesInspector } from "./SeriesInspector";

export function QualityDebugPanel({ series }: { series: any }) {
  const debugMode = useQualityStore(s => s.chart.debug.mode);

  if (debugMode === "OFF") return null;

  return (
    <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
        {debugMode === "SERIES" && <SeriesInspector series={series} />}
        {debugMode === "RAW" && <RawInspector />}
    </div>
  );
}

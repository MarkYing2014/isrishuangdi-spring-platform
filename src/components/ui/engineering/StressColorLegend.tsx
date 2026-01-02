"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface StressColorLegendProps {
  className?: string;
  isZh?: boolean;
}

export function StressColorLegend({ className, isZh = false }: StressColorLegendProps) {
  const stops = [
    { pos: "0%", color: "#0000ff", label: "0%" },
    { pos: "35%", color: "#00ffff", label: "35%" },
    { pos: "70%", color: "#00ff00", label: "70%" },
    { pos: "100%", color: "#ffff00", label: "100%" },
    { pos: "120%", color: "#ff0000", label: "120%+" },
  ];

  const thresholds = [
    { ratio: 0.8, label: isZh ? "警告 (80%)" : "Warn (80%)", color: "text-amber-500" },
    { ratio: 1.1, label: isZh ? "生效失效 (110%)" : "Fail (110%)", color: "text-red-600 font-bold" },
  ];

  return (
    <div className={cn("flex flex-col gap-2 p-2 bg-white/90 backdrop-blur-sm rounded-md shadow-sm border border-slate-200 text-[10px]", className)}>
      <div className="flex items-center justify-between font-medium text-slate-500 mb-0.5">
        <span>{isZh ? "应力水平 (相对于极限)" : "Stress Level (vs Limit)"}</span>
      </div>
      
      <div className="relative h-4 w-full flex rounded-sm overflow-hidden border border-slate-100">
        {stops.map((stop, i) => (
          <div 
            key={i} 
            className="flex-1 h-full"
            style={{ backgroundColor: stop.color }}
            title={stop.label}
          />
        ))}
      </div>

      <div className="flex justify-between px-0.5 text-slate-400 font-mono scale-90 origin-top">
        {stops.map((stop, i) => (
          <span key={i}>{stop.label}</span>
        ))}
      </div>

      <div className="flex gap-3 mt-1 border-t border-slate-100 pt-1 justify-center">
        {thresholds.map((t, i) => (
          <div key={i} className={cn("flex items-center gap-1", t.color)}>
             <div className={cn("w-1.5 h-1.5 rounded-full bg-current")} />
             <span>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

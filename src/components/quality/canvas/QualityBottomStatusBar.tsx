"use client";

import React from "react";
import { useQualityStore } from "@/lib/quality/qualityStore";

export function QualityBottomStatusBar() {
  const auditTrail = useQualityStore(state => state.auditTrail);
  const lastAction = auditTrail.length > 0 ? auditTrail[auditTrail.length - 1] : null;

  return (
    <div className="h-6 bg-slate-100 border-t flex items-center px-4 text-[10px] text-slate-500 justify-between select-none">
       <div className="flex items-center space-x-4">
           <span>Ready</span>
           {lastAction && (
               <span className="text-slate-400">
                   Last Action: {lastAction.type} ({new Date(lastAction.at).toLocaleTimeString()})
               </span>
           )}
       </div>
       <div>
           ISRI Spring Platform (Beta)
       </div>
    </div>
  );
}

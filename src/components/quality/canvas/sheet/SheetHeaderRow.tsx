"use client";

import React from "react";
import { useQualityStore } from "@/lib/quality/qualityStore";

interface SheetHeaderRowProps {
  columns: string[];
}

export function SheetHeaderRow({ columns }: SheetHeaderRowProps) {
    const columnMapping = useQualityStore(state => state.columnMapping);
    
    // Helper to get type badge
    const getType = (col: string) => {
        const map = columnMapping.find(m => m.target === col);
        return map?.type || "string";
    };

    return (
        <div className="flex w-full bg-gray-50 border-b z-10 sticky top-0 font-medium text-xs text-slate-600 shadow-sm">
             <div className="w-[50px] flex-shrink-0 p-2 border-r text-center text-slate-400">#</div>
             {columns.map(col => (
                 <div key={col} className="w-[120px] flex-shrink-0 px-2 py-1.5 border-r flex items-center justify-between group hover:bg-gray-100">
                     <span className="truncate mr-1" title={col}>{col}</span>
                     <span className="text-[10px] uppercase text-gray-400 bg-gray-100 px-1 rounded border group-hover:bg-white group-hover:border-gray-200">
                         {getType(col)[0]}
                     </span>
                 </div>
             ))}
        </div>
    );
}

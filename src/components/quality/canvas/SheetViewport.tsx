"use client";

import React, { useRef, useState, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useQualityStore } from "@/lib/quality/qualityStore";
import { cn } from "@/lib/utils";
import { CellIssue } from "@/lib/quality/types";

export function SheetViewport() {
    const parentRef = useRef<HTMLDivElement>(null);
    const mode = useQualityStore(state => state.mode);
    
    // Select correct rows/cols based on mode
    const rawRows = useQualityStore(state => state.rawRows);
    const rawColumns = useQualityStore(state => state.rawColumns);
    const normalizedRows = useQualityStore(state => state.normalizedRows);
    const mapping = useQualityStore(state => state.columnMapping);
    
    // Actions
    const editCell = useQualityStore(state => state.editCell);
    
    // Derived Data
    const rows = mode === "RAW" ? rawRows : normalizedRows;
    
    // Columns Definition
    const columns = useMemo(() => {
        if (mode === "RAW") return rawColumns;
        if (mapping.length === 0) return ["(No Mapping)"]; 
        return mapping.map(m => m.targetKey);
    }, [mode, rawColumns, mapping]);

    // Virtualizer
    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 35, // Row height
        overscan: 20
    });

    // Render Helpers
    const getCellValue = (rowIndex: number, colIndex: number) => {
        const row = rows[rowIndex];
        if (!row) return "";
        
        if (mode === "RAW") {
            const col = rawColumns[colIndex];
            // @ts-ignore - access raw
            return row.cells ? row.cells[col] ?? "" : "";
        } else {
             // Normalized
             const colKey = columns[colIndex];
             // @ts-ignore
             return row.values[colKey];
        }
    };
    
    const getCellStatus = (rowIndex: number, colKey: string) => {
        if (mode !== "NORMALIZED") return null;
        const row = rows[rowIndex];
        // @ts-ignore
        const issue = row.issues?.find((i: CellIssue) => i.colKey === colKey);
        
        if (issue) return issue.severity;
        return null;
    };

    return (
        <div 
            ref={parentRef} 
            className="flex-1 overflow-auto bg-white"
            style={{ width: "100%", height: "100%" }}
        >
            <div
                style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {/* Headers */}
                <div className="sticky top-0 z-10 flex bg-slate-100 border-b shadow-sm font-semibold text-xs text-slate-600">
                    <div className="w-12 flex-shrink-0 p-2 border-r text-center">#</div>
                    {columns.map((col, i) => (
                        <div key={i} className="w-32 flex-shrink-0 p-2 border-r truncate" title={col}>
                            {col}
                             {mode === "NORMALIZED" && mapping.find(m => m.targetKey === col)?.required && <span className="text-red-500 ml-1">*</span>}
                        </div>
                    ))}
                    <div className="flex-1 min-w-[20px]"></div>
                </div>

                {/* Rows */}
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    const isExcluded = mode === "NORMALIZED" && (row as any).excluded;
                    const rowStatus = mode === "NORMALIZED" ? (row as any).status : null;
                    
                    return (
                        <div
                            key={virtualRow.key}
                            className={cn(
                                "absolute top-0 left-0 w-full flex text-xs border-b hover:bg-slate-50 transition-colors",
                                isExcluded ? "opacity-40 bg-slate-50 grayscale" : "bg-white",
                                rowStatus === "FAIL" && !isExcluded ? "bg-red-50/30" : "",
                                rowStatus === "WARN" && !isExcluded ? "bg-amber-50/30" : ""
                            )}
                            style={{
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            {/* Row Index */}
                            <div className={cn("w-12 flex-shrink-0 p-2 border-r text-center text-slate-400 select-none", 
                                rowStatus === "FAIL" ? "bg-red-100 text-red-600 font-bold" : "")}>
                                {virtualRow.index + 1}
                            </div>
                            
                            {/* Cells */}
                            {columns.map((col, cIndex) => {
                                const val = getCellValue(virtualRow.index, cIndex);
                                const status = getCellStatus(virtualRow.index, col);
                                
                                return (
                                    <div 
                                        key={cIndex} 
                                        className={cn(
                                            "w-32 flex-shrink-0 border-r relative group", 
                                            status === "FAIL" ? "bg-red-50 inset-shadow-red" : "",
                                            status === "WARN" ? "bg-amber-50" : ""
                                        )}
                                    >
                                        {mode === "NORMALIZED" && !isExcluded ? (
                                            <input 
                                                className={cn("w-full h-full px-2 bg-transparent focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-300 transition-all", 
                                                    status === "FAIL" ? "text-red-700 font-medium" : "text-slate-700")}
                                                value={(val === null || (typeof val === "number" && isNaN(val))) ? "" : val}
                                                onChange={(e) => editCell((row as any).id, col, e.target.value)}
                                            />
                                        ) : (
                                            <div className="w-full h-full px-2 py-2 truncate text-slate-600 block">
                                                {String(val ?? "")}
                                            </div>
                                        )}
                                        {status === "FAIL" && <div className="absolute right-1 top-2 w-2 h-2 rounded-full bg-red-500" title="Error"></div>}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

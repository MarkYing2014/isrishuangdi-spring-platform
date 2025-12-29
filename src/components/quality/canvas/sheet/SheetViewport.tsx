"use client";

import React, { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useQualityStore } from "@/lib/quality/qualityStore";
import { useQualityCanvas } from "../QualityCanvasContext";
import { SheetHeaderRow } from "./SheetHeaderRow";
import { SheetRow } from "./SheetRow";

export function SheetViewport() {
  const parentRef = useRef<HTMLDivElement>(null);
  const { mode, registerScrollHandler } = useQualityCanvas();
  
  const rawRows = useQualityStore(state => state.rawRows);
  const normalizedRows = useQualityStore(state => state.normalizedRows);
  const columnMapping = useQualityStore(state => state.columnMapping);
  
  const isRaw = mode === "RAW";
  const rows = isRaw ? rawRows : normalizedRows;
  
  // Columns Calculation
  const columns = React.useMemo(() => {
     if (isRaw) {
         if (rawRows.length === 0) return [];
         return Object.keys(rawRows[0].cells ?? {});
     } else {
         return columnMapping.map(m => m.target ?? m.targetKey).filter((c): c is string => !!c);
     }
  }, [isRaw, rawRows, columnMapping]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36, // Fixed height for perf
    overscan: 20, 
  });

  // Register scroll handler to context
  useEffect(() => {
      registerScrollHandler((index) => {
          rowVirtualizer.scrollToIndex(index, { align: 'center' });
      });
  }, [registerScrollHandler, rowVirtualizer]);

  if (rows.length === 0) {
      return (
          <div className="flex bg-slate-50 flex-1 items-center justify-center text-gray-400">
              No data to display.
          </div>
      );
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white relative">
       {/* Sticky Header */}
       <SheetHeaderRow columns={columns} />

       {/* Virtual Body */}
       <div ref={parentRef} className="flex-1 overflow-auto w-full relative">
            <div
                style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%', // In future, if horizontal scroll needed, this must be explicit width
                    position: 'relative',
                }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => (
                    <SheetRow 
                        key={virtualRow.key}
                        row={rows[virtualRow.index] as any}
                        columns={columns}
                        style={{
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                        }}
                    />
                ))}
            </div>
       </div>
    </div>
  );
}

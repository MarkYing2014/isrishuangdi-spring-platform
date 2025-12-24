"use client";

import { useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language-context";

export interface ForceDeflectionPoint {
  deflection: number;
  load: number;
}

interface SpringForceTableProps {
  data: ForceDeflectionPoint[];
  currentDeflection: number;
  onRowClick?: (deflection: number) => void;
  maxHeight?: string;
  freeLength?: number;
}

export function SpringForceTable({
  data,
  currentDeflection,
  onRowClick,
  maxHeight = "max-h-64",
  freeLength,
}: SpringForceTableProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const deflectionLabel = isZh ? "位移 (mm)" : "Deflection (mm)";
  const heightLabel = isZh ? "剩余高度 (mm)" : "Remaining Height (mm)";
  const forceLabel = isZh ? "载荷 (N)" : "Force (N)";
  const tableRef = useRef<HTMLDivElement>(null);

  // Find the index of the nearest row to currentDeflection
  const nearestIndex = useMemo(() => {
    if (data.length === 0) return -1;

    let nearestIdx = 0;
    let minDiff = Math.abs(data[0].deflection - currentDeflection);

    for (let i = 1; i < data.length; i++) {
      const diff = Math.abs(data[i].deflection - currentDeflection);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIdx = i;
      }
    }

    return nearestIdx;
  }, [data, currentDeflection]);

  // Auto-scroll to the highlighted row
  useEffect(() => {
    if (nearestIndex >= 0 && tableRef.current) {
      const container = tableRef.current;
      const rows = container.querySelectorAll("tbody tr");
      const targetRow = rows[nearestIndex] as HTMLElement;
      
      if (targetRow) {
        const containerRect = container.getBoundingClientRect();
        // const rowRect = targetRow.getBoundingClientRect();
        const rowTop = targetRow.offsetTop;
        const rowHeight = targetRow.offsetHeight;
        const containerScrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        
        if (rowTop < containerScrollTop) {
          container.scrollTo({ top: rowTop - rowHeight, behavior: "smooth" });
        } else if (rowTop + rowHeight > containerScrollTop + containerHeight) {
          container.scrollTo({ top: rowTop - containerHeight + rowHeight * 2, behavior: "smooth" });
        }
      }
    }
  }, [nearestIndex]);

  const formatNumber = (value: number) => Number(value.toFixed(2)).toLocaleString();

  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
        {isZh ? "暂无数据" : "No data available"}
      </div>
    );
  }

  return (
    <div ref={tableRef} className={cn("overflow-x-auto overflow-y-auto rounded-lg border", maxHeight)}>
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-left sticky top-0 z-10">
          <tr>
            <th className="px-4 py-2 font-medium">{deflectionLabel}</th>
            {freeLength !== undefined && <th className="px-4 py-2 font-medium">{heightLabel}</th>}
            <th className="px-4 py-2 font-medium">{forceLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const isHighlighted = idx === nearestIndex;
            const isLast = idx === data.length - 1;

            return (
              <tr
                key={idx}
                onClick={() => onRowClick?.(row.deflection)}
                className={cn(
                  "border-t transition-colors cursor-pointer hover:bg-slate-50",
                  isHighlighted && "bg-blue-50 hover:bg-blue-100",
                  isLast && !isHighlighted && "bg-green-50"
                )}
              >
                <td className={cn("px-4 py-2", isHighlighted && "text-blue-700 font-medium")}>
                  {formatNumber(row.deflection)}
                  {isHighlighted && (
                    <span className="ml-2 text-xs text-blue-500">◀</span>
                  )}
                </td>
                {freeLength !== undefined && (
                  <td className={cn("px-4 py-2", isHighlighted && "text-blue-700 font-medium")}>
                    {formatNumber(freeLength - row.deflection)}
                  </td>
                )}
                <td className={cn("px-4 py-2", isHighlighted && "text-blue-700 font-medium")}>
                  {formatNumber(row.load)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

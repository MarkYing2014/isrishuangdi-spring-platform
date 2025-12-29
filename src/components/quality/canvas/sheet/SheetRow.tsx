"use client";

import React from "react";
import type { QualityRow, NormalizedRow } from "@/lib/quality/sheetTypes";
import { SheetCell } from "./SheetCell";
import { RowGutter } from "./RowGutter";
import { useQualityCanvas } from "../QualityCanvasContext";

interface SheetRowProps {
  row: QualityRow | NormalizedRow;
  columns: string[];
  style: React.CSSProperties;
}

export const SheetRow = React.memo(function SheetRow({ row, columns, style }: SheetRowProps) {
  const { mode } = useQualityCanvas();
  const isRaw = mode === "RAW";
  
  // Type guards/casting
  const nRow = !isRaw ? (row as NormalizedRow) : null;
  const rRow = isRaw ? (row as QualityRow) : null;
  const status = nRow ? nRow.status : "PASS"; // Raw always looks PASS or Gray
  const rowIndex = isRaw ? rRow!.index : nRow!.rowIndex;
  
  return (
    <div className="absolute left-0 w-full flex" style={style}>
      <RowGutter index={rowIndex} status={status} isRaw={isRaw} />
      
      {columns.map(col => {
          const value = isRaw ? rRow?.data[col] : nRow?.normalized[col];
          const issues = nRow?.issues?.filter(i => i.colKey === col);
          
          return (
              <SheetCell 
                key={col}
                rowIndex={rowIndex}
                colKey={col}
                value={value ?? null}
                mode={mode}
                isRaw={isRaw}
                issues={issues}
              />
          );
      })}
    </div>
  );
});

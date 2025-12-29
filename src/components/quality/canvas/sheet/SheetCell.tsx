"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { CellValue, ValidationIssue } from "@/lib/quality/sheetTypes";
import { useQualityCanvas } from "../QualityCanvasContext";
import { useQualityStore } from "@/lib/quality/qualityStore";

interface SheetCellProps {
  rowIndex: number;
  colKey: string;
  value: CellValue;
  mode: "RAW" | "NORMALIZED";
  issues?: ValidationIssue[];
  isRaw: boolean;
}

export const SheetCell = React.memo(function SheetCell({
  rowIndex,
  colKey,
  value,
  mode,
  issues = [],
  isRaw
}: SheetCellProps) {
  const { editingCell, setEditingCell } = useQualityCanvas();
  const editCellAction = useQualityStore(state => state.editCell);
  
  const isEditing = !isRaw && editingCell?.rowIndex === rowIndex && editingCell?.colKey === colKey;
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isEditing]);

  // Handle Edit Commit
  const handleBlur = () => {
      if (isEditing && inputRef.current) {
          editCellAction(String(rowIndex), colKey, inputRef.current.value);
          setEditingCell(null);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
          handleBlur();
      } else if (e.key === "Escape") {
          setEditingCell(null);
      }
  };

  // Status Styling
  let cellClass = "bg-white hover:bg-slate-50";
  if (!isRaw) {
      if (issues.some(i => i.level === "FAIL")) cellClass = "bg-red-50 ring-1 ring-inset ring-red-300";
      else if (issues.some(i => i.level === "WARN")) cellClass = "bg-amber-50";
  }
  if (isRaw) cellClass = "bg-slate-50 text-slate-500 italic"; // Raw readonly style

  return (
    <div 
        className={cn(
            "w-[120px] flex-shrink-0 border-r border-b px-2 py-1 flex items-center text-sm truncate relative group cursor-default",
            cellClass
        )}
        onClick={() => {
            if (!isRaw && !isEditing) setEditingCell({ rowIndex, colKey });
        }}
    >
        {isEditing ? (
            <input 
                ref={inputRef}
                defaultValue={String(value ?? "")}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full h-full bg-transparent outline-none ring-2 ring-blue-500 rounded px-1 absolute inset-0 z-10"
            />
        ) : (
            <span className="truncate w-full block" title={String(value ?? "")}>
                {value !== null && value !== undefined ? String(value) : ""}
            </span>
        )}
        
        {/* Issue Marker Triangle */}
        {issues.length > 0 && (
             <div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-r-[6px] border-t-red-500 border-r-transparent" />
        )}
    </div>
  );
});

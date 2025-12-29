"use client";

import React, { createContext, useContext, useState, useRef } from "react";
import type { QualityRow, NormalizedRow } from "@/lib/quality/sheetTypes";

interface QualityCanvasContextType {
  // Mode
  mode: "RAW" | "NORMALIZED";
  setMode: (mode: "RAW" | "NORMALIZED") => void;

  // Navigation
  scrollToCell: (rowIndex: number, colKey: string) => void;
  // We expose the virtualizer instanceRef or a handler to parent
  registerScrollHandler: (handler: (rowIndex: number) => void) => void;
  
  // Selection
  selectedCell: { rowIndex: number; colKey: string } | null;
  setSelectedCell: (sel: { rowIndex: number; colKey: string } | null) => void;
  
  // Editing
  editingCell: { rowIndex: number; colKey: string } | null;
  setEditingCell: (sel: { rowIndex: number; colKey: string } | null) => void;

  // Analysis Overlay
  showAnalysis: boolean;
  setShowAnalysis: (show: boolean) => void;
}

const QualityCanvasContext = createContext<QualityCanvasContextType | null>(null);

export function useQualityCanvas() {
  const ctx = useContext(QualityCanvasContext);
  if (!ctx) throw new Error("useQualityCanvas must be used within QualityCanvasProvider");
  return ctx;
}

export function QualityCanvasProvider({ children, initialMode = "NORMALIZED" }: { children: React.ReactNode, initialMode?: "RAW" | "NORMALIZED" }) {
  const [mode, setMode] = useState<"RAW" | "NORMALIZED">(initialMode);
  const [selectedCell, setSelectedCell] = useState<{ rowIndex: number; colKey: string } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colKey: string } | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  const scrollHandlerRef = useRef<((idx: number) => void) | null>(null);

  const registerScrollHandler = (handler: (idx: number) => void) => {
    scrollHandlerRef.current = handler;
  };

  const scrollToCell = (rowIndex: number, colKey: string) => {
    // 1. Set selection
    setSelectedCell({ rowIndex, colKey });
    // 2. Scroll Row
    if (scrollHandlerRef.current) {
        scrollHandlerRef.current(rowIndex);
    }
    // 3. Scroll Column (TODO in future if horizontal virtualized)
  };

  return (
    <QualityCanvasContext.Provider value={{
      mode,
      setMode,
      scrollToCell,
      registerScrollHandler,
      selectedCell,
      setSelectedCell,
      editingCell,
      setEditingCell,
      showAnalysis,
      setShowAnalysis
    }}>
      {children}
    </QualityCanvasContext.Provider>
  );
}

"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Loader2, RefreshCw, Download, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FreeCadDrawingProps {
  springType: "compression" | "extension" | "torsion" | "conical" | "arc";
  geometry: {
    wireDiameter: number;
    meanDiameter?: number;
    outerDiameter?: number;
    activeCoils: number;
    totalCoils?: number;
    freeLength?: number;
    bodyLength?: number;
  };
  material?: {
    name: string;
  };
  analysis?: {
    springRate?: number;
  };
  className?: string;
}

interface DrawingState {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
  svgContent?: string;
}

// 缓存
const drawingCache = new Map<string, { svg: string; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000;

function getCacheKey(springType: string, geometry: Record<string, unknown>): string {
  return JSON.stringify({ springType, geometry, type: "drawing" });
}

/**
 * 加载指示器 - 带倒计时
 */
function LoadingIndicator({ message, estimatedTime = 10 }: { message: string; estimatedTime?: number }) {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const remaining = Math.max(0, estimatedTime - elapsed);
  const progress = Math.min(100, (elapsed / estimatedTime) * 100);
  
  return (
    <div className="flex flex-col items-center gap-3 min-w-[200px]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <span className="text-sm font-medium text-muted-foreground">{message}</span>
      
      {/* 进度条 */}
      <div className="w-48 bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* 时间显示 */}
      <div className="text-xs text-muted-foreground">
        {remaining > 0 ? (
          <span>预计剩余 ~{remaining} 秒</span>
        ) : (
          <span>即将完成...</span>
        )}
        <span className="ml-2 text-gray-400">({elapsed}s)</span>
      </div>
    </div>
  );
}

/**
 * FreeCAD 2D 工程图组件
 * 调用后端生成专业的 SVG 工程图
 */
export function FreeCadDrawing({
  springType,
  geometry,
  material,
  analysis,
  className = "",
}: FreeCadDrawingProps) {
  const [state, setState] = useState<DrawingState>({ status: "idle" });
  
  const cacheKey = useMemo(() => getCacheKey(springType, geometry), [springType, geometry]);
  
  // 检查缓存
  useEffect(() => {
    const cached = drawingCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setState({ status: "success", svgContent: cached.svg });
    }
  }, [cacheKey]);
  
  const generateDrawing = useCallback(async (forceRefresh = false) => {
    // 检查缓存
    if (!forceRefresh) {
      const cached = drawingCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setState({ status: "success", svgContent: cached.svg });
        return;
      }
    }
    
    setState({ status: "loading", message: "Generating engineering drawing..." });
    
    try {
      const response = await fetch("/api/freecad/drawing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          springType,
          geometry,
          material,
          analysis,
        }),
      });
      
      const result = await response.json();
      
      if (result.status !== "success") {
        setState({ status: "error", message: result.message || "Failed to generate drawing" });
        return;
      }
      
      // 保存到缓存
      drawingCache.set(cacheKey, { svg: result.svg, timestamp: Date.now() });
      
      setState({ status: "success", svgContent: result.svg });
      
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [springType, geometry, material, analysis, cacheKey]);
  
  const downloadSVG = useCallback(() => {
    if (!state.svgContent) return;
    
    const blob = new Blob([state.svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${springType}_spring_drawing.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.svgContent, springType]);
  
  return (
    <div className={`relative bg-white rounded-lg border ${className}`}>
      {/* 控制按钮 */}
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => generateDrawing(state.status === "success")}
          disabled={state.status === "loading"}
        >
          {state.status === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span className="ml-1">
            {state.status === "idle" ? "Generate Drawing" : "Refresh"}
          </span>
        </Button>
        
        {state.status === "success" && (
          <Button size="sm" variant="outline" onClick={downloadSVG}>
            <Download className="w-4 h-4" />
            <span className="ml-1">Download SVG</span>
          </Button>
        )}
      </div>
      
      {/* 状态指示 */}
      {state.status !== "idle" && state.status !== "loading" && (
        <div className="absolute top-2 left-2 z-10">
          {state.status === "success" && (
            <div className="flex items-center gap-1 bg-green-500/90 text-white px-2 py-1 rounded text-xs">
              <CheckCircle className="w-3 h-3" />
              <span>FreeCAD Drawing</span>
            </div>
          )}
          {state.status === "error" && (
            <div className="flex items-center gap-1 bg-red-500/90 text-white px-2 py-1 rounded text-xs">
              <AlertCircle className="w-3 h-3" />
              <span>Error</span>
            </div>
          )}
        </div>
      )}
      
      {/* 内容区域 */}
      <div className="min-h-[500px] flex items-center justify-center p-4">
        {state.status === "idle" && (
          <div className="text-center text-muted-foreground">
            <p>Click "Generate Drawing" to create</p>
            <p className="text-sm mt-1">a professional engineering drawing using FreeCAD</p>
          </div>
        )}
        
        {state.status === "loading" && (
          <LoadingIndicator message={state.message || "生成中..."} estimatedTime={10} />
        )}
        
        {state.status === "error" && (
          <div className="text-center text-red-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>{state.message}</p>
          </div>
        )}
        
        {state.status === "success" && state.svgContent && (
          <div 
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: state.svgContent }}
          />
        )}
      </div>
    </div>
  );
}

export default FreeCadDrawing;

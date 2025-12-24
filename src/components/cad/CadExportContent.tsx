"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Download, FileText, CheckCircle, AlertCircle, Loader2, Eye } from "lucide-react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LanguageText } from "@/components/language-context";
import type { 
  CadExportFormat, 
  SpringGeometry,
  ExportedFile,
} from "@/lib/cad/types";
import { 
  CAD_FORMAT_GROUPS, 
  CAD_FORMAT_META,
} from "@/lib/cad/types";
import { requestCadExport } from "@/lib/cad/exportService";
import type {
  CompressionSpringGeometry,
  ExtensionSpringGeometry,
  TorsionSpringGeometry,
  ConicalSpringGeometry,
  SpringGeometry as EngineSpringGeometry,
} from "@/lib/engine/types";
import { 
  useSpringDesignStore,
  getMeanDiameter,
  type SpringGeometry as DesignGeometry,
  type CompressionGeometry,
} from "@/lib/stores/springDesignStore";
import { convertStoreGeometryToEngine } from "@/lib/engine/geometryAdapters";
import type { SpringMaterialId } from "@/lib/materials/springMaterials";
import { generateSpringDrawingSpec } from "@/lib/drawing";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCode, Box } from "lucide-react";

// Dynamic import for 3D preview (client-side only)
const CadPreview3D = dynamic(
  () => import("@/components/cad/CadPreview3D").then(mod => mod.CadPreview3D),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[400px] bg-slate-900 rounded-lg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }
);

// Dynamic import for Spiral Torsion 3D preview
const SpiralTorsionSpringVisualizer = dynamic(
  () => import("@/components/three/SpiralTorsionSpringMesh").then(mod => mod.SpiralTorsionSpringVisualizer),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[400px] bg-slate-900 rounded-lg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }
);

// Dynamic import for Arc Spring 3D preview
const ArcSpringVisualizer = dynamic(
  () => import("@/components/three/ArcSpringMesh").then(mod => mod.ArcSpringVisualizer),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[400px] bg-white rounded-lg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }
);

// Dynamic import for Wave Spring 3D preview
const WaveSpringVisualizer = dynamic(
  () => import("@/components/three/WaveSpringVisualizer").then(mod => mod.WaveSpringVisualizer),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[400px] bg-white rounded-lg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }
);

// Dynamic import for 2D drawing canvas
const EngineeringDrawingCanvas = dynamic(
  () => import("@/components/drawing/EngineeringDrawingCanvas").then(mod => mod.EngineeringDrawingCanvas),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[400px] bg-white border rounded-lg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }
);

// Dynamic import for FreeCAD preview
const FreeCadPreview = dynamic(
  () => import("@/components/cad/FreeCadPreview").then(mod => mod.FreeCadPreview),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[400px] bg-slate-800 rounded-lg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }
);

// Dynamic import for FreeCAD 2D drawing
const FreeCadDrawing = dynamic(
  () => import("@/components/cad/FreeCadDrawing").then(mod => mod.FreeCadDrawing),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[500px] bg-white border rounded-lg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }
);

const numberOrUndefined = (value: string | null) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export default function SpringCadExportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading CAD Export...</div>}>
      <CadExportContent />
    </Suspense>
  );
}

function CadExportContent() {
  const searchParams = useSearchParams();
  
  // 从全局 store 读取设计数据
  const storeGeometry = useSpringDesignStore(state => state.geometry);
  const storeMaterial = useSpringDesignStore(state => state.material);
  const storeAnalysis = useSpringDesignStore(state => state.analysisResult);
  const storeMeta = useSpringDesignStore(state => state.meta);
  const hasValidDesign = useSpringDesignStore(state => state.hasValidDesign);
  
  // 检查是否有 URL 参数（作为备选）
  const hasUrlParams = searchParams.has("d") || searchParams.has("Dm") || searchParams.has("Na");
  
  // 优先使用 store 数据，否则使用 URL 参数
  const hasParams = hasValidDesign || hasUrlParams;
  
  // 从 store 或 URL 获取数据
  const code = storeMeta?.designCode ?? searchParams.get("code") ?? undefined;
  // Note: dieSpring has its own dedicated engineering page and is not supported in CAD export
  const rawType = searchParams.get("type") ?? storeGeometry?.type ?? "compression";
  const springType = (rawType === "arcSpring" ? "arc" : rawType) as SpringGeometry['type'] | "spiralTorsion" | "wave" | "arc";
  
  // 几何参数 - 优先从 store 读取
  // 螺旋扭转弹簧没有 wireDiameter，使用 stripThickness 作为替代
  // Note: dieSpring 有专用工程分析页面，不在此处处理
  const wireDiameter = storeGeometry?.type === "spiralTorsion" 
    ? storeGeometry.stripThickness 
    : ("wireDiameter" in (storeGeometry ?? {}) 
      ? (storeGeometry as { wireDiameter?: number })?.wireDiameter 
      : undefined) ?? numberOrUndefined(searchParams.get("d")) ?? 3.2;
  
  // 螺旋扭转弹簧没有 meanDiameter 概念，getMeanDiameter 返回 null
  // 对于 wire spring 使用 meanDiameter，对于 spiral 使用 fallback 值（仅用于显示）
  const meanDiameterRaw = storeGeometry ? getMeanDiameter(storeGeometry) : null;
  const meanDiameter = meanDiameterRaw ?? (numberOrUndefined(searchParams.get("Dm")) ?? 24);
  
  // 标记是否为螺旋扭转弹簧
  const isSpiralTorsion = storeGeometry?.type === "spiralTorsion" || springType === "spiralTorsion";
  // Note: dieSpring 有专用工程分析页面，CAD 导出暂不支持
  const isDieSpring = storeGeometry?.type === "dieSpring";
  // 使用 in 操作符安全访问 activeCoils
  const activeCoils = ("activeCoils" in (storeGeometry ?? {})
    ? (storeGeometry as { activeCoils?: number })?.activeCoils
    : undefined) ?? numberOrUndefined(searchParams.get("Na")) ?? 8;
  const totalCoils = (storeGeometry?.type === "compression" ? storeGeometry.totalCoils : undefined) 
    ?? numberOrUndefined(searchParams.get("Nt")) ?? activeCoils + 2;
  const freeLength = (storeGeometry?.type === "compression" || storeGeometry?.type === "conical" 
    ? storeGeometry.freeLength : undefined) ?? numberOrUndefined(searchParams.get("L0")) ?? 50;
  
  // 材料
  const materialId = storeMaterial?.id ?? searchParams.get("material") ?? "music_wire_a228";
  const materialName = storeMaterial?.name ?? materialId;
  
  // 分析结果
  const springRate = storeAnalysis?.springRate ?? numberOrUndefined(searchParams.get("k")) ?? 10;
  const maxDeflection = storeAnalysis?.maxDeflection ?? numberOrUndefined(searchParams.get("dx"));
  const safetyFactor = storeAnalysis?.staticSafetyFactor;
  const fatigueLife = storeAnalysis?.fatigueLife;
  
  // Extension specific
  const hookType = (storeGeometry?.type === "extension" ? storeGeometry.hookType : undefined) 
    ?? (searchParams.get("hookType") ?? "machine") as "machine" | "crossover" | "side" | "extended" | "doubleLoop";
  const initialTension = (storeGeometry?.type === "extension" ? storeGeometry.initialTension : undefined) 
    ?? numberOrUndefined(searchParams.get("Fi")) ?? 5;
  const bodyLength = (storeGeometry?.type === "extension" ? storeGeometry.bodyLength : undefined) 
    ?? numberOrUndefined(searchParams.get("Lb"));
  
  // Torsion specific
  const legLength1 = (storeGeometry?.type === "torsion" ? storeGeometry.legLength1 : undefined) 
    ?? numberOrUndefined(searchParams.get("L1")) ?? 25;
  const legLength2 = (storeGeometry?.type === "torsion" ? storeGeometry.legLength2 : undefined) 
    ?? numberOrUndefined(searchParams.get("L2")) ?? 25;
  const windingDirection = (storeGeometry?.type === "torsion" ? storeGeometry.windingDirection : undefined) 
    ?? (searchParams.get("hand") ?? "right") as "left" | "right";
  
  // Conical specific
  const largeDiameter = (storeGeometry?.type === "conical" ? storeGeometry.largeOuterDiameter : undefined) 
    ?? numberOrUndefined(searchParams.get("D1"));
  const smallDiameter = (storeGeometry?.type === "conical" ? storeGeometry.smallOuterDiameter : undefined) 
    ?? numberOrUndefined(searchParams.get("D2"));
  const conicalTotalCoils = (storeGeometry?.type === "conical" ? storeGeometry.totalCoils : undefined)
    ?? numberOrUndefined(searchParams.get("Nt"));
  const conicalEndType = (storeGeometry?.type === "conical" ? storeGeometry.endType : undefined)
    ?? (searchParams.get("endType") as "natural" | "closed" | "closed_ground" | null) ?? "closed_ground";

  // Arc Spring Parameters
  const arcRadius = (storeGeometry?.type === "arc" ? (storeGeometry as any).workingRadius : undefined) ?? numberOrUndefined(searchParams.get("r")) ?? 50;
  const arcAlpha0 = (storeGeometry?.type === "arc" ? (storeGeometry as any).unloadedAngle : undefined) ?? numberOrUndefined(searchParams.get("alpha0")) ?? 45;

  // 构建几何参数 - 根据实际弹簧类型构建
  const geometry = useMemo(() => {
    if (storeGeometry) {
      switch (storeGeometry.type) {
        case "conical":
          return {
            ...storeGeometry,
            endType: storeGeometry.endType ?? conicalEndType,
            totalCoils: storeGeometry.totalCoils ?? conicalTotalCoils ?? storeGeometry.activeCoils,
          };
        case "extension":
          return {
            ...storeGeometry,
            meanDiameter: storeGeometry.meanDiameter ?? storeGeometry.outerDiameter - storeGeometry.wireDiameter,
          };
        case "torsion":
          return {
            ...storeGeometry,
            outerDiameter: storeGeometry.outerDiameter ?? storeGeometry.meanDiameter + storeGeometry.wireDiameter,
            freeAngle: storeGeometry.freeAngle ?? storeGeometry.workingAngle ?? 90,
            bodyLength: storeGeometry.bodyLength ?? storeGeometry.activeCoils * storeGeometry.wireDiameter,
          };
        default:
          return storeGeometry;
      }
    }

    switch (springType) {
      case "extension": {
        const outer = meanDiameter + wireDiameter;
        const body = bodyLength ?? activeCoils * wireDiameter;
        return {
          type: "extension" as const,
          wireDiameter,
          meanDiameter,
          activeCoils,
          bodyLength: body,
          freeLength: body + wireDiameter * 4,
          hookType: hookType ?? "machine",
          initialTension: initialTension ?? 5,
        };
      }
      case "torsion":
        return {
          type: "torsion" as const,
          wireDiameter,
          meanDiameter,
          activeCoils,
          bodyLength: activeCoils * wireDiameter * 1.1,
          legLength1,
          legLength2,
          freeAngle: 90,
          windingDirection,
        };
      case "conical":
        return {
          type: "conical" as const,
          wireDiameter,
          largeOuterDiameter: largeDiameter ?? meanDiameter * 1.5,
          smallOuterDiameter: smallDiameter ?? meanDiameter * 0.5,
          activeCoils,
          totalCoils: conicalTotalCoils ?? activeCoils,
          freeLength,
          endType: conicalEndType,
        };
      case "compression":
      default:
        return {
          type: "compression" as const,
          wireDiameter,
          meanDiameter,
          activeCoils,
          totalCoils,
          freeLength,
          topGround: true,
          bottomGround: true,
        };
    }
  }, [
    storeGeometry,
    springType,
    wireDiameter,
    meanDiameter,
    activeCoils,
    totalCoils,
    freeLength,
    bodyLength,
    hookType,
    initialTension,
    legLength1,
    legLength2,
    windingDirection,
    largeDiameter,
    smallDiameter,
    conicalTotalCoils,
    conicalEndType,
  ]);

  const engineGeometry = useMemo<EngineSpringGeometry | null>(() => {
    // 螺旋扭转弹簧现在支持 FreeCAD 导出
    // 但不支持 engine geometry 转换，直接使用 storeGeometry
    if (isSpiralTorsion) {
      // 返回 null 让 FreeCAD 导出使用 storeGeometry
      return null;
    }

    // 波形弹簧也不使用通用引擎适配器
    if (storeGeometry?.type === "wave") {
      return null; 
    }
    
    if (storeGeometry) {
      return convertStoreGeometryToEngine(storeGeometry, materialId as SpringMaterialId);
    }

    switch (springType) {
      case "extension": {
        const body = bodyLength ?? activeCoils * wireDiameter;
        const safeHookType =
          hookType === "doubleLoop" ? "extended" : (hookType ?? "machine");
        const extGeom: ExtensionSpringGeometry = {
          type: "extension",
          wireDiameter,
          meanDiameter,
          activeCoils,
          totalCoils: activeCoils,
          bodyLength: body,
          initialTension: initialTension ?? 0,
          hookType: safeHookType,
          materialId: materialId as SpringMaterialId,
        };
        return extGeom;
      }
      case "torsion": {
        const torGeom: TorsionSpringGeometry = {
          type: "torsion",
          wireDiameter,
          meanDiameter,
          activeCoils,
          bodyLength: activeCoils * wireDiameter * 1.1,
          legLength1,
          legLength2,
          windDirection: windingDirection,
          materialId: materialId as SpringMaterialId,
        };
        return torGeom;
      }
      case "conical": {
        const cnGeom: ConicalSpringGeometry = {
          type: "conical",
          wireDiameter,
          largeOuterDiameter: largeDiameter ?? meanDiameter * 1.5,
          smallOuterDiameter: smallDiameter ?? meanDiameter * 0.5,
          activeCoils,
          totalCoils: conicalTotalCoils ?? activeCoils,
          freeLength,
          materialId: materialId as SpringMaterialId,
        };
        return cnGeom;
      }
      case "compression":
      default: {
        const compGeom: CompressionSpringGeometry = {
          type: "compression",
          wireDiameter,
          meanDiameter,
          activeCoils,
          totalCoils,
          freeLength,
          materialId: materialId as SpringMaterialId,
        };
        return compGeom;
      }
    }
  }, [
    storeGeometry,
    springType,
    wireDiameter,
    meanDiameter,
    activeCoils,
    totalCoils,
    freeLength,
    bodyLength,
    hookType,
    initialTension,
    legLength1,
    legLength2,
    windingDirection,
    largeDiameter,
    smallDiameter,
    conicalTotalCoils,
    materialId,
  ]);

  const [selectedFormats, setSelectedFormats] = useState<CadExportFormat[]>(["STEP", "PDF_2D"]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedFiles, setExportedFiles] = useState<ExportedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [freecadStatus, setFreecadStatus] = useState<{ available: boolean; version?: string } | null>(null);
  const [isExportingFreeCAD, setIsExportingFreeCAD] = useState(false);
  
  // 检查 FreeCAD 状态
  useEffect(() => {
    fetch("/api/freecad/export")
      .then(res => res.json())
      .then(data => setFreecadStatus(data))
      .catch(() => setFreecadStatus({ available: false }));
  }, []);
  
  // FreeCAD 导出
  const handleFreeCADExport = async () => {
    setIsExportingFreeCAD(true);
    setError(null);
    
    try {
      // 构建几何参数 - 螺旋扭转弹簧使用特殊参数
      const geometryParams = isSpiralTorsion && storeGeometry?.type === "spiralTorsion"
        ? {
            innerDiameter: storeGeometry.innerDiameter,
            outerDiameter: storeGeometry.outerDiameter,
            turns: storeGeometry.activeCoils,
            stripWidth: storeGeometry.stripWidth,
            stripThickness: storeGeometry.stripThickness,
            handedness: "ccw",
          }
        : {
            wireDiameter,
            meanDiameter,
            outerDiameter: meanDiameter + wireDiameter,
            activeCoils,
            totalCoils,
            freeLength,
            bodyLength,
            hookType,
            legLength1,
            legLength2,
            windingDirection,
            largeOuterDiameter: largeDiameter,
            smallOuterDiameter: smallDiameter,
          };
      
      const response = await fetch("/api/freecad/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          springType: isSpiralTorsion ? "spiral_torsion" : springType,
          geometry: geometryParams,
          export: {
            formats: ["STEP"],
            name: `${springType}_spring_${Date.now()}`,
          },
        }),
      });
      
      const result = await response.json();
      
      if (result.status === "success" && result.files) {
        setExportedFiles(result.files.map((f: { format: string; fileName: string; downloadUrl: string; fileSize?: number }) => ({
          format: f.format as CadExportFormat,
          fileName: f.fileName,
          downloadUrl: f.downloadUrl,
          fileSize: f.fileSize,
        })));
      } else if (result.status === "unavailable") {
        setError(result.message || "FreeCAD is not available");
      } else {
        setError(result.message || "Export failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExportingFreeCAD(false);
    }
  };

  const toggleFormat = (format: CadExportFormat) => {
    setSelectedFormats((prev) =>
      prev.includes(format) ? prev.filter((item) => item !== format) : [...prev, format],
    );
  };

  const handleExport = async () => {
    if (selectedFormats.length === 0) {
      setError("请至少选择一种导出格式");
      return;
    }
    
    // 螺旋扭转弹簧暂不支持 CAD 导出
    if (!engineGeometry) {
      setError("螺旋扭转弹簧暂不支持 CAD 导出 / Spiral torsion spring CAD export not yet supported");
      return;
    }
    
    setIsExporting(true);
    setError(null);
    setExportedFiles([]);
    
    try {
      const result = await requestCadExport(engineGeometry, selectedFormats, {
        analysisResult: {
          springRate: springRate ?? 0,
          maxDeflection,
        },
      });
      
      if (result.status === 'failed') {
        throw new Error(result.error?.message ?? 'Export failed');
      }
      
      if (result.files) {
        setExportedFiles(result.files);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = (file: ExportedFile) => {
    // 对于 data URL，创建下载链接
    const link = document.createElement('a');
    link.href = file.downloadUrl;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const springTypeLabels: Record<string, string> = {
    compression: "Compression / 压缩弹簧",
    extension: "Extension / 拉伸弹簧",
    torsion: "Torsion / 扭转弹簧",
    conical: "Conical / 锥形弹簧",
  };
  
  // 根据弹簧类型构建参数显示列表
  const summaryItems = useMemo(() => {
    const baseItems = [
      { label: "Spring Type / 类型", value: springTypeLabels[springType] ?? springType },
      { label: "Design Code / 设计编号", value: code ?? "—" },
      { label: "Wire Diameter d / 线径", value: springType === "wave" ? "—" : `${wireDiameter.toFixed(2)} mm` },
    ];
    
    // 根据弹簧类型添加特定参数
    switch (springType) {
      case "wave": {
        // Assume storeGeometry is available and is WaveSpringGeometry
        const g = storeGeometry as any; 
        if (!g) return baseItems;
        return [
          { label: "Spring Type / 类型", value: "Wave / 波形弹簧" },
          { label: "Material / 材料", value: materialName },
          { label: "Inner Diameter ID / 内径", value: `${g.id} mm` },
          { label: "Outer Diameter OD / 外径", value: `${g.od} mm` },
          { label: "Thickness t / 厚度", value: `${g.thickness_t} mm` },
          { label: "Radial Wall b / 壁宽", value: `${g.radialWall_b} mm` },
          { label: "Turns Nt / 圈数", value: String(g.turns_Nt) },
          { label: "Waves/Turn Nw / 波数", value: String(g.wavesPerTurn_Nw) },
          { label: "Free Height Hf / 自由高度", value: `${g.freeHeight_Hf} mm` },
          { label: "Working Height Hw / 工作高度", value: `${g.workingHeight_Hw} mm` },
          { label: "Spring Rate k / 刚度", value: springRate ? `${springRate.toFixed(2)} N/mm` : "—" },
        ];
      }
      case "arc": {
        return [
          { label: "Spring Type / 类型", value: "Arc / 弧形弹簧" },
          { label: "Material / 材料", value: materialName },
          { label: "Wire Diameter d / 线径", value: `${wireDiameter.toFixed(2)} mm` },
          { label: "Mean Diameter D / 中径", value: `${meanDiameter.toFixed(2)} mm` },
          { label: "Active Coils n / 有效圈数", value: String(activeCoils) },
          { label: "Working Radius r / 工作半径", value: `${arcRadius.toFixed(2)} mm` },
          { label: "Unloaded Angle α₀ / 自由角度", value: `${arcAlpha0.toFixed(2)}°` },
          { label: "Spring Rate R / 旋转刚度", value: springRate ? `${springRate.toFixed(2)} N·mm/deg` : "—" },
        ];
      }
      case "extension":
        return [
          ...baseItems,
          { label: "Outer Diameter OD / 外径", value: `${(meanDiameter + wireDiameter).toFixed(2)} mm` },
          { label: "Active Coils Na / 有效圈数", value: activeCoils.toFixed(1) },
          { label: "Body Length Lb / 体长", value: `${(bodyLength ?? activeCoils * wireDiameter).toFixed(1)} mm` },
          { label: "Hook Type / 钩子类型", value: hookType ?? "machine" },
          { label: "Initial Tension Fi / 初张力", value: `${(initialTension ?? 0).toFixed(1)} N` },
          { label: "Material / 材料", value: materialName },
          { label: "Spring Rate k / 刚度", value: springRate ? `${springRate.toFixed(2)} N/mm` : "—" },
        ];
      case "torsion":
        return [
          ...baseItems,
          { label: "Mean Diameter Dm / 中径", value: `${meanDiameter.toFixed(2)} mm` },
          { label: "Active Coils Na / 有效圈数", value: activeCoils.toFixed(1) },
          { label: "Leg Length 1 / 腿长1", value: `${legLength1.toFixed(1)} mm` },
          { label: "Leg Length 2 / 腿长2", value: `${legLength2.toFixed(1)} mm` },
          { label: "Winding / 旋向", value: windingDirection === "left" ? "Left / 左旋" : "Right / 右旋" },
          { label: "Material / 材料", value: materialName },
          { label: "Spring Rate k / 刚度", value: springRate ? `${springRate.toFixed(2)} N·mm/°` : "—" },
        ];
      case "conical": {
        const endTypeLabels: Record<string, string> = {
          natural: "Natural / 自然端",
          closed: "Closed / 并紧",
          closed_ground: "Closed & Ground / 并紧磨平",
        };
        return [
          ...baseItems,
          { label: "Large OD D1 / 大端外径", value: `${(largeDiameter ?? meanDiameter * 1.5).toFixed(2)} mm` },
          { label: "Small OD D2 / 小端外径", value: `${(smallDiameter ?? meanDiameter * 0.5).toFixed(2)} mm` },
          { label: "Active Coils Na / 有效圈数", value: activeCoils.toFixed(1) },
          { label: "Total Coils Nt / 总圈数", value: (conicalTotalCoils ?? activeCoils).toFixed(1) },
          { label: "Free Length L₀ / 自由长度", value: `${freeLength.toFixed(1)} mm` },
          { label: "End Type / 端面形式", value: endTypeLabels[conicalEndType] ?? conicalEndType },
          { label: "Material / 材料", value: materialName },
          { label: "Spring Rate k / 刚度", value: springRate ? `${springRate.toFixed(2)} N/mm` : "—" },
        ];
      }
      case "compression":
      default:
        return [
          ...baseItems,
          { label: "Mean Diameter Dm / 中径", value: `${meanDiameter.toFixed(2)} mm` },
          { label: "Active Coils Na / 有效圈数", value: activeCoils.toFixed(1) },
          { label: "Total Coils Nt / 总圈数", value: totalCoils.toFixed(1) },
          { label: "Free Length L₀ / 自由长度", value: `${freeLength.toFixed(1)} mm` },
          { label: "Material / 材料", value: materialName },
          { label: "Spring Rate k / 刚度", value: springRate ? `${springRate.toFixed(2)} N/mm` : "—" },
          { label: "Safety Factor / 安全系数", value: safetyFactor ? safetyFactor.toFixed(2) : "—" },
        ];
    }
  }, [
    springType, code, wireDiameter, meanDiameter, activeCoils, totalCoils, 
    freeLength, bodyLength, hookType, initialTension, legLength1, legLength2, 
    windingDirection, largeDiameter, smallDiameter, materialName, springRate, safetyFactor,
    conicalTotalCoils, conicalEndType
  ]);

  const rfqUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (code) params.set("code", code);
    params.set("d", wireDiameter.toString());
    params.set("Dm", meanDiameter.toString());
    params.set("Na", activeCoils.toString());
    params.set("L0", freeLength.toString());
    if (springRate) params.set("k", springRate.toString());
    return `/rfq?${params.toString()}`;
  }, [code, wireDiameter, meanDiameter, activeCoils, freeLength, springRate]);

  // 如果没有参数，显示提示
  if (!hasParams) {
    return (
      <section className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
            <LanguageText en="Module • CAD Export" zh="模块 • CAD 导出" />
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            <LanguageText en="CAD Export" zh="CAD 导出" />
          </h1>
        </div>
        
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 mx-auto text-amber-500" />
            <h2 className="text-xl font-semibold">
              <LanguageText en="No Design Data" zh="没有设计数据" />
            </h2>
            <p className="text-muted-foreground">
              <LanguageText 
                en="Please start from the Calculator page to design your spring, then click 'Export CAD' to generate CAD files."
                zh="请先从计算器页面设计您的弹簧，然后点击「导出 CAD」按钮生成 CAD 文件。"
              />
            </p>
            <Button asChild>
              <a href="/tools/calculator">
                <LanguageText en="Go to Calculator" zh="前往计算器" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
          <LanguageText en="Module • CAD Export" zh="模块 • CAD 导出" />
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          <LanguageText en="CAD Export" zh="CAD 导出" />
        </h1>
        <p className="text-muted-foreground">
          <LanguageText
            en="Review your spring design parameters and export CAD files for manufacturing."
            zh="查看您的弹簧设计参数，并导出 CAD 文件用于制造。"
          />
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <LanguageText en="Spring Design Summary" zh="弹簧设计概要" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {code && (
            <p className="text-sm text-primary font-medium">
              <LanguageText en="Design Code" zh="设计代码" />: {code}
            </p>
          )}
          <dl className="grid gap-3 sm:grid-cols-2">
            {summaryItems.map((item) => (
              <div key={item.label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">{item.label}</dt>
                <dd className="text-base font-semibold text-slate-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* Preview - 3D Model & 2D Drawing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            <LanguageText en="Preview" zh="预览" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="3d" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="3d" className="flex items-center gap-2">
                <Box className="w-4 h-4" />
                <LanguageText en="3D Preview" zh="3D 预览" />
              </TabsTrigger>
              <TabsTrigger value="cad" className="flex items-center gap-2">
                <Box className="w-4 h-4" />
                <LanguageText en="FreeCAD" zh="FreeCAD" />
              </TabsTrigger>
              <TabsTrigger value="2d" className="flex items-center gap-2">
                <FileCode className="w-4 h-4" />
                <LanguageText en="2D Drawing" zh="2D 工程图" />
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="3d">
              {isSpiralTorsion && storeGeometry?.type === "spiralTorsion" ? (
                <>
                  <div className="h-[400px] rounded-lg overflow-hidden">
                    <SpiralTorsionSpringVisualizer
                      innerDiameter={storeGeometry.innerDiameter}
                      outerDiameter={storeGeometry.outerDiameter}
                      turns={storeGeometry.activeCoils}
                      stripWidth={storeGeometry.stripWidth}
                      stripThickness={storeGeometry.stripThickness}
                      handedness={storeGeometry.windingDirection ?? "cw"}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    <LanguageText 
                      en="Spiral Torsion Spring • Archimedean spiral + rectangular cross-section"
                      zh="螺旋扭转弹簧 • 阿基米德螺线 + 矩形截面"
                    />
                  </p>
                </>
              ) : springType === "arc" ? (
                <>
                  <div className="h-[400px] rounded-lg overflow-hidden bg-white border">
                    <ArcSpringVisualizer
                      d={wireDiameter}
                      D={meanDiameter}
                      n={activeCoils}
                      r={arcRadius}
                      alpha0Deg={arcAlpha0}
                      autoRotate={true}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    <LanguageText 
                      en="Arc Spring • Internal 3D Renderer"
                      zh="弧形弹簧 • 内置 3D 渲染器"
                    />
                  </p>
                </>
              ) : storeGeometry?.type === "wave" ? (
                <>
                  <div className="h-[400px] rounded-lg overflow-hidden bg-white border">
                    <WaveSpringVisualizer
                      meanDiameter={(storeGeometry as any).od - (storeGeometry as any).radialWall_b}
                      thickness={(storeGeometry as any).thickness_t}
                      width={(storeGeometry as any).radialWall_b}
                      amplitude={((storeGeometry as any).freeHeight_Hf - ((storeGeometry as any).turns_Nt * (storeGeometry as any).thickness_t)) / (2 * (storeGeometry as any).turns_Nt * (storeGeometry as any).wavesPerTurn_Nw)}
                      waves={(storeGeometry as any).wavesPerTurn_Nw}
                      turns={(storeGeometry as any).turns_Nt}
                      color="#6b9bd1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    <LanguageText 
                      en="Wave Spring • Internal 3D Renderer"
                      zh="波形弹簧 • 内置 3D 渲染器"
                    />
                  </p>
                </>
              ) : (
                <>
                  <CadPreview3D 
                    params={{
                      type: springType as "compression" | "extension" | "torsion" | "conical",
                      wireDiameter,
                      meanDiameter,
                      activeCoils,
                      totalCoils,
                      freeLength,
                      bodyLength,
                      hookType,
                      initialTension,
                      legLength1,
                      legLength2,
                      windingDirection,
                      largeDiameter,
                      smallDiameter,
                    }}
                    className="h-[400px] rounded-lg overflow-hidden"
                  />
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    <LanguageText 
                      en="Three.js preview • Drag to rotate • Scroll to zoom"
                      zh="Three.js 预览 • 拖动旋转 • 滚轮缩放"
                    />
                  </p>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="cad">
              {springType === "wave" || springType === "arc" ? (
                <div className="flex flex-col items-center justify-center h-[400px] bg-slate-50 rounded-lg p-6 border text-center">
                  <AlertCircle className="w-10 h-10 text-slate-300 mb-4" />
                  <p className="text-muted-foreground">
                    <LanguageText 
                      en={`FreeCAD preview is not available for ${springType === "wave" ? "Wave" : "Arc"} Springs yet.`}
                      zh={`${springType === "wave" ? "波形" : "弧形"}弹簧暂不支持 FreeCAD 预览。`}
                    />
                  </p>
                </div>
              ) : (
                <>
                  <FreeCadPreview
                    springType={isSpiralTorsion ? "spiral_torsion" : springType as any}
                    geometry={isSpiralTorsion && storeGeometry?.type === "spiralTorsion" 
                      ? {
                          innerDiameter: storeGeometry.innerDiameter,
                          outerDiameter: storeGeometry.outerDiameter,
                          turns: storeGeometry.activeCoils,
                          stripWidth: storeGeometry.stripWidth,
                          stripThickness: storeGeometry.stripThickness,
                          handedness: "ccw",
                        }
                      : {
                          wireDiameter,
                          meanDiameter,
                          outerDiameter: springType === "extension" || springType === "torsion" ? meanDiameter + wireDiameter : undefined,
                          activeCoils,
                          totalCoils: springType === "conical" ? conicalTotalCoils : totalCoils,
                          freeLength,
                          bodyLength,
                          hookType,
                          legLength1,
                          legLength2,
                          windingDirection,
                          largeOuterDiameter: largeDiameter,
                          smallOuterDiameter: smallDiameter,
                          topGround: storeGeometry?.type === "compression" ? storeGeometry.topGround : undefined,
                          bottomGround: storeGeometry?.type === "compression" ? storeGeometry.bottomGround : undefined,
                          endType: springType === "conical" ? conicalEndType : undefined,
                        }
                    }
                    className="h-[400px] rounded-lg overflow-hidden"
                  />
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    <LanguageText 
                      en="Real CAD model generated by FreeCAD - Click Generate to create"
                      zh="由 FreeCAD 生成的真实 CAD 模型 - 点击生成按钮创建"
                    />
                  </p>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="2d">
              {springType === "wave" || springType === "arc" ? (
                <div className="flex flex-col items-center justify-center h-[500px] bg-slate-50 rounded-lg p-6 border text-center">
                  <FileText className="w-10 h-10 text-slate-300 mb-4" />
                  <p className="text-muted-foreground">
                    <LanguageText 
                      en={`Engineering drawing generation is not available for ${springType === "wave" ? "Wave" : "Arc"} Springs yet.`}
                      zh={`${springType === "wave" ? "波形" : "弧形"}弹簧暂不支持工程图生成。`}
                    />
                  </p>
                </div>
              ) : (
                <>
                  <FreeCadDrawing
                    springType={springType as "compression" | "extension" | "torsion" | "conical"}
                    geometry={{
                      wireDiameter,
                      meanDiameter,
                      outerDiameter: meanDiameter + wireDiameter,
                      activeCoils,
                      totalCoils,
                      freeLength,
                      bodyLength,
                    }}
                    material={storeMaterial ?? undefined}
                    analysis={storeAnalysis ? { springRate: storeAnalysis.springRate } : undefined}
                    className="min-h-[500px]"
                  />
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    <LanguageText 
                      en="Professional engineering drawing generated by FreeCAD - Click Generate to create"
                      zh="由 FreeCAD 生成的专业工程图 - 点击生成按钮创建"
                    />
                  </p>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <LanguageText en="Export Options" zh="导出选项" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 格式选择 */}
          {Object.entries(CAD_FORMAT_GROUPS).map(([group, formats]) => (
            <div key={group} className="space-y-2">
              <Label className="text-xs text-slate-500">{group}</Label>
              <div className="flex flex-wrap gap-2">
                {formats.map((format: CadExportFormat) => {
                  const meta = CAD_FORMAT_META[format];
                  const isSelected = selectedFormats.includes(format);
                  
                  return (
                    <button
                      key={format}
                      onClick={() => toggleFormat(format)}
                      className={`
                        px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                        ${isSelected 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }
                      `}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* 错误提示 */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* 导出按钮 */}
          <Button 
            onClick={handleExport} 
            disabled={isExporting || selectedFormats.length === 0}
            className="w-full"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <LanguageText en="Exporting..." zh="导出中..." />
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                <LanguageText en="Export CAD Files" zh="导出 CAD 文件" />
              </>
            )}
          </Button>

          {/* 导出结果 */}
          {exportedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  <LanguageText en="Export Successful" zh="导出成功" />
                </span>
              </div>
              
              <div className="space-y-2">
                {exportedFiles.map((file, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span className="text-sm">{file.fileName}</span>
                      {file.fileSize && (
                        <span className="text-xs text-slate-400">
                          ({(file.fileSize / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      <LanguageText en="Download" zh="下载" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FreeCAD 高级导出 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="w-5 h-5" />
            <LanguageText en="FreeCAD Export (STEP/STL)" zh="FreeCAD 导出（STEP/STL）" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <LanguageText 
              en="Generate parametric 3D CAD models using FreeCAD. These files can be opened in SolidWorks, NX, CATIA, and other CAD software."
              zh="使用 FreeCAD 生成参数化 3D CAD 模型。这些文件可以在 SolidWorks、NX、CATIA 等 CAD 软件中打开。"
            />
          </p>
          
          {freecadStatus && (
            <div className={`p-3 rounded-lg ${
              freecadStatus.available ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
            }`}>
              {freecadStatus.available ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">FreeCAD {freecadStatus.version || "available"}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      <LanguageText 
                        en="FreeCAD not installed"
                        zh="FreeCAD 未安装"
                      />
                    </span>
                  </div>
                  <div className="text-xs space-y-1 ml-6">
                    <p className="font-medium">Windows:</p>
                    <a 
                      href="https://github.com/FreeCAD/FreeCAD/releases/download/0.21.2/FreeCAD-0.21.2-WIN-x64-installer-1.exe"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline block"
                    >
                      <LanguageText 
                        en="Download FreeCAD 0.21.2 for Windows (64-bit)"
                        zh="下载 FreeCAD 0.21.2 Windows 版（64位）"
                      />
                    </a>
                    <p className="text-amber-600">
                      <LanguageText 
                        en="Install to: C:\\Program Files\\FreeCAD 0.21"
                        zh="安装路径：C:\\Program Files\\FreeCAD 0.21"
                      />
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <Button 
            onClick={handleFreeCADExport} 
            disabled={isExportingFreeCAD || !freecadStatus?.available}
            className="w-full"
            variant="secondary"
          >
            {isExportingFreeCAD ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <LanguageText en="Generating 3D Model..." zh="生成 3D 模型中..." />
              </>
            ) : (
              <>
                <Box className="w-4 h-4 mr-2" />
                <LanguageText en="Export STEP + STL (FreeCAD)" zh="导出 STEP + STL（FreeCAD）" />
              </>
            )}
          </Button>

          {/* FreeCAD 导出结果 */}
          {exportedFiles.length > 0 && (
            <div className="space-y-3 mt-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  <LanguageText en="FreeCAD Export Successful" zh="FreeCAD 导出成功" />
                </span>
              </div>
              
              <div className="space-y-2">
                {exportedFiles.map((file, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm font-medium block truncate">{file.fileName}</span>
                        {file.fileSize && (
                          <span className="text-xs text-slate-400">
                            {file.fileSize > 1024 * 1024 
                              ? `${(file.fileSize / 1024 / 1024).toFixed(1)} MB`
                              : `${(file.fileSize / 1024).toFixed(1)} KB`
                            }
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      <LanguageText en="Download" zh="下载" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="outline">
          <a href={rfqUrl}>
            <LanguageText en="Add to RFQ" zh="添加到 RFQ" />
          </a>
        </Button>
      </div>
    </section>
  );
}

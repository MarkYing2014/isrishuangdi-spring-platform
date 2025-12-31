"use client";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings2 } from "lucide-react";

import { type PlatformModules, PlatformSpringType } from "@/lib/spring-platform/types";

// ============================================================================
// Types
// ============================================================================

interface ModuleSelectorProps {
  /** Spring type to determine which modules to show */
  springType: PlatformSpringType;
  /** Current module settings */
  modules: PlatformModules;
  /** Callback when modules change */
  onModulesChange: (modules: PlatformModules) => void;
  /** Compact mode (inline checkboxes) */
  compact?: boolean;
}

interface ModuleItem {
  key: keyof PlatformModules;
  label: string;
  labelEn: string;
  isAdvanced?: boolean;
  canDisable: boolean;
  showFor?: PlatformSpringType[];
}

const MODULE_ITEMS: ModuleItem[] = [
  { key: "basicGeometry", label: "基础几何", labelEn: "Geometry", canDisable: false },
  { key: "loadAnalysis", label: "负荷分析", labelEn: "Load Analysis", canDisable: true },
  { key: "stressAnalysis", label: "应力校核", labelEn: "Stress Check", canDisable: true },
  { key: "solidAnalysis", label: "压并分析", labelEn: "Solid Analysis", canDisable: true, showFor: ["compression", "conical"] },
  { key: "hookAnalysis", label: "钩子分析", labelEn: "Hook Analysis", canDisable: true, showFor: ["extension"] },
  { key: "legAnalysis", label: "支撑臂分析", labelEn: "Leg Analysis", canDisable: true, showFor: ["torsion"] },
  { key: "fatigueAnalysis", label: "疲劳分析", labelEn: "Fatigue", isAdvanced: true, canDisable: true },
  { key: "dynamics", label: "动态频率", labelEn: "Dynamics", isAdvanced: true, canDisable: true },
];

export const DEFAULT_PLATFORM_MODULES: PlatformModules = {
  basicGeometry: true,
  loadAnalysis: true,
  stressAnalysis: true,
  solidAnalysis: true,
  hookAnalysis: true,
  legAnalysis: true,
  fatigueAnalysis: false,
  dynamics: false,
};

// ============================================================================
// Main Component
// ============================================================================

export function ModuleSelector({
  springType,
  modules,
  onModulesChange,
  compact = false,
}: ModuleSelectorProps) {
  const handleToggle = (key: keyof PlatformModules) => {
    if (key === "basicGeometry") return;
    
    onModulesChange({
      ...modules,
      [key]: !modules[key] as any,
    });
  };

  const visibleItems = MODULE_ITEMS.filter(item => !item.showFor || item.showFor.includes(springType));
  
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 items-center">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        {visibleItems.map((item) => (
          <label 
            key={item.key}
            className={`flex items-center gap-1 text-xs cursor-pointer ${
              !item.canDisable ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={!!modules[item.key]}
              onChange={() => handleToggle(item.key)}
              disabled={!item.canDisable}
              className="h-3 w-3"
            />
            <span>{item.label} / {item.labelEn}</span>
            {item.isAdvanced && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">高级</Badge>
            )}
          </label>
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">显示模块 / Display Modules</Label>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {visibleItems.map((item) => (
          <label 
            key={item.key}
            className={`flex items-center gap-2 p-2 rounded-md border text-sm cursor-pointer transition-colors ${
              modules[item.key] 
                ? "bg-primary/10 border-primary/50" 
                : "bg-muted/30 border-transparent"
            } ${!item.canDisable ? "opacity-70 cursor-not-allowed" : "hover:bg-muted"}`}
          >
            <input
              type="checkbox"
              checked={!!modules[item.key]}
              onChange={() => handleToggle(item.key)}
              disabled={!item.canDisable}
              className="h-4 w-4"
            />
            <span className="flex-1">
                {item.label} / {item.labelEn}
            </span>
            {item.isAdvanced && (
              <Badge variant="secondary" className="text-[10px]">高级</Badge>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

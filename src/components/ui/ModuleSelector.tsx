"use client";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings2 } from "lucide-react";

import { type DisplayModules, DEFAULT_MODULES } from "@/lib/compressionSpringMultiPoint";

// ============================================================================
// Types
// ============================================================================

interface ModuleSelectorProps {
  /** Current module settings */
  modules: DisplayModules;
  /** Callback when modules change */
  onModulesChange: (modules: DisplayModules) => void;
  /** Compact mode (inline checkboxes) */
  compact?: boolean;
}

interface ModuleItem {
  key: keyof DisplayModules;
  label: string;
  labelEn: string;
  isAdvanced?: boolean;
  canDisable: boolean;
}

const MODULE_ITEMS: ModuleItem[] = [
  { key: "geometry", label: "基础几何", labelEn: "Geometry", canDisable: false },
  { key: "loadAnalysis", label: "负荷分析", labelEn: "Load Analysis", canDisable: true },
  { key: "stressCheck", label: "应力校核", labelEn: "Stress Check", canDisable: true },
  { key: "solidAnalysis", label: "压并分析", labelEn: "Solid Analysis", canDisable: true },
  { key: "fatigue", label: "疲劳分析", labelEn: "Fatigue", isAdvanced: true, canDisable: true },
  { key: "dynamics", label: "动态频率", labelEn: "Dynamics", isAdvanced: true, canDisable: true },
];

// ============================================================================
// Main Component
// ============================================================================

export function ModuleSelector({
  modules,
  onModulesChange,
  compact = false,
}: ModuleSelectorProps) {
  const handleToggle = (key: keyof DisplayModules) => {
    // Geometry cannot be disabled
    if (key === "geometry") return;
    
    onModulesChange({
      ...modules,
      [key]: !modules[key],
    });
  };
  
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 items-center">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        {MODULE_ITEMS.map((item) => (
          <label 
            key={item.key}
            className={`flex items-center gap-1 text-xs cursor-pointer ${
              !item.canDisable ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={modules[item.key]}
              onChange={() => handleToggle(item.key)}
              disabled={!item.canDisable}
              className="h-3 w-3"
            />
            <span>{item.label}</span>
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
        {MODULE_ITEMS.map((item) => (
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
              checked={modules[item.key]}
              onChange={() => handleToggle(item.key)}
              disabled={!item.canDisable}
              className="h-4 w-4"
            />
            <span className="flex-1">{item.label}</span>
            {item.isAdvanced && (
              <Badge variant="secondary" className="text-[10px]">高级</Badge>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

export { DEFAULT_MODULES };

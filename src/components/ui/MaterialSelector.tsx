"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  type SpringMaterial,
  SPRING_MATERIALS,
  getSpringMaterial as getMaterialById,
} from "@/lib/materials/springMaterials";

/**
 * Group materials by category for display
 */
export function getGroupedMaterials(): Record<string, SpringMaterial[]> {
  const materials = SPRING_MATERIALS;
  return {
    "碳素钢 / Carbon Steel": materials.filter(m => m.id === "65Mn" || m.id === "music_wire_a228" || m.id === "oil_tempered"),
    "合金钢 / Alloy Steel": materials.filter(m => m.id === "60Si2Mn" || m.id === "chrome_silicon" || m.id === "chrome_vanadium"),
    "不锈钢 / Stainless Steel": materials.filter(m => m.id === "ss_302" || m.id === "sus304" || m.id === "sus316"),
    "其他 / Others": materials.filter(m => ["phosphor_bronze", "swpb", "custom"].includes(m.id)),
  };
}

// ============================================================================
// Types
// ============================================================================

interface MaterialSelectorProps {
  /** Selected material ID */
  selectedId: string;
  /** Callback when material changes */
  onMaterialChange: (material: SpringMaterial) => void;
  /** Wire diameter d (for calculation of allowable stress) */
  d?: number;
}

// ============================================================================
// Main Component
// ============================================================================

export function MaterialSelector({
  selectedId,
  onMaterialChange,
  d = 2,
}: MaterialSelectorProps) {
  const groupedMaterials = useMemo(() => getGroupedMaterials(), []);
  const selectedMaterial = useMemo(() => getMaterialById(selectedId as any), [selectedId]);

  const handleValueChange = (value: string) => {
    const material = getMaterialById(value as any);
    if (material) {
      onMaterialChange(material);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">弹簧材料 / Spring Material</Label>
        {selectedMaterial && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help hover:text-primary transition-colors">
                  <Info className="h-3 w-3" />
                  <span>详情 / Details</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3 space-y-2">
                <div className="font-semibold">{selectedMaterial.nameZh} / {selectedMaterial.nameEn}</div>
                <div className="text-xs grid grid-cols-2 gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">应力 / τ_allow:</span>
                  <span>{selectedMaterial.allowShearStatic} MPa</span>
                  <span className="text-muted-foreground">刚性 / G:</span>
                  <span>{selectedMaterial.shearModulus} MPa</span>
                  <span className="text-muted-foreground">密度 / Density:</span>
                  <span>{selectedMaterial.density} kg/m³</span>
                </div>
                {selectedMaterial.notes && (
                  <div className="text-[10px] text-muted-foreground italic border-t pt-1">
                    {selectedMaterial.notes}
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <Select value={selectedId} onValueChange={handleValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="选择材料 / Select Material" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(groupedMaterials).map(([groupName, materials]) => (
            <SelectGroup key={groupName}>
              <SelectLabel className="text-xs bg-muted/50 py-1">{groupName}</SelectLabel>
              {materials.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-sm">
                  <div className="flex items-center justify-between w-full gap-4">
                    <span>{m.nameZh} / {m.id}</span>
                    <span className="text-[10px] text-muted-foreground">G={m.shearModulus}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

"use client";

import { 
  SPRING_MATERIALS, 
  type SpringMaterialId,
  type SpringMaterial,
  getSpringMaterial,
} from "@/lib/materials/springMaterials";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MaterialSelectorProps {
  value: SpringMaterialId;
  onChange: (material: SpringMaterial) => void;
  disabled?: boolean;
  showDetails?: boolean;
}

/**
 * Material selector dropdown for spring calculators
 * 弹簧计算器的材料选择器下拉框
 */
export function MaterialSelector({ 
  value, 
  onChange, 
  disabled = false,
  showDetails = true,
}: MaterialSelectorProps) {
  const selectedMaterial = getSpringMaterial(value);

  const handleChange = (newValue: string) => {
    const material = getSpringMaterial(newValue as SpringMaterialId);
    if (material) {
      onChange(material);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Material / 材料</Label>
      <Select value={value} onValueChange={handleChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select material..." />
        </SelectTrigger>
        <SelectContent>
          {SPRING_MATERIALS.map((material) => (
            <SelectItem key={material.id} value={material.id}>
              <div className="flex flex-col">
                <span>{material.nameEn}</span>
                <span className="text-xs text-muted-foreground">{material.nameZh}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showDetails && selectedMaterial && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs">
          <div className="grid grid-cols-2 gap-1">
            <span className="text-muted-foreground">G (MPa):</span>
            <span className="font-medium">{selectedMaterial.shearModulus.toLocaleString()}</span>
            <span className="text-muted-foreground">τ_allow (MPa):</span>
            <span className="font-medium">{selectedMaterial.allowShearStatic}</span>
            {selectedMaterial.standard && (
              <>
                <span className="text-muted-foreground">Standard:</span>
                <span className="font-medium">{selectedMaterial.standard}</span>
              </>
            )}
          </div>
          {selectedMaterial.notes && (
            <p className="mt-1 text-muted-foreground border-t pt-1">
              {selectedMaterial.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

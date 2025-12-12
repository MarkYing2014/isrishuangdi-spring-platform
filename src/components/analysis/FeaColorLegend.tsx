"use client";

import { useMemo } from "react";
import { useFeaStore } from "@/lib/stores/feaStore";
import { getFeaMinMax, type FeaColorMode } from "@/lib/fea/feaTypes";

interface FeaColorLegendProps {
  allowableStress?: number;
  className?: string;
}

/**
 * Vertical color legend for FEA visualization
 * Shows the color scale with min/max values and units
 */
export function FeaColorLegend({ allowableStress, className }: FeaColorLegendProps) {
  const feaResult = useFeaStore((s) => s.feaResult);
  const colorMode = useFeaStore((s) => s.colorMode);

  const isFeaMode = colorMode !== "formula" && feaResult !== null;

  const { min, max, title, unit } = useMemo(() => {
    if (!feaResult || colorMode === "formula") {
      return { min: 0, max: 0, title: "", unit: "" };
    }

    const { min: minVal, max: maxVal } = getFeaMinMax(
      feaResult.nodes,
      colorMode,
      allowableStress
    );

    let title = "";
    let unit = "";
    switch (colorMode) {
      case "fea_sigma":
        title = "FEA σ_vm";
        unit = "MPa";
        break;
      case "fea_disp":
        title = "FEA |u|";
        unit = "mm";
        break;
      case "fea_sf":
        title = "安全系数";
        unit = "";
        break;
    }

    return { min: minVal, max: maxVal, title, unit };
  }, [feaResult, colorMode, allowableStress]);

  if (!isFeaMode) {
    return null;
  }

  return (
    <div className={`flex flex-col items-center gap-1 ${className || ""}`}>
      {/* Title */}
      <div className="text-xs font-medium text-muted-foreground whitespace-nowrap">
        {title} {unit && `(${unit})`}
      </div>

      {/* Max value */}
      <div className="text-xs font-mono text-red-500">
        {max.toFixed(1)}
      </div>

      {/* Gradient bar */}
      <div
        className="w-4 h-32 rounded-sm border border-border"
        style={{
          background: "linear-gradient(to bottom, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff)",
        }}
      />

      {/* Min value */}
      <div className="text-xs font-mono text-blue-500">
        {min.toFixed(1)}
      </div>

      {/* Allowable stress marker (optional) */}
      {colorMode === "fea_sigma" && allowableStress && (
        <div className="mt-2 text-xs text-muted-foreground">
          <span className="text-yellow-500">—</span> σ_allow: {allowableStress.toFixed(0)}
        </div>
      )}
    </div>
  );
}

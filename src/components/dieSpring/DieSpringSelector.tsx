"use client";

/**
 * Die Spring Catalog Selector - OEM-Style Selection Workflow
 * 模具弹簧目录选择器 - OEM风格选择流程
 * 
 * Selection workflow:
 * 1. Select Series (ISO 10243 / Raymond)
 * 2. Select Size (OD × L0)
 * 3. Select Duty (LD/MD/HD/XHD)
 * 4. Select Life Target (SHORT/NORMAL/LONG)
 * 
 * ⚠️ Geometry fields are READ-ONLY after selection.
 */

import { useState, useMemo, useCallback } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  DieSpringSpec,
  DieSpringSeries,
  DieSpringDutyClass,
  DieSpringLifeClass,
  SERIES_INFO,
  DUTY_CLASS_INFO,
  LIFE_CLASS_INFO,
  COLOR_HEX,
} from "@/lib/dieSpring/types";
import {
  getAvailableSizes,
  getAvailableDuties,
  getDieSpring,
  getDieSpringColorHex,
} from "@/lib/dieSpring/catalog";

// ============================================================================
// PROPS
// ============================================================================

export interface DieSpringSelection {
  spec: DieSpringSpec | null;
  lifeClass: DieSpringLifeClass;
  series: DieSpringSeries;
  outerDiameter: number | null;
  freeLength: number | null;
  duty: DieSpringDutyClass | null;
}

export interface DieSpringOnChange {
  (selection: DieSpringSelection): void;
}

export interface DieStringSelectorProps {
  /** Current selection state */
  value?: DieSpringSelection;
  /** Change callback */
  onChange?: DieSpringOnChange;
  /** Language preference */
  isZh?: boolean;
  /** Disable editing (view only) */
  disabled?: boolean;
  /** Show compact layout */
  compact?: boolean;
}

// ============================================================================
// DEFAULT STATE
// ============================================================================

const DEFAULT_SELECTION: DieSpringSelection = {
  spec: null,
  lifeClass: "NORMAL",
  series: "ISO_10243",
  outerDiameter: null,
  freeLength: null,
  duty: null,
};

// ============================================================================
// COMPONENT
// ============================================================================

export function DieSpringSelector({
  value = DEFAULT_SELECTION,
  onChange,
  isZh = false,
  disabled = false,
  compact = false,
}: DieStringSelectorProps) {
  const [selection, setSelection] = useState<DieSpringSelection>(value);

  // Update internal state when prop changes
  useMemo(() => {
    if (value !== selection) {
      setSelection(value);
    }
  }, [value]);

  // Get available sizes for current series
  const availableSizes = useMemo(() => {
    return getAvailableSizes(selection.series);
  }, [selection.series]);

  // Get available duties for current size
  const availableDuties = useMemo(() => {
    if (selection.outerDiameter && selection.freeLength) {
      return getAvailableDuties(selection.series, selection.outerDiameter, selection.freeLength);
    }
    return [];
  }, [selection.series, selection.outerDiameter, selection.freeLength]);

  // Update selection and notify parent
  const updateSelection = useCallback((update: Partial<DieSpringSelection>) => {
    const newSelection = { ...selection, ...update };
    
    // Auto-resolve spec when all criteria are set
    if (newSelection.outerDiameter && newSelection.freeLength && newSelection.duty) {
      newSelection.spec = getDieSpring(
        newSelection.series,
        newSelection.outerDiameter,
        newSelection.freeLength,
        newSelection.duty
      ) ?? null;
    } else {
      newSelection.spec = null;
    }

    setSelection(newSelection);
    onChange?.(newSelection);
  }, [selection, onChange]);

  // Handle series change - reset size and duty
  const handleSeriesChange = useCallback((seriesValue: string) => {
    updateSelection({
      series: seriesValue as DieSpringSeries,
      outerDiameter: null,
      freeLength: null,
      duty: null,
      spec: null,
    });
  }, [updateSelection]);

  // Handle size change - reset duty
  const handleSizeChange = useCallback((sizeValue: string) => {
    const [od, l0] = sizeValue.split("x").map(Number);
    updateSelection({
      outerDiameter: od,
      freeLength: l0,
      duty: null,
      spec: null,
    });
  }, [updateSelection]);

  // Handle duty change
  const handleDutyChange = useCallback((dutyValue: string) => {
    updateSelection({
      duty: dutyValue as DieSpringDutyClass,
    });
  }, [updateSelection]);

  // Handle life class change
  const handleLifeClassChange = useCallback((lifeValue: string) => {
    updateSelection({
      lifeClass: lifeValue as DieSpringLifeClass,
    });
  }, [updateSelection]);

  // Current size key for Select value
  const currentSizeKey = selection.outerDiameter && selection.freeLength
    ? `${selection.outerDiameter}x${selection.freeLength}`
    : undefined;

  // Labels
  const t = {
    series: isZh ? "标准系列" : "Series",
    size: isZh ? "尺寸" : "Size",
    duty: isZh ? "负载等级" : "Duty",
    lifeTarget: isZh ? "寿命目标" : "Life Target",
    selectSeries: isZh ? "选择系列" : "Select series",
    selectSize: isZh ? "选择尺寸" : "Select size",
    selectDuty: isZh ? "选择负载" : "Select duty",
    selectLife: isZh ? "选择寿命" : "Select life",
    noSizesAvailable: isZh ? "无可用尺寸" : "No sizes available",
    catalogLocked: isZh ? "目录锁定" : "Catalog Locked",
    selected: isZh ? "已选择" : "Selected",
  };

  // Render compact layout
  if (compact) {
    return (
      <div className="flex flex-wrap gap-3">
        {/* Series Select */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">{t.series}</Label>
          <Select
            value={selection.series}
            onValueChange={handleSeriesChange}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder={t.selectSeries} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SERIES_INFO).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  {isZh ? info.name.zh : info.name.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Size Select */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">{t.size}</Label>
          <Select
            value={currentSizeKey}
            onValueChange={handleSizeChange}
            disabled={disabled || availableSizes.length === 0}
          >
            <SelectTrigger className="h-8 w-[100px] text-xs">
              <SelectValue placeholder={t.selectSize} />
            </SelectTrigger>
            <SelectContent>
              {availableSizes.map((size) => (
                <SelectItem 
                  key={`${size.outerDiameter}x${size.freeLength}`} 
                  value={`${size.outerDiameter}x${size.freeLength}`}
                >
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Duty Select */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">{t.duty}</Label>
          <Select
            value={selection.duty ?? undefined}
            onValueChange={handleDutyChange}
            disabled={disabled || availableDuties.length === 0}
          >
            <SelectTrigger className="h-8 w-[100px] text-xs">
              <SelectValue placeholder={t.selectDuty} />
            </SelectTrigger>
            <SelectContent>
              {availableDuties.map((duty) => {
                const dutyInfo = getSeriesDutyDef(selection.series, duty);
                return (
                  <SelectItem key={duty} value={duty}>
                    <span className="flex items-center gap-2">
                      <span 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: COLOR_HEX[dutyInfo.colorCode as DieSpringColorCode] }}
                      />
                      {isZh ? dutyInfo.displayName.zh : dutyInfo.displayName.en}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Life Class Select */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">{t.lifeTarget}</Label>
          <Select
            value={selection.lifeClass}
            onValueChange={handleLifeClassChange}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-[100px] text-xs">
              <SelectValue placeholder={t.selectLife} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LIFE_CLASS_INFO).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  {isZh ? info.name.zh : info.name.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  // Render full layout
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Series Select */}
      <div className="space-y-2">
        <Label>{t.series}</Label>
        <Select
          value={selection.series}
          onValueChange={handleSeriesChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder={t.selectSeries} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>
                {isZh ? "选择标准" : "Select Standard"}
              </SelectLabel>
              {Object.entries(SERIES_INFO).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  {isZh ? info.name.zh : info.name.en}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {isZh 
            ? SERIES_INFO[selection.series].description.zh 
            : SERIES_INFO[selection.series].description.en
          }
        </p>
      </div>

      {/* Size Select */}
      <div className="space-y-2">
        <Label>{t.size}</Label>
        <Select
          value={currentSizeKey}
          onValueChange={handleSizeChange}
          disabled={disabled || availableSizes.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={availableSizes.length === 0 ? t.noSizesAvailable : t.selectSize} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>
                {isZh ? "外径 × 自由长度" : "OD × Free Length"}
              </SelectLabel>
              {availableSizes.map((size) => (
                <SelectItem 
                  key={`${size.outerDiameter}x${size.freeLength}`} 
                  value={`${size.outerDiameter}x${size.freeLength}`}
                >
                  {size.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {isZh ? "选择弹簧尺寸规格" : "Select spring size specification"}
        </p>
      </div>

      {/* Duty Select */}
      <div className="space-y-2">
        <Label>{t.duty}</Label>
        <Select
          value={selection.duty ?? undefined}
          onValueChange={handleDutyChange}
          disabled={disabled || availableDuties.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={t.selectDuty} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>
                {isZh ? "负载等级" : "Load Rating"}
              </SelectLabel>
              {availableDuties.map((duty) => {
                const dutyInfo = getSeriesDutyDef(selection.series, duty);
                return (
                  <SelectItem key={duty} value={duty}>
                    <span className="flex items-center gap-2">
                      <span 
                        className="w-3 h-3 rounded-full border" 
                        style={{ backgroundColor: COLOR_HEX[dutyInfo.colorCode as DieSpringColorCode] }}
                      />
                      <span>{isZh ? dutyInfo.displayName.zh : dutyInfo.displayName.en}</span>
                      <span className="text-muted-foreground">({DUTY_CLASS_INFO[duty].abbreviation})</span>
                    </span>
                  </SelectItem>
                );
              })}
            </SelectGroup>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {selection.spec
            ? `k = ${selection.spec.springRate} N/mm`
            : isZh ? "选择颜色/负载等级" : "Select color/load class"
          }
        </p>
      </div>

      {/* Life Class Select */}
      <div className="space-y-2">
        <Label>{t.lifeTarget}</Label>
        <Select
          value={selection.lifeClass}
          onValueChange={handleLifeClassChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder={t.selectLife} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>
                {isZh ? "寿命目标" : "Life Target"}
              </SelectLabel>
              {Object.entries(LIFE_CLASS_INFO).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <span>{isZh ? info.name.zh : info.name.en}</span>
                    <span className="text-muted-foreground text-xs">
                      ({info.typicalCycles} {isZh ? "次" : "cycles"})
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {isZh 
            ? LIFE_CLASS_INFO[selection.lifeClass].description.zh 
            : LIFE_CLASS_INFO[selection.lifeClass].description.en
          }
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

import { DieSpringColorCode } from "@/lib/dieSpring/types";

/**
 * Get series-specific duty definition (color, name)
 */
function getSeriesDutyDef(series: DieSpringSeries, duty: DieSpringDutyClass) {
  const supported = SERIES_INFO[series].supportedDuties;
  
  // Find mapped logic duty
  const match = supported.find(d => d.legacyDuty === duty);
  if (match) return match;

  // Fallback (should not happen if catalog is consistent)
  return {
    dutyId: duty,
    displayName: DUTY_CLASS_INFO[duty]?.name ?? { en: duty, zh: duty },
    colorCode: "green" // Safe fallback
  };
}

export default DieSpringSelector;

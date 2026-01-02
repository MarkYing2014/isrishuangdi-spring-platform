"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Shield, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import {
  EngineeringRequirements,
  DEFAULT_ENGINEERING_REQUIREMENTS,
  TOLERANCE_GRADE_LABELS,
  CLEARANCE_CLASS_LABELS,
  SURFACE_FINISH_LABELS,
  CORROSION_CLASS_LABELS,
  CYCLE_CLASS_LABELS,
  TEMPERATURE_RANGE_LABELS,
  ToleranceGrade,
  ClearanceClass,
  SurfaceFinish,
  CorrosionClass,
  CycleClass,
  TemperatureRange,
  GuideType,
  SeatCondition,
  HumidityClass,
  ChemicalExposure
} from "@/lib/audit/engineeringRequirements";

import { DeliverabilityAudit, AuditStatus } from "@/lib/audit/types";

interface EngineeringRequirementsPanelProps {
  className?: string;
  language: "en" | "zh";
  value: EngineeringRequirements;
  onChange: (requirements: EngineeringRequirements) => void;
  deliverabilityAudit?: DeliverabilityAudit;
  readOnly?: boolean;
}

/**
 * Selection dropdown component with bilingual support
 */
function SelectField<T extends string>({
  label,
  labelZh,
  value,
  options,
  onChange,
  isZh,
  disabled
}: {
  label: string;
  labelZh: string;
  value: T | undefined;
  options: { value: T; labelEn: string; labelZh: string; extra?: string }[];
  onChange: (val: T) => void;
  isZh: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-500">{isZh ? labelZh : label}</Label>
      <select
        className="flex h-8 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        value={value || ""}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {isZh ? opt.labelZh : opt.labelEn}
            {opt.extra ? ` (${opt.extra})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Section header with status indicator
 */
function SectionHeader({
  title,
  titleZh,
  icon: Icon,
  status,
  isZh
}: {
  title: string;
  titleZh: string;
  icon: typeof AlertTriangle;
  status?: AuditStatus;
  isZh: boolean;
}) {
  const statusColors: Record<AuditStatus, string> = {
    PASS: "bg-green-500",
    WARN: "bg-yellow-500",
    FAIL: "bg-red-500",
    INFO: "bg-blue-500"
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-500" />
        <h4 className="text-sm font-semibold text-slate-700">{isZh ? titleZh : title}</h4>
      </div>
      {status && (
        <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
      )}
    </div>
  );
}

export function EngineeringRequirementsPanel({
  className,
  language,
  value,
  onChange,
  deliverabilityAudit,
  readOnly = false
}: EngineeringRequirementsPanelProps) {
  const isZh = language === "zh";
  const [isOpen, setIsOpen] = useState(false);

  // Helper to update nested properties
  const updateTolerance = (field: string, val: any) => {
    onChange({
      ...value,
      tolerances: { ...value.tolerances, [field]: val }
    });
  };

  const updateAssembly = (field: string, val: any) => {
    onChange({
      ...value,
      assembly: { ...value.assembly, [field]: val }
    });
  };

  const updateSurface = (field: string, val: any) => {
    onChange({
      ...value,
      surface: { ...value.surface, [field]: val }
    });
  };

  const updateEnvironment = (field: string, val: any) => {
    onChange({
      ...value,
      environment: { ...value.environment, [field]: val }
    });
  };

  const updateLifespan = (field: string, val: any) => {
    onChange({
      ...value,
      lifespan: { ...value.lifespan, [field]: val }
    });
  };

  // Derive section statuses from findings
  const getSectionStatus = (category: string): AuditStatus | undefined => {
    if (!deliverabilityAudit) return undefined;
    const findings = deliverabilityAudit.findings.filter(f => f.category === category);
    if (findings.some(f => f.severity === "FAIL")) return "FAIL";
    if (findings.some(f => f.severity === "WARN")) return "WARN";
    if (findings.length > 0) return "INFO";
    return "PASS";
  };

  // Overall status badge
  const renderOverallStatus = () => {
    if (!deliverabilityAudit) return null;
    
    const { status, level } = deliverabilityAudit;
    const levelLabels = {
      STANDARD: { en: "Standard", zh: "标准" },
      CHALLENGING: { en: "Challenging", zh: "有挑战" },
      HIGH_RISK: { en: "High Risk", zh: "高风险" }
    };
    
    const statusColors = {
      PASS: "bg-green-100 text-green-800 border-green-200",
      WARN: "bg-yellow-100 text-yellow-800 border-yellow-200",
      FAIL: "bg-red-100 text-red-800 border-red-200",
      INFO: "bg-blue-100 text-blue-800 border-blue-200"
    };

    return (
      <Badge className={`${statusColors[status]} border font-medium`}>
        {isZh ? levelLabels[level].zh : levelLabels[level].en}
      </Badge>
    );
  };

  return (
    <div className={className}>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader 
          className="cursor-pointer hover:bg-slate-50/50 transition-colors py-3"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold">
                {isZh ? "工程要求 / 交付性约束" : "Engineering Requirements / Deliverability"}
              </CardTitle>
              {renderOverallStatus()}
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          {!isOpen && (
            <p className="text-[10px] text-slate-400 mt-1">
              {isZh 
                ? "公差、装配、表面处理、环境与寿命要求（不影响计算）" 
                : "Tolerances, assembly, surface, environment & lifespan (does not affect calculations)"}
            </p>
          )}
        </CardHeader>

        {isOpen && (
          <CardContent className="pt-0 space-y-4">
            {/* Warning Notice */}
            <div className="flex items-start gap-2 p-2 bg-blue-50/50 border border-blue-100 rounded text-[10px] text-blue-700">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                {isZh 
                  ? "这些要求仅用于交付性审核，不会影响应力、刚度或其他计算结果。" 
                  : "These requirements are for deliverability audit only. They do NOT affect stress, stiffness, or other calculations."}
              </span>
            </div>

            {/* Section 1: Tolerances */}
            <div className="space-y-2">
              <SectionHeader 
                title="Dimensional Tolerances" 
                titleZh="尺寸公差" 
                icon={AlertTriangle}
                status={getSectionStatus("tolerance")}
                isZh={isZh}
              />
              <div className="grid grid-cols-2 gap-2 pl-6">
                <SelectField<ToleranceGrade>
                  label="Wire Diameter"
                  labelZh="线径公差"
                  value={value.tolerances?.wireDiameter}
                  options={Object.entries(TOLERANCE_GRADE_LABELS).map(([k, v]) => ({
                    value: k as ToleranceGrade,
                    labelEn: v.en,
                    labelZh: v.zh
                  }))}
                  onChange={(v) => updateTolerance("wireDiameter", v)}
                  isZh={isZh}
                  disabled={readOnly}
                />
                <SelectField<ToleranceGrade>
                  label="Coil Diameter"
                  labelZh="圈径公差"
                  value={value.tolerances?.coilDiameter}
                  options={Object.entries(TOLERANCE_GRADE_LABELS).map(([k, v]) => ({
                    value: k as ToleranceGrade,
                    labelEn: v.en,
                    labelZh: v.zh
                  }))}
                  onChange={(v) => updateTolerance("coilDiameter", v)}
                  isZh={isZh}
                  disabled={readOnly}
                />
                <SelectField<"±10%" | "±5%" | "±3%" | "±1.5%">
                  label="Load Tolerance"
                  labelZh="载荷公差"
                  value={value.tolerances?.loadTolerance}
                  options={[
                    { value: "±10%", labelEn: "±10%", labelZh: "±10%" },
                    { value: "±5%", labelEn: "±5%", labelZh: "±5%" },
                    { value: "±3%", labelEn: "±3%", labelZh: "±3%" },
                    { value: "±1.5%", labelEn: "±1.5% (Tight)", labelZh: "±1.5% (严格)" }
                  ]}
                  onChange={(v) => updateTolerance("loadTolerance", v)}
                  isZh={isZh}
                  disabled={readOnly}
                />
              </div>
            </div>

            <Separator />

            {/* Section 2: Assembly */}
            <div className="space-y-2">
              <SectionHeader 
                title="Assembly Fit" 
                titleZh="装配配合" 
                icon={AlertTriangle}
                status={getSectionStatus("assembly")}
                isZh={isZh}
              />
              <div className="grid grid-cols-2 gap-2 pl-6">
                <SelectField<GuideType>
                  label="Guide Type"
                  labelZh="导向方式"
                  value={value.assembly?.guideType}
                  options={[
                    { value: "NONE", labelEn: "None", labelZh: "无导向" },
                    { value: "ROD", labelEn: "Guide Rod", labelZh: "导杆" },
                    { value: "BORE", labelEn: "Guide Bore", labelZh: "导孔" }
                  ]}
                  onChange={(v) => updateAssembly("guideType", v)}
                  isZh={isZh}
                  disabled={readOnly}
                />
                <SelectField<ClearanceClass>
                  label="Clearance Class"
                  labelZh="间隙等级"
                  value={value.assembly?.clearanceClass}
                  options={Object.entries(CLEARANCE_CLASS_LABELS).map(([k, v]) => ({
                    value: k as ClearanceClass,
                    labelEn: v.en,
                    labelZh: v.zh,
                    extra: v.range
                  }))}
                  onChange={(v) => updateAssembly("clearanceClass", v)}
                  isZh={isZh}
                  disabled={readOnly}
                />
                <SelectField<SeatCondition>
                  label="Seat Condition"
                  labelZh="支座条件"
                  value={value.assembly?.seatCondition}
                  options={[
                    { value: "FLAT", labelEn: "Flat", labelZh: "平面" },
                    { value: "TAPERED", labelEn: "Tapered", labelZh: "锥面" },
                    { value: "FLOATING", labelEn: "Floating", labelZh: "浮动" },
                    { value: "POCKET", labelEn: "Pocket", labelZh: "座槽" }
                  ]}
                  onChange={(v) => updateAssembly("seatCondition", v)}
                  isZh={isZh}
                  disabled={readOnly}
                />
              </div>
            </div>

            <Separator />

            {/* Section 3: Surface Treatment */}
            <div className="space-y-2">
              <SectionHeader 
                title="Surface Treatment" 
                titleZh="表面处理" 
                icon={AlertTriangle}
                status={getSectionStatus("surface")}
                isZh={isZh}
              />
              <div className="grid grid-cols-2 gap-2 pl-6">
                <SelectField<SurfaceFinish>
                  label="Surface Finish"
                  labelZh="表面处理"
                  value={value.surface?.finish}
                  options={Object.entries(SURFACE_FINISH_LABELS).map(([k, v]) => ({
                    value: k as SurfaceFinish,
                    labelEn: v.en,
                    labelZh: v.zh
                  }))}
                  onChange={(v) => updateSurface("finish", v)}
                  isZh={isZh}
                  disabled={readOnly}
                />
                <SelectField<CorrosionClass>
                  label="Corrosion Class"
                  labelZh="防腐等级"
                  value={value.surface?.corrosionClass}
                  options={Object.entries(CORROSION_CLASS_LABELS).map(([k, v]) => ({
                    value: k as CorrosionClass,
                    labelEn: v.en,
                    labelZh: v.zh
                  }))}
                  onChange={(v) => updateSurface("corrosionClass", v)}
                  isZh={isZh}
                  disabled={readOnly}
                />
              </div>
            </div>

            <Separator />

            {/* Section 4: Environment */}
            <div className="space-y-2">
              <SectionHeader 
                title="Environment" 
                titleZh="环境要求" 
                icon={AlertTriangle}
                status={getSectionStatus("environment")}
                isZh={isZh}
              />
              <div className="grid grid-cols-2 gap-2 pl-6">
                <SelectField<TemperatureRange>
                  label="Temperature Range"
                  labelZh="温度范围"
                  value={value.environment?.operatingTempRange}
                  options={Object.entries(TEMPERATURE_RANGE_LABELS).map(([k, v]) => ({
                    value: k as TemperatureRange,
                    labelEn: v.en,
                    labelZh: v.zh,
                    extra: v.range
                  }))}
                  onChange={(v) => updateEnvironment("operatingTempRange", v)}
                  isZh={isZh}
                  disabled={readOnly}
                />
                <SelectField<HumidityClass>
                  label="Humidity"
                  labelZh="湿度条件"
                  value={value.environment?.humidity}
                  options={[
                    { value: "DRY", labelEn: "Dry", labelZh: "干燥" },
                    { value: "HUMID", labelEn: "Humid", labelZh: "潮湿" },
                    { value: "CONDENSING", labelEn: "Condensing", labelZh: "凝结" },
                    { value: "SUBMERGED", labelEn: "Submerged", labelZh: "浸没" }
                  ]}
                  onChange={(v) => updateEnvironment("humidity", v)}
                  isZh={isZh}
                  disabled={readOnly}
                />
                <SelectField<ChemicalExposure>
                  label="Chemical Exposure"
                  labelZh="化学接触"
                  value={value.environment?.chemicalExposure}
                  options={[
                    { value: "NONE", labelEn: "None", labelZh: "无" },
                    { value: "OIL", labelEn: "Oil", labelZh: "油类" },
                    { value: "COOLANT", labelEn: "Coolant", labelZh: "冷却液" },
                    { value: "BRAKE_FLUID", labelEn: "Brake Fluid", labelZh: "制动液" },
                    { value: "FUEL", labelEn: "Fuel", labelZh: "燃油" },
                    { value: "CORROSIVE", labelEn: "Corrosive", labelZh: "腐蚀性" }
                  ]}
                  onChange={(v) => updateEnvironment("chemicalExposure", v)}
                  isZh={isZh}
                  disabled={readOnly}
                />
              </div>
            </div>

            <Separator />

            {/* Section 5: Lifespan */}
            <div className="space-y-2">
              <SectionHeader 
                title="Lifespan Requirements" 
                titleZh="寿命要求" 
                icon={AlertTriangle}
                status={getSectionStatus("lifespan")}
                isZh={isZh}
              />
              <div className="grid grid-cols-2 gap-2 pl-6">
                <SelectField<CycleClass>
                  label="Cycle Class"
                  labelZh="循环等级"
                  value={value.lifespan?.cycleClass}
                  options={Object.entries(CYCLE_CLASS_LABELS).map(([k, v]) => ({
                    value: k as CycleClass,
                    labelEn: v.en,
                    labelZh: v.zh,
                    extra: v.range
                  }))}
                  onChange={(v) => updateLifespan("cycleClass", v)}
                  isZh={isZh}
                  disabled={readOnly}
                />
                <SelectField<"STANDARD" | "LOW_RELAX">
                  label="Relaxation Limit"
                  labelZh="松弛限制"
                  value={value.lifespan?.relaxationLimit}
                  options={[
                    { value: "STANDARD", labelEn: "Standard (≤5%)", labelZh: "标准 (≤5%)" },
                    { value: "LOW_RELAX", labelEn: "Low Relax (≤2%)", labelZh: "低松弛 (≤2%)" }
                  ]}
                  onChange={(v) => updateLifespan("relaxationLimit", v)}
                  isZh={isZh}
                  disabled={readOnly}
                />
              </div>
            </div>

            {/* Deliverability Findings */}
            {deliverabilityAudit && deliverabilityAudit.findings.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {isZh ? "交付性问题" : "Deliverability Findings"}
                  </h4>
                  <div className="space-y-1">
                    {deliverabilityAudit.findings.map((finding, i) => (
                      <div key={i} className={`flex items-start gap-2 p-2 rounded border text-xs ${
                        finding.severity === "FAIL" ? "bg-red-50 border-red-200" :
                        finding.severity === "WARN" ? "bg-yellow-50 border-yellow-200" :
                        "bg-blue-50 border-blue-200"
                      }`}>
                        {finding.severity === "FAIL" 
                          ? <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                          : finding.severity === "WARN"
                          ? <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 mt-0.5 shrink-0" />
                          : <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                        }
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-700">
                            {isZh ? finding.labelZh : finding.labelEn}
                          </div>
                          <div className="text-slate-500 text-[10px]">
                            {isZh ? finding.messageZh : finding.messageEn}
                          </div>
                          {finding.impact && (
                            <Badge variant="outline" className="mt-1 text-[9px] h-4">
                              {finding.impact}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Reset Button */}
            {!readOnly && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => onChange(DEFAULT_ENGINEERING_REQUIREMENTS)}
                >
                  {isZh ? "重置为默认" : "Reset to Default"}
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/language-context";

interface CurrentPointCardProps {
  deflection: number;
  force: number;
  springRate: number;
  springType: "compression" | "extension" | "conical";
  /** For extension springs: initial tension */
  initialTension?: number;
  /** For conical springs: active coils */
  activeCoils?: number;
  /** For conical springs: collapsed coils */
  collapsedCoils?: number;
}

export function CurrentPointCard({
  deflection,
  force,
  springRate,
  springType,
  initialTension,
  activeCoils,
  collapsedCoils,
}: CurrentPointCardProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const formatNumber = (value: number) => Number(value.toFixed(2)).toLocaleString();

  const getDeflectionLabel = () => {
    switch (springType) {
      case "extension":
        return isZh ? "伸长量 Δx" : "Extension Δx";
      case "compression":
      case "conical":
      default:
        return isZh ? "压缩量 Δx" : "Deflection Δx";
    }
  };

  return (
    <Card className="bg-slate-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{isZh ? "当前点" : "Current Point"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">{getDeflectionLabel()}</p>
            <p className="font-semibold text-blue-600">{formatNumber(deflection)} mm</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{isZh ? "载荷 F" : "Force F"}</p>
            <p className="font-semibold text-green-600">{formatNumber(force)} N</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{isZh ? "刚度 k" : "Spring Rate k"}</p>
            <p className="font-semibold">{formatNumber(springRate)} N/mm</p>
          </div>

          {/* Extension spring: show initial tension */}
          {springType === "extension" && initialTension !== undefined && (
            <div>
              <p className="text-xs text-muted-foreground">{isZh ? "初拉力 F₀" : "Initial Tension F₀"}</p>
              <p className="font-semibold text-purple-600">{formatNumber(initialTension)} N</p>
            </div>
          )}

          {/* Conical spring: show active/collapsed coils */}
          {springType === "conical" && activeCoils !== undefined && (
            <div>
              <p className="text-xs text-muted-foreground">{isZh ? "有效圈数" : "Active Coils"}</p>
              <p className="font-semibold text-blue-600">{activeCoils}</p>
            </div>
          )}
          {springType === "conical" && collapsedCoils !== undefined && (
            <div>
              <p className="text-xs text-muted-foreground">{isZh ? "贴底圈数" : "Collapsed"}</p>
              <p className="font-semibold text-slate-500">{collapsedCoils}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

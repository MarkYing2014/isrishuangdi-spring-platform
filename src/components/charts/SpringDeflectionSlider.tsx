"use client";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/language-context";

interface SpringDeflectionSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  labelEn?: string;
  labelZh?: string;
  step?: number;
}

export function SpringDeflectionSlider({
  min,
  max,
  value,
  onChange,
  labelEn = "Deflection Δx (mm)",
  labelZh = "位移 Δx (mm)",
  step = 0.1,
}: SpringDeflectionSliderProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  
  const handleChange = (values: number[]) => {
    onChange(values[0]);
  };

  return (
    <div className="space-y-3">
      <Label>{isZh ? labelZh : labelEn}</Label>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={handleChange}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min.toFixed(1)} mm</span>
        <span className="font-medium text-foreground">
          Δx = {value.toFixed(2)} mm
        </span>
        <span>{max.toFixed(1)} mm</span>
      </div>
    </div>
  );
}

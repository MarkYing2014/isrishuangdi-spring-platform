"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { calculateSpringRate } from "@/lib/springMath";
import { SpringDesign } from "@/lib/springTypes";
import { BasicScene } from "@/components/three/BasicScene";
import { SpringModel } from "@/components/three/SpringModel";
import { CoilerMachineScene } from "@/components/three/CoilerMachineScene";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULTS = {
  wireDiameter: 3.2,
  meanDiameter: 24,
  activeCoils: 8,
  totalCoils: 10,
  shearModulus: 79300,
  deflection: 10,
  pitch: 8,
  legTop: 12,
  legBottom: 8,
};

const formatNumber = (value: number) => Number(value.toFixed(2)).toLocaleString();

export default function SpringSimulatorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading Simulator...</div>}>
      <SimulatorContent />
    </Suspense>
  );
}

function SimulatorContent() {
  const searchParams = useSearchParams();
  const getParam = (key: string, fallback: number) => {
    const value = searchParams.get(key);
    const parsed = value ? Number(value) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const [wireDiameter, setWireDiameter] = useState(() => getParam("d", DEFAULTS.wireDiameter));
  const [meanDiameter, setMeanDiameter] = useState(() => getParam("Dm", DEFAULTS.meanDiameter));
  const [activeCoils, setActiveCoils] = useState(() => getParam("Na", DEFAULTS.activeCoils));
  const [totalCoils, setTotalCoils] = useState(() => getParam("Nt", DEFAULTS.totalCoils));
  const [shearModulus] = useState(() => getParam("G", DEFAULTS.shearModulus));
  const [deflection] = useState(() => getParam("dx", DEFAULTS.deflection));
  const [pitch, setPitch] = useState(() => getParam("pitch", DEFAULTS.pitch));
  const [legLengthTop, setLegLengthTop] = useState(() => getParam("legTop", DEFAULTS.legTop));
  const [legLengthBottom, setLegLengthBottom] = useState(() => getParam("legBottom", DEFAULTS.legBottom));
  const [topGround, setTopGround] = useState(true);
  const [bottomGround, setBottomGround] = useState(true);
  const [activeTab, setActiveTab] = useState<"spring" | "coiler">("spring");

  const design: SpringDesign = useMemo(
    () => ({
      type: "compression",
      wireDiameter,
      meanDiameter,
      activeCoils,
      shearModulus,
    }),
    [wireDiameter, meanDiameter, activeCoils, shearModulus],
  );

  const springRate = useMemo(() => calculateSpringRate(design), [design]);
  const freeLength = useMemo(
    () => activeCoils * pitch + legLengthTop + legLengthBottom,
    [activeCoils, pitch, legLengthTop, legLengthBottom],
  );

  const toStableParam = (value: number) => (Number.isFinite(value) ? Number(value.toFixed(6)).toString() : "");

  const calculatorParams = useMemo(() => {
    const params = new URLSearchParams({
      d: toStableParam(wireDiameter),
      Dm: toStableParam(meanDiameter),
      Na: toStableParam(activeCoils),
      G: toStableParam(shearModulus),
      dx: toStableParam(deflection),
    });
    return `/tools/calculator?${params.toString()}`;
  }, [wireDiameter, meanDiameter, activeCoils, shearModulus, deflection]);

  const forceTesterParams = useMemo(() => {
    const params = new URLSearchParams({
      k: toStableParam(springRate),
      L0: toStableParam(freeLength),
      dx: toStableParam(deflection),
    });
    return `/tools/force-tester?${params.toString()}`;
  }, [springRate, freeLength, deflection]);

  const handleNumber = (setter: (value: number) => void) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setter(Number.isFinite(value) ? value : 0);
  };

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">Module • Spring Simulator</p>
        <h1 className="text-3xl font-semibold tracking-tight">Spring Simulator</h1>
        <p className="text-muted-foreground">
          Adjust pitch, coil count, and foot lengths to preview stiffness and free length. React-three-fiber renders a
          parametric helix model. 将来会在此加入八爪机成型模拟组件。
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Parameter Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(
              [
                { label: "Wire Diameter d (mm)", value: wireDiameter, step: 0.05, setter: setWireDiameter },
                { label: "Mean Diameter Dm (mm)", value: meanDiameter, step: 0.1, setter: setMeanDiameter },
                { label: "Active Coils Na", value: activeCoils, step: 0.25, setter: setActiveCoils },
                { label: "Total Coils Nt", value: totalCoils, step: 0.5, setter: setTotalCoils },
                { label: "Pitch (mm)", value: pitch, step: 0.1, setter: setPitch },
                { label: "Leg Length Top (mm)", value: legLengthTop, step: 0.5, setter: setLegLengthTop },
                { label: "Leg Length Bottom (mm)", value: legLengthBottom, step: 0.5, setter: setLegLengthBottom },
              ] as const
            ).map((control) => (
              <div key={control.label} className="space-y-2">
                <Label>{control.label}</Label>
                <Input
                  type="number"
                  step={control.step}
                  value={control.value}
                  onChange={handleNumber(control.setter)}
                />
              </div>
            ))}

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={bottomGround}
                  onChange={(e) => setBottomGround(e.target.checked)}
                  className="size-4 rounded border-slate-300"
                />
                Bottom Ground
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={topGround}
                  onChange={(e) => setTopGround(e.target.checked)}
                  className="size-4 rounded border-slate-300"
                />
                Top Ground
              </label>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="flex items-center justify-between">
                <span>Spring Rate k</span>
                <strong>{formatNumber(springRate)} N/mm</strong>
              </p>
              <p className="mt-1 flex items-center justify-between">
                <span>Free Length L₀</span>
                <strong>{formatNumber(freeLength)} mm</strong>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button asChild variant="outline">
                <a href={calculatorParams}>Back to Calculator</a>
              </Button>
              <Button asChild>
                <a href={forceTesterParams}>Go to Force Tester</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>3D Preview</CardTitle>
              <div className="flex gap-2 text-xs">
                <Button
                  type="button"
                  variant={activeTab === "spring" ? "default" : "outline"}
                  onClick={() => setActiveTab("spring")}
                >
                  Spring Model
                </Button>
                <Button
                  type="button"
                  variant={activeTab === "coiler" ? "default" : "outline"}
                  onClick={() => setActiveTab("coiler")}
                >
                  Coiling Machine Simulation (coming soon)
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[520px]">
            {activeTab === "spring" ? (
              <BasicScene>
                <SpringModel
                  wireDiameter={wireDiameter}
                  meanDiameter={meanDiameter}
                  activeCoils={activeCoils}
                  pitch={pitch}
                  totalCoils={totalCoils}
                  topGround={topGround}
                  bottomGround={bottomGround}
                />
              </BasicScene>
            ) : (
              <div className="relative h-full">
                <CoilerMachineScene
                  springDesign={design}
                  pitch={pitch}
                  simulationSpeed={1}
                />
                <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-md bg-black/60 p-3 text-xs text-slate-100">
                  Motion trajectory logic will be ported from the existing Vite/Three coiler simulator. Current view is a
                  static placeholder showing wire feed, coiler arms, and the forming spring.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

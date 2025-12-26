"use client";

import { useMemo, useState } from "react";
import type { GarterAnalysisBundle, GarterV2Inputs, GarterFeaResult } from "@/lib/analysis/garter/types";
import { computeGarterAnalytical } from "@/lib/analysis/garter/compute";
import { buildGarterAudit } from "@/lib/audit/garterAudit";
import { EngineeringAuditCard } from "@/components/audit/EngineeringAuditCard";
import { GarterUnwrappedModelCard } from "./garter/GarterUnwrappedModelCard";
import { GarterOverlayCharts } from "./garter/GarterOverlayCharts";
import { GarterFeaVerificationCard } from "./garter/GarterFeaVerificationCard";
import { GarterSpringVisualizer } from "@/components/three/GarterSpringVisualizer";

export function GarterEngineeringAnalysis({ inputs }: { inputs: GarterV2Inputs }) {
  const [fea, setFea] = useState<GarterFeaResult | undefined>(undefined);

  const bundle: GarterAnalysisBundle = useMemo(() => {
    const analytical = computeGarterAnalytical(inputs);
    return { type: "garter", inputs, analytical, fea };
  }, [inputs, fea]);

  const audit = useMemo(() => buildGarterAudit(bundle), [bundle]);

  return (
    <div className="space-y-4">
      {/* 3D Visualizer */}
      <GarterSpringVisualizer 
        geometry={{
            type: "garter",
            wireDiameter: inputs.d,
            meanDiameter: inputs.Dm,
            activeCoils: inputs.N,
            totalCoils: inputs.N,
            ringFreeDiameter: inputs.D_free,
            jointType: inputs.jointType,
            // Defaults to satisfy strict TS (not used by viz directly)
            freeLength: inputs.D_free * Math.PI,
            shearModulus: inputs.G
        }} 
        installedDiameter={inputs.D_inst}
      />

      <EngineeringAuditCard audit={audit as any} governingVariable="ΔD" />

      <div className="grid gap-4 md:grid-cols-2">
        <GarterUnwrappedModelCard bundle={bundle} />
        <GarterFeaVerificationCard
          bundle={bundle}
          onFeaUpdated={(next) => setFea(next)}
        />
      </div>

      <GarterOverlayCharts bundle={bundle} />
    </div>
  );
}

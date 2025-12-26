"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GarterAnalysisBundle } from "@/lib/analysis/garter/types";

export function GarterFeaVerificationCard({
  bundle,
  onFeaUpdated,
}: {
  bundle: GarterAnalysisBundle;
  onFeaUpdated: (nextFea: any) => void;
}) {
  const [loading, setLoading] = useState(false);

  const fea = bundle.fea;

  async function runFea() {
    setLoading(true);
    try {
      // 1) POST /api/fea/jobs (Now a Sync Proxy)
      const res = await fetch("/api/fea/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          springType: "garter",
          mode: "single",
          inputs: bundle.inputs,
        }),
      });

      if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText);
      }

      const result = await res.json();
      onFeaUpdated(result); // Result is already in GarterFeaResult format

    } catch (e: any) {
      onFeaUpdated({ status: "FAILED", message: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-dashed border-red-200 bg-red-50/10">
      <CardHeader>
        <CardTitle className="flex justify-between">
            <span>Advanced Verification / 进阶校核 (FEA)</span>
            <Badge variant="outline" className="text-xs font-normal">Experimental</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Asynchronous verification. Analytical model remains primary.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <Button onClick={runFea} disabled={loading}>
            {loading ? "Running..." : "Run FEA Verification"}
          </Button>
          <span className="text-muted-foreground">
          Status: <span className="font-semibold">{loading ? "RUNNING..." : (fea?.status ?? "NOT RUN")}</span>
        </span>
        </div>

        {fea?.message && <div className="text-xs text-red-500">{fea.message}</div>}

        {fea?.status === "SUCCEEDED" && (
          <div className="grid gap-2 md:grid-cols-2">
            <Row label="FEA Max Stress" value={`${fmt(fea.maxStress)} MPa`} />
            <Row label="FEA Reaction Force" value={`${fmt(fea.reactionForce)} N`} />
            <Row label="ΔStress vs Ana" value={pct(fea.deviation?.stressPct)} />
            <Row label="ΔForce vs Ana" value={pct(fea.deviation?.forcePct)} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function fmt(v?: number) {
  if (v === undefined || v === null) return "-";
  return Number(v.toFixed(2)).toLocaleString();
}
function pct(v?: number) {
  if (v === undefined || v === null) return "-";
  return `${v.toFixed(1)}%`;
}

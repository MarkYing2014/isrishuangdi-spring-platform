"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { TorsionalAuditPanel } from "@/components/torsional-audit/TorsionalAuditPanel";
import { analyzeDieSpringSystem, DieSpringStageConfig } from "@/lib/dieSpring/torsionalIntegration";
import { TORSIONAL_SYSTEM_SAMPLES } from "@/lib/torsional/torsionalSystem";
import { ISO_10243_CATALOG } from "@/lib/dieSpring/catalog";
import { DieSpringSpec } from "@/lib/dieSpring/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/language-context";

export default function TorsionalAuditPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]">Loading Audit Engine...</div>}>
        <TorsionalAuditContent />
      </Suspense>
    </div>
  );
}

function TorsionalAuditContent() {
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const isZh = language === "zh";

  // Reconstruct the analysis from query params or use a default sample
  const analysis = useMemo(() => {
    const sampleKey = searchParams.get("sample") || "clutch_passenger";
    const sample = TORSIONAL_SYSTEM_SAMPLES[sampleKey] || TORSIONAL_SYSTEM_SAMPLES["clutch_passenger"];

    // Convert sample groups to DieSpringStageConfig
    const stages: DieSpringStageConfig[] = sample.groups.map(group => {
       const catalogId = searchParams.get(`group_${group.id}_spec`) || group.materialId || "";
       const match = ISO_10243_CATALOG.find(s => s.id === catalogId) || ISO_10243_CATALOG[0];
       
       const spec: DieSpringSpec = match;

       return {
         spec,
         count: group.n,
         installRadius: group.R,
         engagementAngle: group.theta_start,
         lifeClass: "NORMAL",
         name: group.name
       };
    });

    const drawingNumber = searchParams.get("drawing") || sample.customerDrawingNumber || "DWG-2025-X0";
    const revision = searchParams.get("rev") || sample.customerDrawingRevision || "A";
    const thetaOperatingDeg = parseFloat(searchParams.get("theta") || "") || sample.thetaOperatingCustomerDeg || 12;
    const operatingSource = (searchParams.get("source") as any) || sample.thetaOperatingSource || "DRAWING";
    const assumptions = searchParams.get("assumptions")?.split(",") || sample.assumptions || ["Slot travel not specified → treated as ∞"];

    return analyzeDieSpringSystem(
      stages,
      thetaOperatingDeg,
      { number: drawingNumber, revision },
      operatingSource,
      assumptions
    );
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm" className="h-8">
            <Link href="/tools/calculator?type=torsionalSpringSystem">
              <ArrowLeft className="w-4 h-4 mr-1" />
              {isZh ? "返回工作区" : "Back to Workspace"}
            </Link>
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <h1 className="text-xl font-bold text-slate-900">
            {isZh ? "高级扭矩系统审计 (AUDIT)" : "Advanced Torsional System Audit"}
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8">
          <Printer className="w-4 h-4 mr-2" />
          {isZh ? "打印/PDF报告" : "Print/PDF Report"}
        </Button>
      </div>

      <TorsionalAuditPanel analysis={analysis} />

      <div className="mt-8 pt-8 border-t text-center opacity-30 pointer-events-none grayscale">
        <p className="text-[10px] font-mono uppercase tracking-[0.4em]">
           Quality Systems Architecture · Phase 8 · Audit Mode Only
        </p>
      </div>
    </div>
  );
}

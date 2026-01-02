"use client";

import React, { useMemo, useState } from "react";
import type { AxialOptimizerCandidate } from "@/lib/optimizer/AxialParetoOptimizer";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Copy, Pin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type TabKey = "geometry" | "constraints" | "audit";

export function CandidateDetailPanel({
  candidate,
  onApply,
  onCompare,
  onPin,
}: {
  candidate: AxialOptimizerCandidate | null;
  onApply: (c: AxialOptimizerCandidate) => void;
  onCompare?: (c: AxialOptimizerCandidate) => void;
  onPin?: (c: AxialOptimizerCandidate) => void;
}) {
  const [tab, setTab] = useState<TabKey>("constraints");

  const derived = useMemo(() => {
    if (!candidate) return null;

    const r = candidate.result;
    const clr = r.pack?.clearance;
    const ssMin = clr?.ssMin ?? Number.POSITIVE_INFINITY;
    const boundaryMin = clr?.boundaryMin ?? Number.POSITIVE_INFINITY;
    const seatMin = clr?.seatPocketMin ?? Number.POSITIVE_INFINITY;
    const minClearance = Math.min(ssMin, boundaryMin, seatMin);

    const audit = candidate.audit;
    const status = audit.status; // Directly from our AxialPackAudit wrapper
    // const degraded = !!audit.degraded; // Not in our wrapper for now

    const kTotal = r.pack?.k_total ?? 0;
    const hs = r.pack?.Hs_pack ?? 0;
    const maxStroke = r.pack?.maxStroke ?? 0; // Or from limits?
    const err = candidate.score.targetErrorPct;

    const sf = audit.kpi?.safetyFactor ?? 0;
    const gov = audit.governingMode ?? "—";
    
    // Limits
    const limits = audit.limits;

    return { minClearance, status, degraded: false, kTotal, hs, maxStroke, err, sf, gov, ratio: 0, ssMin, boundaryMin, seatMin, limits };
  }, [candidate]);

  if (!candidate || !derived) {
    return (
      <div className="h-full border-l bg-slate-50/50 p-8 flex flex-col items-center justify-center text-center">
        <div className="text-sm text-slate-400 font-medium">Select a candidate<br/>to view details.</div>
      </div>
    );
  }

  return (
    <div className="h-full border-l bg-white overflow-hidden flex flex-col w-[380px] shrink-0">
      {/* Header */}
      <div className="p-5 border-b flex flex-col gap-3 shrink-0 bg-slate-50/30">
        <div className="flex items-start justify-between">
            <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Candidate Details</div>
            <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {candidate.score.bucket}
                <StatusPill status={derived.status} degraded={derived.degraded} />
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono">
                Gov: {derived.gov} · SF {derived.sf.toFixed(2)}
            </div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          {onPin && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => onPin(candidate)}>
              <Pin className="w-3 h-3 mr-2" /> Pin
            </Button>
          )}
          <Button
            size="sm"
            className="w-full col-span-2 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            onClick={() => onApply(candidate)}
            disabled={derived.status !== "PASS"} // keep strict: only PASS can apply
          >
            Apply Design <ArrowRight className="w-3 h-3 ml-2" />
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="p-4 grid grid-cols-2 gap-3 border-b shrink-0 bg-white">
        <KpiCard label="Total Stiffness k" value={`${derived.kTotal.toFixed(1)} N/mm`} />
        {/* <KpiCard label="P @ stroke" value={formatPAtStroke(candidate)} /> */}
        <KpiCard label="Solid Height" value={`${derived.hs.toFixed(1)} mm`} />
        <KpiCard
          label="Min Clearance"
          value={`${Number.isFinite(derived.minClearance) ? derived.minClearance.toFixed(2) : "—"} mm`}
          tone={clearanceTone(derived.minClearance)}
        />
        <KpiCard label="Target Error" value={`${derived.err.toFixed(1)} %`} tone={derived.err <= 10 ? "good" : "warn"} />
      </div>

      {/* Why */}
      <div className="p-4 border-b shrink-0 bg-slate-50/50">
        <div className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Why this design</div>
        <ul className="text-xs text-slate-500 list-disc pl-4 space-y-1">
          {candidate.why.slice(0, 4).map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-3 shrink-0 bg-white">
        <div className="flex gap-2">
          <TabButton active={tab === "constraints"} onClick={() => setTab("constraints")}>Constraints</TabButton>
          <TabButton active={tab === "geometry"} onClick={() => setTab("geometry")}>Geometry</TabButton>
          <TabButton active={tab === "audit"} onClick={() => setTab("audit")}>Audit</TabButton>
        </div>
      </div>

      {/* Tab content */}
      <div className="p-4 overflow-y-auto flex-1 bg-white">
        {tab === "geometry" && <GeometryTab candidate={candidate} />}
        {tab === "constraints" && <ConstraintsTab candidate={candidate} derived={derived} />}
        {tab === "audit" && <AuditTab candidate={candidate} derived={derived} />}
      </div>

      {/* Footer */}
      <div className="p-3 border-t bg-slate-50 shrink-0 flex items-center justify-between">
        <div className="text-[10px] text-slate-400 max-w-[200px] leading-tight">
          Assumptions: Linear k, Single-spring stress.
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copySummary(candidate)}>
          <Copy className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ----------------- sub components -----------------

function StatusPill({ status, degraded }: { status: string; degraded: boolean }) {
  const tone =
    status === "PASS" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
    status === "WARN" ? "bg-amber-100 text-amber-800 border-amber-200" :
    "bg-red-100 text-red-700 border-red-200";
  return (
    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${tone}`}>
      {status}{degraded ? " · Degraded" : ""}
    </span>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: string; tone?: "good"|"warn"|"bad" }) {
  const cls =
    tone === "good" ? "border-emerald-200 bg-emerald-50/50" :
    tone === "warn" ? "border-amber-200 bg-amber-50/50" :
    tone === "bad" ? "border-red-200 bg-red-50/50" :
    "border-slate-100 bg-slate-50/50";
  
  const textCls = 
    tone === "good" ? "text-emerald-700" :
    tone === "warn" ? "text-amber-700" :
    tone === "bad" ? "text-red-700" :
    "text-slate-700";

  return (
    <div className={`border ${cls} rounded-lg p-2.5`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">{label}</div>
      <div className={`text-sm font-bold font-mono ${textCls}`}>{value}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }: any) {
  return (
    <button
      className={cn(
        "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
        active ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function GeometryTab({ candidate }: { candidate: AxialOptimizerCandidate }) {
  const i = candidate.input;
  return (
    <div className="space-y-4 text-xs">
      <Section title="Base Spring">
        <KeyVal k="Wire Dia (d)" v={`${i.baseSpring.d.toFixed(2)} mm`} />
        <KeyVal k="Mean Dia (Dm)" v={`${i.baseSpring.Dm.toFixed(2)} mm`} />
        <KeyVal k="Active Coils" v={`${i.baseSpring.Na.toFixed(1)}`} />
        <KeyVal k="Free Length" v={`${i.baseSpring.L0.toFixed(2)} mm`} />
        <KeyVal k="End Condition" v={`${i.baseSpring.endCondition ?? "—"}`} />
        <KeyVal k="Material" v={`${i.baseSpring.materialId ?? "—"}`} />
      </Section>

      <Section title="Pack Configuration">
        <KeyVal k="Count (N)" v={`${i.pack.N}`} />
        <KeyVal k="Bolt Circle (Rbc)" v={`${i.pack.Rbc.toFixed(2)} mm`} />
        <KeyVal k="Ring OD" v={i.pack.ringOD ? `${i.pack.ringOD} mm` : "—"} />
        <KeyVal k="Ring ID" v={i.pack.ringID ? `${i.pack.ringID} mm` : "—"} />
        <KeyVal k="Plate Thick" v={i.pack.plateThickness ? `${i.pack.plateThickness} mm` : "—"} />
      </Section>
    </div>
  );
}

function ConstraintsTab({ candidate, derived }: { candidate: AxialOptimizerCandidate; derived: any }) {
  const r = candidate.result;
  const l = derived.limits;
  const strokeUsed = (candidate.input as any).loadcase?.stroke ?? 0;

  return (
    <div className="space-y-4 text-xs">
      <Section title="Clearance Checks">
        <KeyVal k="Spring-Spring" v={`${finite(derived.ssMin)} mm`} tone={clearanceTone(derived.ssMin)} />
        <KeyVal k="Boundary" v={`${finite(derived.boundaryMin)} mm`} tone={clearanceTone(derived.boundaryMin)} />
        <KeyVal k="Seat Pocket" v={`${finite(derived.seatMin)} mm`} tone={clearanceTone(derived.seatMin)} />
      </Section>

      <Section title="Stroke & Solid">
        <KeyVal k="Stroke used" v={`${strokeUsed.toFixed(2)} mm`} />
        <KeyVal k="Max Allowed" v={`${(l?.maxDeflection ?? 0).toFixed(2)} mm`} tone={strokeUsed > (l?.maxDeflection ?? 0) ? "bad" : "good"} />
        <KeyVal k="Hs_pack" v={`${derived.hs.toFixed(2)} mm`} />
      </Section>

      <Section title="Engineering Limits">
        <KeyVal k="Stress Limit" v={`${l?.stressLimit?.toFixed(0) ?? "—"} MPa`} />
        <KeyVal k="Check Ratios" v={`${l?.warnRatio ?? "—"} / ${l?.failRatio ?? "—"}`} />
      </Section>
    </div>
  );
}

function AuditTab({ candidate, derived }: { candidate: AxialOptimizerCandidate, derived: any }) {
  const gov = derived.gov;
  const sf = derived.sf;
  
  // Note: We don't have detailed stress val in Audit wrapper yet (it's simplified).
  // But we have safety factor.

  return (
    <div className="space-y-4 text-xs">
      <Section title="Audit Summary">
        <KeyVal k="Global Status" v={derived.status} tone={derived.status === "PASS" ? "good" : derived.status === "WARN" ? "warn" : "bad"} />
        <KeyVal k="Governing Mode" v={gov} />
        <KeyVal k="Safety Factor" v={`${sf.toFixed(2)}`} />
      </Section>

      {derived.status !== "PASS" && (
        <div className="rounded-lg border border-amber-200 p-3 bg-amber-50 text-xs text-amber-900 leading-relaxed">
          <strong>Engineering Notice:</strong><br/>
          This design is geometrically valid but fails engineering audit (Stress or Load limits). 
          It receives "Designable but not Deliverable" status.
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/30">
      <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function KeyVal({ k, v, tone }: { k: string; v: string; tone?: "good"|"warn"|"bad" }) {
  const cls =
    tone === "good" ? "text-emerald-700 bg-emerald-50 px-1.5 rounded" :
    tone === "warn" ? "text-amber-800 bg-amber-50 px-1.5 rounded" :
    tone === "bad" ? "text-red-700 bg-red-50 px-1.5 rounded" :
    "text-slate-700";
  return (
    <div className="flex justify-between items-center gap-3">
      <div className="text-slate-500 font-medium">{k}</div>
      <div className={`font-mono font-semibold ${cls}`}>{v}</div>
    </div>
  );
}

function clearanceTone(x: number): "good" | "warn" | "bad" {
  if (!Number.isFinite(x)) return "warn";
  if (x < 0) return "bad";
  if (x < 0.5) return "warn";
  return "good";
}

function finite(x: number) {
  return Number.isFinite(x) ? x.toFixed(2) : "—";
}

function copySummary(c: AxialOptimizerCandidate) {
  const i = c.input;
  const r = c.result;
  const line = [
    `AxialPack: N=${i.pack.N}, Rbc=${i.pack.Rbc}mm`,
    `Spring: d=${i.baseSpring.d}mm, Dm=${i.baseSpring.Dm}mm, Na=${i.baseSpring.Na}, L0=${i.baseSpring.L0}mm`,
    `k_total=${(r.pack?.k_total ?? 0).toFixed(2)} N/mm`,
    `Hs_pack=${(r.pack?.Hs_pack ?? 0).toFixed(2)}mm`,
    `Audit=${c.audit.status}`,
  ].join(" | ");

  navigator.clipboard?.writeText(line);
}

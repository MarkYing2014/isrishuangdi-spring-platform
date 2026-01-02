"use client";

import React, { useState } from "react";
import { CandidateDetailPanel } from "@/components/calculators/optimizer/CandidateDetailPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Wand2, Loader2, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

import { 
    optimizeAxialPack, 
    type AxialOptimizerCandidate, 
    type AxialOptimizerRequest,
    type AxialPackInput
} from "@/lib/optimizer/AxialParetoOptimizer";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  baseTemplate: AxialPackInput;
  onApply: (input: AxialPackInput) => void;
}

export function DesignOptimizerDialog({ open, onOpenChange, baseTemplate, onApply }: Props) {
  const [req, setReq] = useState<AxialOptimizerRequest>(() => ({
    baseTemplate,
    target: { type: "loadAtStroke", pReq: 1200, stroke: 10, tolerancePct: 10 },
    envelope: { maxOD: 350, minID: 20, maxSolidHeight: 100 },
    constraints: { 
        minSafetyFactor: 1.1,
        indexRange: [4, 12],
        packNRange: [4, 20],
        NaRange: [3, 20],
        maxCandidates: 60,
        requireAuditPass: true 
    },
  }));

  const [candidates, setCandidates] = useState<AxialOptimizerCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<AxialOptimizerCandidate | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async () => {
    setIsRunning(true);
    setError(null);
    setCandidates([]);
    setSelectedCandidate(null);
    
    await new Promise(r => setTimeout(r, 50));

    try {
      const res = optimizeAxialPack(req);
      setCandidates(res);
      if (res.length === 0) {
        setError("No valid designs found.");
      } else {
        setSelectedCandidate(res[0]);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Optimizer failed");
    } finally {
      setIsRunning(false);
    }
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200"
        style={{ 
          width: '1200px', 
          maxWidth: '95vw', 
          height: '85vh',
          display: 'grid',
          gridTemplateRows: 'auto 1fr',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-lg p-2 text-white">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Axial Optimizer</h2>
              <div className="text-xs text-slate-500">
                {candidates.length > 0 ? `Found ${candidates.length} designs` : "Ready"}
                {error && <span className="text-red-500 ml-2">{error}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => {setCandidates([]); setSelectedCandidate(null); setError(null);}}>
              <RotateCcw className="w-4 h-4 mr-1" /> Reset
            </Button>
            <Button size="sm" onClick={runSearch} disabled={isRunning}>
              {isRunning ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Running...</> : "Run Search"}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 3-Column Body using CSS Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 320px', overflow: 'hidden' }}>
          
          {/* Left: Requirements */}
          <div className="border-r bg-slate-50 overflow-y-auto p-4" style={{ minHeight: 0 }}>
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-400 uppercase">1. Goals</div>
              <div className="space-y-2">
                <Label className="text-xs">Target Mode</Label>
                <Select
                  value={req.target.type}
                  onValueChange={(v) => {
                    setReq((r) => ({
                      ...r,
                      target: v === "k"
                        ? { type: "k", kReq: 50, tolerancePct: 10 }
                        : { type: "loadAtStroke", pReq: 1200, stroke: 10, tolerancePct: 10 },
                    }));
                  }}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loadAtStroke">Target Load (P)</SelectItem>
                    <SelectItem value="k">Target Stiffness (k)</SelectItem>
                  </SelectContent>
                </Select>

                {req.target.type === "loadAtStroke" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Load (N)</Label>
                      <Input className="h-8 text-xs" type="number" value={req.target.pReq} onChange={e => setReq(r => ({...r, target: {...r.target, pReq: Number(e.target.value)} as any}))} />
                    </div>
                    <div>
                      <Label className="text-xs">Stroke (mm)</Label>
                      <Input className="h-8 text-xs" type="number" value={req.target.stroke} onChange={e => setReq(r => ({...r, target: {...r.target, stroke: Number(e.target.value)} as any}))} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs">Stiffness (N/mm)</Label>
                    <Input className="h-8 text-xs" type="number" value={req.target.kReq} onChange={e => setReq(r => ({...r, target: {...r.target, kReq: Number(e.target.value)} as any}))} />
                  </div>
                )}

                <div>
                  <Label className="text-xs">Tolerance (%)</Label>
                  <Input className="h-8 text-xs" type="number" value={req.target.tolerancePct} onChange={e => setReq(r => ({...r, target: {...r.target, tolerancePct: Number(e.target.value)} as any}))} />
                </div>
              </div>

              <div className="text-xs font-bold text-slate-400 uppercase pt-4">2. Envelope</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Max OD</Label>
                  <Input className="h-8 text-xs" type="number" value={req.envelope.maxOD || ""} onChange={e => setReq(r => ({...r, envelope: {...r.envelope, maxOD: Number(e.target.value)}}))} />
                </div>
                <div>
                  <Label className="text-xs">Min ID</Label>
                  <Input className="h-8 text-xs" type="number" value={req.envelope.minID || ""} onChange={e => setReq(r => ({...r, envelope: {...r.envelope, minID: Number(e.target.value)}}))} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Max Solid Height</Label>
                <Input className="h-8 text-xs" type="number" value={req.envelope.maxSolidHeight || ""} onChange={e => setReq(r => ({...r, envelope: {...r.envelope, maxSolidHeight: Number(e.target.value)}}))} />
              </div>

              <div className="text-xs font-bold text-slate-400 uppercase pt-4">3. Rules</div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="auditPass" 
                  checked={req.constraints?.requireAuditPass}
                  onCheckedChange={(c) => setReq(r => ({...r, constraints: {...r.constraints, requireAuditPass: !!c} as any}))}
                />
                <Label htmlFor="auditPass" className="text-xs">Require Audit PASS</Label>
              </div>
            </div>
          </div>

          {/* Middle: Results Table */}
          <div className="bg-white border-r overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
            {/* Header Row */}
            <div className="grid grid-cols-7 bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-500 uppercase shrink-0">
              <div>Status</div>
              <div>Bucket</div>
              <div className="text-right">d</div>
              <div className="text-right">Na</div>
              <div className="text-right">N</div>
              <div className="text-right">k</div>
              <div className="text-right">Err%</div>
            </div>
            {/* Rows */}
            <div className="flex-1 overflow-y-auto">
              {candidates.length === 0 && !isRunning && (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                  Click "Run Search" to find designs
                </div>
              )}
              {candidates.map((c, idx) => {
                const status = c?.audit?.status ?? "?";
                const bucket = c?.score?.bucket ?? "?";
                const d = c?.input?.baseSpring?.d ?? 0;
                const Na = c?.input?.baseSpring?.Na ?? 0;
                const N = c?.input?.pack?.N ?? 0;
                const k = c?.result?.pack?.k_total;
                const err = c?.score?.targetErrorPct ?? 0;
                
                return (
                  <div 
                    key={idx}
                    className={cn(
                      "grid grid-cols-7 px-3 py-2 text-xs border-b cursor-pointer",
                      selectedCandidate === c ? "bg-blue-50" : "hover:bg-slate-50"
                    )}
                    onClick={() => setSelectedCandidate(c)}
                  >
                    <div>
                      <Badge variant="outline" className={cn(
                        "text-[9px] h-5 px-1",
                        status === "PASS" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {status}
                      </Badge>
                    </div>
                    <div className="text-slate-500">{bucket}</div>
                    <div className="text-right font-mono">{d.toFixed(1)}</div>
                    <div className="text-right font-mono">{Na.toFixed(1)}</div>
                    <div className="text-right font-mono">{N}</div>
                    <div className="text-right font-mono text-slate-500">{k?.toFixed(1) ?? "—"}</div>
                    <div className="text-right font-mono text-slate-400">{err.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Detail Panel */}
          <div className="bg-slate-50 overflow-y-auto" style={{ minHeight: 0 }}>
            <CandidateDetailPanel 
              candidate={selectedCandidate}
              onApply={(c) => {
                onApply(c.input);
                onOpenChange(false);
              }}
            />
          </div>

        </div>
      </div>
    </div>
  );
}

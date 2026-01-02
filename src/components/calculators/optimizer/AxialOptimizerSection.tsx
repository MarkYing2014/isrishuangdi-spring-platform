"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wand2, Loader2, RotateCcw, ChevronDown, ChevronUp, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

import { 
    optimizeAxialPack, 
    type AxialOptimizerCandidate, 
    type AxialOptimizerRequest,
    type AxialPackInput
} from "@/lib/optimizer/AxialParetoOptimizer";

interface Props {
  baseTemplate: AxialPackInput;
  onApply: (input: AxialPackInput) => void;
}

export function AxialOptimizerSection({ baseTemplate, onApply }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  
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
        requireAuditPass: false  // More lenient default
    },
  }));

  const [candidates, setCandidates] = useState<AxialOptimizerCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<AxialOptimizerCandidate | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);

  const runSearch = async () => {
    setIsRunning(true);
    setError(null);
    setCandidates([]);
    setSelectedCandidate(null);
    setAppliedMessage(null);
    
    await new Promise(r => setTimeout(r, 50));

    try {
      const res = optimizeAxialPack(req);
      setCandidates(res);
      setHasRun(true);
      if (res.length === 0) {
        setError("No valid designs found. Try relaxing constraints.");
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

  const handleApply = () => {
    if (selectedCandidate) {
      console.log("[Optimizer] Applying candidate:", selectedCandidate.input);
      onApply(selectedCandidate.input);
      setAppliedMessage(`Applied: d=${selectedCandidate.input.baseSpring.d}mm, N=${selectedCandidate.input.pack.N}`);
      setTimeout(() => setAppliedMessage(null), 3000);
    }
  };

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
      {/* Header - Always Visible */}
      <CardHeader 
        className="cursor-pointer hover:bg-blue-50/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg p-2 text-white shadow-lg shadow-blue-500/20">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">Auto Design Optimizer</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically find optimal spring pack designs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {candidates.length > 0 && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                {candidates.length} designs found
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Expandable Content */}
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Requirements */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Optimization Goals</div>
              
              <div className="space-y-3 bg-white rounded-xl p-4 border border-slate-100">
                <div>
                  <Label className="text-xs font-medium">Target Mode</Label>
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
                    <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loadAtStroke">Target Load @ Stroke</SelectItem>
                      <SelectItem value="k">Target Stiffness (k)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {req.target.type === "loadAtStroke" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-500">Load (N)</Label>
                      <Input className="h-9 text-xs font-mono mt-1" type="number" value={req.target.pReq} onChange={e => setReq(r => ({...r, target: {...r.target, pReq: Number(e.target.value)} as any}))} />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Stroke (mm)</Label>
                      <Input className="h-9 text-xs font-mono mt-1" type="number" value={req.target.stroke} onChange={e => setReq(r => ({...r, target: {...r.target, stroke: Number(e.target.value)} as any}))} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs text-slate-500">Stiffness (N/mm)</Label>
                    <Input className="h-9 text-xs font-mono mt-1" type="number" value={req.target.kReq} onChange={e => setReq(r => ({...r, target: {...r.target, kReq: Number(e.target.value)} as any}))} />
                  </div>
                )}

                <div>
                  <Label className="text-xs text-slate-500">Tolerance ±%</Label>
                  <Input className="h-9 text-xs font-mono mt-1" type="number" value={req.target.tolerancePct} onChange={e => setReq(r => ({...r, target: {...r.target, tolerancePct: Number(e.target.value)} as any}))} />
                </div>
              </div>

              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Design Envelope</div>
              
              <div className="bg-white rounded-xl p-4 border border-slate-100 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500">Max OD (mm)</Label>
                    <Input className="h-9 text-xs font-mono mt-1" type="number" value={req.envelope.maxOD || ""} onChange={e => setReq(r => ({...r, envelope: {...r.envelope, maxOD: Number(e.target.value)}}))} />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Min ID (mm)</Label>
                    <Input className="h-9 text-xs font-mono mt-1" type="number" value={req.envelope.minID || ""} onChange={e => setReq(r => ({...r, envelope: {...r.envelope, minID: Number(e.target.value)}}))} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Max Solid Height (mm)</Label>
                  <Input className="h-9 text-xs font-mono mt-1" type="number" value={req.envelope.maxSolidHeight || ""} onChange={e => setReq(r => ({...r, envelope: {...r.envelope, maxSolidHeight: Number(e.target.value)}}))} />
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white rounded-xl p-3 border border-slate-100">
                <Checkbox 
                  id="auditPass" 
                  checked={req.constraints?.requireAuditPass}
                  onCheckedChange={(c) => setReq(r => ({...r, constraints: {...r.constraints, requireAuditPass: !!c} as any}))}
                />
                <Label htmlFor="auditPass" className="text-xs font-medium cursor-pointer">Strict Audit (PASS only)</Label>
              </div>

              <Button 
                className="w-full h-11 font-semibold shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                onClick={runSearch}
                disabled={isRunning}
              >
                {isRunning ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching...</>
                ) : (
                  <><Wand2 className="w-4 h-4 mr-2" /> Run Optimizer</>
                )}
              </Button>
              
              {error && (
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                  {error}
                </div>
              )}
              
              {appliedMessage && (
                <div className="text-xs text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-200 animate-pulse">
                  ✓ {appliedMessage}
                </div>
              )}
            </div>

            {/* Middle: Results Table */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Results {candidates.length > 0 && `(${candidates.length})`}
              </div>
              
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-6 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-500 uppercase border-b">
                  <div>Status</div>
                  <div className="text-right">d</div>
                  <div className="text-right">Na</div>
                  <div className="text-right">N</div>
                  <div className="text-right">k</div>
                  <div className="text-right">Err%</div>
                </div>

                {/* Rows */}
                <div className="max-h-[400px] overflow-y-auto">
                  {!hasRun && (
                    <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
                      Click "Run Optimizer" to start
                    </div>
                  )}
                  
                  {hasRun && candidates.length === 0 && !isRunning && (
                    <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
                      No designs found
                    </div>
                  )}

                  {candidates.map((c, idx) => {
                    const status = c?.audit?.status ?? "?";
                    const d = c?.input?.baseSpring?.d ?? 0;
                    const Na = c?.input?.baseSpring?.Na ?? 0;
                    const N = c?.input?.pack?.N ?? 0;
                    const k = c?.result?.pack?.k_total;
                    const err = c?.score?.targetErrorPct ?? 0;
                    
                    return (
                      <div 
                        key={idx}
                        className={cn(
                          "grid grid-cols-6 px-3 py-2.5 text-xs border-b cursor-pointer transition-colors",
                          selectedCandidate === c ? "bg-blue-50 border-blue-100" : "hover:bg-slate-50"
                        )}
                        onClick={() => setSelectedCandidate(c)}
                      >
                        <div>
                          <Badge variant="outline" className={cn(
                            "text-[9px] h-5 px-1.5 border-0 font-bold",
                            status === "PASS" ? "bg-emerald-100 text-emerald-700" :
                            status === "WARN" ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          )}>
                            {status}
                          </Badge>
                        </div>
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
            </div>

            {/* Right: Selected Candidate Details */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selected Design</div>
              
              {!selectedCandidate ? (
                <div className="bg-white rounded-xl border border-slate-100 p-6 text-center text-slate-400 text-sm">
                  Select a candidate from the results
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                  {/* Candidate Header */}
                  <div className="p-4 border-b bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          {selectedCandidate.score.bucket}
                          <Badge className={cn(
                            "text-[9px]",
                            selectedCandidate.audit.status === "PASS" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          )}>
                            {selectedCandidate.audit.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Error: {selectedCandidate.score.targetErrorPct.toFixed(1)}%
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={handleApply}
                        disabled={selectedCandidate.audit.status === "FAIL"}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Apply
                      </Button>
                    </div>
                  </div>

                  {/* Candidate Details */}
                  <div className="p-4 space-y-4 text-xs">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Spring Geometry</div>
                      <div className="grid grid-cols-2 gap-2">
                        <DetailRow label="Wire d" value={`${selectedCandidate.input.baseSpring.d.toFixed(2)} mm`} />
                        <DetailRow label="Mean Dm" value={`${selectedCandidate.input.baseSpring.Dm.toFixed(2)} mm`} />
                        <DetailRow label="Coils Na" value={selectedCandidate.input.baseSpring.Na.toFixed(1)} />
                        <DetailRow label="Free L0" value={`${selectedCandidate.input.baseSpring.L0.toFixed(2)} mm`} />
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Pack Config</div>
                      <div className="grid grid-cols-2 gap-2">
                        <DetailRow label="Count N" value={String(selectedCandidate.input.pack.N)} />
                        <DetailRow label="Rbc" value={`${selectedCandidate.input.pack.Rbc.toFixed(2)} mm`} />
                        <DetailRow label="k_total" value={`${(selectedCandidate.result.pack?.k_total ?? 0).toFixed(2)} N/mm`} />
                        <DetailRow label="Hs_pack" value={`${(selectedCandidate.result.pack?.Hs_pack ?? 0).toFixed(2)} mm`} />
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Why This Design</div>
                      <ul className="text-slate-600 space-y-1 list-disc pl-4">
                        {selectedCandidate.why.slice(0, 3).map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </CardContent>
      )}
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 px-2 bg-slate-50 rounded">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono font-medium text-slate-700">{value}</span>
    </div>
  );
}

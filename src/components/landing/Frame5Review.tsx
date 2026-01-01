"use client";

import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function Frame5Review() {
  return (
    <section className="w-full max-w-[1440px] mx-auto px-6 md:px-20 py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left: 3D Mock */}
        <div className="bg-muted/10 rounded-2xl border p-8 space-y-8">
            <div className="aspect-square bg-grid-white/10 rounded-xl border border-dashed flex items-center justify-center relative bg-background">
                <div className="text-muted-foreground/20 font-mono text-xs absolute top-4 left-4">3D SIMULATION CONTEXT</div>
                <div className="w-32 h-64 border-2 border-primary/50 rounded-full flex flex-col items-center justify-center relative">
                    {/* Mock Spring */}
                    <div className="w-full h-full space-y-1 overflow-hidden p-2 opacity-50">
                        {Array.from({length: 12}).map((_, i) => (
                            <div key={i} className="w-full h-4 rounded-full border border-primary/40" />
                        ))}
                    </div>
                </div>
            </div>
            <div className="space-y-4">
                <div className="flex justify-between text-xs font-mono font-bold uppercase text-muted-foreground">
                    <span>L0: 120mm</span>
                    <span>Ls: 85mm</span>
                </div>
                <Slider defaultValue={[45]} max={100} step={1} className="w-full" />
                <div className="text-center font-mono text-xs text-muted-foreground">Stroke Simulation</div>
            </div>
        </div>

        {/* Right: Review Panel */}
        <div className="space-y-6">
            <div>
                <Badge variant="outline" className="mb-4">Internal Review</Badge>
                <h2 className="text-3xl font-semibold tracking-tight">Engineering Review Mode</h2>
                <p className="text-muted-foreground mt-2">
                    Catch unmanufacturable or failure-prone designs before drawings reach the shop floor.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">Design Review Checklist</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <CheckItem status="safe" label="Spring Index" val="8.5" icon={CheckCircle2} />
                    <CheckItem status="warning" label="Buckling Risk" val="0.85 (Guided)" icon={AlertTriangle} />
                    <CheckItem status="danger" label="Fatigue Life" val="< 10k Cycles" icon={XCircle} />
                    <CheckItem status="info" label="Grinding" val="0.75 Coils" icon={Info} />
                </CardContent>
            </Card>
        </div>
    </section>
  );
}

function CheckItem({ status, label, val, icon: Icon }: { status: "safe" | "warning" | "danger" | "info", label: string, val: string, icon: any }) {
    const colors = {
        safe: "text-green-500",
        warning: "text-amber-500",
        danger: "text-red-500",
        info: "text-blue-500"
    };

    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
            <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${colors[status]}`} />
                <span className="font-medium">{label}</span>
            </div>
            <span className="font-mono text-sm">{val}</span>
        </div>
    )
}

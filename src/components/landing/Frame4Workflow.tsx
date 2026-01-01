"use client";

import { ArrowRight } from "lucide-react";

export function Frame4Workflow() {
  return (
    <section className="w-full bg-primary/5 py-20 border-y">
        <div className="w-full max-w-[1440px] mx-auto px-6 md:px-20">
            <div className="text-center mb-16">
                <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Workflow</div>
                <h2 className="text-3xl font-semibold tracking-tight">One system. One engineering workflow.</h2>
            </div>

            <div className="flex flex-col md:flex-row items-start justify-between gap-4 md:gap-0 relative">
                {/* Connecting Line (Desktop) */}
                <div className="hidden md:block absolute top-[28px] left-0 w-full h-[2px] bg-border -z-10" />

                <WorkflowNode 
                    title="Geometry" 
                    sub="Variable pitch / d" 
                    first
                />
                <WorkflowArrow />
                <WorkflowNode 
                    title="Physics & k(x)" 
                    sub="k(x), P(x), Energy" 
                />
                <WorkflowArrow />
                <WorkflowNode 
                    title="Design Rules" 
                    sub="Buckling, fatigue" 
                />
                <WorkflowArrow />
                <WorkflowNode 
                    title="Assembly Safety" 
                    sub="Caps, solid, contact" 
                />
                <WorkflowArrow />
                <WorkflowNode 
                    title="OEM RFQ" 
                    sub="Versioned handoff" 
                    last
                />
            </div>
        </div>
    </section>
  );
}

function WorkflowNode({ title, sub, first, last }: { title: string; sub: string; first?: boolean; last?: boolean }) {
    return (
        <div className="bg-background border rounded-xl p-6 w-full md:w-48 text-center shadow-sm relative z-10">
            <div className="font-bold text-lg mb-1">{title}</div>
            <div className="text-xs text-muted-foreground font-mono">{sub}</div>
        </div>
    )
}

function WorkflowArrow() {
    return (
        <div className="hidden md:flex flex-1 justify-center items-center h-[56px] text-muted-foreground/30">
            <ArrowRight className="h-6 w-6" />
        </div>
    )
}

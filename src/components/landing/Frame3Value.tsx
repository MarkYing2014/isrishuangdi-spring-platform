"use client";

import { Brain, Eye, Package } from "lucide-react";

export function Frame3Value() {
  return (
    <section className="w-full max-w-[1440px] mx-auto px-6 md:px-20 py-20">
      <div className="mb-12">
        <div className="text-sm font-bold uppercase tracking-widest text-primary mb-2">Value</div>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Engineering-first,<br />not feature-first
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <ValueBlock 
            icon={<Brain className="h-6 w-6" />}
            title="Physics you can explain"
            bullets={[
                "Segment-based non-linear k(x)",
                "Force via ∫k(x)dx",
                "Explicit fatigue assumptions"
            ]}
        />
        <ValueBlock 
            icon={<Eye className="h-6 w-6" />}
            title="Visuals tied to physics"
            bullets={[
                "Stress = real shear stress",
                "Active vs closed coils",
                "Local-space grinding"
            ]}
        />
        <ValueBlock 
            icon={<Package className="h-6 w-6" />}
            title="Assembly-aware by default"
            bullets={[
                "Spring + end caps",
                "Pack solid & contact stress",
                "Safety included by design"
            ]}
        />
      </div>
    </section>
  );
}

function ValueBlock({ icon, title, bullets }: { icon: React.ReactNode, title: string, bullets: string[] }) {
    return (
        <div className="space-y-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {icon}
            </div>
            <h3 className="text-xl font-bold">{title}</h3>
            <ul className="space-y-2">
                {bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
                        {b}
                    </li>
                ))}
            </ul>
        </div>
    )
}

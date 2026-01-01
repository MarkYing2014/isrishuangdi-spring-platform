"use client";

import { XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Frame2Problem() {
  return (
    <section className="w-full max-w-[1440px] mx-auto px-6 md:px-20 py-16 md:py-24 bg-muted/30">
        <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold tracking-tight">
                Why traditional spring calculators fail in real projects
            </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ProblemCard 
                title="Linear k assumption"
                description="Progressive pitch and coil binding are ignored in most calculators."
            />
            <ProblemCard 
                title="No assembly awareness"
                description="End caps, grinding, and housing limits are missing from analysis."
            />
            <ProblemCard 
                title="No responsibility handoff"
                description="Numbers exist, but assumptions and decisions are not traceable."
            />
        </div>
    </section>
  );
}

function ProblemCard({ title, description }: { title: string; description: string }) {
    return (
        <Card className="border-red-100 bg-red-50/10">
            <CardHeader className="gap-2">
                <XCircle className="h-6 w-6 text-red-500" />
                <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    )
}

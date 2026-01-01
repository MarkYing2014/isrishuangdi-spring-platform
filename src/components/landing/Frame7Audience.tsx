"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Factory, ShieldCheck } from "lucide-react";

export function Frame7Audience() {
  return (
    <section className="w-full max-w-[1440px] mx-auto px-6 md:px-20 py-24">
        <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold tracking-tight">Who Is This For</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <AudienceCard 
                icon={Users}
                title="Design Engineer"
                items={["Faster iteration", "Clear margins", "Less rework"]}
            />
            <AudienceCard 
                icon={Factory}
                title="Supplier / Mfg"
                items={["Clear specs", "Fewer questions", "Faster quoting"]}
            />
            <AudienceCard 
                icon={ShieldCheck}
                title="Engineering Manager"
                items={["Review transparency", "Reduced risk", "Consistent decisions"]}
            />
        </div>
    </section>
  );
}

function AudienceCard({ icon: Icon, title, items }: { icon: any, title: string, items: string[] }) {
    return (
        <Card className="text-center h-full hover:shadow-md transition-shadow">
            <CardHeader>
                <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
                    <Icon className="h-6 w-6 text-foreground" />
                </div>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    {items.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
            </CardContent>
        </Card>
    )
}

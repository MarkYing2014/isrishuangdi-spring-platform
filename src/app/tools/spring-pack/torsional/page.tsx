"use client";

import { TorsionalSystemCalculator } from "@/components/calculators/TorsionalSystemCalculator";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/language-context";

export default function TorsionalPackPage() {
    const { language } = useLanguage();
    const isZh = language === "zh";

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/tools/spring-pack">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {isZh ? "返回" : "Back"}
                    </Button>
                </Link>
                <div>
                   <h1 className="text-2xl font-bold tracking-tight">
                        {isZh ? "切向/扭转弹簧包" : "Torsional Spring Pack"}
                   </h1>
                   <p className="text-sm text-muted-foreground">
                        {isZh ? "多级刚度系统 | Dual Mass Flywheel (DMF)" : "Multi-stage Stiffness System | Dual Mass Flywheel (DMF)"}
                   </p>
                </div>
            </div>

            <TorsionalSystemCalculator />
        </div>
    );
}

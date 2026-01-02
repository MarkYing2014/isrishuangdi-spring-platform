"use client";

import { AxialPackCalculator } from "@/components/calculators/AxialPackCalculator";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/language-context";

export default function AxialPackPage() {
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
                        {isZh ? "轴向弹簧包 (离合器回位)" : "Axial Spring Pack (Clutch Return)"}
                   </h1>
                   <p className="text-sm text-muted-foreground">
                        {isZh ? "环形阵列并联计算 | Piston Return | Multi-point Support" : "Circular Parallel Array | Piston Return | Multi-point Support"}
                   </p>
                </div>
            </div>

            <AxialPackCalculator />
        </div>
    );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-context";
import Link from "next/link";
import { ArrowRight, Disc, Settings, Layers } from "lucide-react";

export default function SpringPackHubPage() {
    const { language } = useLanguage();
    const isZh = language === "zh";

    return (
        <div className="container mx-auto py-12 space-y-8">
            <div className="space-y-4 text-center max-w-2xl mx-auto">
                <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
                    {isZh ? "弹簧包与总成" : "SPRING PACK & ASSEMBLY"}
                </p>
                <h1 className="text-4xl font-bold tracking-tight">
                    {isZh ? "选择弹簧包架构" : "Select Pack Architecture"}
                </h1>
                <p className="text-muted-foreground text-lg">
                    {isZh 
                        ? "请根据受力方向选择包括类型：切向（扭转）或 轴向（离合器回位）。" 
                        : "Choose the pack configuration based on force application: Tangential (Torsional) or Axial (Clutch Return)."
                    }
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-12">
                {/* Card A: Torsional */}
                <Card className="hover:border-blue-400/50 hover:shadow-lg transition-all cursor-pointer group border-slate-200">
                    <CardHeader className="pb-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                            <Settings className="w-6 h-6 text-blue-600" />
                        </div>
                        <CardTitle className="flex items-center gap-2">
                             {isZh ? "切向/扭转弹簧包" : "Torsional Spring Pack"}
                             <span className="text-xs font-normal text-muted-foreground border px-2 py-0.5 rounded-full">TSP</span>
                        </CardTitle>
                        <CardDescription>
                            {isZh ? "用于双质量飞轮(DMF)、离合器减震" : "For Dual Mass Flywheels (DMF), Clutch Dampers"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="h-32 bg-slate-100 rounded-md flex items-center justify-center relative overflow-hidden">
                             {/* Placeholder Graphic */}
                             <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-slate-100 opacity-50" />
                             <Disc className="w-16 h-16 text-slate-300" />
                        </div>
                        
                        <div className="space-y-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                                {isZh ? "多级刚度曲线设计" : "Multi-stage stiffness design"}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                                {isZh ? "串联/并联/嵌套" : "Series/Parallel/Nested config"}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                                {isZh ? "滞回与摩擦分析" : "Hysteresis & Friction analysis"}
                            </div>
                        </div>

                        <Link href="/tools/spring-pack/torsional" className="block">
                            <Button className="w-full group-hover:bg-blue-600" variant="outline">
                                {isZh ? "进入模块" : "Open Calculation"}
                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                {/* Card B: Axial */}
                <Card className="hover:border-purple-400/50 hover:shadow-lg transition-all cursor-pointer group border-slate-200">
                    <CardHeader className="pb-4">
                        <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-100 transition-colors">
                            <Layers className="w-6 h-6 text-purple-600" />
                        </div>
                        <CardTitle className="flex items-center gap-2">
                             {isZh ? "轴向弹簧包" : "Axial Spring Pack"}
                             <span className="text-xs font-normal text-muted-foreground border px-2 py-0.5 rounded-full">ASP</span>
                        </CardTitle>
                        <CardDescription>
                            {isZh ? "用于离合器回位 (Piston Return)、多点支撑" : "For Clutch Piston Return, Multi-point Support"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="h-32 bg-slate-100 rounded-md flex items-center justify-center relative overflow-hidden">
                             {/* Placeholder Graphic */}
                             <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-slate-100 opacity-50" />
                             <div className="grid grid-cols-2 gap-2 opacity-30">
                                <div className="w-4 h-8 bg-slate-400 rounded-full" />
                                <div className="w-4 h-8 bg-slate-400 rounded-full" />
                             </div>
                        </div>
                        
                        <div className="space-y-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                                {isZh ? "圆周阵列并联计算" : "Circular array parallel calculation"}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                                {isZh ? "弹簧对弹簧/边界干涉检查" : "Spring-to-spring/boundary checks"}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                                {isZh ? "Instanced 3D 预览" : "Instanced 3D Visualization"}
                            </div>
                        </div>

                        <Link href="/tools/spring-pack/axial" className="block">
                            <Button className="w-full group-hover:bg-purple-600" variant="outline">
                                {isZh ? "进入模块" : "Open Calculation"}
                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

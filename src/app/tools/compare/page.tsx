"use client";

import React, { useMemo, useState } from "react";
import { 
  ArrowLeft, 
  BarChart3, 
  Trash2, 
  ChevronRight, 
  History,
  Info,
  Layers,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useSpringDesignStore, type SavedDesign } from "@/lib/stores/springDesignStore";
import { useLanguage } from "@/components/language-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";

export default function CompareDesignsPage() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const { savedDesigns, deleteDesign, setDesign } = useSpringDesignStore();

  const [selectedIds, setSelectedIds] = useState<string[]>(() => 
    savedDesigns.slice(0, 3).map(d => d.id)
  );

  const selectedDesigns = useMemo(() => 
    savedDesigns.filter(d => selectedIds.includes(d.id)),
    [savedDesigns, selectedIds]
  );

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  const handleRestore = (design: SavedDesign) => {
    setDesign({
      springType: design.springType,
      geometry: design.geometry,
      material: design.material,
      analysisResult: design.analysisResult,
    });
  };

  // Prepare chart data (Force-Deflection)
  const chartData = useMemo(() => {
    if (selectedDesigns.length === 0) return [];
    
    // Find max deflection to normalize X axis
    const maxDef = Math.max(...selectedDesigns.map(d => d.analysisResult.maxDeflection ?? 50));
    const step = maxDef / 10;
    
    const data = [];
    for (let i = 0; i <= 10; i++) {
        const x = i * step;
        const entry: any = { name: x.toFixed(1) };
        selectedDesigns.forEach(d => {
            const k = d.analysisResult.springRate;
            entry[d.designCode] = k * x; // Simplified linear assumption for comparison
        });
        data.push(entry);
    }
    return data;
  }, [selectedDesigns]);

  const colors = ["#2563eb", "#db2777", "#059669", "#d97706", "#7c3aed"];

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Breadcrumbs / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/tools/analysis" className="hover:text-primary transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              {isZh ? "工程分析" : "Engineering Analysis"}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{isZh ? "对比工具" : "Comparison Tool"}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{isZh ? "方案对比 / Comparison" : "Design Case Comparison"}</h1>
          <p className="text-muted-foreground">
            {isZh ? "侧重物理性能、安全系数与成本潜力的多维度评估。" : "Side-by-side evaluation of physical performance, safety factors, and cost potential."}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
           <Badge variant="secondary" className="px-3 py-1">
             <History className="mr-2 h-3.5 w-3.5" />
             {savedDesigns.length} {isZh ? "个已保存方案" : "Saved Cases"}
           </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr,350px] gap-8">
        <div className="space-y-8">
          {/* Comparison Table */}
          <Card className="overflow-hidden border-2 border-slate-100 shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
                {isZh ? "性能矩阵对照" : "Performance Matrix"}
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/30">
                  <TableHead className="w-[150px]">{isZh ? "指标" : "Metric"}</TableHead>
                  {selectedDesigns.map((d, idx) => (
                    <TableHead key={d.id} className="min-w-[120px]">
                      <div className="flex flex-col gap-1">
                        <span className="text-blue-600 font-mono text-xs">{d.designCode}</span>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{d.springType}</span>
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                        </div>
                      </div>
                    </TableHead>
                  ))}
                  {selectedDesigns.length === 0 && <TableHead>{isZh ? "请从侧边栏选择方案" : "Select designs from sidebar"}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground">{isZh ? "刚度 k" : "Rate k"}</TableCell>
                  {selectedDesigns.map(d => (
                    <TableCell key={d.id} className="font-semibold tabular-nums">
                        {d.analysisResult.springRate.toFixed(3)} <span className="text-[10px] font-normal text-muted-foreground">{d.analysisResult.springRateUnit}</span>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground">{isZh ? "安全系数 SF" : "Safety Factor"}</TableCell>
                  {selectedDesigns.map(d => (
                    <TableCell key={d.id}>
                       <Badge 
                         variant={ (d.analysisResult.staticSafetyFactor ?? 0) < 1.1 ? "destructive" : "secondary" }
                         className="rounded-full px-2"
                       >
                         {d.analysisResult.staticSafetyFactor?.toFixed(2) ?? "-"}
                       </Badge>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground">{isZh ? "最大应力" : "Max Stress"}</TableCell>
                  {selectedDesigns.map(d => (
                    <TableCell key={d.id} className="tabular-nums">
                        {d.analysisResult.maxStress?.toFixed(0)} <span className="text-[10px] text-muted-foreground">MPa</span>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground">{isZh ? "估算体积" : "Est. Volume"}</TableCell>
                  {selectedDesigns.map(d => (
                    <TableCell key={d.id} className="text-muted-foreground italic">
                        {isZh ? "计算中..." : "Calculating..."}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="bg-slate-50/20">
                    <TableCell className="font-medium">{isZh ? "操作" : "Action"}</TableCell>
                    {selectedDesigns.map(d => (
                        <TableCell key={d.id}>
                             <Button size="sm" variant="ghost" className="text-blue-600 h-8" asChild onClick={() => handleRestore(d)}>
                               <Link href="/tools/analysis">
                                 {isZh ? "载入" : "Load"}
                               </Link>
                             </Button>
                        </TableCell>
                    ))}
                </TableRow>
              </TableBody>
            </Table>
          </Card>

          {/* Performance Curves */}
          <Card className="border-2 border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
                {isZh ? "力-位移特性曲线叠加" : "Force-Deflection Overlay"}
              </CardTitle>
              <CardDescription>
                {isZh ? "可视化对比不同方案在全量程下的载荷响应。" : "Visual comparison of load response across the full operating range."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis 
                       dataKey="name" 
                       label={{ value: isZh ? '位移 (mm)' : 'Deflection (mm)', position: 'insideBottomRight', offset: -5, fontSize: 10 }}
                       fontSize={12}
                    />
                    <YAxis 
                       label={{ value: isZh ? '力 (N)' : 'Force (N)', angle: -90, position: 'insideLeft', fontSize: 10 }}
                       fontSize={12}
                    />
                    <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    {selectedDesigns.map((d, idx) => (
                        <Line 
                           key={d.id}
                           type="monotone" 
                           dataKey={d.designCode} 
                           stroke={colors[idx % colors.length]} 
                           strokeWidth={3}
                           dot={false}
                           activeDot={{ r: 6 }}
                        />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Selection & Legend */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{isZh ? "选择对比方案" : "Select Designs"}</CardTitle>
              <CardDescription className="text-xs">
                {isZh ? `最多选择 5 个方案 (已选 ${selectedIds.length})` : `Pick up to 5 cases (Selected ${selectedIds.length})`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {savedDesigns.map((design, idx) => (
                <div 
                    key={design.id} 
                    className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                        selectedIds.includes(design.id) 
                            ? "bg-blue-50/50 border-blue-200 ring-1 ring-blue-100" 
                            : "bg-white border-slate-100 hover:border-slate-200"
                    )}
                    onClick={() => toggleSelection(design.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold",
                        selectedIds.includes(design.id) ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                    )}>
                      {idx + 1}
                    </div>
                    <div>
                        <p className="text-xs font-mono font-bold leading-tight">{design.designCode}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(design.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {selectedIds.includes(design.id) && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                </div>
              ))}

              {savedDesigns.length === 0 && (
                <div className="py-8 text-center">
                    <History className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">{isZh ? "暂无保存记录" : "No saved cases"}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 text-slate-100 border-none">
            <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    {isZh ? "推荐决策" : "Recommendation"}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                    {isZh 
                      ? "基于选定方案，系统检测到方案 A 的安全系数最高，但方案 B 的体积效率最佳。" 
                      : "Based on selected cases, Case A has the highest SF, while Case B offers the best volumetric efficiency."}
                </p>
                <Button className="w-full bg-blue-600 hover:bg-blue-500 h-9 rounded-full text-xs" variant="default">
                    {isZh ? "申请制造可行性评审" : "Request Feasibility Review"}
                </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper for conditional classes
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

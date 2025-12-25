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
import { ComparisonEngine } from "@/lib/comparison/ComparisonEngine";
import { cn } from "@/lib/utils";

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

  // Generate semantic comparison matrix
  const comparisonMatrix = useMemo(() => 
    ComparisonEngine.getComparisonMatrix(selectedDesigns),
    [selectedDesigns]
  );

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : (prev.length < 5 ? [...prev, id] : prev)
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
            <span className="text-foreground font-medium">{isZh ? "方案对比" : "Comparison Tool"}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{isZh ? "统一工程方案对比" : "Unified Component Comparison"}</h1>
          <p className="text-muted-foreground">
            {isZh ? "跨类型弹簧的物理性能、安全系数与几何限制的多维度评估。" : "Cross-type spring evaluation of physics, safety, and geometry limits."}
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
                {isZh ? "工程性能矩阵" : "Engineering Matrix"}
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/30">
                    <TableHead className="w-[180px] font-bold">{isZh ? "工程指标" : "Metric"}</TableHead>
                    {selectedDesigns.map((d, idx) => (
                      <TableHead key={d.id} className="min-w-[140px]">
                        <div className="flex flex-col gap-1">
                          <span className="text-blue-600 font-mono text-xs">{d.designCode}</span>
                          <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground px-1.5 py-0.5 bg-slate-100 rounded">{d.springType}</span>
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                          </div>
                        </div>
                      </TableHead>
                    ))}
                    {selectedDesigns.length === 0 && <TableHead>{isZh ? "请从侧边栏选择方案" : "Select designs from sidebar"}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonMatrix.map((row, rowIdx) => (
                    <TableRow key={row.definition.key} className={cn(rowIdx % 5 === 0 && "bg-slate-50/10")}>
                      <TableCell className="font-medium text-slate-500 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{isZh ? row.definition.labelZh : row.definition.labelEn}</span>
                          {row.definition.unit && <span className="text-[10px] text-muted-foreground">({row.definition.unit})</span>}
                        </div>
                      </TableCell>
                      {row.cells.map((cell, cellIdx) => (
                        <TableCell key={cell.id} className={cn("tabular-nums", cell.isBest && "text-blue-700 font-bold")}>
                          {row.definition.key === "audit_status" ? (
                            <Badge 
                              variant={cell.value === "PASS" ? "secondary" : cell.value === "WARN" ? "outline" : "destructive"}
                              className={cn(
                                "rounded-sm px-1 text-[10px] uppercase tracking-wider",
                                cell.value === "PASS" && "bg-emerald-50 text-emerald-700 border-emerald-100"
                              )}
                            >
                              {cell.value}
                            </Badge>
                          ) : (
                            <div className="flex flex-col">
                               <span>{cell.formattedValue}</span>
                               {cell.isBest && <span className="text-[9px] uppercase text-blue-500">{isZh ? "最优" : "Best"}</span>}
                            </div>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-50/50 border-t-2">
                      <TableCell className="font-bold">{isZh ? "决策操作" : "Decision"}</TableCell>
                      {selectedDesigns.map(d => (
                          <TableCell key={d.id}>
                               <Button size="sm" variant="default" className="h-8 text-xs w-full shadow-sm" asChild onClick={() => handleRestore(d)}>
                                 <Link href="/tools/analysis">
                                   {isZh ? "载入及详审" : "Load & Review"}
                                 </Link>
                               </Button>
                          </TableCell>
                      ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
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
              <CardTitle className="text-sm font-semibold">{isZh ? "设计方案库" : "Design Library"}</CardTitle>
              <CardDescription className="text-xs">
                {isZh ? `支持跨类型对比 (已选 ${selectedIds.length}/5)` : `Cross-type ready (Selected ${selectedIds.length}/5)`}
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
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">{design.springType}</Badge>
                    {selectedIds.includes(design.id) && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                  </div>
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

          <Card className="bg-slate-900 text-slate-100 border-none shadow-xl">
            <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    {isZh ? "系统选型建议" : "Selection Insight"}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                    {isZh 
                      ? "基于当前工程指标，系统会自动识别最优解（Blue Text）。建议优先平衡“安全系数”与“体积效率”。" 
                      : "The system identifies optimal values in Blue. We recommend balancing Safety Factor and Volumetric Efficiency."}
                </p>
                <Button className="w-full bg-blue-600 hover:bg-blue-500 h-9 rounded-full text-xs font-bold" variant="default">
                    {isZh ? "申请专家评审" : "Request Expert Review"}
                </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

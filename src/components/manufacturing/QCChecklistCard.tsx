import React, { useState } from "react";
import { 
  ClipboardCheck, 
  CheckSquare, 
  Square, 
  Target,
  Ruler,
  Weight,
  Eye,
  FileCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { QCChecklist, QCItem } from "@/lib/manufacturing/workOrderTypes";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language-context";

interface QCChecklistCardProps {
  checklist: QCChecklist;
  className?: string;
  readOnly?: boolean;
}

export function QCChecklistCard({ checklist, className, readOnly = false }: QCChecklistCardProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [activeTab, setActiveTab] = useState("dimensions");

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-emerald-50/50 pb-4 border-b border-emerald-100/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-emerald-600" />
            <CardTitle className="text-lg">
              {isZh ? "质量检验清单" : "QC Checklist"}
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-200">
             Auto-Generated
          </Badge>
        </div>
      </CardHeader>
      
      <Tabs defaultValue="dimensions" className="w-full" onValueChange={setActiveTab}>
        <div className="px-4 pt-2 bg-slate-50/50 border-b">
          <TabsList className="bg-transparent h-9 w-full justify-start gap-4 p-0">
            <TabsTrigger 
              value="dimensions" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none px-1"
            >
              <Ruler className="w-3.5 h-3.5 mr-2" />
              {isZh ? "尺寸" : "Dimensions"}
            </TabsTrigger>
            <TabsTrigger 
              value="load" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none px-1"
            >
              <Weight className="w-3.5 h-3.5 mr-2" />
              {isZh ? "载荷" : "Load"}
            </TabsTrigger>
            <TabsTrigger 
              value="appearance" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none px-1"
            >
              <Eye className="w-3.5 h-3.5 mr-2" />
              {isZh ? "外观" : "Appearance"}
            </TabsTrigger>
            <TabsTrigger 
              value="process" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none px-1"
            >
              <FileCheck className="w-3.5 h-3.5 mr-2" />
              {isZh ? "工艺" : "Process"}
            </TabsTrigger>
          </TabsList>
        </div>

        <CardContent className="p-0">
          <QCItemGroup items={checklist.dimensions} value="dimensions" />
          <QCItemGroup items={checklist.loadTests} value="load" />
          <QCItemGroup items={checklist.appearance} value="appearance" />
          <QCItemGroup items={checklist.processVerification} value="process" />
        </CardContent>
      </Tabs>
    </Card>
  );
}

function QCItemGroup({ items, value }: { items: QCItem[]; value: string }) {
  const { language } = useLanguage();
  const isZh = language === "zh";

  if (!items || items.length === 0) {
    return (
      <TabsContent value={value} className="p-8 text-center text-slate-400 text-sm">
        {isZh ? "无相关检验项" : "No items in this category"}
      </TabsContent>
    );
  }

  return (
    <TabsContent value={value} className="divide-y divide-slate-100">
      {items.map((item) => (
        <div key={item.itemId} className="flex gap-4 p-4 hover:bg-slate-50 transition-colors">
          <div className="mt-1">
             <Square className="w-4 h-4 text-slate-300" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm text-slate-800">{item.description}</span>
              {item.required && <Badge variant="secondary" className="text-[10px] h-4">REQ</Badge>}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 mt-2">
              {item.target !== undefined && (
                <div className="flex items-center gap-2">
                  <Target className="w-3 h-3 text-emerald-500" />
                  <span>Target: {item.target} {item.unit}</span>
                </div>
              )}
              {item.tolerance && (
                <div>Tolerance: <span className="font-mono text-slate-700">{item.tolerance}</span></div>
              )}
              {(item.min !== undefined && item.max !== undefined) && (
                <div className="col-span-2 font-mono text-[10px] bg-slate-100 px-2 py-1 rounded inline-block w-fit">
                   Range: [{item.min.toFixed(3)} - {item.max.toFixed(3)}] {item.unit}
                </div>
              )}
              {item.passCriteria && (
                <div className="col-span-2 text-emerald-600 bg-emerald-50/50 px-2 py-1 rounded">
                   Criteria: {item.passCriteria}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </TabsContent>
  );
}

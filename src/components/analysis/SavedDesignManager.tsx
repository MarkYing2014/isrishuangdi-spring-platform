"use client";

import React, { useState } from "react";
import { 
  Save, 
  History, 
  Trash2, 
  ArrowRight, 
  Check, 
  LayoutPanelLeft,
  X
} from "lucide-react";
import { 
  useSpringDesignStore, 
  type SavedDesign 
} from "@/lib/stores/springDesignStore";
import { useLanguage } from "@/components/language-context";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function SavedDesignManager() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  
  const { 
    savedDesigns, 
    saveDesign, 
    deleteDesign, 
    hasValidDesign,
    setDesign
  } = useSpringDesignStore();

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    saveDesign();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleRestore = (design: SavedDesign) => {
    setDesign({
      springType: design.springType,
      geometry: design.geometry,
      material: design.material,
      analysisResult: design.analysisResult,
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Save Button */}
      {hasValidDesign && (
        <Button 
          size="sm" 
          variant={saveSuccess ? "secondary" : "default"}
          className="rounded-full shadow-sm"
          onClick={handleSave}
        >
          {saveSuccess ? (
            <Check className="mr-2 h-4 w-4 text-green-500" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isZh ? (saveSuccess ? "已保存" : "保存方案") : (saveSuccess ? "Saved" : "Save Case")}
        </Button>
      )}

      {/* History Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button size="sm" variant="outline" className="rounded-full bg-background/50 backdrop-blur-sm">
            <History className="mr-2 h-4 w-4 text-blue-500" />
            {isZh ? "历史记录" : "History"}
            {savedDesigns.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                {savedDesigns.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[450px] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-500" />
              {isZh ? "工程方案记录" : "Engineering Design History"}
            </SheetTitle>
            <SheetDescription>
              {isZh 
                ? "查看和对比已保存的弹簧设计方案。" 
                : "View and compare your saved spring design cases."}
            </SheetDescription>
          </SheetHeader>

          {savedDesigns.length > 0 ? (
            <div className="space-y-4">
              {/* Compare Trigger */}
              {savedDesigns.length >= 2 && (
                <Link href="/tools/compare" className="block">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    <LayoutPanelLeft className="mr-2 h-4 w-4" />
                    {isZh ? "对比选定方案" : "Compare Designs"}
                  </Button>
                </Link>
              )}

              <div className="space-y-3">
                {savedDesigns.map((design) => (
                  <Card key={design.id} className="relative group hover:border-blue-200 transition-colors">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteDesign(design.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {design.designCode}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground italic">
                          {new Date(design.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <CardTitle className="text-sm font-medium mt-1">
                        {isZh ? "类型: " : "Type: "} {design.springType}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 text-xs">
                      <div className="grid grid-cols-2 gap-y-1 text-muted-foreground">
                        <span>k: {design.analysisResult.springRate.toFixed(2)} {design.analysisResult.springRateUnit}</span>
                        <span>SF: {design.analysisResult.staticSafetyFactor?.toFixed(2) ?? "-"}</span>
                        <span>Max S: {design.analysisResult.maxStress?.toFixed(0) ?? "-"} MPa</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-3 h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex items-center justify-center p-0"
                        onClick={() => handleRestore(design)}
                      >
                        {isZh ? "载入此方案" : "Load this case"}
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <History className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground max-w-[200px]">
                {isZh 
                  ? "尚无保存记录。点击主页面的“保存方案”开始记录。" 
                  : "No history yet. Click 'Save Case' on the analysis page to start."}
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

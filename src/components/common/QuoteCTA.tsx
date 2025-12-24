"use client";

import React from "react";
import { 
  CheckCircle, 
  ArrowRight, 
  MessageSquare, 
  Factory,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageText } from "@/components/language-context";
import { useLanguage } from "@/components/language-context";
import Link from "next/link";

interface QuoteCTAProps {
  onDismiss?: () => void;
  designCode?: string;
  isVisible: boolean;
}

export function QuoteCTA({ onDismiss, designCode, isVisible }: QuoteCTAProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="max-w-md w-full shadow-2xl border-none overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-emerald-600 p-6 text-white text-center">
          <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-1">
             <LanguageText en="Export Successful!" zh="导出成功！" />
          </h3>
          <p className="text-emerald-50 text-sm opacity-90">
             {designCode && (
               <span className="font-mono bg-emerald-700/50 px-2 py-0.5 rounded mr-2">
                 {designCode}
               </span>
             )}
             <LanguageText en="Your engineering data is ready." zh="您的工程数据已准备就绪。" />
          </p>
        </div>
        
        <CardContent className="p-6 space-y-6 bg-white">
          <div className="space-y-4">
             <div className="flex gap-3">
                <div className="mt-1 h-5 w-5 text-blue-600 shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                   <p className="text-sm font-bold text-slate-800">
                     <LanguageText en="Verify Manufacturing Feasibility" zh="验证生产可行性" />
                   </p>
                   <p className="text-xs text-muted-foreground leading-relaxed">
                     <LanguageText 
                        en="Let our factory engineers review your design for production efficiency and cost optimization." 
                        zh="让我们的工厂工程师为您评审设计，优化生产效率并降低成本。" 
                     />
                   </p>
                </div>
             </div>

             <div className="flex gap-3">
                <div className="mt-1 h-5 w-5 text-indigo-600 shrink-0">
                  <Factory className="h-5 w-5" />
                </div>
                <div>
                   <p className="text-sm font-bold text-slate-800">
                     <LanguageText en="Get a Formal RFQ" zh="获取正式报价 (RFQ)" />
                   </p>
                   <p className="text-xs text-muted-foreground leading-relaxed">
                     <LanguageText 
                        en="Receive a professional quotation based on your exact engineering specifications." 
                        zh="根据您的精确工程规范获取专业报价。" 
                     />
                   </p>
                </div>
             </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
             <Link href="/rfq" passHref className="w-full">
               <Button className="w-full bg-blue-600 hover:bg-blue-700 h-11 rounded-xl text-sm font-bold gap-2 group">
                 <LanguageText en="Request Quote / Review" zh="申请报价与评审" />
                 <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
               </Button>
             </Link>
             <Button variant="ghost" className="w-full h-11 rounded-xl text-slate-500 text-sm" onClick={onDismiss}>
               <LanguageText en="Back to Design" zh="返回设计" />
             </Button>
          </div>
          
          <div className="pt-2 text-center">
             <p className="text-[11px] text-muted-foreground">
               <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2" />
               <LanguageText 
                 en="Response within 24 hours from our technical team." 
                 zh="我们的技术团队将在 24 小时内回复您。" 
               />
             </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

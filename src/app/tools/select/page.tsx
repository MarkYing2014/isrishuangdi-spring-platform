"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  ArrowRight,
  CheckCircle2,
  Info
} from "lucide-react";

import { useLanguage } from "@/components/language-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  SELECTION_QUESTIONS, 
  evaluateSelection 
} from "@/lib/selection/decisionTree";
import { SPRING_TYPE_LABELS, type SpringType } from "@/lib/springTypes";
import { cn } from "@/lib/utils";

export default function SelectionWizardPage() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isFinished, setIsFinished] = useState(false);

  const totalSteps = SELECTION_QUESTIONS.length;
  const progressValue = ((currentStep) / totalSteps) * 100;

  const currentQuestion = SELECTION_QUESTIONS[currentStep];

  const handleAnswer = (value: string) => {
    const nextAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(nextAnswers);
    
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsFinished(true);
    }
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setAnswers({});
    setIsFinished(false);
  };

  const results = useMemo(() => {
    if (!isFinished) return null;
    return evaluateSelection(answers);
  }, [answers, isFinished]);

  if (isFinished && results) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="text-center space-y-2">
          <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
            {isZh ? "工程建议" : "Engineering Recommendation"}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {isZh ? "推荐方案" : "Recommended Solutions"}
          </h1>
          <p className="text-slate-500">
            {isZh ? "根据您的工况参数，我们筛选出以下最佳弹簧类型：" : "Based on your requirements, we have selected the optimal spring types:"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.recommended.map((type, idx) => {
            const label = SPRING_TYPE_LABELS[type];
            const reason = results.reasons.find(r => r.type === type);
            
            return (
              <Card key={type} className={cn(
                "group relative overflow-hidden transition-all hover:shadow-lg border-slate-200",
                idx === 0 && "border-blue-200 ring-1 ring-blue-100"
              )}>
                {idx === 0 && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-bl-lg">
                    {isZh ? "首选" : "Top Pick"}
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">
                    {isZh ? label.zh : label.en}
                  </CardTitle>
                  <CardDescription>
                    {isZh ? "匹配度最高" : "Highest match for requirements"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <p>{isZh ? reason?.reasonZh : reason?.reasonEn}</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full bg-slate-900 hover:bg-slate-800">
                    <Link href={`/tools/calculator?type=${type}`}>
                      {isZh ? "开始设计" : "Start Designing"}
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <Card className="bg-slate-50 border-dashed border-slate-300">
          <CardContent className="py-6 flex flex-col items-center justify-center space-y-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Info className="w-4 h-4" />
              <span>{isZh ? "如果您有更复杂的需求（如多层嵌套、极端高温），请联系我们的专家团队。" : "For complex needs (e.g., nesting, extreme temperatures), please contact our expert team."}</span>
            </div>
            <Button variant="outline" onClick={resetWizard} className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              {isZh ? "重新开始" : "Start Over"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-slate-500 font-medium">
          <span>{isZh ? `步骤 ${currentStep + 1} / ${totalSteps}` : `Step ${currentStep + 1} of ${totalSteps}`}</span>
          <span>{Math.round(progressValue)}%</span>
        </div>
        <Progress value={progressValue} className="h-2" />
      </div>

      <Card className="border-none shadow-xl bg-white ring-1 ring-slate-200">
        <CardHeader className="pb-8">
          <CardTitle className="text-2xl font-bold text-slate-900 mb-2">
            {isZh ? currentQuestion.textZh : currentQuestion.textEn}
          </CardTitle>
          <CardDescription className="text-base">
            {isZh ? "请选择最符合您工况的选项，以便为您生成工程建议。" : "Please select the option that best fits your operating conditions."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {currentQuestion.options?.map((option) => (
            <button
              key={option.value}
              onClick={() => handleAnswer(option.value)}
              className={cn(
                "flex items-center justify-between p-5 rounded-xl border-2 text-left transition-all",
                "hover:border-blue-500 hover:bg-blue-50/50",
                answers[currentQuestion.id] === option.value
                  ? "border-blue-600 bg-blue-50 shadow-sm"
                  : "border-slate-100 bg-slate-50/30"
              )}
            >
              <div className="space-y-1">
                <div className="font-semibold text-slate-900">
                  {isZh ? option.labelZh : option.labelEn}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          ))}
        </CardContent>
        <CardFooter className="flex justify-between pt-6 border-t border-slate-50">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="text-slate-500"
          >
            <ChevronLeft className="mr-2 w-4 h-4" />
            {isZh ? "上一步" : "Previous"}
          </Button>
          {currentStep > 0 && (
            <Button variant="ghost" onClick={resetWizard} className="text-slate-400 text-xs">
              {isZh ? "清空并退出" : "Reset & Exit"}
            </Button>
          )}
        </CardFooter>
      </Card>

      <div className="px-6 text-center">
        <p className="text-xs text-slate-400 leading-relaxed italic">
          {isZh ? "* 选型方案由 ISRI-SHUANGDI 专家业务规则驱动，不构成最终设计承诺。" : "* Recommendations are driven by expert business rules and do not constitute a final design commitment."}
        </p>
      </div>
    </div>
  );
}

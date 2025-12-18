"use client";

import Link from "next/link";

import { LanguageText } from "@/components/language-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function QualityPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
          <LanguageText en="Module • Quality Management" zh="模块 • 质量管理" />
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          <LanguageText en="Quality Management" zh="质量管理" />
        </h1>
        <p className="text-muted-foreground">
          <LanguageText
            en="This is a sidecar module. It will import inspection data and generate analytics + reports without changing any spring geometry/calculation/3D."
            zh="这是一个旁路模块：用于导入质检数据并生成分析与报告，不会影响任何弹簧几何/计算/3D。"
          />
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <LanguageText en="Coming soon" zh="即将上线" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            <LanguageText
              en="V1 target: CSV ingestion → mapping → SPC & capability → HTML/PDF report."
              zh="V1 目标：CSV 导入 → 字段映射 → SPC + 过程能力 → HTML/PDF 报告。"
            />
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/">
                <LanguageText en="Back to Home" zh="返回首页" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/tools/analysis">
                <LanguageText en="View Engineering Analysis" zh="查看工程分析" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

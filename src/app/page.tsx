import { LanguageText } from "@/components/language-context";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  Box,
  Calculator,
  FileCog,
  Mail,
  Move3D,
  PackageSearch,
  Cog,
  Activity,
  Shield,
  type LucideIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HomeRiskRadar } from "@/components/home/HomeRiskRadar";
import { HoverGlassCard } from "@/components/home/HoverGlassCard";
import { HeroSpline } from "@/components/home/hero-spline";

const features = [
  {
    title: { en: "Spring Calculator", zh: "弹簧计算器" },
    description: {
      en: "Rapid stiffness, stress, and fatigue placeholders with ISRI best practices embedded.",
      zh: "快速计算刚度、剪应力与疲劳安全系数，占位实现 ISRI 标准工程流程。",
    },
    href: "/tools/calculator",
    icon: Calculator,
  },
  {
    title: { en: "Engineering Analysis", zh: "工程分析" },
    description: {
      en: "Complete stress, S-N fatigue life, safety factor, and buckling analysis for all spring types.",
      zh: "完整的应力、S-N 疲劳寿命、安全系数和屈曲分析，支持所有弹簧类型。",
    },
    href: "/tools/analysis",
    icon: BarChart3,
  },
  {
    title: { en: "Spring Simulator", zh: "弹簧仿真" },
    description: {
      en: "Interactive 3D modeling with pitch, free length, and bending foot presets.",
      zh: "交互式 3D 建模，实时调整节距、自由长、脚位等参数。",
    },
    href: "/tools/simulator",
    icon: Move3D,
  },
  {
    title: { en: "CAD Export", zh: "CAD 导出" },
    description: {
      en: "Creo-ready PDF, STEP, and native files powered by automated drafting pipelines.",
      zh: "自动生成 Creo PDF、STEP 以及原生模型文件。",
    },
    href: "/tools/cad-export",
    icon: FileCog,
  },
  {
    title: { en: "RFQ", zh: "询价" },
    description: {
      en: "Hand off validated designs directly to ISRI-SHUANGDI sourcing in one click.",
      zh: "一键将设计结果推送至 ISRI-SHUANGDI 采购团队。",
    },
    href: "/rfq",
    icon: Mail,
  },
  {
    title: { en: "Spring Catalog", zh: "产品目录" },
    description: {
      en: "Search verified production springs with tolerance, finish, and load filters.",
      zh: "检索量产弹簧，支持公差、表面处理、载荷等条件过滤。",
    },
    href: "/catalog",
    icon: PackageSearch,
  },
  {
    title: { en: "Quality Management", zh: "质量管理" },
    description: {
      en: "Import inspection data, run SPC/capability analytics, and export standardized reports (sidecar).",
      zh: "导入质检数据，进行 SPC/过程能力分析，并导出标准化报告（旁路模块）。",
    },
    href: "/quality",
    icon: ClipboardCheck,
  },
];

type HomeFeature = {
  title: { en: string; zh: string };
  description: { en: string; zh: string };
  href: string;
  icon: LucideIcon;
};

export default function Home() {
  return (
    <div className="space-y-12">
      <Card className="rounded-3xl">
        <div className="grid gap-10 px-6 py-8 md:grid-cols-[1.2fr_0.8fr] md:items-center md:px-10 md:py-10">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>ISRI-SHUANGDI • Industry 4.0</span>
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              <LanguageText
                en="Engineering-First Spring Design & Manufacturing Platform"
                zh="以工程为核心的弹簧设计与制造平台"
              />
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              <LanguageText
                en="From Geometry → Risk → Production → Quality. Replace tribal knowledge with engineering certainty."
                zh="从几何到风险，从设计到生产。用工程确定性替代‘老师傅经验’。"
              />
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full">
                <Link href="/tools/calculator">
                  <LanguageText en="Try Engineering Calculator" zh="使用工程计算器" />
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link href="/production">
                  <LanguageText en="See Manufacturing Dashboard Demo" zh="查看制造看板演示" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border bg-muted/30 shadow-sm">
              <HeroSpline />
            </div>
          </div>
        </div>
      </Card>

      <section className="rounded-3xl border bg-background p-6 sm:p-10">
        <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>
                <LanguageText en="Engineering Risk Radar" zh="工程风险雷达" />
              </span>
            </div>

            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              <LanguageText
                en="Engineering Risk Radar for Spring Design"
                zh="工程风险雷达 · 面向制造的弹簧设计"
              />
            </h2>

            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              <LanguageText
                en="See engineering validity, manufacturing risk, and quality exposure — before production."
                zh="在生产之前，看清工程合理性、制造风险与质量隐患。"
              />
            </p>
            <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
              <LanguageText
                en="Not just calculations. Built-in engineering rules transform spring designs into manufacturing-ready decisions."
                zh="不只是计算结果，内置工程规则，把弹簧设计变成可制造的决策。"
              />
            </p>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              <LanguageText
                en="Rule-based, explainable. No black-box decisions."
                zh="规则驱动，可解释；拒绝黑盒决策。"
              />
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <Card>
                <CardHeader className="gap-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="size-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">
                      <LanguageText en="Engineering OK" zh="工程合理性" />
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  <LanguageText
                    en="Physics-based validation ensures stress, deformation, and geometry are sound."
                    zh="基于物理与工程经验，验证应力、变形与几何比例是否健康。"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="gap-2">
                  <div className="flex items-center gap-2">
                    <PackageSearch className="size-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">
                      <LanguageText en="Manufacturing Risk" zh="制造风险识别" />
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  <LanguageText
                    en="Identify coil density, wire length, spacing, and process-sensitive designs early."
                    zh="提前发现圈数、线长、间距与工艺敏感问题。"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="gap-2">
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">
                      <LanguageText en="High Risk Alert" zh="高风险预警" />
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  <LanguageText
                    en="Catch unmanufacturable or failure-prone designs before drawings reach the shop floor."
                    zh="在图纸下发前识别不可制造或高失败风险设计。"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full">
                <Link href="/tools/calculator">
                  <LanguageText en="Try the calculator" zh="进入计算器" />
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link href="/tools/analysis">
                  <LanguageText en="View analysis" zh="查看工程分析" />
                </Link>
              </Button>
            </div>
          </div>

          <HomeRiskRadar />
        </div>
      </section>

      <section className="rounded-3xl border bg-background p-6 sm:p-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>
              <LanguageText en="Live Risk Brain" zh="实时风险大脑" />
            </span>
          </div>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            <LanguageText
              en="Design → Production → Quality: Closed Loop"
              zh="设计 → 生产 → 质量：闭环系统"
            />
          </h2>
          <p className="mt-4 mx-auto max-w-3xl text-lg text-muted-foreground">
            <LanguageText
              en="Not just calculations. A unified intelligence layer that connects engineering design, real-time production monitoring, and quality analytics into one explainable decision system."
              zh="不只是计算。统一的智能层将工程设计、实时生产监控和质量分析连接成一个可解释的决策系统。"
            />
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="relative overflow-hidden border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100/50 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <Cog
                    className="h-5 w-5 text-emerald-700 motion-reduce:animate-none animate-spin"
                    style={{ animationDuration: "3.5s" }}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Step 1</p>
                  <CardTitle className="text-lg">
                    <LanguageText en="Design" zh="设计" />
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative space-y-3">
              <p className="text-sm text-muted-foreground">
                <LanguageText
                  en="Engineering Risk Radar evaluates design feasibility before production starts."
                  zh="工程风险雷达在生产开始前评估设计可行性。"
                />
              </p>
              <p className="text-xs text-muted-foreground">
                <LanguageText
                  en="Rule-based, explainable. No black-box decisions."
                  zh="规则驱动，可解释；拒绝黑盒决策。"
                />
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <LanguageText en="Stress Analysis" zh="应力分析" />
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <LanguageText en="DFM Rules" zh="DFM 规则" />
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <LanguageText en="Risk Score" zh="风险评分" />
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" size="sm" className="w-full rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <Link href="/tools/calculator">
                  <LanguageText en="Open Calculator" zh="打开计算器" />
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="relative overflow-hidden border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-100/50 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-amber-200/50 motion-reduce:hidden animate-ping" />
                  <Activity className="relative h-5 w-5 text-amber-700 motion-reduce:animate-none animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Step 2</p>
                  <CardTitle className="text-lg">
                    <LanguageText en="Production" zh="生产" />
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative space-y-3">
              <p className="text-sm text-muted-foreground">
                <LanguageText
                  en="Live monitoring with explainable risk drivers. Demo-first, production-ready."
                  zh="实时监控与可解释的风险驱动因素。演示优先，生产就绪。"
                />
              </p>
              <p className="text-xs text-muted-foreground">
                <LanguageText
                  en="Engineering assumptions validated by real production data."
                  zh="用真实生产数据验证工程假设。"
                />
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <LanguageText en="Cycle Time" zh="节拍" />
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <LanguageText en="Temp Drift" zh="温度漂移" />
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <LanguageText en="Alerts" zh="告警" />
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" size="sm" className="w-full rounded-full border-amber-200 text-amber-700 hover:bg-amber-50">
                <Link href="/production">
                  <LanguageText en="Open Dashboard" zh="打开看板" />
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="relative overflow-hidden border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-white">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-100/50 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-sky-200/50 motion-reduce:hidden animate-ping" />
                  <Shield className="relative h-5 w-5 text-sky-700 motion-reduce:animate-none animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-sky-600">Step 3</p>
                  <CardTitle className="text-lg">
                    <LanguageText en="Quality" zh="质量" />
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative space-y-3">
              <p className="text-sm text-muted-foreground">
                <LanguageText
                  en="SPC, Nelson rules, Cp/Cpk, MSA (Gage R&R), and PPAP-ready reports."
                  zh="SPC、Nelson 规则、Cp/Cpk、MSA（Gage R&R）和 PPAP 报告。"
                />
              </p>
              <p className="text-xs text-muted-foreground">
                <LanguageText
                  en="Fully traceable, explainable, and auditable."
                  zh="可追溯、可解释、可审计。"
                />
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                  <LanguageText en="I-MR / Xbar-R" zh="I-MR / Xbar-R" />
                </span>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                  <LanguageText en="MSA" zh="MSA" />
                </span>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                  <LanguageText en="PPAP" zh="PPAP" />
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" size="sm" className="w-full rounded-full border-sky-200 text-sky-700 hover:bg-sky-50">
                <Link href="/quality">
                  <LanguageText en="Open Quality" zh="打开质量" />
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-8 rounded-xl border bg-muted/30 p-4">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">
                <LanguageText en="Live Risk Brain: The Unified Intelligence" zh="Live Risk Brain：统一智能" />
              </p>
              <p className="text-sm text-muted-foreground">
                <LanguageText
                  en="Combines Engineering Radar + Production State + Quality Analytics into one explainable score with actionable drivers."
                  zh="将工程雷达 + 生产状态 + 质量分析合成一个可解释的评分，并提供可执行的驱动因素。"
                />
              </p>
            </div>
            <Button asChild variant="default" className="rounded-full">
              <Link href="/production">
                <LanguageText en="Explore live scenarios" zh="探索真实场景" />
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-4 sm:p-6">
        <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden={true}>
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />
        </div>

        <div className="relative grid gap-6 md:grid-cols-2">
          {(features as HomeFeature[]).map((feature, index) => {
            const Icon = feature.icon;

            return (
              <HoverGlassCard
                key={feature.title.en}
                href={feature.href}
                title={<LanguageText en={feature.title.en} zh={feature.title.zh} />}
                description={<LanguageText en={feature.description.en} zh={feature.description.zh} />}
                icon={<Icon className="size-5" />}
                footer={
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                    <LanguageText en="Open module" zh="进入模块" />
                    <span className="text-muted-foreground transition-colors group-hover:text-primary">→</span>
                  </span>
                }
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

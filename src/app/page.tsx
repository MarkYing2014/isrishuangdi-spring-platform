import { LanguageText } from "@/components/language-context";

import Link from "next/link";
import {
  BarChart3,
  Box,
  Calculator,
  FileCog,
  Mail,
  Move3D,
  PackageSearch,
  ArrowRight,
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
import { HoverGlassCard } from "@/components/home/HoverGlassCard";

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
    title: { en: "Force Tester", zh: "力–位移测试" },
    description: {
      en: "Generate force–displacement curves and export test envelopes instantly.",
      zh: "快速生成力–位移曲线并导出测试包。",
    },
    href: "/tools/force-tester",
    icon: Box,
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
              <LanguageText en="Spring Engineering Cloud Platform" zh="弹簧工程云平台" />
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              <LanguageText
                en="Design, simulate, visualize, and source advanced suspension springs in one cohesive workflow. Built with Next.js, react-three-fiber, and enterprise-ready APIs to outpace legacy tools like SpringStore."
                zh="一站式完成弹簧设计、仿真、可视化与采购，依托 Next.js、react-three-fiber 以及企业级 API，超越传统 SpringStore 平台。"
              />
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full">
                <Link href="/tools/calculator">
                  <LanguageText en="Explore Spring Stack" zh="探索弹簧工具链" />
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link href="/rfq">
                  <LanguageText en="Initiate RFQ" zh="发起询价" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border bg-muted/30 shadow-sm">
              <div className="flex h-full w-full items-center justify-center p-6">
                <img
                  src="/hero.png"
                  alt="Hero"
                  className="h-28 w-auto object-contain sm:h-32 md:h-36"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-4 sm:p-6">
        <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden={true}>
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />
        </div>

        <div className="relative grid gap-6 md:grid-cols-2">
          {(features as HomeFeature[]).map((feature, index) => {
            const Icon = feature.icon;

            if (index < 6) {
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
            }

            return (
              <Link key={feature.title.en} href={feature.href} className="group">
                <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <CardHeader className="gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl border bg-background shadow-sm">
                          <Icon className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
                        </div>
                        <CardTitle className="text-base font-semibold">
                          <LanguageText en={feature.title.en} zh={feature.title.zh} />
                        </CardTitle>
                      </div>
                      <ArrowRight className="mt-1 size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-lg font-semibold text-foreground">
                      <LanguageText en={feature.description.en} zh={feature.description.zh} />
                    </p>
                  </CardContent>
                  <CardFooter className="mt-auto">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                      <LanguageText en="Open module" zh="进入模块" />
                      <span className="text-muted-foreground transition-colors group-hover:text-primary">
                        →
                      </span>
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

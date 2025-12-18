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

          <div className="rounded-2xl border bg-muted/20 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">
                  <LanguageText en="Radar demo (static)" zh="雷达示例（静态）" />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  <LanguageText
                    en="Example output for a compression spring design."
                    zh="以压缩弹簧为例展示输出结构。"
                  />
                </p>
              </div>
              <div className="rounded-full border bg-background px-3 py-1 text-sm font-semibold">
                <LanguageText en="Score: 78" zh="得分：78" />
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-xl border bg-background/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  <LanguageText en="Overall" zh="总体" />
                </p>
                <p className="mt-1 text-base font-semibold">
                  <LanguageText en="Manufacturing Risk" zh="制造风险" />
                </p>
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">
                      <LanguageText en="Engineering" zh="工程" />
                    </span>
                    <span className="font-semibold">OK</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">
                      <LanguageText en="Manufacturing" zh="制造" />
                    </span>
                    <span className="font-semibold">WARN</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">
                      <LanguageText en="Quality" zh="质量" />
                    </span>
                    <span className="font-semibold">OK</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-background/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  <LanguageText en="Key risks" zh="关键风险" />
                </p>
                <div className="mt-2 space-y-2 text-sm">
                  <p>
                    <span className="font-semibold">1.</span>{" "}
                    <LanguageText en="Coil bind margin is low" zh="贴圈余量偏小" />
                  </p>
                  <p>
                    <span className="font-semibold">2.</span>{" "}
                    <LanguageText en="Shear utilization is near limit" zh="剪应力利用率接近上限" />
                  </p>
                  <p>
                    <span className="font-semibold">3.</span>{" "}
                    <LanguageText en="Pitch estimate is tight" zh="估算节距偏紧" />
                  </p>
                </div>
              </div>

              <div className="rounded-xl border bg-background/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  <LanguageText en="What makes this different" zh="差异点" />
                </p>
                <div className="mt-2 grid gap-2 text-sm text-muted-foreground">
                  <p>
                    <LanguageText
                      en="Calculates + Engineering Risk Radar"
                      zh="不仅计算，更提供工程风险雷达"
                    />
                  </p>
                  <p>
                    <LanguageText
                      en="3D visualization + manufacturing insight"
                      zh="3D 可视化 + 制造可行性洞察"
                    />
                  </p>
                  <p>
                    <LanguageText
                      en="PPAP / DFM ready outputs"
                      zh="面向 PPAP / DFM 的输出"
                    />
                  </p>
                </div>
              </div>
            </div>
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

import { LanguageText } from "@/components/language-context";

const features = [
  {
    title: { en: "Spring Calculator", zh: "弹簧计算器" },
    description: {
      en: "Rapid stiffness, stress, and fatigue placeholders with ISRI best practices embedded.",
      zh: "快速计算刚度、剪应力与疲劳安全系数，占位实现 ISRI 标准工程流程。",
    },
    href: "/tools/calculator",
  },
  {
    title: { en: "Engineering Analysis", zh: "工程分析" },
    description: {
      en: "Complete stress, S-N fatigue life, safety factor, and buckling analysis for all spring types.",
      zh: "完整的应力、S-N 疲劳寿命、安全系数和屈曲分析，支持所有弹簧类型。",
    },
    href: "/tools/analysis",
  },
  {
    title: { en: "Spring Simulator", zh: "弹簧仿真" },
    description: {
      en: "Interactive 3D modeling with pitch, free length, and bending foot presets.",
      zh: "交互式 3D 建模，实时调整节距、自由长、脚位等参数。",
    },
    href: "/tools/simulator",
  },
  {
    title: { en: "Force Tester", zh: "力–位移测试" },
    description: {
      en: "Generate force–displacement curves and export test envelopes instantly.",
      zh: "快速生成力–位移曲线并导出测试包。",
    },
    href: "/tools/force-tester",
  },
  {
    title: { en: "CAD Export", zh: "CAD 导出" },
    description: {
      en: "Creo-ready PDF, STEP, and native files powered by automated drafting pipelines.",
      zh: "自动生成 Creo PDF、STEP 以及原生模型文件。",
    },
    href: "/tools/cad-export",
  },
  {
    title: { en: "RFQ", zh: "询价" },
    description: {
      en: "Hand off validated designs directly to ISRI-SHUANGDI sourcing in one click.",
      zh: "一键将设计结果推送至 ISRI-SHUANGDI 采购团队。",
    },
    href: "/rfq",
  },
  {
    title: { en: "Spring Catalog", zh: "产品目录" },
    description: {
      en: "Search verified production springs with tolerance, finish, and load filters.",
      zh: "检索量产弹簧，支持公差、表面处理、载荷等条件过滤。",
    },
    href: "/catalog",
  },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border bg-card p-10 shadow-sm">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
              ISRI-SHUANGDI • Industry 4.0
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              <LanguageText en="Spring Engineering Cloud Platform" zh="弹簧工程云平台" />
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              <LanguageText
                en="Design, simulate, visualize, and source advanced suspension springs in one cohesive workflow. Built with Next.js, react-three-fiber, and enterprise-ready APIs to outpace legacy tools like SpringStore."
                zh="一站式完成弹簧设计、仿真、可视化与采购，依托 Next.js、react-three-fiber 以及企业级 API，超越传统 SpringStore 平台。"
              />
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/tools/calculator"
                className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90"
              >
                <LanguageText en="Explore Spring Stack" zh="探索弹簧工具链" />
              </a>
              <a
                href="/rfq"
                className="inline-flex items-center rounded-full border border-muted px-5 py-2 text-sm font-semibold"
              >
                <LanguageText en="Initiate RFQ" zh="发起询价" />
              </a>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-center md:justify-end">
            <img
              src="/hero.png"
              alt="Hero"
              className="h-24 w-auto md:h-36 lg:h-44"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {features.map((feature) => (
          <a
            key={feature.title.en}
            href={feature.href}
            className="group rounded-2xl border bg-background/80 p-6 transition hover:border-primary"
          >
            <p className="text-sm font-semibold text-primary/80">
              <LanguageText en={feature.title.en} zh={feature.title.zh} />
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              <LanguageText en={feature.description.en} zh={feature.description.zh} />
            </p>
            <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
              <LanguageText en="Open module" zh="进入模块" /> →
            </span>
          </a>
        ))}
      </section>
    </div>
  );
}

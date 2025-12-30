import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Cog,
  Mail,
  Shield,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  Factory,
  Cpu,
} from "lucide-react";

import { LanguageText } from "@/components/language-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              <LanguageText en="About" zh="关于" />
            </p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              <LanguageText
                en="Spring Engineering Intelligence Platform"
                zh="Spring Engineering Intelligence Platform"
              />
            </h1>
            <p className="max-w-3xl text-pretty text-base text-slate-600 sm:text-lg">
              <LanguageText
                en="Customer-ready engineering platform for spring manufacturers — reduce scrap, shorten PPAP cycles, and ship with confidence."
                zh="面向弹簧制造现场的一体化工程平台：减少报废与返工，加速 PPAP，一次通过交付。"
              />
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/rfq">
                <span className="flex items-center gap-2">
                  <LanguageText en="Request Customer Pilot" zh="申请客户 Pilot" />
                  <ArrowRight className="size-4" />
                </span>
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href="mailto:markying2014@gmail.com">
                <span className="flex items-center gap-2">
                  <Mail className="size-4" />
                  <LanguageText en="Contact" zh="联系" />
                </span>
              </a>
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            <LanguageText en="Business contact:" zh="商务联系：" />{" "}
            <a className="underline" href="mailto:markying2014@gmail.com">
              markying2014@gmail.com
            </a>
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <LanguageText en="Elevator Pitch" zh="一句话说明（Elevator Pitch）" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-slate-600">
            <p>
              <LanguageText
                en="Turn spring designs into production-ready decisions: manufacturability, risk drivers, and PPAP-grade quality evidence — in one workflow."
                zh="把弹簧设计变成可投产的决策：可制造性、风险驱动因子、以及 PPAP 级质量证据，一条链路完成。"
              />
            </p>
            <p className="text-sm text-slate-500">
              <LanguageText
                en="Typical pilot: one product family, one line, 2–4 weeks — with measurable ROI."
                zh="典型 Pilot：一个产品族 + 一条产线，2–4 周交付可量化 ROI。"
              />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <LanguageText en="Why It Matters" zh="行业痛点（Why It Matters）" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-600">
            <div className="space-y-2">
              <p className="font-medium text-slate-900">
                <LanguageText en="Disconnected workflows" zh="工程、生产和质量通常是割裂的" />
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>
                  <LanguageText
                    en="Engineering: calculations exist, but yield and manufacturability are unclear."
                    zh="工程端：计算能算，但良率与可制造性不清楚"
                  />
                </li>
                <li>
                  <LanguageText
                    en="Production: firefighting after issues occur — scrap and line stops."
                    zh="生产端：问题发生后救火，带来报废与停线"
                  />
                </li>
                <li>
                  <LanguageText
                    en="Quality: PPAP/SPC evidence takes manual effort and is hard to standardize."
                    zh="质量端：PPAP/SPC 证据依赖人工，难标准化与复用"
                  />
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p className="font-medium text-slate-900">
                <LanguageText en="Result" zh="结果" />
              </p>
              <p className="mt-1">
                <LanguageText
                  en="Scrap, rework, delayed SOP, and audit pressure — plus PPAP cycles that keep getting rejected."
                  zh="报废、返工、SOP 延期与审核压力，以及 PPAP 反复被打回。"
                />
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            <LanguageText en="Typical Customer Scenarios" zh="典型客户场景" />
          </h2>
          <p className="max-w-3xl text-slate-600">
            <LanguageText
              en="Three common situations where teams need fast, evidence-based decisions."
              zh="三类最常见的现场场景：你需要更快、更可追溯的决策。"
            />
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cog className="size-5 text-slate-700" />
                <LanguageText en="New Program Launch" zh="新项目导入" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                <LanguageText
                  en="Before SOP, you need to know what will break first: manufacturability, risk drivers, and which actions matter."
                  zh="量产导入前，需要明确：哪里最先出问题、风险驱动因子是什么、先改哪几项最有效。"
                />
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <LanguageText
                    en="Output: risk badge + drivers + prioritized actions"
                    zh="输出：风险结论 + 驱动因子 + 优先动作清单"
                  />
                </li>
                <li>
                  <LanguageText
                    en="Reduce PPAP rejections and avoid late design changes"
                    zh="减少 PPAP 被打回，避免后期被迫改设计"
                  />
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-5 text-slate-700" />
                <LanguageText en="Mass Production Fluctuation" zh="量产波动" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                <LanguageText
                  en="Scrap rate spikes, alarms increase, and quality drifts — but the team can’t tell whether it’s machine, process, or design."
                  zh="报废率上升、报警变多、质量漂移，但难判断是机台、工艺还是设计问题。"
                />
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <LanguageText
                    en="Correlate anomalies with machine, batch, and time window"
                    zh="将异常与机台、批次、时间窗口直接关联"
                  />
                </li>
                <li>
                  <LanguageText
                    en="Make root-cause investigation systematic and faster"
                    zh="把根因排查系统化，并显著提速"
                  />
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5 text-slate-700" />
                <LanguageText en="Customer Audit & PPAP" zh="客户审核与 PPAP" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                <LanguageText
                  en="When customers ask for evidence, the bottleneck is not analysis — it’s assembling consistent, auditable documentation."
                  zh="客户要证据时，瓶颈往往不是计算，而是整理一致、可审核的文档与报告。"
                />
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <LanguageText
                    en="One-click evidence pack: SPC + capability + audit-ready PDF"
                    zh="一键证据包：SPC + 能力分析 + 可审核 PDF"
                  />
                </li>
                <li>
                  <LanguageText
                    en="Traceable results that auditors can review and sign"
                    zh="结果可追溯、可复核、可签署"
                  />
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            <LanguageText en="Pilot Timeline" zh="Pilot 时间线" />
          </h2>
          <p className="max-w-3xl text-slate-600">
            <LanguageText
              en="A practical 4-step process to reach measurable outcomes in 2–4 weeks."
              zh="一个可落地的 4 步流程，通常 2–4 周交付可量化结果。"
            />
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white/80 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-7 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                1
              </span>
              <div>
                <p className="font-semibold text-slate-900">
                  <LanguageText en="Scope & Success Metrics" zh="范围与成功指标" />
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  <LanguageText
                    en="Define product family, line, and KPI (scrap, FPY, PPAP cycle time)."
                    zh="确定产品族、产线与 KPI（报废、FPY、PPAP 周期）。"
                  />
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/80 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-7 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                2
              </span>
              <div>
                <p className="font-semibold text-slate-900">
                  <LanguageText en="Ingest Specs & Data" zh="导入规范与数据" />
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  <LanguageText
                    en="Onboard drawings/specs + one dataset (SPC or inspection) and map fields."
                    zh="导入图纸/规范 + 1 份数据（SPC 或检验），并完成字段映射。"
                  />
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/80 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-7 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                3
              </span>
              <div>
                <p className="font-semibold text-slate-900">
                  <LanguageText en="Run Risk + Evidence" zh="输出风险与证据" />
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  <LanguageText
                    en="Generate risk radar, drivers, and an audit-ready quality evidence pack."
                    zh="生成风险雷达、驱动因子，并输出可审核的质量证据包。"
                  />
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/80 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-7 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                4
              </span>
              <div>
                <p className="font-semibold text-slate-900">
                  <LanguageText en="Deliver ROI & Rollout Plan" zh="交付 ROI 与上线计划" />
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  <LanguageText
                    en="Review results, quantify ROI, and define the next integration path (CSV/API/MES)."
                    zh="复盘结果、量化 ROI，并明确下一步接入路径（CSV/API/MES）。"
                  />
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            <LanguageText en="What You Get" zh="你能拿到什么（Deliverables）" />
          </h2>
          <p className="max-w-3xl text-slate-600">
            <LanguageText
              en="Three connected modules with concrete outputs your team can act on."
              zh="三个模块闭环输出可落地结果，让工程、生产、质量对齐同一套证据。"
            />
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cog className="size-5 text-slate-700" />
                <span>Engineering Risk Radar</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                <LanguageText
                  en="A design gate that outputs a clear risk badge, drivers, and prioritized actions — before production."
                  zh="设计闸门：在投产前输出清晰的风险结论、驱动因子与优先整改建议。"
                />
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <LanguageText en="Engineering OK" zh="Engineering OK" />
                </li>
                <li>
                  <LanguageText en="Manufacturing Risk" zh="Manufacturing Risk" />
                </li>
                <li>
                  <LanguageText en="High Risk" zh="High Risk" />
                </li>
              </ul>
              <p className="text-slate-500">
                <LanguageText
                  en="Explainable by engineers: rules + interpretable metrics, with traceable evidence."
                  zh="工程师可解释：规则 + 可解释指标，并提供可追溯证据链。"
                />
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-5 text-slate-700" />
                <span>
                  <LanguageText
                    en="Manufacturing & Production Intelligence"
                    zh="Manufacturing & Production Intelligence"
                  />
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                <LanguageText
                  en="Connect production signals (machine status, takt, scrap, alarms) to the design and batch context."
                  zh="把生产信号（机台状态、节拍、报废、报警）与设计、批次、时间段关联起来。"
                />
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <LanguageText
                    en="Pinpoint where problems originate: machine, process step, or specific time window."
                    zh="快速定位问题源头：机台、工艺步骤、或特定时间段。"
                  />
                </li>
                <li>
                  <LanguageText
                    en="Help teams decide what to change first — design, process, or equipment."
                    zh="帮助团队判断优先改哪里：设计、工艺还是设备。"
                  />
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5 text-slate-700" />
                <span>
                  <LanguageText
                    en="Professional Quality Analytics & Reporting"
                    zh="Professional Quality Analytics & Reporting"
                  />
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                <LanguageText
                  en="One-click SPC/PPAP evidence packs: capability results, rule-based alarms, and audit-ready PDF exports."
                  zh="一键生成 SPC/PPAP 证据包：能力结果、规则报警、以及可审核/可签署的 PDF 导出。"
                />
              </p>
              <p className="text-slate-500">
                <LanguageText
                  en="Standardize reporting, shorten PPAP loops, and reduce manual effort."
                  zh="标准化报告输出，缩短 PPAP 闭环，降低人工成本。"
                />
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          <LanguageText en="Key Differentiators" zh="为什么我们不一样（Key Differentiators）" />
        </h2>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">
                    <LanguageText en="Traditional tools" zh="传统工具" />
                  </TableHead>
                  <TableHead>
                    <LanguageText en="Our platform" zh="我们的平台" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <LanguageText en="Single-point calculation" zh="单一计算" />
                  </TableCell>
                  <TableCell>
                    <LanguageText en="Engineering + Manufacturing + Quality" zh="工程 + 制造 + 质量" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <LanguageText en="Static model" zh="静态模型" />
                  </TableCell>
                  <TableCell>
                    <LanguageText en="Real-time / production data-ready" zh="实时 / 可接入生产数据" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <LanguageText en="Manual PPAP/SPC documentation" zh="手工整理 PPAP/SPC 文档" />
                  </TableCell>
                  <TableCell>
                    <LanguageText en="Audit-ready evidence pack in one click" zh="一键生成可审核证据包" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <LanguageText en="Manual judgment" zh="人工判断" />
                  </TableCell>
                  <TableCell>
                    <LanguageText en="Systematic risk assessment" zh="系统化风险评估" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <LanguageText en="Black-box outcomes" zh="黑盒结果" />
                  </TableCell>
                  <TableCell>
                    <LanguageText en="Explainable, traceable conclusions" zh="可解释、可追溯" />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <LanguageText en="Technology Philosophy" zh="技术理念（Technology Philosophy）" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-slate-600">
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 text-slate-700" />
                <span>
                  <LanguageText
                    en="Rule-first, AI-assisted: statistics and engineering rules are the foundation; AI helps pattern detection and root-cause hints."
                    zh="Rule-first, AI-assisted：统计规则是基础，AI 用于模式识别、异常发现、根因提示。"
                  />
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 text-slate-700" />
                <span>
                  <LanguageText
                    en="Explainability over prediction: every conclusion can be reviewed by engineers."
                    zh="Explainability over prediction：每一个结论都能被工程师理解与复核。"
                  />
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 text-slate-700" />
                <span>
                  <LanguageText
                    en="Industrial-grade architecture: modular analytics and report generation, ready for high-throughput data."
                    zh="Industrial-grade architecture：支持高并发数据，模块化分析与报告生成。"
                  />
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <LanguageText en="Who It’s For" zh="适用客户（Who It’s For）" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <LanguageText en="Spring & precision component manufacturers" zh="弹簧与精密零部件制造商" />
              </li>
              <li>
                <LanguageText
                  en="Automotive / industrial equipment supply chains"
                  zh="汽车 / 工业设备供应链"
                />
              </li>
              <li>
                <LanguageText
                  en="Quality teams needing PPAP / SPC / capability analysis"
                  zh="需要 PPAP / SPC / 能力分析的质量团队"
                />
              </li>
              <li>
                <LanguageText
                  en="Engineering teams reducing trial-and-error cost"
                  zh="希望减少试错成本的工程团队"
                />
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            <LanguageText 
              en="Industrial Knowledge Embedding & Advanced Modules" 
              zh="工业知识嵌入与先进模块" 
            />
          </h2>
          <p className="max-w-4xl text-slate-600">
            <LanguageText
              en="We want to embed industrial spring knowledge (from internal presentations) into our system, not as static PPT, but as structured product capabilities."
              zh="我们致力于将工业弹簧领域的深厚知识（源自内部技术沉淀与演示）嵌入系统，不再是静态的 PPT，而是转化为结构化的产品能力。"
            />
          </p>
        </div>

        <Card className="border-slate-300 bg-slate-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <div className="rounded-md bg-slate-900 p-1">
                <Activity className="size-4 text-white" />
              </div>
              <LanguageText en="Arc Springs & Spring Packs Design Module" zh="弧形弹簧与弹簧组设计模块" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-900">
                    <LanguageText en="Core Mission & Goals" zh="核心使命与目标" />
                  </h3>
                  <p className="text-sm text-slate-600">
                    <LanguageText 
                      en="Deliver industrial-grade precision for Arc Springs through 'Digital Twin' modeling — reducing physical scrap and accelerating the SOP cycle." 
                      zh="通过“数字孪生”建模，为弧形弹簧提供工业级精度：减少物理报废，显著缩短 SOP 周期。"
                    />
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-3 text-slate-900" />
                    <LanguageText en="Digital twin precision (Physics-aligned)" zh="数字孪生精度（物理对齐）" />
                  </li>
                  <li className="items-center gap-2 flex">
                    <CheckCircle2 className="size-3 text-slate-900" />
                    <LanguageText en="Manufacturing-ready geometry export" zh="可制造性几何模型导出" />
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">
                  <LanguageText en="System Architecture" zh="系统架构升级" />
                </h3>
                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
                  <li>
                    <LanguageText en="Unified Spring Registry: Support for Arc, Compression, and Spring Packs" zh="统一弹簧注册：支持弧形、压缩及弹簧组" />
                  </li>
                  <li>
                    <LanguageText en="Pipeline: Backbone Generator → Shell Extruder → Physical Validator" zh="流水线：骨架生成器 → 表壳挤出器 → 物理验证器" />
                  </li>
                  <li>
                    <LanguageText en="Type-specific geometry kernels for unique manufacturing constraints" zh="针对独特制造约束的专属几何内核" />
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">
                <LanguageText en="Key Technical Requirements" zh="关键技术要求" />
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-sm font-medium text-slate-900">
                    <LanguageText en="Parametric Modeling" zh="参数化建模" />
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    <li><LanguageText en="Variable wire & mean diameter" zh="变线径与变中径支持" /></li>
                    <li><LanguageText en="Variable pitch & arc length integration" zh="变节距与弧长积分" /></li>
                    <li><LanguageText en="Arc geometry (Radius, Free/Block Angle)" zh="圆弧几何（半径、自由/压并角）" /></li>
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-sm font-medium text-slate-900">
                    <LanguageText en="Engineering Math" zh="工程数学与几何" />
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    <li><LanguageText en="Toroidal Helix (True geometry)" zh="圆环螺旋（真实几何）" /></li>
                    <li><LanguageText en="Angle-based parametric centerline" zh="基于角度的参数化中心线" /></li>
                    <li><LanguageText en="Curvature-compensated pitch integration" zh="曲率补偿的节距积分" /></li>
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-sm font-medium text-slate-900">
                    <LanguageText en="Manufacturing Awareness" zh="制造感知" />
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    <li><LanguageText en="Grinding depth control (mm definition)" zh="磨平深度精确控制（mm 定义）" /></li>
                    <li><LanguageText en="Stress/load validation vs wire limits" zh="应力/负载校验与线材极限对比" /></li>
                    <li><LanguageText en="Automatic manufacturing constraint alerts" zh="制造约束自动警报" /></li>
                  </ul>
                </div>
                <div className="col-span-full rounded-lg border border-slate-200 bg-slate-900 p-3 text-white">
                  <p className="text-sm font-medium">
                    <LanguageText en="Simulation Readiness (FEM-ready)" zh="仿真就绪（有限元支持）" />
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    <LanguageText 
                      en="Explicit torque, stiffness, and contact regions for high-fidelity nonlinear industrial simulation." 
                      zh="显式定义扭矩、刚度及接触区域，为高保真非线性工业仿真提供精准支撑。"
                    />
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            <LanguageText 
              en="Manufacturing Excellence & Production Capabilities" 
              zh="卓越制造与生产能力" 
            />
          </h2>
          <p className="max-w-3xl text-slate-600">
            <LanguageText
              en="Combining decades of industrial heritage with next-generation digital intelligence — we deliver precision at scale."
              zh="我们将数十年的工业底蕴与新一代数字智能相结合：规模化交付高精度产品。"
            />
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <div className="mb-2 inline-flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-900">
                <Factory className="size-5" />
              </div>
              <CardTitle className="text-lg">
                <LanguageText en="Advanced Equipment" zh="先进设备" />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <ul className="list-disc space-y-1 pl-4">
                <li><LanguageText en="CNC multi-axis coiling" zh="数控多轴卷制" /></li>
                <li><LanguageText en="Automated grinding lines" zh="全自动磨削线" /></li>
                <li><LanguageText en="Precision heat treatment" zh="精密热处理过程" /></li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <div className="mb-2 inline-flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-900">
                <Cpu className="size-5" />
              </div>
              <CardTitle className="text-lg">
                <LanguageText en="Technical Leadership" zh="技术领军" />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <ul className="list-disc space-y-1 pl-4">
                <li><LanguageText en="Real-time 3D simulation" zh="实时 3D 仿真模拟" /></li>
                <li><LanguageText en="CAD/CAM integrated design" zh="CAD/CAM 集成设计" /></li>
                <li><LanguageText en="Proprietary rule engine" zh="自研工程规则引擎" /></li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <div className="mb-2 inline-flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-900">
                <ShieldCheck className="size-5" />
              </div>
              <CardTitle className="text-lg">
                <LanguageText en="Quality Assurance" zh="质量保证" />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <ul className="list-disc space-y-1 pl-4">
                <li><LanguageText en="Automated optical inspection" zh="全自动光学影像检测" /></li>
                <li><LanguageText en="IATF 16949 compliant" zh="符合 IATF 16949 标准" /></li>
                <li><LanguageText en="SPC process control" zh="SPC 全程质量管控" /></li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <div className="mb-2 inline-flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-900">
                <Users className="size-5" />
              </div>
              <CardTitle className="text-lg">
                <LanguageText en="Customer Ecosystem" zh="客户生态" />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <p className="leading-relaxed">
                <LanguageText 
                  en="Trusted by global automotive OEMs, Tier 1 suppliers, and specialized industrial equipment leaders." 
                  zh="备受全球汽车整车厂 (OEM)、一级供应商 (Tier 1) 及专业工业设备领跑者的信赖。"
                />
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>
              <LanguageText en="Business Impact" zh="商业价值（Business Impact）" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <TrendingDown className="mt-0.5 size-4 text-slate-700" />
              <span>
                <LanguageText en="Reduce scrap and rework" zh="降低报废与返工" />
              </span>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 size-4 text-slate-700" />
              <span>
                <LanguageText
                  en="Increase first pass yield (FPY) and stability"
                  zh="提高一次通过率（FPY）与过程稳定性"
                />
              </span>
            </div>
            <div className="flex items-start gap-2">
              <TrendingDown className="mt-0.5 size-4 text-slate-700" />
              <span>
                <LanguageText
                  en="Shorten PPAP loops and time-to-SOP"
                  zh="缩短 PPAP 闭环与导入周期（time-to-SOP）"
                />
              </span>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 size-4 text-slate-700" />
              <span>
                <LanguageText
                  en="Standardize audit-ready reporting with less manual work"
                  zh="用更少人工实现可审核、可复用的报告标准化"
                />
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <LanguageText en="Status" zh="当前状态 & 路线图（Status）" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
              <span>
                <LanguageText
                  en="Engineering calculation and Engineering Risk Radar are live"
                  zh="工程计算与风险雷达已落地"
                />
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
              <span>
                <LanguageText
                  en="Quality analytics and reporting system is available"
                  zh="质量分析与报告系统已可用"
                />
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 text-slate-400" />
              <span>
                <LanguageText
                  en="Production data integration and closed-loop optimization"
                  zh="生产数据实时接入与闭环优化"
                />
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 text-slate-400" />
              <span>
                <LanguageText
                  en="Industry rule library and customer-specific models"
                  zh="行业规则库与客户定制模型"
                />
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              <LanguageText en="Customer Outcome" zh="客户结果（Outcome）" />
            </h2>
            <p className="max-w-3xl text-slate-700">
              <LanguageText
                en="Launch programs faster with fewer surprises — a shared, evidence-based workflow across engineering, production, and quality."
                zh="更快导入、更少意外：让工程、生产、质量基于同一套证据协同决策。"
              />
            </p>
            <div className="grid gap-4 pt-2 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white/70 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  <LanguageText en="Contact / Next Steps" zh="联系 / 下一步" />
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  <li>
                    <LanguageText
                      en="30-min discovery: goals, constraints, and success metrics"
                      zh="30 分钟沟通：目标、约束与成功指标"
                    />
                  </li>
                  <li>
                    <LanguageText
                      en="Pilot inputs: drawing/spec + 1 dataset (SPC or inspection)"
                      zh="Pilot 输入：图纸/规范 + 1 份数据（SPC 或检验数据）"
                    />
                  </li>
                  <li>
                    <LanguageText
                      en="Deliverables: risk radar + evidence pack + action list"
                      zh="Pilot 交付：风险雷达 + 证据包 + 动作清单"
                    />
                  </li>
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/70 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  <LanguageText en="Optional" zh="可选" />
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  <li>
                    <LanguageText
                      en="Integration checklist (CSV / API / MES)"
                      zh="接入清单（CSV / API / MES）"
                    />
                  </li>
                  <li>
                    <LanguageText
                      en="ROI estimate and pilot plan template"
                      zh="ROI 估算与 Pilot 计划模板"
                    />
                  </li>
                  <li>
                    <LanguageText
                      en="Sample report pack (SPC / PPAP / audit-ready PDF)"
                      zh="示例报告包（SPC / PPAP / 可审核 PDF）"
                    />
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/rfq">
                <span className="flex items-center gap-2">
                  <LanguageText en="Start Customer Pilot" zh="发起客户 Pilot" />
                  <ArrowRight className="size-4" />
                </span>
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href="mailto:markying2014@gmail.com">
                <span className="flex items-center gap-2">
                  <Mail className="size-4" />
                  <LanguageText en="Email us" zh="邮件联系" />
                </span>
              </a>
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            <LanguageText en="Business contact:" zh="商务联系：" />{" "}
            <a className="underline" href="mailto:markying2014@gmail.com">
              markying2014@gmail.com
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}

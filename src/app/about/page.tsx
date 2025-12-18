import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Cog,
  Mail,
  Shield,
  TrendingDown,
  TrendingUp,
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

      <section className="grid gap-6 lg:grid-cols-2">
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
        </div>
      </section>
    </div>
  );
}

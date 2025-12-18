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
                en="A unified platform that connects spring design, manufacturing risk, and quality analytics — before problems reach the shopfloor."
                zh="从设计计算，到制造风险与质量结论的一体化工程平台"
              />
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/rfq">
                <span className="flex items-center gap-2">
                  <LanguageText en="Demo / Pilot" zh="Demo / Pilot 项目" />
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
                en="We help manufacturers know — before production — whether a spring design is buildable, where the risks are, and whether quality is controllable."
                zh="我们帮助制造企业在弹簧投入生产之前，就清楚知道：这个设计能不能做、风险在哪里、质量是否可控。"
              />
            </p>
            <p className="text-sm text-slate-500">
              <LanguageText
                en="A unified platform that connects spring design, manufacturing risk, and quality analytics — before problems reach the shopfloor."
                zh="A unified platform that connects spring design, manufacturing risk, and quality analytics — before problems reach the shopfloor."
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
                    en="Engineering: calculations exist, but manufacturability is unclear."
                    zh="工程端：计算能算，但不知道是否可制造"
                  />
                </li>
                <li>
                  <LanguageText
                    en="Production: adjustments happen after issues occur — expensive."
                    zh="生产端：问题发生后才调整，代价高"
                  />
                </li>
                <li>
                  <LanguageText
                    en="Quality: analysis and reporting are manual, slow, and hard to reproduce."
                    zh="质量端：报告靠人工分析，慢且不可重复"
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
                  en="Rework, delays, customer complaints, and PPAP cycles that keep getting rejected."
                  zh="返工、延误、客户投诉、PPAP 反复被打回"
                />
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            <LanguageText en="What We Built" zh="我们的解决方案（What We Built）" />
          </h2>
          <p className="max-w-3xl text-slate-600">
            <LanguageText en="One system covering three critical phases." zh="一个系统，覆盖三个关键阶段：" />
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
                  en="Expose risks at the design stage and output clear, explainable conclusions."
                  zh="在设计阶段暴露风险：自动评估工程可行性、制造复杂度、质量稳定性，并输出明确结论。"
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
                  en="All results are grounded in engineering rules and interpretable metrics — not black-box AI."
                  zh="所有结论基于工程规则与可解释指标，而非黑盒 AI。"
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
                  en="Align design assumptions with production reality, via real integrations or realistic simulation."
                  zh="让设计假设对齐真实生产：支持接入或模拟设备状态、产线节拍、报废率与报警。"
                />
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <LanguageText
                    en="Correlate quality anomalies with machine, process step, batch, and time window."
                    zh="将质量异常与机台、工艺步骤、批次 / 时间段直接关联"
                  />
                </li>
                <li>
                  <LanguageText
                    en="Help teams decide: design issue, process issue, or equipment issue."
                    zh="帮助企业判断：这是设计问题、工艺问题，还是设备问题。"
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
                  en="Generate customer-grade quality conclusions and reports with one click."
                  zh="客户级质量结论，一键生成：内置 SPC / Nelson Rules、Cp/Cpk、分层分析、PPAP 数据结构，并自动生成可追溯、可审核、可签署的质量报告。"
                />
              </p>
              <p className="text-slate-500">
                <LanguageText
                  en="Upgrade from “calculating data” to “delivering decisions.”"
                  zh="从“算数据”升级为“给结论”。"
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
                <LanguageText en="Reduce rework and trial production cycles" zh="减少返工与试产轮次" />
              </span>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 size-4 text-slate-700" />
              <span>
                <LanguageText
                  en="Improve first pass yield (FPY)"
                  zh="提高一次通过率（First Pass Yield）"
                />
              </span>
            </div>
            <div className="flex items-start gap-2">
              <TrendingDown className="mt-0.5 size-4 text-slate-700" />
              <span>
                <LanguageText
                  en="Cut manual effort for quality analysis and reporting"
                  zh="降低质量分析与报告的人力成本"
                />
              </span>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 size-4 text-slate-700" />
              <span>
                <LanguageText
                  en="Boost credibility with customers and auditors"
                  zh="提升对客户与审核机构的专业可信度"
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
              <LanguageText en="Vision" zh="我们的愿景（Vision）" />
            </h2>
            <p className="max-w-3xl text-slate-700">
              <LanguageText
                en="Make engineering decisions driven by data, rules, and explainable conclusions — not guesswork."
                zh="让工程决策不再依赖经验猜测，而是基于数据、规则与可解释结论。"
              />
            </p>
            <div className="grid gap-4 pt-2 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white/70 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  <LanguageText en="Contact / Next Steps" zh="联系 / 下一步" />
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  <li>
                    <LanguageText en="Demo / Pilot project" zh="Demo / Pilot 项目" />
                  </li>
                  <li>
                    <LanguageText
                      en="Review sample engineering & quality reports"
                      zh="查看示例工程与质量报告"
                    />
                  </li>
                  <li>
                    <LanguageText en="Explore industry collaboration" zh="探索行业合作" />
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
                      en="Investor version (growth & market oriented)"
                      zh="改写成投资人版本（更偏增长与市场）"
                    />
                  </li>
                  <li>
                    <LanguageText
                      en="Customer sales version (ROI & scenarios oriented)"
                      zh="改写成客户销售版本（更偏 ROI 与应用场景）"
                    />
                  </li>
                  <li>
                    <LanguageText
                      en="One-page PPT / pitch deck outline"
                      zh="生成一页 PPT / Pitch Deck 结构"
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
                  <LanguageText en="Start a Demo / Pilot" zh="发起 Demo / Pilot" />
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

import { LanguageText } from "@/components/language-context";
import {
  ArrowRight,
  CheckCircle2,
  FileWarning,
  Microscope,
  MoveUpRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HomeRiskRadar } from "@/components/home/HomeRiskRadar";
import { RulesVisualizer } from "@/components/engineering/rules-visualizer";

export default function EngineeringPage() {
  return (
    <div className="space-y-24 pb-20">
      {/* 1. Hero Section: Radar Focus */}
      <section className="relative pt-10">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span>Engineering First</span>
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              <LanguageText
                en="Replace Tribal Knowledge with Engineering Certainty"
                zh="以工程确定性，替代“老师傅经验”"
              />
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              <LanguageText
                en="Most spring failures aren't caused by bad materials, but by blind geometric decisions. Our Engineering Risk Radar visualizes validity, stress, fatigue, and manufacturing risks—instantly."
                zh="大多数弹簧失效并非源于材料，而是盲目的几何设计。我们的工程风险雷达即时可视化这些有效性、应力、疲劳与制造风险。"
              />
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button size="lg" className="rounded-full">
                <LanguageText en="Start Calculation (Free)" zh="开始计算（免费）" />
                <ArrowRight className="ml-2 size-4" />
              </Button>
              <Button size="lg" variant="outline" className="rounded-full">
                <LanguageText en="Read the Whitepaper" zh="阅读工程白皮书" />
              </Button>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="absolute -top-10 -right-10 -z-10 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
             <div className="relative rounded-2xl border bg-background/50 shadow-2xl backdrop-blur-sm">
                <HomeRiskRadar />
             </div>
          </div>
        </div>
      </section>

      {/* 2. The Rules Engine (V1/V2) */}
      <section>
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <LanguageText
              en="Zero Black Boxes. Just Physics."
              zh="拒绝黑盒。只有物理学。"
            />
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            <LanguageText
              en="How we validate every single design parameter before it hits the shop floor."
              zh="我们如何在图纸下发车间之前，验证每一个设计参数。"
            />
          </p>
        </div>
        
        <RulesVisualizer />
      </section>

      {/* 3. Case Study: Die Spring */}
      <section className="overflow-hidden rounded-3xl bg-slate-900 py-16 px-6 text-white sm:px-16 lg:flex lg:items-center lg:gap-x-20">
        <div className="lg:w-1/2">
          <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1 text-sm font-medium text-white ring-1 ring-inset ring-white/20">
            <Microscope className="size-4" />
            <LanguageText en="Case Study: ISO 10243" zh="案例研究：ISO 10243" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <LanguageText
              en="Why Die Springs Fail: The 'Phantom' 360° Coil"
              zh="模具弹簧失效真相：“通过”的 360° 支撑圈"
            />
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            <LanguageText
              en="Many CAD tools model die springs with a perfect closed loop. In reality, the grinding process often leaves the last 45° unconnected or thin. Our engine accounts for this specific 'tipping' moment and stress concentration."
              zh="许多 CAD 工具将模具弹簧建模为完美的闭合圈。实际上，磨削工艺常导致最后 45° 未接触或过薄。我们的引擎专门考量这种‘倾覆’力矩与应力集中。"
            />
          </p>

          <dl className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
            {[
              {
                label: { en: "Standard CAD", zh: "标准 CAD" },
                value: { en: "Geometric Ideal", zh: "几何理想化" },
              },
              {
                label: { en: "ISRI Engine", zh: "ISRI 引擎" },
                value: { en: "+ Manufacturing Reality", zh: "+ 制造现实" },
              },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col-reverse gap-y-1">
                <dt className="text-sm leading-7 text-slate-400">
                   <LanguageText en={stat.label.en} zh={stat.label.zh} />
                </dt>
                <dd className="text-3xl font-bold tracking-tight text-white">
                   <LanguageText en={stat.value.en} zh={stat.value.zh} />
                </dd>
              </div>
            ))}
          </dl>
          
           <div className="mt-10">
              <Button variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/10 hover:text-white">
                <LanguageText en="Read the full analysis" zh="阅读完整分析" />
                <MoveUpRight className="ml-2 size-4" />
              </Button>
           </div>
        </div>
        <div className="relative mt-16 h-80 lg:mt-0 lg:w-1/2 lg:flex-none">
           <div className="absolute inset-0 rounded-2xl bg-white/5 ring-1 ring-white/10" />
           {/* Placeholder for an actual diagram or technical drawing */}
           <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center text-slate-400">
              <FileWarning className="mb-4 size-12 opacity-50" />
              <p>
                  <LanguageText en="Interactive Stress Diagram Placeholder" zh="交互式应力图占位符" />
              </p>
           </div>
        </div>
      </section>

      {/* 4. Supported Types */}
      <section>
         <div className="mb-10 flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">
               <LanguageText en="Full Spectrum Engineering" zh="全谱系工程支持" />
            </h2>
            <Button variant="link" className="text-primary">
               <LanguageText en="View Catalog" zh="查看目录" /> <ArrowRight className="ml-2 size-4" />
            </Button>
         </div>
         
         <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
               { title: { en: "Compression", zh: "压缩弹簧" }, feats: ["Buckling", "Setting"] },
               { title: { en: "Extension", zh: "拉伸弹簧" }, feats: ["Hook Stress", "Gap"] },
               { title: { en: "Torsion", zh: "扭转弹簧" }, feats: ["Leg Length", "Friction"] },
               { title: { en: "Die Springs", zh: "模具弹簧" }, feats: ["ISO 10243", "Trapezoid"] },
               { title: { en: "Wave Springs", zh: "波形弹簧" }, feats: ["Space Saving", "Hysteresis"] },
               { title: { en: "Conical", zh: "圆锥弹簧" }, feats: ["Variable Rate", "Telescoping"] },
            ].map((item, i) => (
               <Card key={i} className="bg-muted/30 transition-colors hover:bg-muted/50">
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="size-5 text-primary" />
                        <LanguageText en={item.title.en} zh={item.title.zh} />
                     </CardTitle>
                  </CardHeader>
                  <CardContent>
                     <div className="flex flex-wrap gap-2">
                        {item.feats.map(f => (
                           <span key={f} className="rounded-md bg-background px-2 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                              {f}
                           </span>
                        ))}
                     </div>
                  </CardContent>
               </Card>
            ))}
         </div>
      </section>
    </div>
  );
}

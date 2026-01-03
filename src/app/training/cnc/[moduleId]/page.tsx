"use client";

/**
 * CNC Lesson Player Page
 * Session-driven with Demo Mode progress writes
 */

import * as React from "react";
import Link from "next/link";
import { use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLanguage } from "@/components/language-context";
import type { TrainingModule, TrainingSession, SessionAction } from "@/lib/training";

type Severity = "INFO" | "WARN" | "ERROR";

// Step definitions for each module (could be moved to API later)
const STEP_DEFINITIONS: Record<string, Array<{
  id: string;
  titleEn: string;
  titleZh: string;
  instructionEn: string;
  instructionZh: string;
  passCriteriaEn: string[];
  passCriteriaZh: string[];
  commonMistakesEn: string[];
  commonMistakesZh: string[];
}>> = {
  "cnc-8claw-001": [
    {
      id: "s1-safety",
      titleEn: "Safety checks",
      titleZh: "安全检查",
      instructionEn: "Confirm guard closed, E-stop released, and machine is in safe state.",
      instructionZh: "确认护罩关闭、急停复位、机台处于安全状态。",
      passCriteriaEn: ["Guard closed", "E-stop released", "Axes ready / homed"],
      passCriteriaZh: ["护罩关闭", "急停复位", "轴已就绪/回零"],
      commonMistakesEn: ["Starting with guard open", "Ignoring alarms"],
      commonMistakesZh: ["护罩未关就启动", "忽略报警直接继续"],
    },
    {
      id: "s2-identify",
      titleEn: "Identify key parts",
      titleZh: "识别关键部件",
      instructionEn: "Locate feed rollers, guide, mandrel, fingers, and cut-off tool.",
      instructionZh: "找到送丝轮、导向、芯轴、成形爪、剪切机构。",
      passCriteriaEn: ["Select all highlighted parts"],
      passCriteriaZh: ["点选所有高亮部件"],
      commonMistakesEn: ["Confusing mandrel with guide"],
      commonMistakesZh: ["把芯轴与导向混淆"],
    },
    {
      id: "s3-threading",
      titleEn: "Thread the wire",
      titleZh: "穿线",
      instructionEn: "Follow the correct threading path: guide → rollers → mandrel area.",
      instructionZh: "按正确路径穿线：导向 → 送丝轮 → 芯轴区域。",
      passCriteriaEn: ["Correct path sequence", "No unsafe shortcuts"],
      passCriteriaZh: ["路径顺序正确", "无危险操作"],
      commonMistakesEn: ["Skipping the guide", "Wrong direction through rollers"],
      commonMistakesZh: ["跳过导向", "穿过送丝轮方向错误"],
    },
    {
      id: "s4-first-run",
      titleEn: "First run (low speed)",
      titleZh: "低速试运行",
      instructionEn: "Start at low speed and verify stable feed with no collisions.",
      instructionZh: "低速启动，确认送丝稳定且无干涉碰撞。",
      passCriteriaEn: ["Speed set low", "No collision", "Stable feed (no slip)"],
      passCriteriaZh: ["速度设为低速", "无碰撞", "送丝稳定（无打滑）"],
      commonMistakesEn: ["Running too fast", "Not watching finger clearance"],
      commonMistakesZh: ["一上来就高速", "未观察爪位间隙"],
    },
  ],
};

// Default steps for modules without specific definitions
const DEFAULT_STEPS = [
  { id: "s1", titleEn: "Step 1", titleZh: "步骤 1", instructionEn: "Complete this step", instructionZh: "完成此步骤", passCriteriaEn: [], passCriteriaZh: [], commonMistakesEn: [], commonMistakesZh: [] },
  { id: "s2", titleEn: "Step 2", titleZh: "步骤 2", instructionEn: "Complete this step", instructionZh: "完成此步骤", passCriteriaEn: [], passCriteriaZh: [], commonMistakesEn: [], commonMistakesZh: [] },
  { id: "s3", titleEn: "Step 3", titleZh: "步骤 3", instructionEn: "Complete this step", instructionZh: "完成此步骤", passCriteriaEn: [], passCriteriaZh: [], commonMistakesEn: [], commonMistakesZh: [] },
];

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

interface PageProps {
  params: Promise<{ moduleId: string }>;
}

export default function CncLessonPlayerPage({ params }: PageProps) {
  const { moduleId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get("sessionId") || "";
  
  const { language } = useLanguage();
  const isZh = language === "zh";
  const t = (en: string, zh: string) => (isZh ? zh : en);
  const userId = "demo";

  const [demoMode, setDemoMode] = React.useState(true);
  const [log, setLog] = React.useState<Array<{ ts: number; sev: Severity; msg: string }>>([]);
  const [module, setModule] = React.useState<TrainingModule | null>(null);
  const [session, setSession] = React.useState<TrainingSession | null>(null);
  const [loading, setLoading] = React.useState(false);

  const steps = STEP_DEFINITIONS[moduleId] ?? DEFAULT_STEPS;

  // Load module and session
  React.useEffect(() => {
    if (!moduleId) return;
    (async () => {
      try {
        // Get module
        const mRes = await fetchJson<{ modules: TrainingModule[] }>("/api/training/modules");
        const mod = mRes.modules.find((x) => x.id === moduleId) ?? null;
        setModule(mod);

        // Get or create session
        if (sessionIdParam) {
          const sRes = await fetchJson<{ sessions: TrainingSession[] }>(`/api/training/sessions/list?userId=${userId}`);
          const found = sRes.sessions.find((x) => x.id === sessionIdParam) ?? null;
          setSession(found);
          pushLog("INFO", `Loaded session ${sessionIdParam}`);
        } else {
          // Auto start/resume
          const result = await fetchJson<{ session: TrainingSession }>("/api/training/sessions/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, moduleId }),
          });
          setSession(result.session);
          router.replace(`/training/cnc/${moduleId}?sessionId=${result.session.id}`);
          pushLog("INFO", `Started session ${result.session.id}`);
        }
      } catch (e) {
        console.error("Failed to load:", e);
        pushLog("ERROR", "Failed to load module/session");
      }
    })();
  }, [moduleId, sessionIdParam]);

  function pushLog(sev: Severity, msg: string) {
    setLog((prev) => [{ ts: Date.now(), sev, msg }, ...prev].slice(0, 50));
  }

  async function patchProgress(action: SessionAction, step?: number) {
    if (!module || !session) return;
    setLoading(true);
    try {
      const result = await fetchJson<{ module: TrainingModule; session: TrainingSession }>(
        "/api/training/sessions/progress",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.id,
            moduleId: module.id,
            userId,
            action,
            step,
          }),
        }
      );
      setSession(result.session);
      pushLog(
        action === "SIMULATE_ERROR" ? "ERROR" : action === "RESTART_STEP" ? "WARN" : "INFO",
        `${action} → Step ${result.session.currentStep}, Progress ${result.session.progressPercent}%`
      );
    } catch (e) {
      console.error("Failed to patch progress:", e);
      pushLog("ERROR", "Failed to update progress");
    } finally {
      setLoading(false);
    }
  }

  if (!module || !session) {
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const title = isZh ? module.titleZh : module.titleEn;
  const currentStepIndex = Math.min(session.currentStep - 1, steps.length - 1);
  const step = steps[currentStepIndex] ?? steps[0];
  const stepTitle = isZh ? step.titleZh : step.titleEn;
  const stepInstruction = isZh ? step.instructionZh : step.instructionEn;
  const passCriteria = isZh ? step.passCriteriaZh : step.passCriteriaEn;
  const mistakes = isZh ? step.commonMistakesZh : step.commonMistakesEn;

  return (
    <div className="h-[calc(100vh-0px)] w-full">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{title}</h1>
            <Badge variant="outline">{module.machine}</Badge>
            <Badge variant="outline">{module.level}</Badge>
            <Badge variant={session.status === "COMPLETED" ? "default" : "secondary"}>
              {session.status === "COMPLETED" ? t("Completed", "已完成") : t("In Progress", "进行中")}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {t("Estimated time", "预计时长")}: {module.minutes} {t("min", "分钟")}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/training/cnc">{t("Back to courses", "返回课程列表")}</Link>
          </Button>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid h-[calc(100vh-72px)] grid-cols-1 lg:grid-cols-3">
        {/* Left: 3D area */}
        <div className="lg:col-span-2 border-r">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{t("Lesson Player", "课程播放")}</Badge>
              <div className="text-sm text-muted-foreground">
                {t("Progress", "进度")} {session.progressPercent}%
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => patchProgress("RESTART_STEP")} disabled={loading}>
                {t("Restart step", "重置当前步骤")}
              </Button>
              <Button variant="outline" onClick={() => pushLog("INFO", "Hint requested")}>
                {t("Hint", "提示")}
              </Button>
              <Button variant="outline" onClick={() => setDemoMode((v) => !v)}>
                {demoMode ? t("Demo: ON", "演示：开") : t("Demo: OFF", "演示：关")}
              </Button>
            </div>
          </div>

          <div className="px-6 pb-6">
            <Progress value={session.progressPercent} />
          </div>

          <div className="px-6 pb-6">
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("3D / Unity Area", "3D / Unity 区域")}</CardTitle>
                <CardDescription>
                  {t(
                    "Phase 1 UI: placeholder. Later replace with Unity WebGL iframe.",
                    "Phase 1 UI：占位。后续替换为 Unity WebGL iframe。"
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex h-[520px] w-full items-center justify-center bg-muted text-muted-foreground">
                  <div className="text-center space-y-2">
                    <div className="text-sm">{t("Unity WebGL Placeholder", "Unity WebGL 占位")}</div>
                    <div className="text-xs">{t("Module ID", "模块ID")}: {module.id}</div>
                    <div className="text-xs">{t("Session ID", "会话ID")}: {session.id}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right: Step panel */}
        <div className="lg:col-span-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            <Card>
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{t("Steps", "步骤")}</CardTitle>
                  <Badge variant="outline">
                    {t("Step", "当前")} {session.currentStep}/{module.stepsCount}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {t(
                    "Complete each step to unlock the next. Demo mode allows manual completion.",
                    "完成当前步骤后解锁下一步。演示模式可手动标记完成。"
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {steps.map((s, idx) => {
                    const label = isZh ? s.titleZh : s.titleEn;
                    const isDone = idx < session.stepsDone;
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <button
                        key={s.id}
                        onClick={() => patchProgress("SET_STEP", idx + 1)}
                        disabled={loading}
                        className={[
                          "w-full rounded-lg border px-3 py-2 text-left transition",
                          isCurrent ? "bg-muted" : "hover:bg-muted/60",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium">
                            {idx + 1}. {label}
                          </div>
                          <Badge variant={isDone ? "default" : isCurrent ? "secondary" : "outline"} className="text-[11px]">
                            {isDone ? t("Done", "完成") : isCurrent ? t("In progress", "进行中") : t("Not started", "未开始")}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground truncate">
                          {isZh ? s.instructionZh : s.instructionEn}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <Separator />

                {/* Current step details */}
                <div className="space-y-2">
                  <div className="text-sm font-semibold">{stepTitle}</div>
                  <div className="text-sm text-muted-foreground">{stepInstruction}</div>

                  <Tabs defaultValue="criteria" className="mt-3">
                    <TabsList className="grid grid-cols-3 w-full">
                      <TabsTrigger value="criteria">{t("Criteria", "判定")}</TabsTrigger>
                      <TabsTrigger value="mistakes">{t("Mistakes", "错误")}</TabsTrigger>
                      <TabsTrigger value="log">{t("Log", "日志")}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="criteria" className="mt-3 space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        {t("Pass criteria", "通过条件")}
                      </div>
                      <ul className="text-sm list-disc pl-5 space-y-1">
                        {passCriteria.length > 0 ? passCriteria.map((x, i) => (
                          <li key={i}>{x}</li>
                        )) : <li className="text-muted-foreground">{t("No criteria defined", "未定义判定条件")}</li>}
                      </ul>
                    </TabsContent>

                    <TabsContent value="mistakes" className="mt-3 space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        {t("Common mistakes", "常见错误")}
                      </div>
                      <ul className="text-sm list-disc pl-5 space-y-1">
                        {mistakes.length > 0 ? mistakes.map((x, i) => (
                          <li key={i}>{x}</li>
                        )) : <li className="text-muted-foreground">{t("No mistakes defined", "未定义常见错误")}</li>}
                      </ul>
                    </TabsContent>

                    <TabsContent value="log" className="mt-3 space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        {t("Recent events", "最近事件")}
                      </div>
                      <div className="max-h-[220px] overflow-auto rounded-lg border p-2 space-y-2">
                        {log.length === 0 ? (
                          <div className="text-xs text-muted-foreground">{t("No events yet.", "暂无事件。")}</div>
                        ) : (
                          log.map((e) => (
                            <div key={e.ts} className="text-xs flex items-start justify-between gap-2">
                              <span
                                className={[
                                  "font-medium",
                                  e.sev === "ERROR"
                                    ? "text-red-600"
                                    : e.sev === "WARN"
                                    ? "text-amber-600"
                                    : "text-muted-foreground",
                                ].join(" ")}
                              >
                                {e.sev}
                              </span>
                              <span className="flex-1">{e.msg}</span>
                              <span className="text-muted-foreground">
                                {new Date(e.ts).toLocaleTimeString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <Separator />

                {/* Demo controls */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    {t("Actions", "操作")}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      disabled={!demoMode || loading || session.status === "COMPLETED"}
                      onClick={() => patchProgress("MARK_DONE")}
                    >
                      {t("Mark done", "标记完成")}
                    </Button>

                    <Button
                      variant="outline"
                      disabled={!demoMode || loading}
                      onClick={() => patchProgress("SIMULATE_ERROR")}
                    >
                      {t("Simulate error", "模拟错误")}
                    </Button>
                  </div>

                  <Button variant="secondary" className="w-full" asChild>
                    <Link href="/training/cnc">{t("Exit lesson", "退出课程")}</Link>
                  </Button>

                  <div className="text-xs text-muted-foreground">
                    {demoMode
                      ? t(
                          "Demo mode is ON: you can complete steps without Unity.",
                          "演示模式已开启：无需 Unity 也可推进步骤。"
                        )
                      : t(
                          "Demo mode is OFF: later Unity events will drive progress automatically.",
                          "演示模式关闭：后续由 Unity 事件自动驱动进度。"
                        )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Help card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("Next", "下一步")}</CardTitle>
                <CardDescription>
                  {t(
                    "When Unity WebGL build is ready, replace the placeholder with an iframe and send events via postMessage.",
                    "当 Unity WebGL build 就绪后，把占位区替换为 iframe，并用 postMessage 回传事件。"
                  )}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

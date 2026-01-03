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
  const [error, setError] = React.useState<string | null>(null);

  // Checklists state: { stepKey-index: boolean }
  const [checklistState, setChecklistState] = React.useState<Record<string, boolean>>({});

  const steps = module?.steps ?? [];

  // Load module and session
  React.useEffect(() => {
    if (!moduleId) return;
    (async () => {
      try {
        // Get module
        const mRes = await fetchJson<{ modules: TrainingModule[] }>("/api/training/modules");
        const mod = mRes.modules.find((x) => x.id === moduleId) ?? null;
        if (!mod) throw new Error(`Module '${moduleId}' not found in API`);
        setModule(mod);

        // Get or create session
        let sessionToSet = null;

        if (sessionIdParam) {
          const sRes = await fetchJson<{ sessions: TrainingSession[] }>(`/api/training/sessions/list?userId=${userId}`);
          const found = sRes.sessions.find((x) => x.id === sessionIdParam) ?? null;
          if (found) {
            sessionToSet = found;
            pushLog("INFO", `Resumed session ${sessionIdParam}`);
          } else {
             console.warn(`Session ${sessionIdParam} not found, starting new one.`);
          }
        }
        
        if (!sessionToSet) {
          // Auto start/resume
          const result = await fetchJson<{ session: TrainingSession }>("/api/training/sessions/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, moduleId }),
          });
          if (!result.session) throw new Error("Failed to create/resume session");
          sessionToSet = result.session;
          router.replace(`/training/cnc/${moduleId}?sessionId=${result.session.id}`);
          pushLog("INFO", `Started session ${result.session.id}`);
        }

        setSession(sessionToSet);
      } catch (e: any) {
        console.error("Failed to load:", e);
        setError(e.message || "Failed to load module or session");
        pushLog("ERROR", "Failed to load module/session");
      }
    })();
  }, [moduleId, sessionIdParam]);

  // Derived step data
  const currentStepIndex = session ? Math.min(session.currentStep - 1, steps.length - 1) : 0;
  const step = steps[currentStepIndex];

  // Reset checklist when step changes (optional, or persist in local state)
  React.useEffect(() => {
    if (step) {
        // We could reset here if we want fresh state every time we enter a step
        // setChecklistState({}); 
    }
  }, [step?.key]);


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
    } catch (e: any) {
      console.error(e);
      pushLog("ERROR", `Action ${action} failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoAction(item: { action: string; step?: number }) {
      if (item.action === "CONTINUE") {
          await patchProgress("SET_STEP", (session!.currentStep) + 1);
      } else {
          await patchProgress(item.action as SessionAction, item.step);
      }
  }

  const toggleChecklist = (key: string, idx: number) => {
      const id = `${key}-${idx}`;
      setChecklistState(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const stepBullets = step ? (isZh ? step.bulletsZh : step.bulletsEn) : [];
  const stepChecklist = step ? (isZh ? step.checklistZh : step.checklistEn) : [];
  
  const isChecklistComplete = React.useMemo(() => {
    if (!stepChecklist || stepChecklist.length === 0) return true;
    return stepChecklist.every((_, idx) => checklistState[`${step?.key}-${idx}`]);
  }, [stepChecklist, checklistState, step]);


  if (error) {
    return (
      <div className="p-10 text-center space-y-4">
        <div className="text-red-600 font-semibold">Error: {error}</div>
        <div className="text-sm text-muted-foreground">Module ID: {moduleId}</div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!module || !session) {
    return (
      <div className="p-10 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <div className="text-muted-foreground">
            {t("Loading lesson content...", "正在加载课程内容...")}
          <br />
          <span className="text-xs font-mono">ID: {moduleId}</span>
        </div>
      </div>
    );
  }

  const title = isZh ? module.titleZh : module.titleEn;
  const stepTitle = step ? (isZh ? step.titleZh : step.titleEn) : "";

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
        <div className="lg:col-span-2 border-r flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 border-b">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{t("Lesson Player", "课程播放")}</Badge>
              <div className="text-sm text-muted-foreground">
                {t("Progress", "进度")} {session.progressPercent}%
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => patchProgress("RESTART_STEP")} disabled={loading}>
                {t("Restart step", "重置当前步骤")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => pushLog("INFO", "Hint requested")}>
                {t("Hint", "提示")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDemoMode((v) => !v)}>
                {demoMode ? t("Demo: ON", "演示：开") : t("Demo: OFF", "演示：关")}
              </Button>
            </div>
          </div>

          <div className="flex-1 bg-muted/20 relative">
             {/* Imagine Unity Canvas Here */}
             <div className="absolute inset-0 flex items-center justify-center text-muted-foreground flex-col gap-2">
                <div className="font-semibold text-lg">{t("3D Simulation View", "3D 仿真视图")}</div>
                <div className="text-sm">({t("Module", "模块")}: {module.id})</div>
             </div>
          </div>
          
          <div className="p-4 border-t h-[150px] overflow-auto bg-background">
             <div className="text-xs font-mono space-y-1">
                {log.map((l, i) => (
                    <div key={i} className={l.sev === "ERROR" ? "text-red-500" : l.sev === "WARN" ? "text-amber-500" : "text-muted-foreground"}>
                        [{new Date(l.ts).toLocaleTimeString()}] {l.msg}
                    </div>
                ))}
             </div>
          </div>
        </div>

        {/* Right: Step panel */}
        <div className="lg:col-span-1 overflow-y-auto bg-card">
          <div className="p-6 space-y-6">
            
            {/* Step Header */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Badge variant="outline">{t("Step", "步骤")} {session.currentStep} / {module.stepsCount}</Badge>
                    {step?.requireChecklistComplete && !isChecklistComplete && (
                        <Badge variant="destructive" className="text-[10px]">{t("Checklist Required", "需完成检查项")}</Badge>
                    )}
                </div>
                <h2 className="text-xl font-bold">{stepTitle}</h2>
                <div className="text-sm text-muted-foreground">
                    {isZh ? step?.descriptionZh : step?.descriptionEn}
                </div>
            </div>

            <Separator />

            {/* Content: Bullets */}
            {stepBullets && stepBullets.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground">{t("Key Points", "关键点")}</h3>
                    <ul className="list-disc pl-5 space-y-1">
                        {stepBullets.map((b, i) => (
                            <li key={i} className="text-sm text-muted-foreground">{b}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Content: Checklist */}
            {stepChecklist && stepChecklist.length > 0 && (
                <div className="space-y-3 bg-muted/30 p-4 rounded-lg border">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                        {t("Safety Checklist", "安全检查项")}
                        <Badge variant={isChecklistComplete ? "default" : "outline"} className="text-[10px] h-5">
                            {isChecklistComplete ? "OK" : t("Pending", "待确认")}
                        </Badge>
                    </h3>
                    <div className="space-y-2">
                        {stepChecklist.map((item, i) => {
                            const isChecked = checklistState[`${step.key}-${i}`] || false;
                            return (
                                <div key={i} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => toggleChecklist(step.key, i)}>
                                    <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                                        {isChecked && <div className="w-2 h-2 bg-primary-foreground rounded-sm" />}
                                    </div>
                                    <div className={`text-sm select-none ${isChecked ? "text-foreground font-medium" : "text-muted-foreground"}`}>{item}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="h-4" />

            {/* Actions */}
            <div className="space-y-3">
                {step?.demoActions && step.demoActions.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                        {step.demoActions.map((action, idx) => {
                             const isGated = 
                                step.requireChecklistComplete && 
                                !isChecklistComplete && 
                                (action.action === "CONTINUE" || action.action === "MARK_DONE");
                             
                             return (
                                <Button 
                                    key={idx}
                                    variant={action.action === "SIMULATE_ERROR" ? "destructive" : action.action === "RESTART_STEP" ? "outline" : "default"}
                                    disabled={!demoMode || loading || session.status === "COMPLETED" || isGated}
                                    onClick={() => handleDemoAction(action)}
                                    className="w-full"
                                >
                                    {isZh ? action.labelZh : action.labelEn}
                                </Button>
                             );
                        })}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                        {t("Follow instructions in 3D view.", "请在 3D 视图中按指示操作。")}
                    </div>
                )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

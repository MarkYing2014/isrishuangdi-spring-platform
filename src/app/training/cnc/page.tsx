"use client";

/**
 * CNC Training Course List Page
 * Session-driven with API integration
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/components/language-context";
import type { TrainingModule, TrainingSession, CourseStatus, Level } from "@/lib/training";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function statusLabel(status: CourseStatus) {
  if (status === "NOT_STARTED") return { en: "Not started", zh: "未开始" };
  if (status === "IN_PROGRESS") return { en: "In progress", zh: "进行中" };
  return { en: "Completed", zh: "已完成" };
}

function statusVariant(status: CourseStatus): "default" | "secondary" | "outline" {
  if (status === "COMPLETED") return "default";
  if (status === "IN_PROGRESS") return "secondary";
  return "outline";
}

export default function CncTrainingPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const isZh = language === "zh";
  const t = (en: string, zh: string) => (isZh ? zh : en);
  const userId = "demo";

  const [modules, setModules] = React.useState<TrainingModule[]>([]);
  const [sessions, setSessions] = React.useState<TrainingSession[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [statusTab, setStatusTab] = React.useState<"ALL" | CourseStatus>("ALL");
  const [level, setLevel] = React.useState<"ALL" | Level>("ALL");
  const [machine, setMachine] = React.useState<"ALL" | "8-claw">("ALL");
  const [query, setQuery] = React.useState("");

  // Load modules and sessions
  React.useEffect(() => {
    (async () => {
      try {
        const [mRes, sRes] = await Promise.all([
          fetchJson<{ modules: TrainingModule[] }>("/api/training/modules"),
          fetchJson<{ sessions: TrainingSession[] }>(`/api/training/sessions/list?userId=${userId}`),
        ]);
        setModules(mRes.modules);
        setSessions(sRes.sessions);
      } catch (e) {
        console.error("Failed to load training data:", e);
      }
    })();
  }, []);

  const sessionByModuleId = React.useMemo(() => {
    const map = new Map<string, TrainingSession>();
    for (const s of sessions) map.set(s.moduleId, s);
    return map;
  }, [sessions]);

  // Merge modules with session data
  const coursesWithSession = React.useMemo(() => {
    return modules.map((m) => {
      const sess = sessionByModuleId.get(m.id);
      return {
        ...m,
        status: sess?.status ?? "NOT_STARTED" as CourseStatus,
        progressPercent: sess?.progressPercent ?? 0,
        sessionId: sess?.id,
      };
    });
  }, [modules, sessionByModuleId]);

  // Filter and sort
  const courses = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return coursesWithSession
      .filter((c) => (statusTab === "ALL" ? true : c.status === statusTab))
      .filter((c) => (level === "ALL" ? true : c.level === level))
      .filter((c) => (machine === "ALL" ? true : c.machine === machine))
      .filter((c) => {
        if (!q) return true;
        const hay = `${c.id} ${c.titleEn} ${c.titleZh} ${c.level} ${c.machine}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const prio = (s: CourseStatus) => (s === "NOT_STARTED" ? 0 : s === "IN_PROGRESS" ? 1 : 2);
        const p = prio(a.status) - prio(b.status);
        if (p !== 0) return p;
        if (a.progressPercent !== b.progressPercent) return a.progressPercent - b.progressPercent;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [coursesWithSession, statusTab, level, machine, query]);

  async function handleStart(moduleId: string) {
    setLoading(true);
    try {
      const result = await fetchJson<{ session: TrainingSession }>("/api/training/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, moduleId }),
      });
      const sessionId = result.session.id;

      // Refresh sessions
      const sRes = await fetchJson<{ sessions: TrainingSession[] }>(`/api/training/sessions/list?userId=${userId}`);
      setSessions(sRes.sessions);

      router.push(`/training/cnc/${moduleId}?sessionId=${sessionId}`);
    } catch (e) {
      console.error("Failed to start session:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{t("CNC Training", "CNC 培训")}</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "Immersive self-training for CNC spring machines (Phase 1: universal 8-claw).",
              "沉浸式 CNC 卷簧机自学（Phase 1：通用八爪机）。"
            )}
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/">{t("Home", "首页")}</Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as any)}>
            <TabsList className="grid grid-cols-4 w-full sm:w-[520px]">
              <TabsTrigger value="ALL">{t("All", "全部")}</TabsTrigger>
              <TabsTrigger value="NOT_STARTED">{t("Not started", "未开始")}</TabsTrigger>
              <TabsTrigger value="IN_PROGRESS">{t("In progress", "进行中")}</TabsTrigger>
              <TabsTrigger value="COMPLETED">{t("Completed", "已完成")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Input
                placeholder={t("Search by course name / id...", "搜索课程名 / ID...")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <Select value={level} onValueChange={(v) => setLevel(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder={t("Level", "难度")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("All levels", "全部难度")}</SelectItem>
                <SelectItem value="Beginner">{t("Beginner", "入门")}</SelectItem>
                <SelectItem value="Intermediate">{t("Intermediate", "进阶")}</SelectItem>
                <SelectItem value="Advanced">{t("Advanced", "高级")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={machine} onValueChange={(v) => setMachine(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder={t("Machine", "机型")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("All machines", "全部机型")}</SelectItem>
                <SelectItem value="8-claw">{t("8-claw", "八爪机")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t("Courses", "课程")}：{courses.length}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {courses.map((c) => {
          const st = statusLabel(c.status);
          const title = isZh ? c.titleZh : c.titleEn;
          const goals = isZh ? c.goalsZh : c.goalsEn;

          const ctaLabel =
            c.status === "NOT_STARTED"
              ? t("Start", "开始")
              : c.status === "IN_PROGRESS"
              ? t("Resume", "继续")
              : t("Review", "复习");

          return (
            <Card key={c.id} className="overflow-hidden">
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <CardDescription className="flex flex-wrap gap-2">
                      <Badge variant="outline">{c.machine}</Badge>
                      <Badge variant="outline">{c.level}</Badge>
                      <Badge variant={statusVariant(c.status)}>
                        {isZh ? st.zh : st.en}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {c.minutes} {t("min", "分钟")}
                      </span>
                    </CardDescription>
                  </div>

                  <Button onClick={() => handleStart(c.id)} disabled={loading}>
                    {ctaLabel}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Progress value={c.progressPercent} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t("Progress", "进度")} {c.progressPercent}%</span>
                    <span>{t("Updated", "更新")} {new Date(c.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardHeader>

              <Separator />

              <CardContent className="p-4">
                <div className="text-sm font-medium">{t("Goals", "目标")}</div>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc pl-5">
                  {goals.slice(0, 3).map((g, idx) => (
                    <li key={idx}>{g}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

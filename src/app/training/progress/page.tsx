"use client";

/**
 * Training Progress Overview Page
 * Shows per-module progress with status, score, errors, time
 * Supports filtering (failed only) and CSV export
 */

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/language-context";
import type { TrainingModule, TrainingSession, Level } from "@/lib/training";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type Row = {
  moduleId: string;
  titleZh: string;
  titleEn: string;
  level: Level;
  machine: string;
  minutes: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  progressPercent: number;
  errorsCount: number;
  updatedAt: string;
};

function toCsvValue(v: any) {
  const s = String(v ?? "");
  const escaped = s.replace(/"/g, '""');
  return /[,\n"]/.test(escaped) ? `"${escaped}"` : escaped;
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function TrainingProgressPage() {
  const userId = "demo";
  const { language } = useLanguage();
  const isZh = language === "zh";
  const t = (en: string, zh: string) => (isZh ? zh : en);

  const [modules, setModules] = React.useState<TrainingModule[]>([]);
  const [sessions, setSessions] = React.useState<TrainingSession[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [level, setLevel] = React.useState<"ALL" | Level>("ALL");
  const [onlyIncomplete, setOnlyIncomplete] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [mRes, sRes] = await Promise.all([
          fetchJson<{ modules: TrainingModule[] }>("/api/training/modules"),
          fetchJson<{ sessions: TrainingSession[] }>(`/api/training/sessions/list?userId=${userId}`),
        ]);
        setModules(mRes.modules);
        setSessions(sRes.sessions);
      } finally {
        setLoading(false);
      }
    })().catch(console.error);
  }, []);

  const sessionByModuleId = React.useMemo(() => {
    const map = new Map<string, TrainingSession>();
    for (const s of sessions) {
      const existing = map.get(s.moduleId);
      if (!existing) map.set(s.moduleId, s);
      else {
        const a = new Date(existing.updatedAt).getTime();
        const b = new Date(s.updatedAt).getTime();
        if (b > a) map.set(s.moduleId, s);
      }
    }
    return map;
  }, [sessions]);

  const rows: Row[] = React.useMemo(() => {
    return modules.map((m) => {
      const s = sessionByModuleId.get(m.id);
      return {
        moduleId: m.id,
        titleZh: m.titleZh,
        titleEn: m.titleEn,
        level: m.level,
        machine: m.machine,
        minutes: m.minutes,
        status: s?.status ?? "NOT_STARTED",
        progressPercent: s?.progressPercent ?? 0,
        errorsCount: 0, // Track errors in future
        updatedAt: s?.updatedAt ?? m.updatedAt,
      };
    });
  }, [modules, sessionByModuleId]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (level === "ALL" ? true : r.level === level))
      .filter((r) => {
        if (!q) return true;
        const hay = `${r.moduleId} ${r.titleZh} ${r.titleEn} ${r.level} ${r.machine}`.toLowerCase();
        return hay.includes(q);
      })
      .filter((r) => {
        if (!onlyIncomplete) return true;
        return r.status !== "COMPLETED";
      })
      .sort((a, b) => {
        const prio = (r: Row) => {
          if (r.status === "IN_PROGRESS") return 0;
          if (r.status === "NOT_STARTED") return 1;
          return 2;
        };
        const p = prio(a) - prio(b);
        if (p !== 0) return p;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [rows, level, query, onlyIncomplete]);

  const summary = React.useMemo(() => {
    const total = rows.length;
    const notStarted = rows.filter((r) => r.status === "NOT_STARTED").length;
    const inProgress = rows.filter((r) => r.status === "IN_PROGRESS").length;
    const completed = rows.filter((r) => r.status === "COMPLETED").length;
    return { total, notStarted, inProgress, completed };
  }, [rows]);

  function exportCsv() {
    // Server-side export with permissions and audit logging
    const params = new URLSearchParams();
    params.set("userId", userId);
    if (onlyIncomplete) params.set("onlyIncomplete", "1");
    if (level !== "ALL") params.set("level", level);
    if (query.trim()) params.set("q", query.trim());
    params.set("lang", isZh ? "zh" : "en");
    // Demo: pass actor identity via query
    params.set("actorUserId", userId);
    params.set("role", "user"); // Change to "admin" to test admin export
    
    window.location.href = `/api/training/export?${params.toString()}`;
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{t("Training Progress", "培训进度总览")}</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "One row per module: status / progress / errors. Filter incomplete for retraining.",
              "每个模块一行：状态 / 进度 / 错误。筛选未完成以安排复训。"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/training/cnc">{t("CNC Courses", "CNC 课程")}</Link>
          </Button>
          <Button onClick={exportCsv}>{t("Export CSV", "导出 CSV")}</Button>
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">{t("Total", "总数")} {summary.total}</Badge>
            <Badge variant="outline">{t("Not started", "未开始")} {summary.notStarted}</Badge>
            <Badge variant="secondary">{t("In progress", "进行中")} {summary.inProgress}</Badge>
            <Badge>{t("Completed", "已完成")} {summary.completed}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("Filters", "筛选")}</CardTitle>
          <CardDescription>
            {t("Search and filter. CSV export follows current filters.", "搜索筛选；导出 CSV 按当前筛选。")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Input
                placeholder={t("Search by module id / title...", "按模块ID/标题搜索...")}
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

            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div className="space-y-0.5">
                <Label className="text-sm">{t("Only incomplete", "仅未完成")}</Label>
                <div className="text-xs text-muted-foreground">
                  {t("Not started / In progress", "未开始/进行中")}
                </div>
              </div>
              <Switch checked={onlyIncomplete} onCheckedChange={setOnlyIncomplete} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("Modules", "模块")}</CardTitle>
          <CardDescription>
            {t("Click action to open course.", "点击操作打开课程。")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left p-3">{t("Module", "模块")}</th>
                  <th className="text-left p-3">{t("Status", "状态")}</th>
                  <th className="text-right p-3">{t("Progress", "进度")}</th>
                  <th className="text-right p-3">{t("Errors", "错误")}</th>
                  <th className="text-right p-3">{t("Action", "操作")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="p-6 text-muted-foreground" colSpan={5}>
                      {t("Loading...", "加载中...")}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="p-6 text-muted-foreground" colSpan={5}>
                      {t("No results.", "无结果。")}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const title = isZh ? r.titleZh : r.titleEn;
                    const statusLabel =
                      r.status === "NOT_STARTED"
                        ? t("Not started", "未开始")
                        : r.status === "IN_PROGRESS"
                        ? t("In progress", "进行中")
                        : t("Completed", "已完成");
                    const actionLabel =
                      r.status === "NOT_STARTED"
                        ? t("Start", "开始")
                        : r.status === "IN_PROGRESS"
                        ? t("Resume", "继续")
                        : t("Review", "复习");

                    return (
                      <tr key={r.moduleId} className="border-b hover:bg-muted/40">
                        <td className="p-3">
                          <div className="font-medium">{title}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.moduleId} · {r.machine} · {r.level} · {r.minutes} {t("min", "分钟")}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={r.status === "COMPLETED" ? "default" : r.status === "IN_PROGRESS" ? "secondary" : "outline"}>
                            {statusLabel}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">{r.progressPercent}%</td>
                        <td className="p-3 text-right">{r.errorsCount}</td>
                        <td className="p-3 text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/training/cnc/${r.moduleId}`}>{actionLabel}</Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Separator />
          <div className="p-4 text-xs text-muted-foreground">
            {t(
              "CSV export is server-side with permissions and audit logging.",
              "CSV 导出为服务端导出，带权限控制与审计日志。"
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

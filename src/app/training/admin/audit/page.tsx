"use client";

/**
 * Training Admin - Audit Log Page
 * Shows export audit events (ALLOW/DENY) - Admin only
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
import { useLanguage } from "@/components/language-context";
import type { ExportAuditEvent } from "@/lib/training";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function TrainingAuditAdminPage() {
  // Demo: hardcoded admin role; later from auth context
  const actorUserId = "demo";
  const role = "admin";

  const { language } = useLanguage();
  const isZh = language === "zh";
  const t = (en: string, zh: string) => (isZh ? zh : en);

  const [events, setEvents] = React.useState<ExportAuditEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [resultFilter, setResultFilter] = React.useState<"ALL" | "ALLOW" | "DENY">("ALL");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/training/audit/list?limit=300&actorUserId=${encodeURIComponent(actorUserId)}&role=${encodeURIComponent(role)}`;
      const data = await fetchJson<{ events: ExportAuditEvent[] }>(url);
      setEvents(data.events);
    } catch (e: any) {
      setError(e?.message ?? "load_failed");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((e) => (resultFilter === "ALL" ? true : e.result === resultFilter))
      .filter((e) => {
        if (!q) return true;
        const hay = [
          e.id,
          e.actorUserId,
          e.actorRole,
          e.targetUserId,
          e.result,
          e.reason ?? "",
          e.ip ?? "",
          e.userAgent ?? "",
          e.filters?.level ?? "",
          e.filters?.q ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }, [events, query, resultFilter]);

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{t("Audit Log", "审计日志")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Export audit events (ALLOW/DENY). Admin only.", "导出审计记录（允许/拒绝）。仅管理员可访问。")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/training/progress">{t("Progress", "进度总览")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/training/cnc">{t("CNC Courses", "CNC 课程")}</Link>
          </Button>
          <Button onClick={load} disabled={loading}>
            {loading ? t("Refreshing...", "刷新中...") : t("Refresh", "刷新")}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-red-600">{t("Error", "错误")}: {error}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("Tip: set role=admin to access this page.", "提示：需要 role=admin 才能访问。")}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("Filters", "筛选")}</CardTitle>
          <CardDescription>
            {t("Search by actor/target/reason/IP.", "按导出者/目标用户/原因/IP 搜索。")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-3">
              <Input
                placeholder={t("Search...", "搜索...")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={resultFilter} onValueChange={(v) => setResultFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder={t("Result", "结果")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("All", "全部")}</SelectItem>
                <SelectItem value="ALLOW">{t("ALLOW", "允许")}</SelectItem>
                <SelectItem value="DENY">{t("DENY", "拒绝")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground">
            {t("Showing", "显示")} {filtered.length} / {events.length}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("Audit Events", "审计事件")}</CardTitle>
          <CardDescription>
            {t("Newest first. DENY entries help debug permission rules.", "按时间倒序。DENY 记录用于排查权限。")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left p-3">{t("Time", "时间")}</th>
                  <th className="text-left p-3">{t("Actor", "导出者")}</th>
                  <th className="text-left p-3">{t("Target", "目标用户")}</th>
                  <th className="text-left p-3">{t("Filters", "筛选条件")}</th>
                  <th className="text-right p-3">{t("Rows", "行数")}</th>
                  <th className="text-left p-3">{t("Result", "结果")}</th>
                  <th className="text-left p-3">{t("IP", "IP")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-muted-foreground">
                      {t("Loading...", "加载中...")}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-muted-foreground">
                      {t("No events.", "暂无记录。")}
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => {
                    const isDeny = e.result === "DENY";
                    const filterText = [
                      e.filters?.onlyIncomplete ? "onlyIncomplete" : "",
                      e.filters?.level ? `level=${e.filters.level}` : "",
                      e.filters?.q ? `q=${e.filters.q}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <tr key={e.id} className="border-b hover:bg-muted/40">
                        <td className="p-3">
                          <div className="font-medium">{new Date(e.ts).toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{e.id}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{e.actorRole}</Badge>
                            <span className="font-medium">{e.actorUserId}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-medium">{e.targetUserId}</span>
                        </td>
                        <td className="p-3">
                          {filterText ? (
                            <div className="text-xs">{filterText}</div>
                          ) : (
                            <div className="text-xs text-muted-foreground">{t("None", "无")}</div>
                          )}
                          {isDeny && e.reason && (
                            <div className="mt-1 text-xs text-red-600">
                              {t("Reason", "原因")}: {e.reason}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">{e.rowCount}</td>
                        <td className="p-3">
                          <Badge variant={isDeny ? "outline" : "default"}>{e.result}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="text-xs">{e.ip ?? "-"}</div>
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
              "Demo: role=admin in page. Production: from Clerk/JWT auth.",
              "Demo：页面写死 role=admin。生产环境：从 Clerk/JWT 获取。"
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

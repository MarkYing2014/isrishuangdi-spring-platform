"use client";

/**
 * PPAP List Page
 * Risk & Delivery Management View
 * Displays all PPAP packages with status, readiness, and quick actions
 */

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  Plus,
  RefreshCw,
  ExternalLink,
  Loader2,
  Search,
  AlertTriangle,
} from "lucide-react";
import { useLanguage } from "@/components/language-context";
import type { PpapPackage, PpapStatus, PpapReadinessResult } from "@/lib/ppap";
import { computePpapReadiness, PSW_REQUIRED_ITEMS } from "@/lib/ppap";

// Status priority for sorting (lower = higher priority)
const STATUS_PRIORITY: Record<PpapStatus, number> = {
  DRAFT: 1,
  READY: 2,
  SUBMITTED: 3,
  APPROVED: 4,
};

const STATUS_STYLES: Record<PpapStatus, string> = {
  DRAFT: "bg-amber-500/20 text-amber-400 border-amber-500/50",
  READY: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
  SUBMITTED: "bg-sky-500/20 text-sky-400 border-sky-500/50",
  APPROVED: "bg-slate-500/20 text-slate-400 border-slate-500/50",
};

const STATUS_LABELS: Record<PpapStatus, { en: string; zh: string }> = {
  DRAFT: { en: "Draft", zh: "草稿" },
  READY: { en: "Ready", zh: "待提交" },
  SUBMITTED: { en: "Submitted", zh: "已提交" },
  APPROVED: { en: "Approved", zh: "已批准" },
};

// i18n translations
const t = {
  title: { en: "PPAP Management", zh: "PPAP 管理" },
  subtitle: { en: "Risk & Delivery Management", zh: "风险与交付管理" },
  refresh: { en: "Refresh", zh: "刷新" },
  newPpap: { en: "New PPAP", zh: "新建 PPAP" },
  packages: { en: "PPAP Packages", zh: "PPAP 包列表" },
  loading: { en: "Loading...", zh: "加载中..." },
  noPackages: { en: "No PPAP packages yet", zh: "暂无 PPAP 包" },
  noResults: { en: "No matching packages", zh: "无匹配结果" },
  id: { en: "PPAP ID", zh: "编号" },
  part: { en: "Part / Rev", zh: "零件 / 版本" },
  customer: { en: "Customer", zh: "客户" },
  level: { en: "Level", zh: "等级" },
  status: { en: "Status", zh: "状态" },
  readiness: { en: "Readiness", zh: "就绪度" },
  missing: { en: "Missing", zh: "待完成" },
  updated: { en: "Updated", zh: "更新" },
  action: { en: "Action", zh: "操作" },
  open: { en: "Open", zh: "打开" },
  partNo: { en: "Part No", zh: "零件号" },
  partRev: { en: "Revision", zh: "版本" },
  partName: { en: "Part Name", zh: "零件名称" },
  program: { en: "Program", zh: "项目" },
  submissionLevel: { en: "Submission Level", zh: "提交等级" },
  create: { en: "Create", zh: "创建" },
  cancel: { en: "Cancel", zh: "取消" },
  createTitle: { en: "Create New PPAP Package", zh: "创建新 PPAP 包" },
  creating: { en: "Creating...", zh: "创建中..." },
  all: { en: "All", zh: "全部" },
  searchPlaceholder: { en: "Search Part No / PPAP ID", zh: "搜索零件号 / PPAP 编号" },
  allCustomers: { en: "All Customers", zh: "全部客户" },
  allLevels: { en: "All Levels", zh: "全部等级" },
  more: { en: "more", zh: "更多" },
};

// Checklist item labels for missing display
const ITEM_LABELS: Record<string, { en: string; zh: string }> = {
  designRecord: { en: "Design", zh: "设计" },
  engineeringApproval: { en: "Eng Approval", zh: "工程批准" },
  controlPlan: { en: "Control Plan", zh: "控制计划" },
  msa: { en: "MSA", zh: "MSA" },
  materialCert: { en: "Material", zh: "材料" },
  dimensionalResults: { en: "Dims", zh: "尺寸" },
};

interface ExtendedPpapPackage extends PpapPackage {
  readiness?: PpapReadinessResult;
}

export default function PpapListPage() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const T = (key: keyof typeof t) => (isZh ? t[key].zh : t[key].en);

  const [packages, setPackages] = useState<ExtendedPpapPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [form, setForm] = useState({
    partNo: "",
    partRev: "A",
    partName: "",
    program: "",
    customer: "",
    submissionLevel: "3",
  });

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ppap/packages");
      const data = await res.json();
      if (data.ok) {
        // Compute readiness for each package
        const enriched = data.data.map((pkg: PpapPackage) => ({
          ...pkg,
          readiness: computePpapReadiness(pkg),
        }));
        setPackages(enriched);
        setError(null);
      } else {
        setError(data.error?.message || "Failed to load packages");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      const res = await fetch("/api/ppap/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          submissionLevel: parseInt(form.submissionLevel),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowCreate(false);
        setForm({ partNo: "", partRev: "A", partName: "", program: "", customer: "", submissionLevel: "3" });
        fetchPackages();
      } else {
        setError(data.error?.message);
      }
    } catch (err) {
      setError("Failed to create PPAP");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  // Get unique customers for filter
  const customers = useMemo(() => {
    const set = new Set(packages.map((p) => p.customer));
    return Array.from(set).sort();
  }, [packages]);

  // Filter and sort packages
  const filteredPackages = useMemo(() => {
    let result = [...packages];

    // Apply filters
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (customerFilter !== "all") {
      result = result.filter((p) => p.customer === customerFilter);
    }
    if (levelFilter !== "all") {
      result = result.filter((p) => p.submissionLevel === parseInt(levelFilter));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.partNo.toLowerCase().includes(q) ||
          p.partName.toLowerCase().includes(q)
      );
    }

    // Sort by: Status priority → Readiness (low first) → Updated (recent first)
    result.sort((a, b) => {
      // 1. Status priority
      const statusDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
      if (statusDiff !== 0) return statusDiff;

      // 2. Readiness (lower readiness = higher priority)
      const readinessA = a.readiness?.percent ?? 0;
      const readinessB = b.readiness?.percent ?? 0;
      if (readinessA !== readinessB) return readinessA - readinessB;

      // 3. Updated (most recent first)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return result;
  }, [packages, statusFilter, customerFilter, levelFilter, searchQuery]);

  // Readiness bar component
  const ReadinessBar = ({ percent }: { percent: number }) => {
    const color =
      percent >= 90 ? "bg-emerald-500" : percent >= 60 ? "bg-amber-500" : "bg-red-500";
    const textColor =
      percent >= 90 ? "text-emerald-400" : percent >= 60 ? "text-amber-400" : "text-red-400";

    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full`} style={{ width: `${percent}%` }} />
        </div>
        <span className={`text-xs font-medium ${textColor}`}>{percent}%</span>
      </div>
    );
  };

  // Missing items chips
  const MissingChips = ({ missing }: { missing: string[] }) => {
    if (missing.length === 0) return <span className="text-emerald-400 text-xs">✓ Complete</span>;

    const shown = missing.slice(0, 2);
    const extra = missing.length - 2;

    return (
      <TooltipProvider>
        <div className="flex flex-wrap gap-1">
          {shown.map((key) => (
            <span
              key={key}
              className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20"
            >
              {isZh ? ITEM_LABELS[key]?.zh : ITEM_LABELS[key]?.en || key}
            </span>
          ))}
          {extra > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-slate-500 cursor-help">
                  +{extra} {T("more")}
                </span>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-800 border-slate-700">
                <div className="space-y-1">
                  {missing.slice(2).map((key) => (
                    <div key={key} className="text-xs text-slate-300">
                      {isZh ? ITEM_LABELS[key]?.zh : ITEM_LABELS[key]?.en || key}
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-sky-400" />
            <div>
              <h1 className="text-2xl font-bold">{T("title")}</h1>
              <p className="text-sm text-slate-400">{T("subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPackages}
              className="border-slate-700 text-slate-300"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {T("refresh")}
            </Button>
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {T("newPpap")}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Tabs */}
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="bg-slate-800">
              <TabsTrigger value="all" className="data-[state=active]:bg-slate-700">
                {T("all")}
              </TabsTrigger>
              <TabsTrigger value="DRAFT" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                {STATUS_LABELS.DRAFT[language]}
              </TabsTrigger>
              <TabsTrigger value="READY" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                {STATUS_LABELS.READY[language]}
              </TabsTrigger>
              <TabsTrigger value="SUBMITTED" className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-400">
                {STATUS_LABELS.SUBMITTED[language]}
              </TabsTrigger>
              <TabsTrigger value="APPROVED" className="data-[state=active]:bg-slate-600">
                {STATUS_LABELS.APPROVED[language]}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Customer Filter */}
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
              <SelectValue placeholder={T("allCustomers")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{T("allCustomers")}</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Level Filter */}
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-32 bg-slate-800 border-slate-700">
              <SelectValue placeholder={T("allLevels")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{T("allLevels")}</SelectItem>
              <SelectItem value="1">L1</SelectItem>
              <SelectItem value="2">L2</SelectItem>
              <SelectItem value="3">L3</SelectItem>
              <SelectItem value="4">L4</SelectItem>
              <SelectItem value="5">L5</SelectItem>
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder={T("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-800 border-slate-700"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Table */}
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-slate-500">{T("loading")}</div>
            ) : filteredPackages.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                {packages.length === 0 ? T("noPackages") : T("noResults")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-700">
                    <TableHead className="text-slate-400">{T("id")}</TableHead>
                    <TableHead className="text-slate-400">{T("part")}</TableHead>
                    <TableHead className="text-slate-400">{T("customer")}</TableHead>
                    <TableHead className="text-slate-400 w-16">{T("level")}</TableHead>
                    <TableHead className="text-slate-400 w-24">{T("status")}</TableHead>
                    <TableHead className="text-slate-400 w-28">{T("readiness")}</TableHead>
                    <TableHead className="text-slate-400">{T("missing")}</TableHead>
                    <TableHead className="text-slate-400 w-20">{T("action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPackages.map((pkg) => (
                    <TableRow key={pkg.id} className="border-slate-700/50 hover:bg-slate-800/50">
                      <TableCell className="font-mono text-sm text-sky-400">
                        <Link href={`/ppap/${pkg.id}`} className="hover:underline">
                          {pkg.id}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="text-slate-200 font-medium">{pkg.partNo}</div>
                        <div className="text-xs text-slate-500">Rev {pkg.partRev}</div>
                      </TableCell>
                      <TableCell className="text-slate-300">{pkg.customer}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-indigo-500/20 text-indigo-400 border-indigo-500/50">
                          L{pkg.submissionLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_STYLES[pkg.status]}>
                          {STATUS_LABELS[pkg.status][language]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ReadinessBar percent={pkg.readiness?.percent ?? 0} />
                      </TableCell>
                      <TableCell>
                        <MissingChips missing={pkg.readiness?.missing ?? []} />
                      </TableCell>
                      <TableCell>
                        <Link href={`/ppap/${pkg.id}`}>
                          <Button variant="ghost" size="sm" className="text-sky-400 hover:text-sky-300 h-7 px-2">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            {T("open")}
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>{T("createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{T("partNo")}</Label>
                <Input
                  value={form.partNo}
                  onChange={(e) => setForm({ ...form, partNo: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="SPR-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label>{T("partRev")}</Label>
                <Input
                  value={form.partRev}
                  onChange={(e) => setForm({ ...form, partRev: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="A"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{T("partName")}</Label>
              <Input
                value={form.partName}
                onChange={(e) => setForm({ ...form, partName: e.target.value })}
                className="bg-slate-800 border-slate-700"
                placeholder={isZh ? "压缩弹簧总成" : "Compression Spring Assembly"}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{T("customer")}</Label>
                <Input
                  value={form.customer}
                  onChange={(e) => setForm({ ...form, customer: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="Tesla Motors"
                />
              </div>
              <div className="space-y-2">
                <Label>{T("program")}</Label>
                <Input
                  value={form.program}
                  onChange={(e) => setForm({ ...form, program: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="Model Y"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{T("submissionLevel")}</Label>
              <Select value={form.submissionLevel} onValueChange={(v) => setForm({ ...form, submissionLevel: v })}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Level 1 - Warrant only</SelectItem>
                  <SelectItem value="2">Level 2 - Warrant + samples</SelectItem>
                  <SelectItem value="3">Level 3 - Warrant + samples + data</SelectItem>
                  <SelectItem value="4">Level 4 - Per customer specification</SelectItem>
                  <SelectItem value="5">Level 5 - Full documentation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-slate-700">
              {T("cancel")}
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={creating || !form.partNo || !form.partName || !form.customer}
              className="bg-sky-600 hover:bg-sky-700"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  {T("creating")}
                </>
              ) : (
                T("create")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

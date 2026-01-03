"use client";

/**
 * Checklist Table
 * Displays PPAP checklist items with status and actions
 * Links go to Source of Truth pages, not file uploads
 */

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  Circle,
  Clock,
  MinusCircle,
  ExternalLink,
  Plus,
  ArrowRight,
  Eye,
  Link2,
} from "lucide-react";
import type { PpapChecklistItem, ChecklistItemStatus } from "@/lib/ppap";
import { resolveChecklistAction, type ActionContext, type ResolvedAction } from "@/lib/ppap";

interface ChecklistTableProps {
  checklist: PpapChecklistItem[];
  ppapId: string;
  partNo?: string;
  partRev?: string;
  isZh?: boolean;
  onOpenLinkModal?: (key: string, linkMode: string) => void;
}

const STATUS_ICONS: Record<ChecklistItemStatus, React.ReactNode> = {
  NOT_STARTED: <Circle className="h-4 w-4 text-slate-500" />,
  IN_PROGRESS: <Clock className="h-4 w-4 text-amber-400" />,
  READY: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  NA: <MinusCircle className="h-4 w-4 text-slate-600" />,
};

const STATUS_LABELS: Record<ChecklistItemStatus, { en: string; zh: string }> = {
  NOT_STARTED: { en: "Not Started", zh: "未开始" },
  IN_PROGRESS: { en: "In Progress", zh: "进行中" },
  READY: { en: "Ready", zh: "就绪" },
  NA: { en: "N/A", zh: "不适用" },
};

const STATUS_STYLES: Record<ChecklistItemStatus, string> = {
  NOT_STARTED: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  IN_PROGRESS: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  READY: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  NA: "bg-slate-600/20 text-slate-500 border-slate-600/30",
};

// Action button icons based on label
const ACTION_ICONS: Record<string, React.ReactNode> = {
  Create: <Plus className="h-3 w-3" />,
  Continue: <ArrowRight className="h-3 w-3" />,
  View: <Eye className="h-3 w-3" />,
  Link: <Link2 className="h-3 w-3" />,
};

// Action button styles based on label
const ACTION_STYLES: Record<string, string> = {
  Create: "bg-sky-600 hover:bg-sky-700 text-white",
  Continue: "border-amber-500/50 text-amber-400 hover:bg-amber-500/10",
  View: "text-slate-400 hover:text-slate-200",
  Link: "border-sky-500/50 text-sky-400 hover:bg-sky-500/10",
};

export function ChecklistTable({ 
  checklist, 
  ppapId,
  partNo = "",
  partRev = "",
  isZh = true, 
  onOpenLinkModal,
}: ChecklistTableProps) {
  
  const ctx: ActionContext = { partNo, rev: partRev, ppapId };

  const renderActionButton = (item: PpapChecklistItem, action: ResolvedAction) => {
    if (action.disabled) {
      return (
        <span className="text-slate-600 text-xs">{isZh ? action.labelZh : action.label}</span>
      );
    }

    const label = isZh ? action.labelZh : action.label;
    const icon = ACTION_ICONS[action.label] || <ExternalLink className="h-3 w-3" />;
    const style = ACTION_STYLES[action.label] || "text-slate-400 hover:text-slate-200";
    const variant = action.label === "Create" ? "default" : "outline";

    const button = (
      <Button
        variant={action.label === "Create" ? "default" : action.label === "View" ? "ghost" : "outline"}
        size="sm"
        className={`h-7 px-2 text-xs ${style}`}
        onClick={action.kind === "OPEN_LINK_MODAL" 
          ? () => onOpenLinkModal?.(item.key, action.linkMode || "SELECT_SYSTEM_OBJECT")
          : undefined
        }
      >
        {icon}
        <span className="ml-1">{label}</span>
      </Button>
    );

    // Wrap in Link if NAVIGATE
    if (action.kind === "NAVIGATE" && action.href) {
      return <Link href={action.href}>{button}</Link>;
    }

    // Wrap in Tooltip if has tooltip
    if (action.tooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent className="bg-slate-800 border-slate-700">
              <p className="text-xs">{isZh ? action.tooltipZh : action.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return button;
  };

  return (
    <div className="rounded-lg border border-slate-700 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-800/50 hover:bg-slate-800/50">
            <TableHead className="text-slate-400 w-8">#</TableHead>
            <TableHead className="text-slate-400">{isZh ? "检查项" : "Item"}</TableHead>
            <TableHead className="text-slate-400 w-24">{isZh ? "必填" : "Required"}</TableHead>
            <TableHead className="text-slate-400 w-28">{isZh ? "状态" : "Status"}</TableHead>
            <TableHead className="text-slate-400 w-32">{isZh ? "来源" : "Source"}</TableHead>
            <TableHead className="text-slate-400 w-24">{isZh ? "操作" : "Action"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {checklist.map((item, index) => {
            const action = resolveChecklistAction(
              {
                key: item.key,
                status: item.status,
                sourceId: item.sourceId,
                sourceUrl: item.sourceUrl,
              },
              ctx
            );
            
            return (
              <TableRow key={item.key} className="hover:bg-slate-800/30">
                <TableCell className="text-slate-500 font-mono text-xs">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="text-slate-200 font-medium text-sm">
                      {isZh ? item.labelZh : item.label}
                    </div>
                    {item.notes && (
                      <div className="text-xs text-slate-500">{item.notes}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {item.required ? (
                    <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-xs">
                      {isZh ? "必填" : "Required"}
                    </Badge>
                  ) : (
                    <span className="text-slate-600 text-xs">{isZh ? "可选" : "Optional"}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {STATUS_ICONS[item.status]}
                    <Badge variant="outline" className={`${STATUS_STYLES[item.status]} text-xs`}>
                      {isZh ? STATUS_LABELS[item.status].zh : STATUS_LABELS[item.status].en}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {item.sourceUrl ? (
                    <a
                      href={item.sourceUrl}
                      className="text-sky-400 hover:text-sky-300 text-xs flex items-center gap-1"
                    >
                      {item.sourceType || "source"}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : item.sourceId ? (
                    <span className="text-slate-500 text-xs font-mono">{item.sourceId.slice(0, 8)}...</span>
                  ) : (
                    <span className="text-slate-600 text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {renderActionButton(item, action)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

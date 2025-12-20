"use client";

/**
 * Work Order Table Component
 * 工单表格组件
 * 
 * 显示工单列表，支持点击查看详情
 */

import { Clock, Package, Play, Pause, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import type { WorkOrderRow, WorkOrderStatus } from "@/lib/manufacturing/types";
import { WORK_ORDER_STATUS_COLORS } from "@/lib/manufacturing/types";

interface WorkOrderTableProps {
  workOrders: WorkOrderRow[];
  onRowClick?: (workOrder: WorkOrderRow) => void;
  className?: string;
}

function getStatusIcon(status: WorkOrderStatus) {
  switch (status) {
    case "RUNNING":
      return <Play className="h-3 w-3" />;
    case "HOLD":
      return <Pause className="h-3 w-3" />;
    case "DONE":
      return <CheckCircle className="h-3 w-3" />;
    case "CANCELLED":
      return <XCircle className="h-3 w-3" />;
    default:
      return <Clock className="h-3 w-3" />;
  }
}

function getStatusLabel(status: WorkOrderStatus): string {
  const labels: Record<WorkOrderStatus, string> = {
    PLANNED: "计划中",
    RUNNING: "进行中",
    HOLD: "暂停",
    DONE: "完成",
    CANCELLED: "取消",
  };
  return labels[status];
}

function formatTime(isoString?: string): string {
  if (!isoString) return "—";
  const date = new Date(isoString);
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export function WorkOrderTable({ workOrders, onRowClick, className = "" }: WorkOrderTableProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          Work Orders / 工单
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">工单号</TableHead>
                <TableHead>设计码</TableHead>
                <TableHead>零件号</TableHead>
                <TableHead className="text-center">进度</TableHead>
                <TableHead className="text-right">良品/目标</TableHead>
                <TableHead className="text-right">报废</TableHead>
                <TableHead className="text-center">状态</TableHead>
                <TableHead>机台</TableHead>
                <TableHead>预计完成</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    暂无工单数据
                  </TableCell>
                </TableRow>
              ) : (
                workOrders.map((wo) => {
                  const progress = wo.targetQty > 0 ? (wo.goodQty / wo.targetQty) * 100 : 0;
                  const scrapRate = wo.goodQty > 0 ? (wo.scrapQty / (wo.goodQty + wo.scrapQty)) * 100 : 0;

                  return (
                    <TableRow
                      key={wo.workOrderId}
                      className={`cursor-pointer hover:bg-muted/50 ${wo.status === "RUNNING" ? "bg-emerald-50/50" : ""}`}
                      onClick={() => onRowClick?.(wo)}
                    >
                      <TableCell className="font-medium">{wo.workOrderId}</TableCell>
                      <TableCell className="font-mono text-xs">{wo.designCode}</TableCell>
                      <TableCell>{wo.partNo ?? "—"}</TableCell>
                      <TableCell>
                        <div className="w-24">
                          <Progress value={progress} className="h-2" />
                          <span className="text-xs text-muted-foreground">
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {wo.goodQty} / {wo.targetQty}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${scrapRate > 3 ? "text-rose-600" : scrapRate > 1 ? "text-amber-600" : ""}`}>
                        {wo.scrapQty} ({scrapRate.toFixed(1)}%)
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`${WORK_ORDER_STATUS_COLORS[wo.status]} text-xs gap-1`}>
                          {getStatusIcon(wo.status)}
                          {getStatusLabel(wo.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{wo.machineId ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatTime(wo.etaAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default WorkOrderTable;

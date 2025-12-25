"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Plus, 
  Search, 
  Filter, 
  Factory,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkOrderStore } from "@/lib/stores/workOrderStore";
import { useLanguage } from "@/components/language-context";
import { cn } from "@/lib/utils";

export default function ProductionDashboardPage() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const { workOrders, deleteWorkOrder } = useWorkOrderStore();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOrders = workOrders.filter(wo => 
    wo.workOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wo.designCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    created: "bg-slate-100 text-slate-700 border-slate-200",
    approved: "bg-blue-50 text-blue-700 border-blue-200",
    "in-production": "bg-indigo-50 text-indigo-700 border-indigo-200",
    qc: "bg-amber-50 text-amber-700 border-amber-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blocked: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {isZh ? "生产看板" : "Manufacturing Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isZh ? "实时监控生产工单状态、QC进度与制造异常" : "Production monitoring, QC tracking, and audit exception management."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link href="/tools/calculator?type=compression">
              <Plus className="w-4 h-4 mr-2" />
              {isZh ? "新建工单" : "New Work Order"}
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={isZh ? "搜索工单号或设计编码..." : "Search Order ID or Design Code..."}
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>{isZh ? "工单号" : "Order ID"}</TableHead>
                <TableHead>{isZh ? "设计编码" : "Design Code"}</TableHead>
                <TableHead>{isZh ? "类型 / 数量" : "Type / Qty"}</TableHead>
                <TableHead>{isZh ? "状态" : "Status"}</TableHead>
                <TableHead>{isZh ? "创建日期" : "Created"}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Factory className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                    {isZh ? "暂无生产工单" : "No active work orders"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((wo) => (
                  <TableRow key={wo.workOrderId} className="group cursor-pointer hover:bg-slate-50/50">
                    <TableCell className="font-medium font-mono">
                      <Link href={`/manufacturing/workorder/${wo.workOrderId}`} className="hover:underline text-blue-600">
                        {wo.workOrderId}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{wo.designCode}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{wo.springType}</span>
                        <span className="text-xs text-muted-foreground">{wo.quantity} pcs</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px] uppercase font-bold", statusColors[wo.status])}>
                        {wo.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(wo.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/manufacturing/workorder/${wo.workOrderId}`}>
                              {isZh ? "查看详情" : "View Details"}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => deleteWorkOrder(wo.workOrderId)}>
                            {isZh ? "删除" : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

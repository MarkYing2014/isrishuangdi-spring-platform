"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Printer, 
  Download, 
  PlayCircle,
  CheckCircle2,
  AlertOctagon,
  PackageCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useWorkOrderStore } from "@/lib/stores/workOrderStore";
import { ManufacturingPlanCard } from "@/components/manufacturing/ManufacturingPlanCard";
import { QCChecklistCard } from "@/components/manufacturing/QCChecklistCard";
import { ManufacturingAuditCard } from "@/components/manufacturing/ManufacturingAuditCard";
import { useLanguage } from "@/components/language-context";
import { cn } from "@/lib/utils";

export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { language } = useLanguage();
  const isZh = language === "zh";
  const { getById, updateStatus } = useWorkOrderStore();
  const [workOrder, setWorkOrder] = useState(getById(id as string));

  useEffect(() => {
    if (id) {
      setWorkOrder(getById(id as string));
    }
  }, [id, getById]);

  if (!workOrder) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Work Order Not Found</h1>
        <Button variant="link" onClick={() => router.push("/manufacturing/dashboard")}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const statusColors = {
    created: "bg-slate-100 text-slate-700 border-slate-200",
    approved: "bg-blue-50 text-blue-700 border-blue-200",
    "in-production": "bg-indigo-50 text-indigo-700 border-indigo-200",
    qc: "bg-amber-50 text-amber-700 border-amber-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blocked: "bg-red-50 text-red-700 border-red-200",
  };

  const handleStatusChange = (newStatus: any) => {
    updateStatus(workOrder.workOrderId, newStatus);
    setWorkOrder(prev => prev ? { ...prev, status: newStatus } : undefined);
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/manufacturing/dashboard" className="hover:text-primary transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              {isZh ? "生产看板" : "Dashboard"}
            </Link>
            <span>/</span>
            <span className="font-mono">{workOrder.workOrderId}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {isZh ? "生产工单" : "Production Work Order"}
            </h1>
            <Badge variant="outline" className={cn("text-sm px-3 py-1 uppercase", statusColors[workOrder.status])}>
              {workOrder.status}
            </Badge>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700">{isZh ? "设计编码:" : "Design Code:"}</span>
              <span className="font-mono">{workOrder.designCode}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700">{isZh ? "数量:" : "Quantity:"}</span>
              <span>{workOrder.quantity} pcs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700">{isZh ? "创建于:" : "Created:"}</span>
              <span>{new Date(workOrder.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {workOrder.status === "created" && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleStatusChange("approved")}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {isZh ? "批准生产" : "Approve for Production"}
            </Button>
          )}
          
          {workOrder.status === "approved" && (
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => handleStatusChange("in-production")}>
              <PlayCircle className="w-4 h-4 mr-2" />
              {isZh ? "开始生产" : "Start Production"}
            </Button>
          )}

          {workOrder.status === "in-production" && (
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => handleStatusChange("qc")}>
              <PackageCheck className="w-4 h-4 mr-2" />
              {isZh ? "提交质检" : "Submit to QC"}
            </Button>
          )}

          {workOrder.status === "qc" && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleStatusChange("completed")}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {isZh ? "质检通过 & 完工" : "QC Pass & Complete"}
            </Button>
          )}

          <div className="h-6 w-px bg-slate-200 mx-2" />
          
          <Button size="sm" variant="outline">
            <Printer className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Manufacturing & QC */}
        <div className="lg:col-span-2 space-y-8">
          <ManufacturingPlanCard plan={workOrder.manufacturingPlan} />
          <QCChecklistCard checklist={workOrder.qcPlan} />
        </div>

        {/* Right Col: Audit & Snapshot */}
        <div className="space-y-6">
          <ManufacturingAuditCard audit={workOrder.manufacturingAudit} />
          
          {/* Detailed Engineering Snapshot Card could go here or specialized component */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs font-mono text-slate-500">
            <div className="font-bold text-slate-700 mb-2">{isZh ? "工程快照数据" : "Engineering Snapshot"}</div>
             <pre className="overflow-x-auto">
               {JSON.stringify(workOrder.engineeringSnapshot.geometry, null, 2)}
             </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

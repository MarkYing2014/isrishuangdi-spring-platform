"use client";

/**
 * Machine Status Grid Component
 * 设备状态墙组件
 * 
 * 显示所有机台的实时状态
 */

import { Cog } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MachineTile, MachineState } from "@/lib/manufacturing/types";
import { MACHINE_STATE_COLORS, MACHINE_STATE_LABELS, STOP_REASON_LABELS } from "@/lib/manufacturing/types";

interface MachineStatusGridProps {
  machines: MachineTile[];
  onMachineClick?: (machine: MachineTile) => void;
  className?: string;
}

interface MachineCardProps {
  machine: MachineTile;
  onClick?: () => void;
}

function getStateColor(state: MachineState): string {
  return MACHINE_STATE_COLORS[state] ?? "bg-slate-400";
}

function getStateBorderColor(state: MachineState): string {
  const colors: Record<MachineState, string> = {
    RUN: "border-emerald-200",
    STOP: "border-rose-200",
    SETUP: "border-amber-200",
    WAIT: "border-sky-200",
    OFF: "border-slate-200",
  };
  return colors[state] ?? "border-slate-200";
}

function getStateBgColor(state: MachineState): string {
  const colors: Record<MachineState, string> = {
    RUN: "bg-emerald-50",
    STOP: "bg-rose-50",
    SETUP: "bg-amber-50",
    WAIT: "bg-sky-50",
    OFF: "bg-slate-50",
  };
  return colors[state] ?? "bg-slate-50";
}

function MachineCard({ machine, onClick }: MachineCardProps) {
  const stateLabel = MACHINE_STATE_LABELS[machine.state];
  const stopReasonLabel = machine.stopReasonCode 
    ? STOP_REASON_LABELS[machine.stopReasonCode] 
    : null;

  const progress = machine.targetQty && machine.currentQty 
    ? (machine.currentQty / machine.targetQty) * 100 
    : 0;

  return (
    <Card 
      className={`relative cursor-pointer transition-all hover:shadow-md ${getStateBorderColor(machine.state)} ${getStateBgColor(machine.state)}`}
      onClick={onClick}
    >
      {machine.state === "STOP" && machine.alarmCode && (
        <div className="absolute inset-0 rounded-lg ring-2 ring-rose-300 animate-pulse pointer-events-none" />
      )}
      
      <CardContent className="p-3 space-y-2">
        {/* Header: Machine ID + State */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded ${getStateBgColor(machine.state)}`}>
              <Cog 
                className={`h-4 w-4 ${machine.state === "RUN" ? "animate-spin text-emerald-600" : "text-slate-500"}`}
                style={machine.state === "RUN" ? { animationDuration: "2s" } : undefined}
              />
            </div>
            <div>
              <div className="font-semibold text-sm">{machine.name}</div>
              <div className="text-xs text-muted-foreground">{machine.machineId}</div>
            </div>
          </div>
          <Badge className={`${getStateColor(machine.state)} text-white text-xs`}>
            {stateLabel?.zh ?? machine.state}
          </Badge>
        </div>

        {/* Work Order & Design Code */}
        {machine.workOrderId && (
          <div className="text-xs space-y-0.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">工单</span>
              <span className="font-medium">{machine.workOrderId}</span>
            </div>
            {machine.designCode && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">设计码</span>
                <span className="font-mono text-xs">{machine.designCode}</span>
              </div>
            )}
          </div>
        )}

        {/* Cycle Time */}
        {machine.ctSec !== undefined && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">节拍</span>
            <span className="font-medium">{machine.ctSec.toFixed(1)}s</span>
          </div>
        )}

        {/* Progress Bar */}
        {machine.targetQty && machine.currentQty !== undefined && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">进度</span>
              <span>{machine.currentQty}/{machine.targetQty}</span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Stop Reason */}
        {machine.state === "STOP" && stopReasonLabel && (
          <div className="text-xs text-rose-600 font-medium">
            停机原因: {stopReasonLabel.zh}
          </div>
        )}

        {/* Alarm Code */}
        {machine.alarmCode && (
          <div className="text-xs text-rose-600 font-medium flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
            报警: {machine.alarmCode}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MachineStatusGrid({ machines, onMachineClick, className = "" }: MachineStatusGridProps) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 ${className}`}>
      {machines.map((machine) => (
        <MachineCard
          key={machine.machineId}
          machine={machine}
          onClick={() => onMachineClick?.(machine)}
        />
      ))}
    </div>
  );
}

export default MachineStatusGrid;

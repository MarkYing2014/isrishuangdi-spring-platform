"use client";

/**
 * Andon Feed Component
 * 异常事件流组件
 * 
 * 显示实时异常事件，按严重程度排序
 */

import { AlertCircle, AlertTriangle, Bell, CheckCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AndonEvent, AndonSeverity } from "@/lib/manufacturing/types";
import { ANDON_SEVERITY_COLORS } from "@/lib/manufacturing/types";

interface AndonFeedProps {
  events: AndonEvent[];
  onAcknowledge?: (eventId: string) => void;
  onEventClick?: (event: AndonEvent) => void;
  maxHeight?: string;
  className?: string;
}

function getSeverityIcon(severity: AndonSeverity) {
  switch (severity) {
    case "CRIT":
      return <AlertCircle className="h-4 w-4 text-rose-600" />;
    case "WARN":
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    case "INFO":
      return <Info className="h-4 w-4 text-blue-600" />;
  }
}

function getSeverityLabel(severity: AndonSeverity): { en: string; zh: string } {
  switch (severity) {
    case "CRIT":
      return { en: "Critical", zh: "严重" };
    case "WARN":
      return { en: "Warning", zh: "警告" };
    case "INFO":
      return { en: "Info", zh: "信息" };
  }
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

interface AndonEventCardProps {
  event: AndonEvent;
  onAcknowledge?: () => void;
  onClick?: () => void;
}

function AndonEventCard({ event, onAcknowledge, onClick }: AndonEventCardProps) {
  const severityLabel = getSeverityLabel(event.severity);

  return (
    <div 
      className={`p-3 rounded-lg border ${ANDON_SEVERITY_COLORS[event.severity]} cursor-pointer transition-all hover:shadow-sm`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {getSeverityIcon(event.severity)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {severityLabel.zh}
              </Badge>
              {event.machineId && (
                <span className="text-xs font-medium">{event.machineId}</span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatTime(event.startedAt)}
              </span>
            </div>
            <p className="text-sm mt-1 break-words">{event.message}</p>
            {event.durationSec && (
              <p className="text-xs text-muted-foreground mt-1">
                持续时间: {formatDuration(event.durationSec)}
              </p>
            )}
          </div>
        </div>
        
        {!event.acknowledged && onAcknowledge && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onAcknowledge();
            }}
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
        )}
        
        {event.acknowledged && (
          <Badge variant="secondary" className="text-xs shrink-0">
            已确认
          </Badge>
        )}
      </div>
    </div>
  );
}

export function AndonFeed({ 
  events, 
  onAcknowledge, 
  onEventClick,
  maxHeight = "400px",
  className = "" 
}: AndonFeedProps) {
  const critCount = events.filter((e) => e.severity === "CRIT").length;
  const warnCount = events.filter((e) => e.severity === "WARN").length;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Andon / 异常事件
          </CardTitle>
          <div className="flex items-center gap-2">
            {critCount > 0 && (
              <Badge className="bg-rose-500 text-white">
                {critCount} 严重
              </Badge>
            )}
            {warnCount > 0 && (
              <Badge className="bg-amber-500 text-white">
                {warnCount} 警告
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            <p className="text-sm">暂无异常事件</p>
            <p className="text-xs">No active events</p>
          </div>
        ) : (
          <div className="overflow-y-auto pr-2" style={{ maxHeight }}>
            <div className="space-y-2">
              {events.map((event) => (
                <AndonEventCard
                  key={event.eventId}
                  event={event}
                  onAcknowledge={onAcknowledge ? () => onAcknowledge(event.eventId) : undefined}
                  onClick={() => onEventClick?.(event)}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AndonFeed;

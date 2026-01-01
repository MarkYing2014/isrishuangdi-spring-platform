"use client";

import React, { useState } from "react";
import { 
    Clock, 
    History, 
    CheckCircle2, 
    AlertCircle, 
    XCircle, 
    Pin, 
    Trash2, 
    Eye, 
    Columns,
    MessageSquare,
    ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    DesignSnapshot, 
    EvolutionState, 
    SnapshotPin 
} from "@/lib/spring-platform/types";
import { buildInsights } from "@/lib/spring-platform/evolution-logic";

interface DesignEvolutionHubProps {
    state: EvolutionState;
    onView: (id: string) => void;
    onPin: (id: string, pin: SnapshotPin | undefined) => void;
    onDelete: (id: string) => void;
    onUpdateComment: (id: string, comment: string) => void;
    currentResult?: any;
}

export function DesignEvolutionHub({ 
    state, 
    onView, 
    onPin, 
    onDelete, 
    onUpdateComment 
}: DesignEvolutionHubProps) {
    const [compareWith, setCompareWith] = useState<string | null>(null);

    const getStatusIcon = (status: string) => {
        if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        if (status === "warning") return <AlertCircle className="h-4 w-4 text-orange-500" />;
        return <XCircle className="h-4 w-4 text-red-500" />;
    };

    const sortedSnapshots = [...state.snapshots].sort(
        (a, b) => new Date(b.meta.createdAt).getTime() - new Date(a.meta.createdAt).getTime()
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[600px]">
            {/* Timeline Sidebar */}
            <div className="md:col-span-4 border-r pr-4 space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <History className="h-3 w-3" /> 演进时间轴 / Timeline
                    </Label>
                    <Badge variant="outline" className="text-[10px]">{state.snapshots.length} Snapshots</Badge>
                </div>

                <ScrollArea className="h-[520px] pr-3">
                    <div className="space-y-3">
                        {sortedSnapshots.map((snap) => (
                            <div 
                                key={snap.meta.id}
                                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                    state.selectedSnapshotId === snap.meta.id 
                                    ? "bg-primary/5 border-primary" 
                                    : "bg-muted/10 hover:bg-muted/30"
                                }`}
                                onClick={() => onView(snap.meta.id)}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(snap.summary.status)}
                                        <span className="text-[10px] font-bold text-muted-foreground">
                                            {new Date(snap.meta.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className={`h-6 w-6 ${snap.meta.pinned ? 'text-primary' : 'text-muted-foreground opacity-30 hover:opacity-100'}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onPin(snap.meta.id, snap.meta.pinned ? undefined : "milestone");
                                            }}
                                        >
                                            <Pin className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 text-red-400 opacity-30 hover:opacity-100"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(snap.meta.id);
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="text-xs font-black mb-1 truncate">
                                    {snap.meta.label || "未命名版本 / Unnamed Snapshot"}
                                </div>
                                {snap.meta.comment && (
                                    <div className="text-[10px] text-muted-foreground line-clamp-2 italic italic-leading-tight border-l-2 pl-2 mt-2">
                                        "{snap.meta.comment}"
                                    </div>
                                )}
                                {snap.meta.pinned && (
                                    <Badge className="mt-2 text-[9px] bg-primary/20 text-primary border-none uppercase">
                                        {snap.meta.pinned}
                                    </Badge>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Review & Detail Panel */}
            <div className="md:col-span-8 space-y-4">
                {state.selectedSnapshotId ? (
                    <div className="space-y-4">
                        {/* Selected Snapshot Header */}
                        <div className="flex items-center justify-between bg-muted/20 p-4 rounded-xl border border-dashed">
                            <div>
                                <h3 className="text-sm font-black flex items-center gap-2">
                                    {sortedSnapshots.find(s => s.meta.id === state.selectedSnapshotId)?.meta.label || "版本详情"}
                                    <Badge variant="outline" className="text-[9px]">ID: {state.selectedSnapshotId.slice(0,8)}</Badge>
                                </h3>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    创建于 {new Date(sortedSnapshots.find(s => s.meta.id === state.selectedSnapshotId)!.meta.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="h-8 text-[10px] gap-2">
                                    <Eye className="h-3.5 w-3.5" /> 恢复此版本 / Restore
                                </Button>
                            </div>
                        </div>

                        {/* Reasoning Panel */}
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader className="py-3">
                                <CardTitle className="text-xs flex items-center gap-2">
                                    <MessageSquare className="h-3.5 w-3.5" /> 自动决策分析 / Design Reasoning
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-xs">
                                {(() => {
                                    const current = sortedSnapshots.find(s => s.meta.id === state.selectedSnapshotId);
                                    const prevIdx = sortedSnapshots.findIndex(s => s.meta.id === state.selectedSnapshotId) + 1;
                                    const prev = sortedSnapshots[prevIdx];
                                    
                                    if (!prev || !current) return <p className="text-muted-foreground italic">初始版本或暂无对比数据。</p>;
                                    
                                    const insights = buildInsights(prev, current);
                                    if (insights.length === 0) return <p className="text-muted-foreground italic">此迭代仅包含微调，未触发显著物理变化。</p>;

                                    return insights.map((insight, idx) => (
                                        <div key={idx} className="flex gap-3 p-2 bg-white rounded border shadow-sm">
                                            <Badge variant="outline" className="h-5 text-[9px]">{insight.type}</Badge>
                                            <div>
                                                <p className="font-bold">{insight.textEn}</p>
                                                <p className="opacity-80 mt-0.5">{insight.textZh}</p>
                                                {insight.evidence && (
                                                    <div className="flex gap-4 mt-2 pt-2 border-t border-dashed">
                                                        {Object.entries(insight.evidence).map(([k, v]) => (
                                                            <div key={k} className="flex items-center gap-1.5">
                                                                <span className="text-[9px] uppercase font-black opacity-50">{k}:</span>
                                                                <span className="font-mono text-[10px] text-primary">{v}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </CardContent>
                        </Card>

                        {/* Decision Notes */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Decision Note / 审核笔记</Label>
                            <textarea 
                                className="w-full h-24 p-3 text-xs bg-muted/10 border rounded-lg focus:ring-1 focus:ring-primary outline-none resize-none"
                                placeholder="填写该迭代的改进原因或评审结论..."
                                value={sortedSnapshots.find(s => s.meta.id === state.selectedSnapshotId)?.meta.comment || ""}
                                onChange={(e) => onUpdateComment(state.selectedSnapshotId!, e.target.value)}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                        <Clock className="h-12 w-12 mb-2" />
                        <p className="text-sm font-bold">选择一个版本以查看详情 / Select a snapshot</p>
                        <p className="text-xs mt-1">这里将显示设计的物理演变与决策逻辑。</p>
                    </div>
                )}
            </div>
        </div>
    );
}

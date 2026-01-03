"use client";

/**
 * PPAP Detail Page
 * Full package view with checklist, readiness, and export
 */

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RefreshCw, ClipboardList } from "lucide-react";
import { useLanguage } from "@/components/language-context";
import {
  PpapHeaderCard,
  ReadinessBar,
  ChecklistTable,
  ExportPanel,
  LinkModal,
} from "@/components/ppap";
import type { PpapPackage, PswDocument, PpapReadinessResult, PpapChecklistItem, ChecklistItemStatus } from "@/lib/ppap";

// i18n
const t = {
  loading: { en: "Loading...", zh: "加载中..." },
  backToList: { en: "Back to List", zh: "返回列表" },
  back: { en: "Back", zh: "返回" },
  refresh: { en: "Refresh", zh: "刷新" },
  pswReadiness: { en: "PSW Readiness", zh: "PSW 就绪度" },
  checklist: { en: "PPAP Checklist", zh: "PPAP 检查清单" },
};

interface PageProps {
  params: Promise<{ ppapId: string }>;
}

export default function PpapDetailPage({ params }: PageProps) {
  const { ppapId } = use(params);
  const { language } = useLanguage();
  const isZh = language === "zh";
  const T = (key: keyof typeof t) => (isZh ? t[key].zh : t[key].en);

  const [ppap, setPpap] = useState<PpapPackage | null>(null);
  const [readiness, setReadiness] = useState<PpapReadinessResult | null>(null);
  const [psw, setPsw] = useState<PswDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Link modal state
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalItem, setLinkModalItem] = useState<PpapChecklistItem | null>(null);

  const fetchPpap = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/ppap/packages/${ppapId}`);
      const data = await res.json();

      if (data.ok) {
        setPpap(data.data);
        setReadiness(data.data.readiness);

        if (data.data.pswId) {
          const pswRes = await fetch(`/api/ppap/psw/${data.data.pswId}/preview`);
          const pswData = await pswRes.json();
          if (pswData.ok) {
            setPsw(pswData.data);
          }
        }
      } else {
        setError(data.error?.message || "Failed to load PPAP");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePsw = async () => {
    const res = await fetch(`/api/ppap/packages/${ppapId}/generate-psw`, {
      method: "POST",
    });
    const data = await res.json();

    if (!data.ok) {
      throw new Error(data.error?.blockedReasons?.join(", ") || data.error?.message);
    }

    setPsw(data.data);
    await fetchPpap();
  };

  const handlePreviewPsw = () => {
    if (psw) {
      window.open(`/api/ppap/psw/${psw.id}/preview`, "_blank");
    }
  };

  // Open link modal for a checklist item
  const handleOpenLinkModal = (itemKey: string) => {
    const item = ppap?.checklist.find((i) => i.key === itemKey);
    if (item) {
      setLinkModalItem(item);
      setLinkModalOpen(true);
    }
  };

  // Save link from modal
  const handleSaveLink = async (payload: {
    key: string;
    status: ChecklistItemStatus;
    sourceType?: string;
    sourceId?: string;
    sourceUrl?: string;
    notes?: string;
  }) => {
    const res = await fetch(`/api/ppap/packages/${ppapId}/refs`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refs: [
          {
            key: payload.key,
            status: payload.status,
            sourceType: payload.sourceType,
            sourceId: payload.sourceId,
            sourceUrl: payload.sourceUrl,
            notes: payload.notes,
          },
        ],
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error?.message || "Failed to save");
    }

    // Refresh the page data
    await fetchPpap();
  };

  useEffect(() => {
    fetchPpap();
  }, [ppapId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">{T("loading")}</div>
      </div>
    );
  }

  if (error || !ppap) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="p-6 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
            {error || "PPAP not found"}
          </div>
          <Link href="/ppap">
            <Button variant="ghost" className="mt-4 text-slate-400">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {T("backToList")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/ppap">
            <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {T("back")}
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPpap}
            className="border-slate-700 text-slate-300"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            {T("refresh")}
          </Button>
        </div>

        {/* Header Card */}
        <PpapHeaderCard ppap={ppap} isZh={isZh} />

        {/* Readiness & Export Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-200">{T("pswReadiness")}</CardTitle>
            </CardHeader>
            <CardContent>
              {readiness && <ReadinessBar readiness={readiness} isZh={isZh} />}
            </CardContent>
          </Card>

          {readiness && (
            <ExportPanel
              ppap={ppap}
              readiness={readiness}
              psw={psw}
              isZh={isZh}
              onGeneratePsw={handleGeneratePsw}
              onPreviewPsw={handlePreviewPsw}
            />
          )}
        </div>

        {/* Checklist */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-base text-slate-200 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-sky-400" />
              {T("checklist")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChecklistTable
              checklist={ppap.checklist}
              ppapId={ppap.id}
              partNo={ppap.partNo}
              partRev={ppap.partRev}
              isZh={isZh}
              onOpenLinkModal={handleOpenLinkModal}
            />
          </CardContent>
        </Card>
      </div>

      {/* Link Modal */}
      <LinkModal
        open={linkModalOpen}
        onClose={() => {
          setLinkModalOpen(false);
          setLinkModalItem(null);
        }}
        item={linkModalItem}
        ppapId={ppap.id}
        isZh={isZh}
        onSave={handleSaveLink}
      />
    </div>
  );
}

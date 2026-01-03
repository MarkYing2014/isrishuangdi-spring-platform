"use client";

/**
 * PPAP Link Modal
 * Modal for linking checklist items to sources
 * Supports: SELECT_SYSTEM_OBJECT and PASTE_URL modes
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Link2, ExternalLink, FileText } from "lucide-react";
import type { PpapChecklistItem, ChecklistItemStatus } from "@/lib/ppap";

// i18n
const t = {
  title: { en: "Link Source", zh: "关联来源" },
  selectObject: { en: "Select Object", zh: "选择对象" },
  pasteUrl: { en: "Paste URL", zh: "粘贴链接" },
  url: { en: "External URL", zh: "外部链接" },
  urlPlaceholder: { en: "https://...", zh: "https://..." },
  notes: { en: "Notes (optional)", zh: "备注（可选）" },
  notesPlaceholder: { en: "Add notes...", zh: "添加备注..." },
  save: { en: "Save", zh: "保存" },
  cancel: { en: "Cancel", zh: "取消" },
  saving: { en: "Saving...", zh: "保存中..." },
  noObjects: { en: "No objects available yet", zh: "暂无可选对象" },
  markAsReady: { en: "Mark as Ready", zh: "标记为就绪" },
  markAsProgress: { en: "Mark as In Progress", zh: "标记为进行中" },
};

// Mock system objects (replace with real API calls)
const MOCK_OBJECTS: Record<string, { id: string; label: string; url: string }[]> = {
  engineering: [
    { id: "ENG-001", label: "Spring Calculation Result #001", url: "/tools/calculator?id=ENG-001" },
    { id: "ENG-002", label: "Spring Calculation Result #002", url: "/tools/calculator?id=ENG-002" },
  ],
  quality: [
    { id: "GAU-001", label: "Gauge Plan - Wire Diameter", url: "/quality?gaugeId=GAU-001" },
    { id: "INS-001", label: "Inspection Run - Batch #1", url: "/quality?inspectionId=INS-001" },
  ],
  manufacturing: [
    { id: "CP-001", label: "Control Plan v1.0", url: "/manufacturing/dashboard?cpId=CP-001" },
  ],
};

interface LinkModalProps {
  open: boolean;
  onClose: () => void;
  item: PpapChecklistItem | null;
  ppapId: string;
  isZh?: boolean;
  onSave: (payload: {
    key: string;
    status: ChecklistItemStatus;
    sourceType?: string;
    sourceId?: string;
    sourceUrl?: string;
    notes?: string;
  }) => Promise<void>;
}

export function LinkModal({
  open,
  onClose,
  item,
  ppapId,
  isZh = true,
  onSave,
}: LinkModalProps) {
  const T = (key: keyof typeof t) => (isZh ? t[key].zh : t[key].en);

  const [mode, setMode] = useState<"select" | "url">("url");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedObject, setSelectedObject] = useState<string>("");
  const [markReady, setMarkReady] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!item) return null;

  // Get module for this item to show relevant objects
  const getModuleObjects = () => {
    // Map item key to module
    const keyToModule: Record<string, string> = {
      designRecord: "engineering",
      engineeringApproval: "engineering",
      controlPlan: "manufacturing",
      pfmea: "manufacturing",
      msa: "quality",
      dimensionalResults: "quality",
      sampleProducts: "manufacturing",
    };
    const module = keyToModule[item.key] || "engineering";
    return MOCK_OBJECTS[module] || [];
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const status: ChecklistItemStatus = markReady ? "READY" : "IN_PROGRESS";

      if (mode === "url") {
        if (!url.trim()) {
          setError(isZh ? "请输入链接" : "Please enter a URL");
          return;
        }
        await onSave({
          key: item.key,
          status,
          sourceType: "external",
          sourceUrl: url.trim(),
          notes: notes.trim() || undefined,
        });
      } else {
        if (!selectedObject) {
          setError(isZh ? "请选择一个对象" : "Please select an object");
          return;
        }
        const obj = getModuleObjects().find((o) => o.id === selectedObject);
        if (!obj) return;

        await onSave({
          key: item.key,
          status,
          sourceType: "system",
          sourceId: obj.id,
          sourceUrl: obj.url,
          notes: notes.trim() || undefined,
        });
      }

      // Reset and close
      setUrl("");
      setNotes("");
      setSelectedObject("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const objects = getModuleObjects();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-sky-400" />
            {T("title")}: {isZh ? item.labelZh : item.label}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "select" | "url")} className="mt-4">
          <TabsList className="bg-slate-800 w-full">
            <TabsTrigger value="url" className="flex-1 data-[state=active]:bg-slate-700">
              <ExternalLink className="h-4 w-4 mr-1" />
              {T("pasteUrl")}
            </TabsTrigger>
            <TabsTrigger value="select" className="flex-1 data-[state=active]:bg-slate-700">
              <FileText className="h-4 w-4 mr-1" />
              {T("selectObject")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{T("url")}</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={T("urlPlaceholder")}
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </TabsContent>

          <TabsContent value="select" className="space-y-4 mt-4">
            {objects.length === 0 ? (
              <div className="text-center py-6 text-slate-500">{T("noObjects")}</div>
            ) : (
              <RadioGroup value={selectedObject} onValueChange={setSelectedObject}>
                {objects.map((obj) => (
                  <div
                    key={obj.id}
                    className="flex items-center space-x-2 p-2 rounded hover:bg-slate-800"
                  >
                    <RadioGroupItem value={obj.id} id={obj.id} />
                    <Label htmlFor={obj.id} className="cursor-pointer flex-1">
                      <div className="text-slate-200">{obj.label}</div>
                      <div className="text-xs text-slate-500">{obj.id}</div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </TabsContent>
        </Tabs>

        {/* Notes */}
        <div className="space-y-2 mt-4">
          <Label>{T("notes")}</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={T("notesPlaceholder")}
            className="bg-slate-800 border-slate-700"
          />
        </div>

        {/* Status toggle */}
        <div className="flex items-center gap-4 mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={markReady}
              onChange={(e) => setMarkReady(e.target.checked)}
              className="rounded border-slate-600"
            />
            <span className="text-sm text-slate-300">
              {markReady ? T("markAsReady") : T("markAsProgress")}
            </span>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="text-red-400 text-sm mt-2">{error}</div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} className="border-slate-700">
            {T("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-sky-600 hover:bg-sky-700">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                {T("saving")}
              </>
            ) : (
              T("save")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

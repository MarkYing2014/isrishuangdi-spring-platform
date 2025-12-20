"use client";

/**
 * Capture Gallery Component
 * 截图缩略图/附件列表组件
 * 
 * 展示最近 N 张截图，支持放大和下载
 */

import { useState } from "react";
import { Download, X, ZoomIn, Trash2, Upload, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CaptureMeta } from "@/lib/production/types";
import { downloadDataUrl } from "@/lib/camera";

interface CaptureGalleryProps {
  items: CaptureMeta[];
  maxItems?: number;
  onDelete?: (id: string) => void;
  onUpload?: (item: CaptureMeta) => void;
  className?: string;
}

export function CaptureGallery({
  items,
  maxItems = 8,
  onDelete,
  onUpload,
  className = "",
}: CaptureGalleryProps) {
  const [selectedItem, setSelectedItem] = useState<CaptureMeta | null>(null);

  // Show most recent items first, limited to maxItems
  const displayItems = items.slice(0, maxItems);

  const handleDownload = (item: CaptureMeta) => {
    if (item.dataUrl) {
      const timestamp = new Date(item.createdAt).toISOString().replace(/[:.]/g, "-");
      const filename = `capture-${timestamp}.${item.mimeType.split("/")[1] || "png"}`;
      downloadDataUrl(item.dataUrl, filename);
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  if (items.length === 0) {
    return (
      <div className={`text-center py-4 text-sm text-muted-foreground ${className}`}>
        暂无截图 / No captures yet
      </div>
    );
  }

  return (
    <>
      <div className={`grid grid-cols-4 gap-2 ${className}`}>
        {displayItems.map((item) => (
          <div
            key={item.id}
            className="relative group aspect-video bg-slate-100 rounded-md overflow-hidden border cursor-pointer hover:ring-2 hover:ring-primary/50"
            onClick={() => setSelectedItem(item)}
          >
            {item.dataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.dataUrl}
                alt={`Capture ${item.id}`}
                className="w-full h-full object-cover"
              />
            )}
            
            {/* Overlay with time */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-1 py-0.5">
              {formatTime(item.createdAt)}
            </div>

            {/* Hover actions */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItem(item);
                }}
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(item);
                }}
              >
                <Download className="h-3 w-3" />
              </Button>
              {onDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-white hover:bg-rose-500/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Upload indicator */}
            {item.url && (
              <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5">
                <Upload className="h-2 w-2" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fullscreen Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                {formatTime(selectedItem.createdAt)}
                {selectedItem.workOrderId && (
                  <span className="text-muted-foreground">
                    | 工单: {selectedItem.workOrderId}
                  </span>
                )}
                {selectedItem.stationId && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {selectedItem.stationId}
                  </span>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSelectedItem(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Image */}
            {selectedItem.dataUrl && (
              <div className="relative p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedItem.dataUrl}
                  alt={`Capture ${selectedItem.id}`}
                  className="w-full h-auto rounded-md"
                />
                
                <div className="absolute bottom-6 right-6 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDownload(selectedItem)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    下载
                  </Button>
                  {onUpload && !selectedItem.url && (
                    <Button
                      size="sm"
                      onClick={() => {
                        onUpload(selectedItem);
                        setSelectedItem(null);
                      }}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      上传
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="text-xs text-muted-foreground grid grid-cols-2 gap-2 p-4 border-t">
              <div>尺寸: {selectedItem.width} × {selectedItem.height}</div>
              <div>格式: {selectedItem.mimeType}</div>
              {selectedItem.lineId && <div>产线: {selectedItem.lineId}</div>}
              {selectedItem.note && <div className="col-span-2">备注: {selectedItem.note}</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CaptureGallery;

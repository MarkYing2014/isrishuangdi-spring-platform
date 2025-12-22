"use client";

/**
 * Camera Monitor Card Component
 * 摄像头监控卡片组件
 * 
 * 用于生产监控的现场画面卡片
 * 支持：本机摄像头、IP Camera (HLS)、演示视频
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  CameraOff,
  Video,
  VideoOff,
  RefreshCw,
  FlipHorizontal,
  SwitchCamera,
  Aperture,
  AlertTriangle,
  Lock,
  Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { useCameraStream, captureFrame } from "@/lib/camera";
import type { CaptureMeta, CameraSourceMode, UserRole } from "@/lib/production/types";
import { hasPermission, CAMERA_SOURCE_LABELS } from "@/lib/production/types";
import { CaptureGallery } from "./CaptureGallery";

interface CameraMonitorCardProps {
  lineId?: string;
  stationId?: string;
  workOrderId?: string;
  className?: string;
  initialMode?: CameraSourceMode;
}

export function CameraMonitorCard({
  lineId,
  stationId,
  workOrderId,
  className = "",
  initialMode = "local",
}: CameraMonitorCardProps) {
  // Demo role - in production, get from auth context
  const role: UserRole = "manager";
  const canAccessCamera = hasPermission(role);

  // Camera stream hook
  const { stream, status, error, devices, start, stop, refreshDevices } = useCameraStream();

  // State
  const [sourceMode, setSourceMode] = useState<CameraSourceMode>(initialMode);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isMirrored, setIsMirrored] = useState(false);
  const [captures, setCaptures] = useState<CaptureMeta[]>([]);
  const [hlsUrl, setHlsUrl] = useState("");
  const [hlsError, setHlsError] = useState<string | null>(null);
  const [autoCapture, setAutoCapture] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsVideoRef = useRef<HTMLVideoElement>(null);
  const demoVideoRef = useRef<HTMLVideoElement>(null);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Handle device selection
  const handleDeviceChange = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (status === "live") {
      start({ deviceId });
    }
  }, [status, start]);

  // Handle facing mode toggle
  const handleFacingModeToggle = useCallback(() => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    if (status === "live") {
      start({ facingMode: newMode });
    }
  }, [facingMode, status, start]);

  // Handle start camera
  const handleStart = useCallback(() => {
    if (selectedDeviceId) {
      start({ deviceId: selectedDeviceId });
    } else {
      start({ facingMode });
    }
  }, [selectedDeviceId, facingMode, start]);

  // Handle capture
  const handleCapture = useCallback(async () => {
    const videoEl = sourceMode === "local" ? videoRef.current 
      : sourceMode === "ip_hls" ? hlsVideoRef.current 
      : demoVideoRef.current;

    if (!videoEl) return;

    try {
      const result = await captureFrame(videoEl, { mimeType: "image/jpeg", quality: 0.9 });
      
      const newCapture: CaptureMeta = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        source: sourceMode,
        lineId,
        stationId,
        workOrderId,
        width: result.width,
        height: result.height,
        mimeType: "image/jpeg",
        dataUrl: result.dataUrl,
        blob: result.blob,
      };

      setCaptures((prev) => [newCapture, ...prev]);
    } catch (err) {
      console.error("Capture failed:", err);
    }
  }, [sourceMode, lineId, stationId, workOrderId]);

  // Handle upload
  const handleUpload = useCallback(async (item: CaptureMeta) => {
    if (!item.blob) return;

    try {
      const formData = new FormData();
      formData.append("file", item.blob, `capture-${item.id}.jpg`);
      if (item.lineId) formData.append("lineId", item.lineId);
      if (item.stationId) formData.append("stationId", item.stationId);
      if (item.workOrderId) formData.append("workOrderId", item.workOrderId);

      const res = await fetch("/api/production/captures", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setCaptures((prev) =>
          prev.map((c) => (c.id === item.id ? { ...c, url: data.url } : c))
        );
      }
    } catch (err) {
      console.error("Upload failed:", err);
    }
  }, []);

  // Handle delete capture
  const handleDeleteCapture = useCallback((id: string) => {
    setCaptures((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Handle HLS URL change
  const handleHlsUrlChange = useCallback((url: string) => {
    setHlsUrl(url);
    setHlsError(null);
  }, []);

  // Handle HLS video error
  const handleHlsError = useCallback(() => {
    setHlsError("无法播放此视频流。浏览器可能不支持 HLS 格式，请尝试 Demo 模式。");
  }, []);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Live Camera / 现场画面
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          ⚠️ Demo only - do not capture personal information / 仅用于演示，请勿拍摄个人信息
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={sourceMode} onValueChange={(v) => setSourceMode(v as CameraSourceMode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="local">{CAMERA_SOURCE_LABELS.local.zh}</TabsTrigger>
            <TabsTrigger value="ip_hls">{CAMERA_SOURCE_LABELS.ip_hls.zh}</TabsTrigger>
            <TabsTrigger value="demo">{CAMERA_SOURCE_LABELS.demo.zh}</TabsTrigger>
          </TabsList>

          {/* Local Camera Tab */}
          <TabsContent value="local" className="space-y-3 mt-3">
            {!canAccessCamera ? (
              <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                <Lock className="h-4 w-4" />
                <span className="text-sm">No permission to access camera. / 无权限访问摄像头</span>
              </div>
            ) : (
              <>
                {/* Control Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  {status === "live" ? (
                    <Button size="sm" variant="destructive" onClick={stop}>
                      <CameraOff className="h-4 w-4 mr-1" />
                      停止
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleStart} disabled={status === "starting"}>
                      <Camera className="h-4 w-4 mr-1" />
                      {status === "starting" ? "启动中..." : "启动"}
                    </Button>
                  )}

                  {/* Device Select */}
                  {devices.length > 0 && (
                    <Select value={selectedDeviceId || undefined} onValueChange={handleDeviceChange}>
                      <SelectTrigger className="w-40 h-8 text-xs">
                        <SelectValue placeholder="选择摄像头" />
                      </SelectTrigger>
                      <SelectContent>
                        {devices
                          .filter((device) => device.deviceId)
                          .map((device) => (
                            <SelectItem key={device.deviceId} value={device.deviceId}>
                              {device.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Facing Mode Toggle */}
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={handleFacingModeToggle}>
                    <SwitchCamera className="h-4 w-4" />
                  </Button>

                  {/* Mirror Toggle */}
                  <Button
                    size="icon"
                    variant={isMirrored ? "default" : "outline"}
                    className="h-8 w-8"
                    onClick={() => setIsMirrored(!isMirrored)}
                    title="镜像"
                  >
                    <FlipHorizontal className="h-4 w-4" />
                  </Button>

                  {/* Capture Button */}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleCapture}
                    disabled={status !== "live"}
                  >
                    <Aperture className="h-4 w-4 mr-1" />
                    截图
                  </Button>

                  {/* Refresh Devices */}
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={refreshDevices}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="flex items-center gap-2 p-2 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                    <AlertTriangle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                {/* Video Preview */}
                <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden">
                  {status === "live" ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${isMirrored ? "scale-x-[-1]" : ""}`}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                      <div className="text-center">
                        <VideoOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          {status === "starting" ? "正在启动摄像头..." : "点击「启动」开始预览"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Auto Capture on Andon (TODO) */}
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs">Auto Capture on Andon / Andon 自动抓拍</span>
                  </div>
                  <Button
                    size="sm"
                    variant={autoCapture ? "default" : "outline"}
                    onClick={() => setAutoCapture(!autoCapture)}
                    disabled
                    className="text-xs"
                  >
                    {autoCapture ? "ON" : "OFF"}
                  </Button>
                  {/* TODO: Implement auto capture when STOP event > 3 minutes */}
                </div>
              </>
            )}
          </TabsContent>

          {/* IP Camera Tab */}
          <TabsContent value="ip_hls" className="space-y-3 mt-3">
            <div className="flex gap-2">
              <Input
                placeholder="输入 HLS URL (例如 https://...m3u8)"
                value={hlsUrl}
                onChange={(e) => handleHlsUrlChange(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" onClick={handleCapture} disabled={!hlsUrl}>
                <Aperture className="h-4 w-4 mr-1" />
                截图
              </Button>
            </div>

            {hlsError && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-700 text-xs">
                <AlertTriangle className="h-4 w-4" />
                {hlsError}
              </div>
            )}

            <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden">
              {hlsUrl ? (
                <video
                  ref={hlsVideoRef}
                  src={hlsUrl}
                  controls
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  onError={handleHlsError}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">输入 HLS/MP4 URL 开始播放</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Demo Tab */}
          <TabsContent value="demo" className="space-y-3 mt-3">
            <div className="flex justify-end items-center gap-2 mb-2">
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                AI Analysis Active
              </span>
              <Button size="sm" variant="secondary" onClick={handleCapture}>
                <Aperture className="h-4 w-4 mr-1" />
                截图
              </Button>
            </div>

            <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden group">
              {/* Simulated Camera Feed (Spring Coiling Machine) */}
              <iframe 
                className="w-full h-full object-cover scale-150 pointer-events-none"
                src="https://www.youtube.com/embed/5T7Mv-2XN6s?autoplay=1&mute=1&controls=0&loop=1&playlist=5T7Mv-2XN6s&start=30" 
                title="Spring Coiling Machine Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              />
              
              {/* AI Overlay Layer */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Simulated Bounding Box */}
                <div className="absolute top-1/4 left-1/3 w-32 h-32 border-2 border-emerald-500/70 rounded-sm">
                   <div className="absolute -top-6 left-0 bg-emerald-500/70 text-white text-[10px] px-1 py-0.5">
                      Spring OD: 24.02mm (OK)
                   </div>
                </div>
                
                {/* Tech Grid Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
                
                {/* Timestamp */}
                <div className="absolute bottom-2 right-2 font-mono text-xs text-emerald-500/80 bg-black/50 px-2 rounded">
                  CAM-02 | {new Date().toLocaleTimeString()} | 30FPS
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Capture Gallery */}
        {captures.length > 0 && (
          <div className="border-t pt-3">
            <h4 className="text-xs font-medium mb-2 text-muted-foreground">
              截图记录 ({captures.length})
            </h4>
            <CaptureGallery
              items={captures}
              maxItems={8}
              onDelete={handleDeleteCapture}
              onUpload={handleUpload}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CameraMonitorCard;

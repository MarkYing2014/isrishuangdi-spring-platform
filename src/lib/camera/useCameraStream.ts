"use client";

/**
 * Camera Stream Hook
 * 摄像头流 Hook
 * 
 * 封装 getUserMedia 的启动/停止，支持设备切换
 */

import { useState, useCallback, useRef, useEffect } from "react";

export type CameraStatus = "idle" | "starting" | "live" | "stopped" | "error";

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface CameraStreamOptions {
  deviceId?: string;
  facingMode?: "user" | "environment";
}

export interface UseCameraStreamReturn {
  stream: MediaStream | null;
  status: CameraStatus;
  error: string | null;
  devices: CameraDevice[];
  start: (options?: CameraStreamOptions) => Promise<void>;
  stop: () => void;
  refreshDevices: () => Promise<void>;
}

/**
 * Hook for managing camera stream
 */
export function useCameraStream(): UseCameraStreamReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  
  const streamRef = useRef<MediaStream | null>(null);

  /**
   * Refresh available camera devices
   */
  const refreshDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices
        .filter((device) => device.kind === "videoinput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
        }));
      setDevices(videoDevices);
    } catch (err) {
      console.error("Failed to enumerate devices:", err);
    }
  }, []);

  /**
   * Stop the current stream
   */
  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
      setStream(null);
      setStatus("stopped");
    }
  }, []);

  /**
   * Start camera stream
   */
  const start = useCallback(async (options: CameraStreamOptions = {}) => {
    // Stop existing stream first
    stop();
    
    setStatus("starting");
    setError(null);

    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser");
      }

      // Build video constraints
      const videoConstraints: MediaTrackConstraints = options.deviceId
        ? { deviceId: { exact: options.deviceId } }
        : { facingMode: options.facingMode ?? "environment" };

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setStatus("live");

      // Refresh devices after getting permission (labels become available)
      await refreshDevices();
    } catch (err) {
      const errorMessage = getCameraErrorMessage(err);
      setError(errorMessage);
      setStatus("error");
      console.error("Camera error:", err);
    }
  }, [stop, refreshDevices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Initial device enumeration
  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  return {
    stream,
    status,
    error,
    devices,
    start,
    stop,
    refreshDevices,
  };
}

/**
 * Get user-friendly error message for camera errors
 */
function getCameraErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    switch (err.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return "Camera permission denied. Please allow camera access in your browser settings.";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "No camera found. Please connect a camera and try again.";
      case "NotReadableError":
      case "TrackStartError":
        return "Camera is in use by another application. Please close other apps using the camera.";
      case "OverconstrainedError":
        return "Camera does not support the requested settings.";
      case "SecurityError":
        return "Camera access blocked. Please use HTTPS or localhost.";
      default:
        return err.message || "Failed to access camera.";
    }
  }
  return "Unknown camera error occurred.";
}

export default useCameraStream;

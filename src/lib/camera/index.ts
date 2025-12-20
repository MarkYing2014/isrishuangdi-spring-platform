/**
 * Camera Module
 * 摄像头模块
 */

export { useCameraStream } from "./useCameraStream";
export type { CameraStatus, CameraDevice, CameraStreamOptions, UseCameraStreamReturn } from "./useCameraStream";

export { captureFrame, downloadBlob, downloadDataUrl } from "./captureFrame";
export type { CaptureResult, CaptureOptions } from "./captureFrame";

/**
 * Capture Frame Utility
 * 截图工具
 * 
 * 从 video 元素截取当前帧
 */

export interface CaptureResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

export interface CaptureOptions {
  mimeType?: "image/png" | "image/jpeg" | "image/webp";
  quality?: number; // 0-1, only for jpeg/webp
}

/**
 * Capture current frame from video element
 * @param videoEl - The video element to capture from
 * @param options - Capture options (mimeType, quality)
 * @returns Promise with blob, dataUrl, width, height
 */
export async function captureFrame(
  videoEl: HTMLVideoElement,
  options: CaptureOptions = {}
): Promise<CaptureResult> {
  const { mimeType = "image/png", quality = 0.92 } = options;

  // Get actual video dimensions
  const width = videoEl.videoWidth;
  const height = videoEl.videoHeight;

  if (width === 0 || height === 0) {
    throw new Error("Video has no dimensions. Make sure the video is playing.");
  }

  // Create canvas with video dimensions
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas 2D context.");
  }

  // Draw current video frame to canvas
  ctx.drawImage(videoEl, 0, 0, width, height);

  // Convert to blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) {
          resolve(b);
        } else {
          reject(new Error("Failed to create blob from canvas."));
        }
      },
      mimeType,
      quality
    );
  });

  // Get data URL
  const dataUrl = canvas.toDataURL(mimeType, quality);

  return {
    blob,
    dataUrl,
    width,
    height,
  };
}

/**
 * Download a blob as a file
 * @param blob - The blob to download
 * @param filename - The filename for the download
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download from data URL
 * @param dataUrl - The data URL to download
 * @param filename - The filename for the download
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default captureFrame;

"use client";

import React, { useRef, useEffect, useMemo } from "react";
import type {
  SpringDrawingSpec,
  ViewGeometry,
  GeometryElement,
  DimensionSpec,
  Line2D,
  Arc2D,
  Circle2D,
  SHEET_SIZES,
} from "@/lib/drawing/types";

interface EngineeringDrawingCanvasProps {
  spec: SpringDrawingSpec;
  width?: number;
  height?: number;
  className?: string;
}

// 线型样式
const LINE_STYLES = {
  solid: [],
  dashed: [8, 4],
  centerline: [16, 4, 4, 4],
  hidden: [4, 4],
};

// 颜色
const COLORS = {
  geometry: "#000000",
  dimension: "#0066cc",
  centerline: "#cc0000",
  hidden: "#666666",
  titleBlock: "#000000",
  grid: "#e0e0e0",
};

/**
 * 2D 工程图 Canvas 渲染组件
 */
export function EngineeringDrawingCanvas({
  spec,
  width = 800,
  height = 566,
  className = "",
}: EngineeringDrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 计算缩放比例
  const scale = useMemo(() => {
    const sheetWidth = spec.sheetSize === "A4" ? 297 : spec.sheetSize === "A3" ? 420 : 594;
    const sheetHeight = spec.sheetSize === "A4" ? 210 : spec.sheetSize === "A3" ? 297 : 420;
    
    if (spec.orientation === "landscape") {
      return Math.min(width / sheetWidth, height / sheetHeight);
    } else {
      return Math.min(width / sheetHeight, height / sheetWidth);
    }
  }, [spec.sheetSize, spec.orientation, width, height]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // 清空画布
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    
    // 绘制边框
    drawBorder(ctx, width, height, scale);
    
    // 绘制视图几何
    if (spec.viewGeometries) {
      for (const viewGeom of spec.viewGeometries) {
        const view = spec.views.find(v => v.id === viewGeom.viewId);
        if (view) {
          drawViewGeometry(ctx, viewGeom, view.position, scale);
        }
      }
    }
    
    // 绘制尺寸标注
    for (const dim of spec.dimensions) {
      const view = spec.views.find(v => v.id === dim.viewId);
      if (view) {
        drawDimension(ctx, dim, view.position, scale);
      }
    }
    
    // 绘制标题栏
    drawTitleBlock(ctx, spec.titleBlock, width, height, scale);
    
    // 绘制技术要求
    drawTechnicalNotes(ctx, spec.technicalNotes, width, height, scale);
    
  }, [spec, width, height, scale]);
  
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`border border-slate-300 bg-white ${className}`}
    />
  );
}

/**
 * 绘制边框
 */
function drawBorder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number
) {
  const margin = 10 * scale;
  
  ctx.strokeStyle = COLORS.titleBlock;
  ctx.lineWidth = 2;
  ctx.strokeRect(margin, margin, width - 2 * margin, height - 2 * margin);
  
  // 内框
  ctx.lineWidth = 0.5;
  ctx.strokeRect(margin + 5, margin + 5, width - 2 * margin - 10, height - 2 * margin - 10);
}

/**
 * 绘制视图几何
 */
function drawViewGeometry(
  ctx: CanvasRenderingContext2D,
  viewGeom: ViewGeometry,
  position: { x: number; y: number },
  scale: number
) {
  ctx.save();
  ctx.translate(position.x * scale, position.y * scale);
  
  for (const element of viewGeom.elements) {
    drawElement(ctx, element, scale);
  }
  
  ctx.restore();
}

/**
 * 绘制几何元素
 */
function drawElement(
  ctx: CanvasRenderingContext2D,
  element: GeometryElement,
  scale: number
) {
  ctx.beginPath();
  
  // 设置线型
  const style = element.style || "solid";
  ctx.setLineDash(LINE_STYLES[style] || []);
  ctx.lineWidth = (element.weight || 0.35) * scale;
  
  // 设置颜色
  if (style === "centerline") {
    ctx.strokeStyle = COLORS.centerline;
  } else if (style === "hidden") {
    ctx.strokeStyle = COLORS.hidden;
  } else {
    ctx.strokeStyle = COLORS.geometry;
  }
  
  if ("start" in element && "end" in element) {
    // Line
    const line = element as Line2D;
    ctx.moveTo(line.start.x, line.start.y);
    ctx.lineTo(line.end.x, line.end.y);
  } else if ("center" in element && "radius" in element) {
    if ("startAngle" in element) {
      // Arc
      const arc = element as Arc2D;
      const startRad = (arc.startAngle * Math.PI) / 180;
      const endRad = (arc.endAngle * Math.PI) / 180;
      ctx.arc(arc.center.x, arc.center.y, arc.radius, startRad, endRad);
    } else {
      // Circle
      const circle = element as Circle2D;
      ctx.arc(circle.center.x, circle.center.y, circle.radius, 0, Math.PI * 2);
    }
  }
  
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * 绘制尺寸标注
 */
function drawDimension(
  ctx: CanvasRenderingContext2D,
  dim: DimensionSpec,
  viewPosition: { x: number; y: number },
  scale: number
) {
  ctx.save();
  ctx.translate(viewPosition.x * scale, viewPosition.y * scale);
  
  ctx.strokeStyle = COLORS.dimension;
  ctx.fillStyle = COLORS.dimension;
  ctx.lineWidth = 0.25 * scale;
  ctx.font = `${10 * scale}px Arial`;
  
  const from = typeof dim.fromPoint === "object" ? dim.fromPoint : { x: 0, y: 0 };
  const to = typeof dim.toPoint === "object" ? dim.toPoint : { x: 0, y: 0 };
  const offset = dim.offset || 10;
  
  if (dim.orientation === "horizontal") {
    const y = from.y - offset * scale;
    
    // 尺寸线
    ctx.beginPath();
    ctx.moveTo(from.x, y);
    ctx.lineTo(to.x, y);
    ctx.stroke();
    
    // 延伸线
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(from.x, y - 3 * scale);
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x, y - 3 * scale);
    ctx.stroke();
    
    // 箭头
    drawArrow(ctx, from.x, y, "left", scale);
    drawArrow(ctx, to.x, y, "right", scale);
    
    // 文字
    const text = formatDimensionText(dim);
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, (from.x + to.x) / 2 - textWidth / 2, y - 3 * scale);
    
  } else if (dim.orientation === "vertical") {
    const x = from.x + offset * scale;
    
    // 尺寸线
    ctx.beginPath();
    ctx.moveTo(x, from.y);
    ctx.lineTo(x, to.y);
    ctx.stroke();
    
    // 延伸线
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(x + 3 * scale, from.y);
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(x + 3 * scale, to.y);
    ctx.stroke();
    
    // 箭头
    drawArrow(ctx, x, from.y, "down", scale);
    drawArrow(ctx, x, to.y, "up", scale);
    
    // 文字（旋转）
    const text = formatDimensionText(dim);
    ctx.save();
    ctx.translate(x + 10 * scale, (from.y + to.y) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(text, -ctx.measureText(text).width / 2, 0);
    ctx.restore();
  }
  
  ctx.restore();
}

/**
 * 绘制箭头
 */
function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: "left" | "right" | "up" | "down",
  scale: number
) {
  const size = 3 * scale;
  ctx.beginPath();
  
  switch (direction) {
    case "left":
      ctx.moveTo(x, y);
      ctx.lineTo(x + size, y - size / 2);
      ctx.lineTo(x + size, y + size / 2);
      break;
    case "right":
      ctx.moveTo(x, y);
      ctx.lineTo(x - size, y - size / 2);
      ctx.lineTo(x - size, y + size / 2);
      break;
    case "up":
      ctx.moveTo(x, y);
      ctx.lineTo(x - size / 2, y + size);
      ctx.lineTo(x + size / 2, y + size);
      break;
    case "down":
      ctx.moveTo(x, y);
      ctx.lineTo(x - size / 2, y - size);
      ctx.lineTo(x + size / 2, y - size);
      break;
  }
  
  ctx.closePath();
  ctx.fill();
}

/**
 * 格式化尺寸文字
 */
function formatDimensionText(dim: DimensionSpec): string {
  let text = "";
  
  if (dim.prefix) text += dim.prefix;
  if (dim.isReference) text += "(";
  
  text += dim.value.toFixed(dim.type === "angular" ? 0 : 2);
  
  if (dim.tolerance) {
    if (dim.tolerance.type === "symmetric" && dim.tolerance.symmetric) {
      text += ` ±${dim.tolerance.symmetric}`;
    } else if (dim.tolerance.type === "deviation") {
      text += ` +${dim.tolerance.upper}/-${Math.abs(dim.tolerance.lower || 0)}`;
    }
  }
  
  if (dim.isReference) text += ")";
  if (dim.suffix) text += dim.suffix;
  
  return text;
}

/**
 * 绘制标题栏
 */
function drawTitleBlock(
  ctx: CanvasRenderingContext2D,
  titleBlock: SpringDrawingSpec["titleBlock"],
  width: number,
  height: number,
  scale: number
) {
  const blockWidth = 180 * scale;
  const blockHeight = 50 * scale;
  const x = width - blockWidth - 15 * scale;
  const y = height - blockHeight - 15 * scale;
  
  ctx.strokeStyle = COLORS.titleBlock;
  ctx.fillStyle = COLORS.titleBlock;
  ctx.lineWidth = 1;
  
  // 外框
  ctx.strokeRect(x, y, blockWidth, blockHeight);
  
  // 分隔线
  ctx.beginPath();
  ctx.moveTo(x, y + blockHeight / 2);
  ctx.lineTo(x + blockWidth, y + blockHeight / 2);
  ctx.moveTo(x + blockWidth / 2, y);
  ctx.lineTo(x + blockWidth / 2, y + blockHeight);
  ctx.stroke();
  
  // 文字
  ctx.font = `bold ${8 * scale}px Arial`;
  ctx.fillText(titleBlock.partName, x + 5 * scale, y + 12 * scale);
  
  ctx.font = `${6 * scale}px Arial`;
  if (titleBlock.partNameZh) {
    ctx.fillText(titleBlock.partNameZh, x + 5 * scale, y + 22 * scale);
  }
  
  ctx.fillText(`Part No: ${titleBlock.partNumber}`, x + blockWidth / 2 + 5 * scale, y + 12 * scale);
  ctx.fillText(`Material: ${titleBlock.material}`, x + blockWidth / 2 + 5 * scale, y + 22 * scale);
  
  ctx.fillText(`Scale: ${titleBlock.scale}`, x + 5 * scale, y + blockHeight / 2 + 12 * scale);
  ctx.fillText(`Drawn: ${titleBlock.drawnBy}`, x + 5 * scale, y + blockHeight / 2 + 22 * scale);
  ctx.fillText(`Date: ${titleBlock.drawnDate}`, x + blockWidth / 2 + 5 * scale, y + blockHeight / 2 + 12 * scale);
}

/**
 * 绘制技术要求
 */
function drawTechnicalNotes(
  ctx: CanvasRenderingContext2D,
  notes: SpringDrawingSpec["technicalNotes"],
  width: number,
  height: number,
  scale: number
) {
  const x = 20 * scale;
  let y = height - 80 * scale;
  
  ctx.fillStyle = COLORS.titleBlock;
  ctx.font = `bold ${8 * scale}px Arial`;
  ctx.fillText("Technical Notes / 技术要求:", x, y);
  
  ctx.font = `${6 * scale}px Arial`;
  y += 12 * scale;
  
  for (const note of notes.slice(0, 5)) {
    const text = `${note.index}. ${note.textEn}`;
    ctx.fillText(text, x, y);
    y += 10 * scale;
  }
}

export default EngineeringDrawingCanvas;

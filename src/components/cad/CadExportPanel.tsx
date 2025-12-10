'use client';

/**
 * CAD Export Panel Component
 * CAD 导出面板组件
 * 
 * 功能：
 * 1. 显示当前设计参数
 * 2. 选择导出格式
 * 3. 配置图纸设置
 * 4. 发起导出请求
 * 5. 显示下载链接
 */

import React, { useState, useMemo } from 'react';
import { 
  Download, 
  FileText, 
  Box, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { 
  CadExportFormat, 
  SpringGeometry,
  AnalysisSummary,
  DrawingSettings,
  ExportedFile,
} from '@/lib/cad/types';
import { 
  CAD_FORMAT_GROUPS, 
  CAD_FORMAT_META,
  DEFAULT_DRAWING_SETTINGS,
} from '@/lib/cad/types';
import { requestCadExport, downloadExportedFile } from '@/lib/cad/exportService';

interface CadExportPanelProps {
  /** 弹簧几何参数 */
  geometry: SpringGeometry;
  /** 分析结果（可选） */
  analysisResult?: Partial<AnalysisSummary>;
  /** 语言 */
  language?: 'zh' | 'en';
  /** 导出成功回调 */
  onExportSuccess?: (files: ExportedFile[]) => void;
  /** 导出失败回调 */
  onExportError?: (error: Error) => void;
}

export function CadExportPanel({
  geometry,
  analysisResult,
  language = 'zh',
  onExportSuccess,
  onExportError,
}: CadExportPanelProps) {
  const isZh = language === 'zh';
  
  // 状态
  const [selectedFormats, setSelectedFormats] = useState<CadExportFormat[]>(['STEP', 'PDF_2D']);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedFiles, setExportedFiles] = useState<ExportedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [drawingSettings, setDrawingSettings] = useState<DrawingSettings>(DEFAULT_DRAWING_SETTINGS);
  
  // 计算设计参数显示
  const designParams = useMemo(() => {
    const params: { label: string; value: string }[] = [];
    
    params.push({
      label: isZh ? '线径 d' : 'Wire Diameter d',
      value: `${geometry.wireDiameter} mm`,
    });
    
    if ('meanDiameter' in geometry) {
      params.push({
        label: isZh ? '中径 Dm' : 'Mean Diameter Dm',
        value: `${geometry.meanDiameter} mm`,
      });
    }
    
    params.push({
      label: isZh ? '有效圈数 Na' : 'Active Coils Na',
      value: `${geometry.activeCoils}`,
    });
    
    if ('freeLength' in geometry) {
      params.push({
        label: isZh ? '自由长度 L₀' : 'Free Length L₀',
        value: `${geometry.freeLength} mm`,
      });
    }
    
    if (geometry.type === 'torsion') {
      const torsion = geometry as { legLength1: number; legLength2: number };
      params.push({
        label: isZh ? '腿长 L1/L2' : 'Leg Length L1/L2',
        value: `${torsion.legLength1} / ${torsion.legLength2} mm`,
      });
    }
    
    return params;
  }, [geometry, isZh]);
  
  // 切换格式选择
  const toggleFormat = (format: CadExportFormat) => {
    setSelectedFormats(prev => 
      prev.includes(format)
        ? prev.filter(f => f !== format)
        : [...prev, format]
    );
  };
  
  // 执行导出
  const handleExport = async () => {
    if (selectedFormats.length === 0) {
      setError(isZh ? '请至少选择一种导出格式' : 'Please select at least one export format');
      return;
    }
    
    setIsExporting(true);
    setError(null);
    setExportedFiles([]);
    
    try {
      const result = await requestCadExport(geometry, selectedFormats, {
        analysisResult,
        drawingSettings,
      });
      
      if (result.status === 'failed') {
        throw new Error(result.error?.message ?? 'Export failed');
      }
      
      if (result.files) {
        setExportedFiles(result.files);
        onExportSuccess?.(result.files);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      onExportError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsExporting(false);
    }
  };
  
  // 下载文件
  const handleDownload = async (file: ExportedFile) => {
    try {
      await downloadExportedFile(file.downloadUrl, file.fileName);
    } catch (err) {
      setError(isZh ? '下载失败' : 'Download failed');
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <Box className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold">
          {isZh ? 'CAD 导出' : 'CAD Export'}
        </h2>
      </div>
      
      {/* 设计参数预览 */}
      <div className="bg-slate-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-slate-700 mb-3">
          {isZh ? '当前设计参数' : 'Current Design Parameters'}
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {designParams.map((param, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-slate-500">{param.label}</span>
              <span className="font-mono">{param.value}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* 格式选择 */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-700">
          {isZh ? '导出格式' : 'Export Formats'}
        </h3>
        
        {Object.entries(CAD_FORMAT_GROUPS).map(([group, formats]) => (
          <div key={group} className="space-y-2">
            <p className="text-xs text-slate-500">{group}</p>
            <div className="flex flex-wrap gap-2">
              {formats.map(format => {
                const meta = CAD_FORMAT_META[format];
                const isSelected = selectedFormats.includes(format);
                
                return (
                  <button
                    key={format}
                    onClick={() => toggleFormat(format)}
                    className={`
                      px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                      ${isSelected 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }
                    `}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* 图纸设置（可折叠） */}
      <div className="border rounded-lg">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between p-3 hover:bg-slate-50"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium">
              {isZh ? '图纸设置' : 'Drawing Settings'}
            </span>
          </div>
          {showSettings ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>
        
        {showSettings && (
          <div className="p-3 border-t space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">
                  {isZh ? '图纸尺寸' : 'Paper Size'}
                </label>
                <select
                  value={drawingSettings.size}
                  onChange={e => setDrawingSettings(s => ({ ...s, size: e.target.value as DrawingSettings['size'] }))}
                  className="w-full mt-1 px-2 py-1 border rounded text-sm"
                >
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="A2">A2</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">
                  {isZh ? '比例' : 'Scale'}
                </label>
                <select
                  value={drawingSettings.scale}
                  onChange={e => setDrawingSettings(s => ({ ...s, scale: e.target.value }))}
                  className="w-full mt-1 px-2 py-1 border rounded text-sm"
                >
                  <option value="1:1">1:1</option>
                  <option value="2:1">2:1</option>
                  <option value="1:2">1:2</option>
                  <option value="5:1">5:1</option>
                </select>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={drawingSettings.showDimensions}
                  onChange={e => setDrawingSettings(s => ({ ...s, showDimensions: e.target.checked }))}
                  className="rounded"
                />
                {isZh ? '显示尺寸' : 'Show Dimensions'}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={drawingSettings.showTolerances}
                  onChange={e => setDrawingSettings(s => ({ ...s, showTolerances: e.target.checked }))}
                  className="rounded"
                />
                {isZh ? '显示公差' : 'Show Tolerances'}
              </label>
            </div>
          </div>
        )}
      </div>
      
      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      
      {/* 导出按钮 */}
      <button
        onClick={handleExport}
        disabled={isExporting || selectedFormats.length === 0}
        className={`
          w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors
          ${isExporting || selectedFormats.length === 0
            ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
          }
        `}
      >
        {isExporting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {isZh ? '导出中...' : 'Exporting...'}
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            {isZh ? '导出 CAD 文件' : 'Export CAD Files'}
          </>
        )}
      </button>
      
      {/* 导出结果 */}
      {exportedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {isZh ? '导出成功' : 'Export Successful'}
            </span>
          </div>
          
          <div className="space-y-2">
            {exportedFiles.map((file, i) => (
              <div 
                key={i}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="text-sm">{file.fileName}</span>
                  {file.fileSize && (
                    <span className="text-xs text-slate-400">
                      ({(file.fileSize / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDownload(file)}
                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  {isZh ? '下载' : 'Download'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CadExportPanel;

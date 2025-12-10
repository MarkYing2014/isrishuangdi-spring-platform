/**
 * CAD Export Module
 * CAD 导出模块
 */

// Types
export type {
  CadExportFormat,
  UnitSettings,
  CadMaterialInfo,
  AnalysisSummary,
  DrawingSettings,
  TitleBlockInfo,
  CadExportDesign,
  CadExportRequest,
  CadExportResponse,
  ExportedFile,
  BatchCadExportRequest,
  BatchCadExportResponse,
  SpringGeometry,
} from './types';

export {
  CAD_FORMAT_GROUPS,
  CAD_FORMAT_META,
  DEFAULT_UNITS,
  DEFAULT_DRAWING_SETTINGS,
} from './types';

// Services
export {
  buildMaterialInfo,
  buildAnalysisSummary,
  generateDesignCode,
  buildTitleBlock,
  buildCadExportDesign,
  requestCadExport,
  pollExportStatus,
  downloadExportedFile,
  exportToStep,
  exportToPdf2D,
  exportDesignPackage,
} from './exportService';

// Hook Parameters
export type { CadHookParams } from './hookParams';
export {
  calculateCadHookParams,
  generateHookAnnotation,
  toCreoParameters,
  HOOK_TYPE_LABELS,
} from './hookParams';

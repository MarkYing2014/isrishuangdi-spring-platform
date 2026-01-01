import { PlatformSpringType } from "./types";

export interface AxisDefinition {
    xLabelEn: string;
    xLabelZh: string;
    xUnit: string;
    yLabelEn: string;
    yLabelZh: string;
    yUnit: string;
}

export const PLATFORM_AXIS_MAP: Record<PlatformSpringType, AxisDefinition> = {
    compression: {
        xLabelEn: "Height H", xLabelZh: "高度 H", xUnit: "mm",
        yLabelEn: "Load P", yLabelZh: "负荷 P", yUnit: "N"
    },
    extension: {
        xLabelEn: "Length L", xLabelZh: "长度 L", xUnit: "mm",
        yLabelEn: "Load P", yLabelZh: "负荷 P", yUnit: "N"
    },
    torsion: {
        xLabelEn: "Angle θ", xLabelZh: "角度 θ", xUnit: "deg",
        yLabelEn: "Torque M", yLabelZh: "扭矩 M", yUnit: "Nmm"
    },
    conical: {
        xLabelEn: "Height H", xLabelZh: "高度 H", xUnit: "mm",
        yLabelEn: "Load P", yLabelZh: "负荷 P", yUnit: "N"
    },
    arc: {
        xLabelEn: "Angle φ", xLabelZh: "转角 φ", xUnit: "deg",
        yLabelEn: "Torque T", yLabelZh: "扭矩 T", yUnit: "Nmm"
    },
    disc: {
        xLabelEn: "Stroke s", xLabelZh: "行程 s", xUnit: "mm",
        yLabelEn: "Load P", yLabelZh: "负荷 P", yUnit: "N"
    },
    spiral: {
        xLabelEn: "Angle θ", xLabelZh: "角度 θ", xUnit: "deg",
        yLabelEn: "Torque M", yLabelZh: "扭矩 M", yUnit: "Nmm"
    },
    wave: {
        xLabelEn: "Height H", xLabelZh: "高度 H", xUnit: "mm",
        yLabelEn: "Load P", yLabelZh: "负荷 P", yUnit: "N"
    },
    variablePitch: {
        xLabelEn: "Height H", xLabelZh: "高度 H", xUnit: "mm",
        yLabelEn: "Load P", yLabelZh: "负荷 P", yUnit: "N"
    },
    shock: {
        xLabelEn: "Stroke x", xLabelZh: "行程 x", xUnit: "mm",
        yLabelEn: "Load P", yLabelZh: "负荷 P", yUnit: "N"
    }
};

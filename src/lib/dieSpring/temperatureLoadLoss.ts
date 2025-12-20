/**
 * Die Spring Temperature Load Loss
 * 模具弹簧温度载荷损失
 * 
 * Lookup tables for temperature-induced load loss in die springs
 */

import type { DieSpringMaterialType } from "./types";

interface TempLossEntry {
  tempC: number;
  lossPct: number;
}

const TEMP_LOSS_TABLES: Record<DieSpringMaterialType, TempLossEntry[]> = {
  OIL_TEMPERED: [
    { tempC: 80, lossPct: 3 },
    { tempC: 100, lossPct: 5 },
    { tempC: 120, lossPct: 8 },
  ],
  CHROME_ALLOY: [
    { tempC: 120, lossPct: 4 },
    { tempC: 150, lossPct: 7 },
    { tempC: 180, lossPct: 10 },
    { tempC: 200, lossPct: 13 },
  ],
  CHROME_SILICON: [
    { tempC: 150, lossPct: 3 },
    { tempC: 180, lossPct: 5 },
    { tempC: 200, lossPct: 7 },
    { tempC: 220, lossPct: 9 },
    { tempC: 250, lossPct: 12 },
  ],
};

/**
 * Get temperature-induced load loss percentage
 * Uses linear interpolation between table entries
 */
export function getTemperatureLoadLoss(
  material: DieSpringMaterialType,
  temperatureC: number
): number {
  const table = TEMP_LOSS_TABLES[material];
  if (!table || table.length === 0) return 0;

  // Below minimum temperature - no loss
  if (temperatureC <= table[0].tempC) {
    return 0;
  }

  // Above maximum temperature - use last value (caller should check for error)
  if (temperatureC >= table[table.length - 1].tempC) {
    return table[table.length - 1].lossPct;
  }

  // Linear interpolation
  for (let i = 0; i < table.length - 1; i++) {
    const low = table[i];
    const high = table[i + 1];
    if (temperatureC >= low.tempC && temperatureC <= high.tempC) {
      const ratio = (temperatureC - low.tempC) / (high.tempC - low.tempC);
      return low.lossPct + ratio * (high.lossPct - low.lossPct);
    }
  }

  return 0;
}

/**
 * Calculate derated load after temperature correction
 */
export function calculateDeratedLoad(
  load_N: number,
  material: DieSpringMaterialType,
  temperatureC: number
): { deratedLoad_N: number; lossPct: number } {
  const lossPct = getTemperatureLoadLoss(material, temperatureC);
  const deratedLoad_N = load_N * (1 - lossPct / 100);
  return { deratedLoad_N, lossPct };
}

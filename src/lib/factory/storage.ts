import { FactoryConfig } from "./types";
import { DEFAULT_FACTORY_CONFIG } from "./defaults";

const STORAGE_PREFIX = "factoryConfig:v1";

/**
 * Persistence layer for factory configuration using localStorage.
 */
export function loadFactoryConfig(factoryId: string = "P01"): FactoryConfig {
    if (typeof window === "undefined") return DEFAULT_FACTORY_CONFIG;

    const key = `${STORAGE_PREFIX}:${factoryId}`;
    const raw = localStorage.getItem(key);

    if (!raw) {
        // Auto-persist default if missing
        saveFactoryConfig(DEFAULT_FACTORY_CONFIG);
        return DEFAULT_FACTORY_CONFIG;
    }

    try {
        const config = JSON.parse(raw) as FactoryConfig;

        // Forward migration hook (stub for now)
        if (config.schemaVersion < DEFAULT_FACTORY_CONFIG.schemaVersion) {
            console.warn("Factory config schema version mismatch. Migrating...");
            // Migration logic would go here
            return {
                ...DEFAULT_FACTORY_CONFIG,
                ...config,
                schemaVersion: DEFAULT_FACTORY_CONFIG.schemaVersion,
            };
        }

        return config;
    } catch (e) {
        console.error("Failed to parse factory config:", e);
        return DEFAULT_FACTORY_CONFIG;
    }
}

export function saveFactoryConfig(config: FactoryConfig): void {
    if (typeof window === "undefined") return;

    const key = `${STORAGE_PREFIX}:${config.factoryId}`;
    const data = {
        ...config,
        updatedAtISO: new Date().toISOString(),
    };

    localStorage.setItem(key, JSON.stringify(data));
}

export function resetFactoryConfig(factoryId: string = "P01"): FactoryConfig {
    saveFactoryConfig({ ...DEFAULT_FACTORY_CONFIG, factoryId });
    return loadFactoryConfig(factoryId);
}

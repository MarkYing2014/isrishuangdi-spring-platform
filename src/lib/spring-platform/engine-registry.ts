import { PlatformSpringType, ISpringEngine } from "./types";
import { CompressionEngine } from "./engines/compression";
import { ExtensionEngine } from "./engines/extension";
import { TorsionEngine } from "./engines/torsion";
import { ConicalEngine } from "./engines/conical";
import { ArcSpringEngine } from "./engines/arc-engine";
import { DiscSpringEngine } from "./engines/disc-engine";
import { SpiralSpringEngine } from "./engines/spiral-engine";
import { WaveSpringEngine } from "./engines/wave-engine";

const registry: Record<string, ISpringEngine> = {
    compression: new CompressionEngine(),
    extension: new ExtensionEngine(),
    torsion: new TorsionEngine(),
    conical: new ConicalEngine(),
    arc: new ArcSpringEngine() as any,
    disc: new DiscSpringEngine() as any,
    spiral: new SpiralSpringEngine() as any,
    wave: new WaveSpringEngine() as any,
};

export function getEngine(type: PlatformSpringType): ISpringEngine {
    const engine = registry[type];
    if (!engine) {
        throw new Error(`No engine found for spring type: ${type}`);
    }
    return engine;
}

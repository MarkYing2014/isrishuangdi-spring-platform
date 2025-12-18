export const previewTheme = {
  background: "#f8fafc",
  grid: {
    major: "#cbd5e1",
    minor: "#e2e8f0",
  },
  lights: {
    ambient: 0.55,
    key: { position: [10, 30, 20] as const, intensity: 0.9 },
    fill: { position: [-15, -10, -10] as const, intensity: 0.25 },
    point: { position: [0, 50, 0] as const, intensity: 0.2 },
  },
  material: {
    spring: { metalness: 0.25, roughness: 0.65 },
    endCap: { color: "#94a3b8", metalness: 0.35, roughness: 0.55 },
    fea: { metalness: 0.15, roughness: 0.8 },
    groundShadow: { color: "#0f172a", opacity: 0.08 },
  },
} as const;

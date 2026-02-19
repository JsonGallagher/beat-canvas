export interface QualityConfig {
  pixelRatio: number;
  particleMultiplier: number;
  postProcess: boolean;
}

export const qualityTiers: Record<"low" | "medium" | "high", QualityConfig> = {
  low: { pixelRatio: 1, particleMultiplier: 0.5, postProcess: false },
  medium: { pixelRatio: 1.5, particleMultiplier: 1, postProcess: true },
  high: { pixelRatio: 2, particleMultiplier: 1.5, postProcess: true },
};

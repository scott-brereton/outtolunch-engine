import {
  MANIFEST,
  BRIEFING_SCHEMA,
  SECTION_SCHEMAS,
  CYCLES,
  CONFIDENCE,
  BRIEFING,
  SECTIONS,
  RENDER_HINTS,
} from "./_pack";

export interface Manifest {
  name: string;
  description: string;
  confidence_scoring: "enabled" | "disabled";
  staleness_hours?: number;
}

export interface Pack {
  manifest: Manifest;
  briefingSchema: unknown;
  sectionSchemas: Record<string, unknown>;
  cycles: { cycles: Record<string, CycleDef>; default_staleness_hours: number };
  confidence: ConfidenceConfig;
  briefing: Record<string, any>;
  sections: Record<string, any>;
  renderHints: Record<string, string>;
}

export interface CycleDef {
  description: string;
  depth: "full" | "update" | "verify" | "skip";
  sections: string[];
}

export interface ConfidenceConfig {
  auto_merge_threshold?: number;
  high_risk_threshold_bump?: { sections: string[]; threshold: number };
  stability_sensitive_sections?: string[];
  expected_delta_per_cycle?: Record<string, { max_changed_keys?: number }>;
  item_count_tolerance?: Record<string, { max_delta_pct?: number }>;
}

let cached: Pack | null = null;

export function getPack(): Pack {
  if (cached) return cached;
  cached = {
    manifest: MANIFEST as unknown as Manifest,
    briefingSchema: BRIEFING_SCHEMA,
    sectionSchemas: SECTION_SCHEMAS,
    cycles: CYCLES as { cycles: Record<string, CycleDef>; default_staleness_hours: number },
    confidence: CONFIDENCE as ConfidenceConfig,
    briefing: BRIEFING,
    sections: SECTIONS,
    renderHints: RENDER_HINTS,
  };
  return cached;
}

export function isConfidenceEnabled(): boolean {
  return getPack().manifest.confidence_scoring === "enabled";
}

import type { ConfidenceConfig } from "./pack-loader";
import { scanObject } from "./injection";

export interface Finding {
  rule: string;
  severity: "low" | "medium" | "high";
  detail: string;
}

export interface ConfidenceResult {
  score: number;
  findings: Finding[];
}

interface ScoreInput {
  prev: Record<string, any>;
  next: Record<string, any>;
  cycle: string;
  config: ConfidenceConfig;
}

const WEIGHTS = {
  delta_magnitude: 0.25,
  continuity: 0.25,
  item_count_tolerance: 0.15,
  injection_scan: 0.15,
} as const;

export function scoreConfidence(input: ScoreInput): ConfidenceResult {
  const { prev, next, cycle, config } = input;
  const findings: Finding[] = [];
  let score = 1.0;

  // Delta magnitude
  const expected = config.expected_delta_per_cycle?.[cycle];
  if (expected?.max_changed_keys != null) {
    const changedKeys = countChangedTopLevelKeys(prev, next);
    if (changedKeys > expected.max_changed_keys) {
      const overshoot = changedKeys / expected.max_changed_keys;
      score -= WEIGHTS.delta_magnitude * Math.min(1, overshoot);
      findings.push({
        rule: "delta_magnitude",
        // Binary-cliff penalty: this branch only fires when changedKeys > max,
        // i.e. overshoot > 1, so "medium" was unreachable.
        severity: "high",
        detail: `${changedKeys} top-level keys changed; cycle "${cycle}" expects max ${expected.max_changed_keys}.`,
      });
    }
  }

  // Continuity in stability-sensitive sections
  for (const section of config.stability_sensitive_sections ?? []) {
    const prevSec = prev?.[section];
    const nextSec = next?.[section];
    if (prevSec && nextSec && typeof prevSec === "object" && typeof nextSec === "object") {
      const broken = continuityBreak(prevSec, nextSec);
      if (broken > 0.5) {
        score -= WEIGHTS.continuity * broken;
        findings.push({
          rule: "continuity",
          severity: "high",
          detail: `${Math.round(broken * 100)}% of items in stability-sensitive section "${section}" changed identity.`,
        });
      }
    }
  }

  // Item-count tolerance
  for (const [section, tol] of Object.entries(config.item_count_tolerance ?? {})) {
    const prevArr = prev?.[section];
    const nextArr = next?.[section];
    if (Array.isArray(prevArr) && Array.isArray(nextArr) && tol.max_delta_pct != null) {
      const denom = Math.max(prevArr.length, 1);
      const pct = (Math.abs(nextArr.length - prevArr.length) / denom) * 100;
      if (pct > tol.max_delta_pct) {
        score -= WEIGHTS.item_count_tolerance * Math.min(1, (pct - tol.max_delta_pct) / 100);
        findings.push({
          rule: "item_count_tolerance",
          severity: pct > tol.max_delta_pct * 2 ? "high" : "medium",
          detail: `Section "${section}" changed item count by ${pct.toFixed(0)}% (tolerance ${tol.max_delta_pct}%).`,
        });
      }
    }
  }

  // Injection scan
  const injectionHits = scanObject(next);
  if (injectionHits.length > 0) {
    score -= WEIGHTS.injection_scan;
    findings.push({
      rule: "injection_scan",
      severity: "high",
      detail: `${injectionHits.length} injection pattern(s) detected.`,
    });
  }

  return { score: Math.max(0, score), findings };
}

function countChangedTopLevelKeys(a: Record<string, any>, b: Record<string, any>): number {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  let n = 0;
  for (const k of keys) {
    if (k.startsWith("_")) continue;
    if (JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k])) n++;
  }
  return n;
}

function continuityBreak(prev: any, next: any): number {
  if (Array.isArray(prev) && Array.isArray(next)) {
    const prevNames = new Set(prev.map(itemIdentity).filter(Boolean));
    const nextNames = new Set(next.map(itemIdentity).filter(Boolean));
    const carried = [...prevNames].filter((n) => nextNames.has(n)).length;
    const denom = Math.max(prevNames.size, 1);
    return 1 - carried / denom;
  }
  if (typeof prev === "object" && typeof next === "object") {
    const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
    let changed = 0;
    let total = 0;
    for (const k of keys) {
      if (k.startsWith("_")) continue;
      total++;
      if (JSON.stringify(prev[k]) !== JSON.stringify(next[k])) changed++;
    }
    return total === 0 ? 0 : changed / total;
  }
  return prev === next ? 0 : 1;
}

function itemIdentity(item: any): string | null {
  if (!item || typeof item !== "object") return null;
  return item.name ?? item.id ?? item.title ?? null;
}

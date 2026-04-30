#!/usr/bin/env tsx
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { scoreConfidence } from "../lib/confidence-rules";

const ROOT = process.cwd();
const PACK = join(ROOT, "pack");

const args = process.argv.slice(2);
const cycle = (args.find((a) => a.startsWith("--cycle="))?.split("=")[1]) ?? "default";

const manifest = JSON.parse(readFileSync(join(PACK, "manifest.json"), "utf-8"));
if (manifest.confidence_scoring !== "enabled") {
  console.log("confidence scoring disabled — passthrough");
  console.log(JSON.stringify({ score: 1.0, findings: [] }, null, 2));
  process.exit(0);
}

const confidenceConfig = existsSync(join(PACK, "CONFIDENCE.json"))
  ? JSON.parse(readFileSync(join(PACK, "CONFIDENCE.json"), "utf-8"))
  : {};

const briefingPath = join(PACK, "briefing.json");
if (!existsSync(briefingPath)) {
  console.error("confidence: pack/briefing.json missing");
  process.exit(1);
}
const next = JSON.parse(readFileSync(briefingPath, "utf-8"));

let prev: any = {};
try {
  const prevRaw = execSync("git show HEAD:pack/briefing.json", { stdio: ["pipe", "pipe", "pipe"] }).toString();
  prev = JSON.parse(prevRaw);
} catch {
  console.error("confidence: no previous pack/briefing.json in git; assuming first commit (score = 1.0)");
  console.log(JSON.stringify({ score: 1.0, findings: [{ rule: "first_run", severity: "low", detail: "no prior version" }] }, null, 2));
  process.exit(0);
}

const result = scoreConfidence({ prev, next, cycle, config: confidenceConfig });

const threshold = confidenceConfig.auto_merge_threshold ?? 0.85;
let effectiveThreshold = threshold;
const bump = confidenceConfig.high_risk_threshold_bump;
if (bump) {
  const changedHighRisk = bump.sections.some(
    (s: string) => JSON.stringify(prev?.[s]) !== JSON.stringify(next?.[s]),
  );
  if (changedHighRisk) effectiveThreshold = bump.threshold;
}

console.log(JSON.stringify({ ...result, threshold: effectiveThreshold, cycle }, null, 2));
if (result.score < effectiveThreshold) process.exit(2);

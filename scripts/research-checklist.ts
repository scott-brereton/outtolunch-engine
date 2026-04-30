#!/usr/bin/env tsx
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PACK = join(ROOT, "pack");

const args = process.argv.slice(2);
const cycle = args.find((a) => a.startsWith("--cycle="))?.split("=")[1];

if (!cycle) {
  console.error("usage: tsx scripts/research-checklist.ts --cycle=<id>");
  process.exit(1);
}

if (!existsSync(PACK)) {
  console.error("research-checklist: pack/ not found.");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(PACK, "manifest.json"), "utf-8"));
const cycles = JSON.parse(readFileSync(join(PACK, "cycles.json"), "utf-8")).cycles;
const def = cycles[cycle];

if (!def) {
  console.error(`research-checklist: unknown cycle "${cycle}". Available: ${Object.keys(cycles).join(", ")}`);
  process.exit(1);
}

const system = existsSync(join(PACK, "SYSTEM.md")) ? readFileSync(join(PACK, "SYSTEM.md"), "utf-8") : "";
const research = existsSync(join(PACK, "RESEARCH.md")) ? readFileSync(join(PACK, "RESEARCH.md"), "utf-8") : "";

let referenceList = "";
const refDir = join(PACK, "reference");
if (existsSync(refDir)) {
  const files = readdirSync(refDir);
  if (files.length > 0) {
    referenceList = "\n## Pre-fetched reference data\n\n" + files.map((f) => `- pack/reference/${f}`).join("\n") + "\n";
  }
}

const out = `# Research checklist — ${manifest.name}

**Cycle:** ${cycle} (${def.depth})
**Description:** ${def.description}

## Agent role

${system}

## Engine-level pre-research checks

- [ ] Hit \`GET /feedback\` with \`Authorization: Bearer $ADMIN_KEY\` or \`X-Admin-Key: $ADMIN_KEY\`. Review pending entries. Note any that align with research findings.
- [ ] Confirm \`pack/manifest.json\` has the expected pack name (sanity check you're working in the right repo).

## Sections this cycle covers

${def.sections.length === 0 ? "_(no sections — this cycle is a no-op)_" : def.sections.map((s: string) => `- ${s} (${def.depth})`).join("\n")}

## Cycle playbook

${research}
${referenceList}

## Engine-level post-research checks

- [ ] Run \`npm run validate\`. Fix any schema or injection findings before proceeding.
- [ ] Run \`npm run confidence -- --cycle=${cycle}\`. ${manifest.confidence_scoring === "enabled" ? "If exit code is non-zero, open a PR for human review instead of auto-merging." : "Passthrough mode — score is informational only."}
- [ ] Run \`npm run bundle-pack\`. Confirm \`lib/_pack.ts\` regenerated.
- [ ] Commit \`pack/briefing.json\` and any modified \`pack/sections/*.json\`.
`;

console.log(out);

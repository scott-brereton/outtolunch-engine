#!/usr/bin/env tsx
import Ajv from "../lib/ajv-stub";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { scanText } from "../lib/injection";

const ROOT = process.cwd();
const PACK = join(ROOT, "pack");

if (!existsSync(PACK)) {
  console.error("validate: pack/ not found. Copy a starter pack from packs/ first.");
  process.exit(1);
}

const briefingMeta = JSON.parse(readFileSync(join(ROOT, "briefing.schema.meta.json"), "utf-8"));
const sectionMeta = JSON.parse(readFileSync(join(ROOT, "sections/schema.meta.json"), "utf-8"));
const briefingSchema = JSON.parse(readFileSync(join(PACK, "briefing.schema.json"), "utf-8"));

const ajv = new Ajv({ strict: false });

let failed = false;

// 1. Pack's briefing schema must satisfy meta-schema
{
  const ok = ajv.compile(briefingMeta)(briefingSchema);
  if (!ok) {
    failed = true;
    console.error("validate: pack/briefing.schema.json fails meta-schema:", ajv.errorsText());
  }
}

// 2. Each section schema must satisfy meta-schema
const sectionSchemaDir = join(PACK, "sections/schema");
if (existsSync(sectionSchemaDir)) {
  for (const f of readdirSync(sectionSchemaDir)) {
    if (extname(f) !== ".json") continue;
    const schema = JSON.parse(readFileSync(join(sectionSchemaDir, f), "utf-8"));
    const ok = ajv.compile(sectionMeta)(schema);
    if (!ok) {
      failed = true;
      console.error(`validate: pack/sections/schema/${f} fails meta-schema:`, ajv.errorsText());
    }
  }
}

// 3. Briefing data validates against pack briefing schema
const briefingPath = existsSync(join(PACK, "briefing.json"))
  ? join(PACK, "briefing.json")
  : join(PACK, "briefing.example.json");
if (existsSync(briefingPath)) {
  const briefing = JSON.parse(readFileSync(briefingPath, "utf-8"));
  const ok = ajv.compile(briefingSchema)(briefing);
  if (!ok) {
    failed = true;
    console.error("validate: briefing data fails schema:", ajv.errorsText());
  }
  // Injection scan on all string fields
  const hits = scanAllStrings(briefing);
  if (hits.length > 0) {
    failed = true;
    console.error(`validate: ${hits.length} injection pattern(s) in briefing:`, hits);
  }
}

// 4. Section data files validate against their schemas
if (existsSync(join(PACK, "sections"))) {
  for (const f of readdirSync(join(PACK, "sections"))) {
    if (!f.endsWith(".json") || f === "schema") continue;
    const isExample = f.endsWith(".example.json");
    const name = isExample ? f.replace(/\.example\.json$/, "") : basename(f, ".json");
    const schemaPath = join(PACK, "sections/schema", `${name}.json`);
    if (!existsSync(schemaPath)) continue;
    const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
    const data = JSON.parse(readFileSync(join(PACK, "sections", f), "utf-8"));
    const ok = ajv.compile(schema)(data);
    if (!ok) {
      failed = true;
      console.error(`validate: section ${name} fails schema:`, ajv.errorsText());
    }
    const hits = scanAllStrings(data);
    if (hits.length > 0) {
      failed = true;
      console.error(`validate: ${hits.length} injection pattern(s) in section ${name}:`, hits);
    }
  }
}

if (failed) {
  console.error("validate: FAILED");
  process.exit(1);
}
console.log("validate: OK");

function scanAllStrings(value: any): string[] {
  const hits: string[] = [];
  function walk(v: any) {
    if (typeof v === "string") {
      hits.push(...scanText(v));
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  }
  walk(value);
  return hits;
}

#!/usr/bin/env tsx
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";

const ROOT = process.cwd();
const PACK = join(ROOT, "pack");

if (!existsSync(PACK)) {
  console.error("review: pack/ not found.");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(PACK, "manifest.json"), "utf-8"));
const briefing = JSON.parse(readFileSync(join(PACK, "briefing.json"), "utf-8"));

let sections = "";
const secDir = join(PACK, "sections");
if (existsSync(secDir)) {
  for (const f of readdirSync(secDir)) {
    if (!f.endsWith(".json") || f === "schema") continue;
    const data = JSON.parse(readFileSync(join(secDir, f), "utf-8"));
    sections += `<h2>section: ${basename(f, ".json")}</h2><pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
  }
}

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>review — ${escapeHtml(manifest.name)}</title>
<style>body{font:14px/1.5 system-ui;max-width:960px;margin:2em auto;padding:0 1em}pre{background:#f5f5f5;padding:1em;overflow:auto}</style>
</head><body>
<h1>${escapeHtml(manifest.name)}</h1>
<p>${escapeHtml(manifest.description)}</p>
<h2>briefing</h2>
<pre>${escapeHtml(JSON.stringify(briefing, null, 2))}</pre>
${sections}
</body></html>`;

writeFileSync(join(ROOT, "review.html"), html);
console.log("review: wrote review.html");

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  existsSync,
  readFileSync,
  rmSync,
  mkdirSync,
  mkdtempSync,
  cpSync,
  writeFileSync,
} from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..");
const EXAMPLE = path.join(REPO_ROOT, "examples/minimal");

let workdir: string;
let packDir: string;
let outPath: string;

beforeEach(() => {
  workdir = mkdtempSync(path.join(tmpdir(), "outtolunch-engine-test-"));
  packDir = path.join(workdir, "pack");
  outPath = path.join(workdir, "_pack.ts");
});

afterEach(() => {
  if (existsSync(workdir)) rmSync(workdir, { recursive: true, force: true });
});

function bootstrapMinimal() {
  mkdirSync(packDir, { recursive: true });
  cpSync(EXAMPLE, packDir, { recursive: true });
}

function runBundler() {
  execSync("npx tsx scripts/bundle-pack.ts", {
    cwd: REPO_ROOT,
    env: { ...process.env, PACK_DIR: packDir, OUT_PATH: outPath },
    stdio: "pipe",
  });
}

describe("bundle-pack", () => {
  it("generates lib/_pack.ts with manifest, schemas, cycles, confidence, briefing example, and section examples", () => {
    bootstrapMinimal();
    runBundler();
    expect(existsSync(outPath)).toBe(true);
    const generated = readFileSync(outPath, "utf-8");
    expect(generated).toContain("export const MANIFEST");
    expect(generated).toContain("export const BRIEFING_SCHEMA");
    expect(generated).toContain("export const SECTION_SCHEMAS");
    expect(generated).toContain("export const CYCLES");
    expect(generated).toContain("export const CONFIDENCE");
    expect(generated).toContain("export const BRIEFING");
    expect(generated).toContain("export const SECTIONS");
    expect(generated).toContain("export const RENDER_HINTS");
    expect(generated).toContain("Minimal Example");
  });

  it("errors clearly when pack is missing", () => {
    let threw = false;
    try {
      runBundler();
    } catch (e: any) {
      threw = true;
      expect(e.stderr.toString()).toMatch(/no pack/i);
    }
    expect(threw).toBe(true);
  });

  it("errors with file path when JSON is malformed", () => {
    bootstrapMinimal();
    writeFileSync(path.join(packDir, "manifest.json"), "{");
    let threw = false;
    try {
      runBundler();
    } catch (e: any) {
      threw = true;
      expect(e.stderr.toString()).toMatch(/malformed JSON/i);
      expect(e.stderr.toString()).toContain("manifest.json");
    }
    expect(threw).toBe(true);
  });

  it("errors clearly when a required pack file is missing", () => {
    bootstrapMinimal();
    rmSync(path.join(packDir, "cycles.json"));
    let threw = false;
    try {
      runBundler();
    } catch (e: any) {
      threw = true;
      expect(e.stderr.toString()).toMatch(/missing required file/i);
      expect(e.stderr.toString()).toContain("cycles.json");
    }
    expect(threw).toBe(true);
  });
});

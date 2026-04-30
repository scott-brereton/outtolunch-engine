import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, rmSync, mkdirSync, cpSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..");

describe("pack-loader", () => {
  beforeAll(() => {
    const pack = path.join(REPO_ROOT, "pack");
    if (existsSync(pack)) rmSync(pack, { recursive: true });
    mkdirSync(pack, { recursive: true });
    cpSync(path.join(REPO_ROOT, "examples/minimal"), pack, { recursive: true });
    execSync("npx tsx scripts/bundle-pack.ts", { cwd: REPO_ROOT });
  });

  it("loads manifest from generated pack module", async () => {
    const { getPack } = await import("../lib/pack-loader");
    const pack = getPack();
    expect(pack.manifest.name).toBe("Minimal Example");
    expect(pack.manifest.confidence_scoring).toBe("disabled");
  });

  it("exposes briefing schema and section schemas", async () => {
    const { getPack } = await import("../lib/pack-loader");
    const pack = getPack();
    expect(pack.briefingSchema).toBeDefined();
    expect(pack.sectionSchemas).toBeDefined();
  });

  it("exposes cycles config", async () => {
    const { getPack } = await import("../lib/pack-loader");
    const pack = getPack();
    expect(pack.cycles.cycles.daily).toBeDefined();
  });

  it("exposes briefing data (from briefing.json or briefing.example.json)", async () => {
    const { getPack } = await import("../lib/pack-loader");
    const pack = getPack();
    expect(pack.briefing._meta.pack_name).toBe("Minimal Example");
  });

  it("indicates confidence scoring disabled", async () => {
    const { isConfidenceEnabled } = await import("../lib/pack-loader");
    expect(isConfidenceEnabled()).toBe(false);
  });
});

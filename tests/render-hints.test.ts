import { describe, it, expect } from "vitest";
import { applyRenderHint } from "../lib/render-hints";

describe("applyRenderHint", () => {
  it("substitutes simple {{key}} from data", () => {
    const tpl = "Hello {{name}}";
    const out = applyRenderHint(tpl, { name: "Alex" });
    expect(out).toBe("Hello Alex");
  });

  it("iterates over arrays with {{#data}}...{{/data}}", () => {
    const tpl = "{{#data}}- {{name}} ({{role}})\n{{/data}}";
    const out = applyRenderHint(tpl, {
      data: [
        { name: "Alex", role: "VP" },
        { name: "Sam", role: "Eng" },
      ],
    });
    expect(out).toContain("- Alex (VP)");
    expect(out).toContain("- Sam (Eng)");
  });

  it("conditionally includes {{#field}}{{/field}} when present", () => {
    const tpl = "{{#data}}- {{name}}{{#reason}}, {{reason}}{{/reason}}\n{{/data}}";
    const out = applyRenderHint(tpl, {
      data: [
        { name: "Alex", reason: "PTO" },
        { name: "Sam" },
      ],
    });
    expect(out).toContain("- Alex, PTO");
    expect(out).toContain("- Sam");
    expect(out).not.toContain("Sam, ");
  });

  it("returns empty string for missing top-level key", () => {
    const tpl = "{{missing}}";
    const out = applyRenderHint(tpl, {});
    expect(out).toBe("");
  });
});

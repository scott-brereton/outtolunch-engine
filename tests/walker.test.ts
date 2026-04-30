import { describe, it, expect } from "vitest";
import { walkToMarkdown, walkToNano } from "../lib/walker";

describe("walkToMarkdown (compact)", () => {
  it("renders flat object as headings + bullets", () => {
    const md = walkToMarkdown({ status: "green", count: 3 });
    expect(md).toContain("## status");
    expect(md).toContain("green");
    expect(md).toContain("## count");
    expect(md).toContain("3");
  });

  it("renders nested object with sub-headings", () => {
    const md = walkToMarkdown({ team: { lead: "Alex", size: 5 } });
    expect(md).toContain("## team");
    expect(md).toContain("- lead: Alex");
    expect(md).toContain("- size: 5");
  });

  it("renders array of strings as bullets", () => {
    const md = walkToMarkdown({ priorities: ["ship v2", "hire", "fundraise"] });
    expect(md).toContain("- ship v2");
    expect(md).toContain("- hire");
    expect(md).toContain("- fundraise");
  });

  it("renders array of objects as bullet groups", () => {
    const md = walkToMarkdown({
      people: [{ name: "Alex", role: "VP" }, { name: "Sam", role: "Eng" }],
    });
    expect(md).toMatch(/-\s*name: Alex/);
    expect(md).toMatch(/role: VP/);
    expect(md).toMatch(/-\s*name: Sam/);
  });

  it("skips _meta keys at top level", () => {
    const md = walkToMarkdown({ _meta: { secret: "x" }, public: "ok" });
    expect(md).not.toContain("secret");
    expect(md).toContain("public");
  });
});

describe("walkToNano", () => {
  it("produces one line per top-level key", () => {
    const out = walkToNano({ a: 1, b: 2, c: 3 });
    const lines = out.trim().split("\n").filter(Boolean);
    expect(lines.length).toBe(3);
  });

  it("collapses nested objects to inline summary", () => {
    const out = walkToNano({ team: { lead: "Alex", size: 5 } });
    expect(out).toMatch(/team:.*lead.*Alex.*size.*5/);
  });

  it("truncates long arrays with count suffix", () => {
    const out = walkToNano({ tags: ["a", "b", "c", "d", "e", "f", "g"] });
    expect(out).toMatch(/tags:.*\(7 items\)|tags:.*\+\d+ more/);
  });
});

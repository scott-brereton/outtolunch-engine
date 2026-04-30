import { describe, it, expect } from "vitest";
import { computeIntegrity } from "../lib/integrity";

describe("integrity", () => {
  it("produces a deterministic SHA-256 of canonical JSON", async () => {
    const a = await computeIntegrity({ a: 1, b: 2 });
    const b = await computeIntegrity({ b: 2, a: 1 });
    expect(a).toBe(b);
    expect(a).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("differs when content differs", async () => {
    const a = await computeIntegrity({ x: 1 });
    const b = await computeIntegrity({ x: 2 });
    expect(a).not.toBe(b);
  });

  it("preserves nested key ordering", async () => {
    const a = await computeIntegrity({ outer: { a: 1, b: 2 } });
    const b = await computeIntegrity({ outer: { b: 2, a: 1 } });
    expect(a).toBe(b);
  });

  it("preserves array order", async () => {
    const a = await computeIntegrity([1, 2]);
    const b = await computeIntegrity([2, 1]);
    expect(a).not.toBe(b);
  });
});

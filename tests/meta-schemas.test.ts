import { describe, it, expect } from "vitest";
import Ajv from "ajv";
import briefingMeta from "../briefing.schema.meta.json";
import sectionMeta from "../sections/schema.meta.json";

describe("briefing meta-schema", () => {
  const ajv = new Ajv({ strict: false });
  const validate = ajv.compile(briefingMeta);

  it("accepts a minimal valid pack briefing schema", () => {
    const packBriefingSchema = {
      type: "object",
      required: ["_meta"],
      properties: {
        _meta: { type: "object" },
        people_on_vacation: { type: "array" },
      },
    };
    expect(validate(packBriefingSchema)).toBe(true);
  });

  it("rejects a top-level array", () => {
    const bad = { type: "array" };
    expect(validate(bad)).toBe(false);
  });

  it("rejects a schema that omits _meta", () => {
    const bad = {
      type: "object",
      required: [],
      properties: { stuff: { type: "string" } },
    };
    expect(validate(bad)).toBe(false);
  });

  it("rejects a briefing schema that declares _integrity as a user property", () => {
    const bad = {
      type: "object",
      required: ["_meta"],
      properties: {
        _meta: { type: "object" },
        _integrity: { type: "string" },
      },
    };
    expect(validate(bad)).toBe(false);
  });

  it("rejects a briefing schema that declares _pack as a user property", () => {
    const bad = {
      type: "object",
      required: ["_meta"],
      properties: {
        _meta: { type: "object" },
        _pack: { type: "object" },
      },
    };
    expect(validate(bad)).toBe(false);
  });
});

describe("section meta-schema", () => {
  const ajv = new Ajv({ strict: false });
  const validate = ajv.compile(sectionMeta);

  it("accepts a minimal valid section schema", () => {
    const sectionSchema = {
      type: "object",
      required: ["_meta", "data"],
      properties: {
        _meta: { type: "object" },
        data: { type: "object" },
      },
    };
    expect(validate(sectionSchema)).toBe(true);
  });

  it("rejects a section schema without `data`", () => {
    const bad = {
      type: "object",
      required: ["_meta"],
      properties: { _meta: { type: "object" } },
    };
    expect(validate(bad)).toBe(false);
  });

  it("rejects a section schema that declares _integrity as a user property", () => {
    const bad = {
      type: "object",
      required: ["_meta", "data"],
      properties: {
        _meta: { type: "object" },
        data: { type: "object" },
        _integrity: { type: "string" },
      },
    };
    expect(validate(bad)).toBe(false);
  });
});

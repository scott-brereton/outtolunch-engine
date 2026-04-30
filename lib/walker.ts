type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function isPlainObject(v: unknown): v is Record<string, Json> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function fmtPrimitive(v: Json): string {
  if (v === null) return "null";
  if (typeof v === "string") return v;
  return String(v);
}

export function walkToMarkdown(data: Json, opts: { skipKeys?: string[] } = {}): string {
  const skip = new Set(opts.skipKeys ?? ["_meta"]);
  if (!isPlainObject(data)) return fmtPrimitive(data);

  const out: string[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (skip.has(key)) continue;
    out.push(`## ${key}`);
    out.push(walkValue(val));
    out.push("");
  }
  return out.join("\n").trim() + "\n";
}

function walkValue(v: Json): string {
  if (v === null || v === undefined) return "_(none)_";
  if (typeof v !== "object") return fmtPrimitive(v as Json);
  if (Array.isArray(v)) return walkArray(v);
  return walkObject(v as Record<string, Json>);
}

function walkArray(arr: Json[]): string {
  if (arr.length === 0) return "_(empty)_";
  const lines: string[] = [];
  for (const item of arr) {
    if (isPlainObject(item)) {
      const entries = Object.entries(item);
      if (entries.length === 0) {
        lines.push("- _(empty)_");
        continue;
      }
      const [firstK, firstV] = entries[0];
      lines.push(`- ${firstK}: ${primOrInline(firstV)}`);
      for (const [k, val] of entries.slice(1)) {
        lines.push(`  ${k}: ${primOrInline(val)}`);
      }
    } else {
      lines.push(`- ${fmtPrimitive(item)}`);
    }
  }
  return lines.join("\n");
}

function walkObject(obj: Record<string, Json>): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (isPlainObject(v) || Array.isArray(v)) {
      lines.push(`- ${k}:`);
      const nested = walkValue(v);
      for (const line of nested.split("\n")) {
        lines.push(`  ${line}`);
      }
    } else {
      lines.push(`- ${k}: ${fmtPrimitive(v)}`);
    }
  }
  return lines.join("\n");
}

function primOrInline(v: Json): string {
  if (v === null || v === undefined) return "_(none)_";
  if (typeof v !== "object") return fmtPrimitive(v as Json);
  if (Array.isArray(v)) return `(${v.length} items)`;
  const keys = Object.keys(v as object);
  return `{${keys.join(", ")}}`;
}

export function walkToNano(data: Json): string {
  if (!isPlainObject(data)) return fmtPrimitive(data) + "\n";
  const out: string[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (key === "_meta") continue;
    out.push(`${key}: ${nanoValue(val)}`);
  }
  return out.join("\n") + "\n";
}

function nanoValue(v: Json): string {
  if (v === null || v === undefined) return "(none)";
  if (typeof v !== "object") return fmtPrimitive(v as Json);
  if (Array.isArray(v)) {
    if (v.length <= 5) return v.map(nanoValue).join(", ");
    return `(${v.length} items)`;
  }
  const entries = Object.entries(v as object);
  return entries.map(([k, val]) => `${k}=${nanoInner(val as Json)}`).join(", ");
}

function nanoInner(v: Json): string {
  if (v === null || v === undefined) return "(none)";
  if (typeof v !== "object") return fmtPrimitive(v as Json);
  if (Array.isArray(v)) return `(${v.length})`;
  return "{...}";
}

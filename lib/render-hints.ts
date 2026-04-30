/**
 * Minimal Mustache-like template engine for pack render hints.
 *
 * Supported:
 *   - {{key}}                       — value substitution (skipped if null/undefined)
 *   - {{#section}}...{{/section}}   — array iteration + truthy conditional sections
 *
 * Known limitations (intentional, to keep this small):
 *   - No partials, helpers, or HTML escaping
 *   - No parent-scope context stack: inside {{#section}} the inner ctx replaces parent ctx
 *   - For nested same-key sections, tpl.indexOf(endTag) finds the FIRST close tag,
 *     so {{#a}}{{#a}}x{{/a}}{{/a}} does the wrong thing
 *   - 0 is treated as truthy for section conditionals (Mustache spec says it's falsy);
 *     "" and null/undefined/false are correctly treated as falsy
 */

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

export function applyRenderHint(template: string, data: Record<string, Json>): string {
  return renderBlock(template, data);
}

function renderBlock(tpl: string, ctx: Record<string, Json>): string {
  let out = "";
  let i = 0;
  while (i < tpl.length) {
    const open = tpl.indexOf("{{", i);
    if (open === -1) {
      out += tpl.slice(i);
      break;
    }
    out += tpl.slice(i, open);
    const close = tpl.indexOf("}}", open);
    if (close === -1) {
      out += tpl.slice(open);
      break;
    }
    const tag = tpl.slice(open + 2, close).trim();
    if (tag.startsWith("#")) {
      const key = tag.slice(1).trim();
      const endTag = `{{/${key}}}`;
      const endIdx = tpl.indexOf(endTag, close + 2);
      if (endIdx === -1) {
        i = close + 2;
        continue;
      }
      const inner = tpl.slice(close + 2, endIdx);
      const val = ctx[key];
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item !== null && typeof item === "object" && !Array.isArray(item)) {
            out += renderBlock(inner, item as Record<string, Json>);
          } else {
            out += renderBlock(inner, { ".": item } as Record<string, Json>);
          }
        }
      } else if (val !== null && val !== undefined && val !== false && val !== "") {
        if (typeof val === "object" && !Array.isArray(val)) {
          out += renderBlock(inner, val as Record<string, Json>);
        } else {
          out += renderBlock(inner, ctx);
        }
      }
      i = endIdx + endTag.length;
    } else if (tag.startsWith("/")) {
      i = close + 2;
    } else {
      const v = ctx[tag];
      if (v !== undefined && v !== null) {
        out += String(v);
      }
      i = close + 2;
    }
  }
  return out;
}

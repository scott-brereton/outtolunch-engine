/**
 * Prompt injection detection — shared between build-time validation and runtime filtering.
 *
 * These patterns detect common LLM prompt injection techniques. They're intentionally
 * conservative (few false positives on factual content about world events). The patterns
 * are public and documented — security through transparency, not obscurity.
 */

export const INJECTION_PATTERNS: { pattern: RegExp; label: string }[] = [
  // Direct instruction overrides
  { pattern: /ignore (all |previous |prior |above |my )?(instructions|prompts|rules|guidelines)/i, label: "instruction override" },
  { pattern: /disregard (all |your |previous |above )?(instructions|prompts|rules|guidelines)/i, label: "instruction override" },
  { pattern: /forget (everything|all|your) (previous |prior )?(instructions|context|training)/i, label: "memory manipulation" },
  { pattern: /override (your|all|the) (instructions|rules|guidelines|safety)/i, label: "instruction override" },
  { pattern: /new instructions:?\s/i, label: "instruction injection" },
  // Identity manipulation
  { pattern: /you are now (a |an |my )/i, label: "identity manipulation" },
  { pattern: /pretend (you are|to be|you're) (a |an |my )/i, label: "roleplay directive" },
  { pattern: /roleplay as/i, label: "roleplay directive" },
  // LLM framing tokens / system-level delimiters
  { pattern: /\[system\]/i, label: "system tag" },
  { pattern: /\[INST\]/i, label: "instruction tag" },
  { pattern: /<<SYS>>/i, label: "system delimiter" },
  { pattern: /<\|im_start\|>/i, label: "chat template token" },
  { pattern: /<\|endoftext\|>/i, label: "end-of-text token" },
  // Code/script injection
  { pattern: /<\/?script/i, label: "script tag" },
  // Explicit attack language
  { pattern: /jailbreak/i, label: "jailbreak reference" },
  { pattern: /prompt injection/i, label: "injection reference" },
  { pattern: /ignore safety/i, label: "safety override" },
];

/**
 * Scan a string for injection patterns.
 * Returns array of matches (empty = clean).
 */
export function scanText(text: string): { label: string; pattern: string }[] {
  const matches: { label: string; pattern: string }[] = [];
  for (const { pattern, label } of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      matches.push({ label, pattern: pattern.source });
    }
  }
  return matches;
}

/**
 * Recursively scan all string values in an object.
 * Returns field paths where injection patterns were found.
 */
export function scanObject(obj: unknown, path = ""): { path: string; label: string }[] {
  const results: { path: string; label: string }[] = [];
  if (typeof obj === "string") {
    for (const match of scanText(obj)) {
      results.push({ path, label: match.label });
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      results.push(...scanObject(item, `${path}[${i}]`));
    });
  } else if (obj && typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      results.push(...scanObject(value, path ? `${path}.${key}` : key));
    }
  }
  return results;
}

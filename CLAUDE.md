# CLAUDE.md — outtolunch-engine

Architecture brief for AI agents working on the engine itself (not on a forker's pack).

## What this is

A headless Cloudflare Workers engine. Forkers add a `pack/` directory; the engine serves that pack's content via HTTP, MCP, and Markdown formatters. The engine ships zero domain content — every concrete fact lives in a pack.

## Key files

- `worker/index.ts` — request handler, MCP wiring, no site mount
- `lib/pack-loader.ts` — boot-time accessor for the bundled pack
- `lib/walker.ts` — generic Markdown serializer for `/compact` and `/nano`
- `lib/render-hints.ts` — minimal Mustache substitution for per-section overrides
- `lib/confidence-rules.ts` — generic scoring rules (delta, continuity, item-count, injection)
- `lib/injection.ts` — pattern detection for prompt injection (always on)
- `lib/integrity.ts` — SHA-256 of canonical JSON (always on)
- `scripts/bundle-pack.ts` — reads `pack/`, emits `lib/_pack.ts` (build step)
- `scripts/validate.ts` — meta-schema check + injection scan
- `scripts/confidence.ts` — flag-aware; passthrough when disabled
- `scripts/research-checklist.ts` — emits Markdown checklist from pack
- `briefing.schema.meta.json`, `sections/schema.meta.json` — what every pack's schemas must look like

## Build flow

```
pack/ -> npm run bundle-pack -> lib/_pack.ts -> wrangler bundles -> deployed worker
```

`lib/_pack.ts` is gitignored. It's regenerated on every build.

## Adding a new endpoint

Add the route in `worker/index.ts`. If it returns briefing-shaped JSON, include the integrity headers via `briefingHeaders()`. If it accepts user input, scan the input via `scanText()` from `lib/injection.ts`.

## Adding a new confidence rule

Add it to `lib/confidence-rules.ts`. Update the test in `tests/confidence-rules.test.ts`. Document the configuration surface (any new `pack/CONFIDENCE.json` field) in `SETUP.md`.

## What NOT to add

- Site rendering / HTML / marketing copy. The engine is headless. The marketing site for outtolunch.app lives in the private repo only.
- Programmatic data adapters (Slack/Salesforce SDK code). The engine doesn't pull data; the research agent does, via MCP.
- World-events specifics (`leaders`, `conflicts`, `fda_approvals`). Those live in the private outtolunch.app pack.

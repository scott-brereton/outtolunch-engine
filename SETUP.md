# Setup playbook (read this first if you're an LLM helping a user configure outtolunch-engine)

You're a setup LLM helping a human configure this engine for their org. The user has cloned the repo and is sitting next to you. Walk them through these steps.

## Step 1: Pick a starter pack

Show them the three packs:
- `internal-ops` — leadership, vacation, hires, priorities, incidents, internal tool versions, corrections, upcoming events. **Default recommendation for most orgs.**
- `sales-revops` — pipeline-focused. Recommend if they're building agents for AEs, CSMs, or sales leadership.
- `eng-platform` — service-ownership and deploy-state-focused. Recommend for DevEx/Platform teams.

Default to internal-ops unless they tell you otherwise.

```bash
cp -R packs/internal-ops/. pack/
cp pack/briefing.example.json pack/briefing.json
```

## Step 2: Tailor the manifest

Open `pack/manifest.json`. Ask:
- Their org name. Set `name: "${COMPANY} Internal Briefing"`.
- Description: one sentence that names a few sections specifically.
- Are the data sources interpretive (Slack messages, web research) or systems of record (HRIS, ticketing, CRM)?
  - Systems of record → `confidence_scoring: disabled` (default).
  - Any interpretive sources → `confidence_scoring: enabled` and walk through `pack/CONFIDENCE.json` thresholds.

## Step 3: Tailor the schemas

Open `pack/briefing.schema.json` and `pack/sections/schema/*.json`. Ask whether each section's fields fit their org. Add fields they need; remove ones they don't. Keep the meta-schema rules: top-level `_meta` required, sections need `_meta + data`.

If they want a section that doesn't exist, add it: schema in `pack/sections/schema/<name>.json`, an example in `pack/sections/<name>.example.json`, mention it in `briefing.schema.json`.

## Step 4: Tailor the cycles

Open `pack/cycles.json`. Ask:
- How often does this data change? Daily is enough for most orgs.
- Do they have any data that changes hourly during business hours (active incidents, current priorities)?
- Anything they only want to verify weekly (internal tool versions, corrections)?

Remove cycles they don't need.

## Step 5: Tailor the research playbook

Open `pack/SYSTEM.md` and `pack/RESEARCH.md`. Replace generic instructions with their actual tools. "Pull from your HRIS" -> "Pull from Workday via the @workday/mcp server." Specific tool names help the research agent be precise.

## Step 6: Render-hint review

Run `npm run bundle-pack && npm run deploy --dry-run` and curl `/compact`. For each section, ask whether the format reads well. If not, write `pack/render-hints/<section>.md` with a Mustache template. There are examples in `packs/internal-ops/render-hints/` to copy from.

## Step 7: Pick an orchestration pattern

Three options, ordered by complexity:
1. **Manual** — they run `npm run checklist -- --cycle=daily` themselves, paste the output into Claude Code, follow it. Good for org sizes where one person owns the briefing.
2. **Scheduled Claude Code triggers** — see `~/.claude/scheduled` patterns. The agent fires on cron, runs the checklist, commits.
3. **GitHub Actions** — workflow on a schedule, calls Claude API with the checklist, opens a PR.

Default to (1) for the first 2 weeks while they validate the pack covers what they need. Move to (2) or (3) once it's working.

## Step 8: Deploy

```bash
wrangler kv namespace create FEEDBACK    # if not done
wrangler secret put ADMIN_KEY            # if not done
npm run validate
npm run deploy
```

Verify `/health` returns `status: "fresh"`. Done.

## Optional: lock it to internal users with SSO

For internal data, recommend SSO rather than a shared API key. The easiest Cloudflare-native path is Cloudflare Access:

1. In Cloudflare Zero Trust, create a self-hosted Access application for the deployed Worker hostname.
2. Add an Allow policy for the org's IdP users, groups, or email domain.
3. Copy the Application Audience (AUD) Tag and add Worker vars:

```toml
[vars]
AUTH_MODE = "cloudflare_access"
ACCESS_TEAM_DOMAIN = "your-team.cloudflareaccess.com"
ACCESS_AUD = "your-access-application-aud-tag"
AUTH_ALLOWED_DOMAINS = "acme.org"
```

4. Deploy again. The Worker now validates the Cloudflare Access JWT before serving `/`, `/compact`, `/nano`, `/sections`, `/feedback`, or `/mcp`.
5. For non-human MCP clients, create a Cloudflare Access service token and set `AUTH_ALLOW_MACHINE_TOKENS = "true"`. Rotate these like API keys; they do not identify an individual user.

For non-Cloudflare SSO, use the portable OIDC mode:

```toml
[vars]
AUTH_MODE = "oidc_jwt"
OIDC_ISSUER = "https://issuer.example.com"
OIDC_AUDIENCE = "your-api-audience-or-client-id"
AUTH_ALLOWED_DOMAINS = "acme.org"
```

See `AUTH.md` for static bearer tokens and portability notes.

## A note on `wrangler.toml` compatibility flags

The engine's MCP wiring imports `agents/mcp`, which depends on Node built-ins (`node:async_hooks`, `node:buffer`, etc.). Cloudflare Workers only expose those when `nodejs_compat` is enabled.

Every starter pack's `wrangler.toml.example` already includes:

```toml
compatibility_flags = ["nodejs_compat"]
```

**Keep it.** If you copy `wrangler.toml.example` to `wrangler.toml` and strip this line out, your deploy will fail at bundle time with errors about missing Node modules. If you're authoring a `wrangler.toml` from scratch, add the flag yourself — the engine will not boot without it.

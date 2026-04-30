# Self-hosting outtolunch-engine

This guide is for orgs running their own internal briefing. If you want a quick demo against the canonical world-events deployment, see [outtolunch.app](https://outtolunch.app) — but the engine is meant to be forked for your own data.

## Why you'd run your own

Your org has internal jargon, product names, leadership transitions, and active incidents that no public feed will cover. A private outtolunch-engine means your AI agents know that "Atlas" is your payments service, that the CEO handoff happened last quarter, and that the mobile SDK is on v4.2 not v3.1.

A UK team probably wants Bank of England rates instead of the Fed; the engine is generic enough that "rates" can be whatever your org cares about. A healthcare team might only want FDA approvals and clinical guidelines. A finance team only wants central banks and commodities. Same engine, different pack.

Some orgs can't have AI agents touch external APIs at all — privacy regulations, classified workloads. Self-hosting inside your own Cloudflare account keeps the data path internal.

## What you need

- A Cloudflare account (free tier is fine) with Workers and KV enabled
- Node 20 or newer
- The `wrangler` CLI (`npm install -g wrangler`)
- Whatever AI agent will run the research cycles (Claude Code, Cursor, GitHub Actions calling Claude API, etc.)

## Setup

See [README.md](README.md) for the quick start. The deeper setup walkthrough is in [SETUP.md](SETUP.md), which the setup LLM reads when configuring the pack.

```bash
git clone https://github.com/scott-brereton/outtolunch-engine.git my-briefing
cd my-briefing
npm install
cp -R packs/internal-ops/. pack/
cp pack/briefing.example.json pack/briefing.json

# Edit wrangler.toml.example -> wrangler.toml.
# Create your KV namespace.
wrangler kv namespace create FEEDBACK

# Set the admin key.
wrangler secret put ADMIN_KEY

npm run validate
npm run deploy
```

## Private access with SSO

For internal briefings, enable SSO-backed JWT validation before deploying real org facts.

On Cloudflare, the easiest path is Cloudflare Access. Add these Worker vars after creating the Access application:

```toml
[vars]
AUTH_MODE = "cloudflare_access"
ACCESS_TEAM_DOMAIN = "your-team.cloudflareaccess.com"
ACCESS_AUD = "your-access-application-aud-tag"
AUTH_ALLOWED_DOMAINS = "acme.org"
```

For other SSO providers, use portable OIDC JWT validation:

```toml
[vars]
AUTH_MODE = "oidc_jwt"
OIDC_ISSUER = "https://issuer.example.com"
OIDC_AUDIENCE = "your-api-audience-or-client-id"
AUTH_ALLOWED_DOMAINS = "acme.org"
```

For automated MCP clients, use provider-issued machine tokens and add:

```toml
AUTH_ALLOW_MACHINE_TOKENS = "true"
```

Machine tokens are not user identity. Keep them scoped, expiring, and rotated. See [AUTH.md](AUTH.md) for all modes and portability notes.

## Updating the briefing

Three orchestration patterns ship as documentation only — you pick one:

1. **Claude Code scheduled triggers.** Mirror what outtolunch.app does. A cron-fired Claude Code session runs `npm run checklist -- --cycle=daily`, follows the output, commits the result.
2. **GitHub Actions.** A workflow triggers Claude API or Cursor on a schedule, runs the checklist, opens a PR.
3. **Cloudflare Cron Trigger + Worker AI.** No external research agent — the worker itself wakes up and runs the research using bound AI.

`SETUP.md` walks the setup LLM through picking one based on your org's tooling.

## Customizing the content

Everything user-facing is in `pack/`. Schemas, cycles, agent prompts, render hints, example data. The engine itself is generic — you edit `pack/`, never `lib/` or `worker/`.

Before adding a section, ask: "do my AI consumers actually get this wrong today?" If no, skip it. Lean briefings serve more queries; rich briefings eat context windows.

## Confidence scoring

Off by default. Turn on in `pack/manifest.json` (`confidence_scoring: enabled`) only if your data sources are interpretive (Slack message synthesis, web research). Then configure `pack/CONFIDENCE.json` thresholds.

## Examples in the wild

Open a PR adding your team or use case here. Doesn't have to be a public link.

- _Your team here._

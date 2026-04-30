# outtolunch-engine

A headless Cloudflare Workers engine for serving an AI-friendly briefing of current facts. Fork it to host an internal briefing for your org.

Your AI agents are out to lunch on internal facts. Sarah left in February but every AI agent in the company still thinks she's the CTO. The Atlas SDK is on v4.2 but Cursor keeps recommending v3. Two people are on vacation this week and your support bot has no idea.

outtolunch-engine fixes that. One curated briefing serves recent facts to every AI agent in the org, kept fresh by a research agent. Instead of every agent re-probing Slack, Workday, and Linear on every interaction, they call one endpoint and get a small, AI-friendly snapshot.

This is the engine behind [outtolunch.app](https://outtolunch.app), repackaged for internal use. The world-events pipeline that powers outtolunch.app stays private. Everything you need to run your own is here.

## Quick start

```bash
git clone https://github.com/scott-brereton/outtolunch-engine.git my-briefing
cd my-briefing
npm install

# Pick a starter pack. internal-ops is the hero example.
cp -R packs/internal-ops/. pack/
cp pack/briefing.example.json pack/briefing.json

# Build and validate.
npm run bundle-pack
npm run validate

# Deploy (after editing wrangler.toml.example -> wrangler.toml).
npm run deploy
```

## Starter packs

- `packs/internal-ops/` — leadership, vacation, hires, priorities, incidents, internal tool versions, corrections, upcoming events.
- `packs/sales-revops/` — pipeline, churn, at-risk accounts, deals in flight.
- `packs/eng-platform/` — service owners, oncall, deploys, feature flags, internal APIs.

Each pack ships with fake "ACME Robotics" example data so `npm run deploy` produces a working endpoint before you do any real research.

## How forkers configure this

Sit next to Claude Code or Cursor. Tell it "set up outtolunch-engine for ${COMPANY}." It reads `SETUP.md`, asks you a handful of questions (which sources of truth, which cycles, what to call your sections), and writes the right files. The configuration surface is small on purpose — most of the configuration is prompts to the setup LLM, not config files.

## API

```
GET  /                          JSON briefing
GET  /compact                   token-efficient Markdown
GET  /nano                      ultra-compact text
GET  /section/:name             single section
GET  /sections?include=a,b      multi-section payload
GET  /health                    freshness status
POST /feedback                  submit a correction (KV-backed)
GET  /feedback                  admin: list pending feedback
POST /mcp                       MCP Streamable HTTP
```

## How it works

A research agent (you point Claude Code, Cursor, or your own agent at it) runs on a cycle defined in `pack/cycles.json`, queries your MCP servers (Slack MCP, Workday MCP, your-org-specific MCP), writes JSON files into `pack/`, runs `npm run validate`, and `npm run deploy`. Your AI consumers (Claude Desktop, Cursor, internal agents) hit `/mcp` or `/compact` and get current facts.

You own the connectors. The engine ships zero adapter code; the AI ecosystem's MCP buildout does the heavy lifting.

## Confidence scoring

Optional. Off by default. Most internal use pulls from systems of record where there's no ambiguity to score. If your data sources are interpretive (Slack message synthesis, doc drafts, web research), turn it on in `pack/manifest.json` and configure thresholds in `pack/CONFIDENCE.json`.

## Security

`lib/injection.ts` runs on every string field at validation time and on every `/feedback` submission. Integrity checksum (SHA-256) on every response. See [SECURITY.md](SECURITY.md).

For private org deployments, enable one of the optional auth modes. Cloudflare Access is the easiest path on Cloudflare:

```toml
[vars]
AUTH_MODE = "cloudflare_access"
ACCESS_TEAM_DOMAIN = "your-team.cloudflareaccess.com"
ACCESS_AUD = "your-access-application-aud-tag"
AUTH_ALLOWED_DOMAINS = "acme.org"
```

For other SSO providers, use generic OIDC JWT validation:

```toml
[vars]
AUTH_MODE = "oidc_jwt"
OIDC_ISSUER = "https://issuer.example.com"
OIDC_AUDIENCE = "your-api-audience-or-client-id"
AUTH_ALLOWED_DOMAINS = "acme.org"
```

See [AUTH.md](AUTH.md) for all modes, including static bearer tokens for demos and machine-only deployments.

## License

MIT. See [LICENSE](LICENSE).

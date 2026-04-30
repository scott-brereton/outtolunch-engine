# Security

## Threat model

`pack/` is the trust boundary. Everything in `pack/` is curated content. Everything else (feedback submissions, MCP tool inputs, external research output) is untrusted and scanned for injection patterns at validation time.

## Defenses

1. **Injection scan** — every string field in `pack/briefing.json` and `pack/sections/*.json` runs through `lib/injection.ts` patterns at `npm run validate`. Same patterns reject `/feedback` submissions at runtime.
2. **Integrity checksum** — SHA-256 of canonical briefing JSON, served via `X-Briefing-Integrity` header and `/health`. Lets consumers detect tampering.
3. **Pack name header** — `X-Pack-Name` lets consumers verify they're hitting the deployment they expect.
4. **Admin gate on `GET /feedback`** — bearer token via `ADMIN_KEY` (Cloudflare secret).
5. **Confidence scoring (optional)** — when enabled, anomalies in updates require human review.
6. **Auth gate (optional)** — when enabled, every route requires either a valid Cloudflare Access JWT, generic OIDC JWT, or static bearer token depending on `AUTH_MODE`. Optional domain/email allowlists add a Worker-level check after SSO.

## SSO and machine tokens

The recommended private deployment pattern is SSO-backed JWT validation. On Cloudflare, Cloudflare Access redirects human users to the org's identity provider, then sends the Worker a `Cf-Access-Jwt-Assertion` JWT. Outside Cloudflare Access, configure `AUTH_MODE=oidc_jwt` with an issuer and audience. The Worker validates the token against the issuer public keys, checks issuer and audience, then enforces `AUTH_ALLOWED_DOMAINS` or `AUTH_ALLOWED_EMAILS` if set.

Automation and MCP clients that cannot complete a browser SSO flow can use machine tokens. Machine tokens are not per-user identity; treat them as org-owned credentials with expiration and rotation. OIDC tokens without a user email claim are rejected unless `AUTH_ALLOW_MACHINE_TOKENS=true`.

## Reporting

Email security findings privately. Don't open public issues for vulnerabilities.

## Patterns are public on purpose

`lib/injection.ts` is intentionally readable. Security through transparency. The patterns are conservative to avoid false positives on legitimate factual content.

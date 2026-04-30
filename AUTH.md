# Authentication

Authentication is optional. A new fork works without auth so the first deploy is easy. For internal data, turn on one auth mode before using real org facts.

## How requests are gated

Every request enters the Worker through `worker/index.ts`. Before routing to `/`, `/compact`, `/nano`, `/sections`, `/feedback`, or `/mcp`, the Worker calls the auth gate. If auth is disabled, the request continues. If auth is enabled, the request must present a valid token for the configured mode.

## Modes

| Mode | Best for | What the Worker verifies |
| --- | --- | --- |
| `cloudflare_access` | Easiest production path on Cloudflare | Cloudflare Access JWT signature, issuer, audience, and optional email/domain allowlist |
| `oidc_jwt` | Provider-neutral SSO with Okta, Auth0, WorkOS, Keycloak, Google, Microsoft, etc. | JWT signature from the issuer JWKS, issuer, audience, and optional email/domain allowlist |
| `static_bearer` | Quick demos, private pilots, simple machine-only deployments | Exact bearer token match |
| disabled | Local setup and public demo data | Nothing |

If `AUTH_MODE` is omitted, the Worker auto-detects a mode from the configured variables:

- `ACCESS_TEAM_DOMAIN` + `ACCESS_AUD` -> `cloudflare_access`
- `OIDC_ISSUER` + `OIDC_AUDIENCE` -> `oidc_jwt`
- `AUTH_TOKEN` -> `static_bearer`

## Recommended setup

For real internal user access, use SSO-backed JWTs:

```toml
[vars]
AUTH_MODE = "oidc_jwt"
OIDC_ISSUER = "https://issuer.example.com"
OIDC_AUDIENCE = "your-api-audience-or-client-id"
AUTH_ALLOWED_DOMAINS = "acme.org"
```

The Worker discovers the issuer's JWKS URL from `/.well-known/openid-configuration`. If your provider does not expose standard OIDC discovery, set it directly:

```toml
OIDC_JWKS_URL = "https://issuer.example.com/.well-known/jwks.json"
```

The JWT should include one of these user claims if you want domain/email checks: `email`, `upn`, `preferred_username`, or `unique_name`.

## Cloudflare Access

Cloudflare Access is the shortest path if you are deploying this project as a Cloudflare Worker.

1. Create a Cloudflare Access self-hosted application for the Worker hostname.
2. Add an allow policy for your Google Workspace, Microsoft Entra, Okta, or other IdP users/groups.
3. Copy the Access application Audience (AUD) Tag.
4. Configure:

```toml
[vars]
AUTH_MODE = "cloudflare_access"
ACCESS_TEAM_DOMAIN = "your-team.cloudflareaccess.com"
ACCESS_AUD = "your-access-application-aud-tag"
AUTH_ALLOWED_DOMAINS = "acme.org"
```

Cloudflare handles the browser SSO flow. The Worker verifies the signed Access JWT that Cloudflare sends in `Cf-Access-Jwt-Assertion`. MCP clients that cannot use browser SSO can use Cloudflare Access service tokens; set `AUTH_ALLOW_MACHINE_TOKENS = "true"` or `ACCESS_ALLOW_SERVICE_TOKENS = "true"` only when you want to accept those.

## Static bearer

Use this only when per-user identity does not matter.

```toml
[vars]
AUTH_MODE = "static_bearer"
```

Set the token as a secret:

```bash
wrangler secret put AUTH_TOKEN
```

Clients call the briefing with:

```http
Authorization: Bearer <AUTH_TOKEN>
```

## Admin feedback

`GET /feedback` still requires `ADMIN_KEY`. If your auth mode already uses the `Authorization` header, send the admin key separately:

```http
Authorization: Bearer <user-or-machine-token>
X-Admin-Key: <ADMIN_KEY>
```

When auth is disabled, the older `Authorization: Bearer <ADMIN_KEY>` form still works.

## Portability

The auth layer is now portable across identity providers because `oidc_jwt` only needs a standard issuer, audience, and JWKS. That covers common SSO systems including Okta, Auth0, WorkOS, Keycloak, Google, and Microsoft.

The hosting runtime is still Cloudflare-first. `worker/index.ts` uses Cloudflare Worker bindings like KV and optional Analytics Engine. To run the whole project on another host, you would need a small runtime adapter and a replacement feedback store. The auth module itself uses standard `Request`, `fetch`, and JWT verification, so it is the easiest part to reuse outside Cloudflare.

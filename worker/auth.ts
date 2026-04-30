import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export interface AuthEnv {
  AUTH_MODE?: string;
  AUTH_ALLOWED_DOMAINS?: string;
  AUTH_ALLOWED_EMAILS?: string;
  AUTH_ALLOW_MACHINE_TOKENS?: string;
  AUTH_TOKEN?: string;
  OIDC_ISSUER?: string;
  OIDC_AUDIENCE?: string;
  OIDC_JWKS_URL?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  ACCESS_ALLOWED_DOMAINS?: string;
  ACCESS_ALLOWED_EMAILS?: string;
  ACCESS_ALLOW_SERVICE_TOKENS?: string;
}

type AuthMode = "cloudflare_access" | "oidc_jwt" | "static_bearer" | "invalid";

interface JwtAuthConfig {
  mode: "cloudflare_access" | "oidc_jwt";
  issuer: string;
  jwksUrl?: URL;
  audience: string | string[];
  allowedDomains: string[];
  allowedEmails: string[];
  allowMachineTokens: boolean;
}

const jwksByUrl = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
const discoveryByIssuer = new Map<string, Promise<URL>>();

export function authMode(env: AuthEnv): AuthMode | null {
  const mode = normalizeMode(env.AUTH_MODE);
  if (mode === "disabled" || mode === "none" || mode === "off") return null;
  if (mode === "cloudflare_access" || mode === "oidc_jwt" || mode === "static_bearer") return mode;
  if (mode) return "invalid";
  if (env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD) return "cloudflare_access";
  if (env.OIDC_ISSUER && env.OIDC_AUDIENCE) return "oidc_jwt";
  if (env.AUTH_TOKEN) return "static_bearer";
  return null;
}

export function isAuthEnabled(env: AuthEnv): boolean {
  return authMode(env) !== null;
}

export async function requireAuth(req: Request, env: AuthEnv): Promise<Response | null> {
  const mode = authMode(env);
  if (!mode) return null;
  if (mode === "invalid") return textResponse("auth misconfigured", 500);

  if (mode === "static_bearer") return requireStaticBearer(req, env);

  const config = buildJwtAuthConfig(mode, env);
  if (!config) {
    return textResponse("auth misconfigured", 500);
  }

  const token = readJwtToken(req, config.mode);
  if (!token) {
    return textResponse("unauthorized", 401, {
      "WWW-Authenticate": 'Bearer realm="outtolunch"',
    });
  }

  try {
    const { payload } = await jwtVerify(token, await jwksFor(config), {
      issuer: config.issuer,
      audience: config.audience,
    });
    const email = emailFromPayload(payload);
    if (!email) {
      if (config.allowMachineTokens) return null;
      return textResponse("machine tokens are not allowed", 403);
    }
    if (!emailAllowed(email, config.allowedDomains, config.allowedEmails)) {
      return textResponse("forbidden", 403);
    }
    return null;
  } catch {
    return textResponse("unauthorized", 401, {
      "WWW-Authenticate": 'Bearer error="invalid_token"',
    });
  }
}

export function readJwtToken(req: Request, mode: "cloudflare_access" | "oidc_jwt" = "oidc_jwt"): string | null {
  if (mode === "cloudflare_access") {
    const accessHeader = req.headers.get("Cf-Access-Jwt-Assertion") ?? req.headers.get("cf-access-token");
    if (looksLikeJwt(accessHeader)) return accessHeader.trim();
  }

  const bearer = readBearerToken(req);
  if (looksLikeJwt(bearer)) return bearer.trim();

  if (mode === "cloudflare_access") {
    const cookieToken = cookieValue(req.headers.get("Cookie"), "CF_Authorization");
    if (looksLikeJwt(cookieToken)) return cookieToken.trim();
  }

  return null;
}

export function readBearerToken(req: Request): string | null {
  const auth = req.headers.get("Authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return null;
  const token = auth.slice("bearer ".length).trim();
  return token || null;
}

export function emailAllowed(email: string, allowedDomains: string[], allowedEmails: string[]): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) return false;
  if (allowedDomains.length === 0 && allowedEmails.length === 0) return true;
  if (allowedEmails.includes(normalizedEmail)) return true;
  const domain = normalizedEmail.slice(normalizedEmail.lastIndexOf("@") + 1);
  return allowedDomains.includes(domain);
}

function requireStaticBearer(req: Request, env: AuthEnv): Response | null {
  const expected = env.AUTH_TOKEN?.trim();
  if (!expected) return textResponse("auth misconfigured", 500);

  const actual = readBearerToken(req);
  if (!actual || !constantTimeEqual(actual, expected)) {
    return textResponse("unauthorized", 401, {
      "WWW-Authenticate": 'Bearer realm="outtolunch"',
    });
  }

  return null;
}

function buildJwtAuthConfig(mode: "cloudflare_access" | "oidc_jwt", env: AuthEnv): JwtAuthConfig | null {
  const allowlists = authAllowlists(env);

  if (mode === "cloudflare_access") {
    const teamDomain = normalizeHost(env.ACCESS_TEAM_DOMAIN);
    const audiences = list(env.ACCESS_AUD);
    if (!teamDomain || audiences.length === 0) return null;

    const issuer = `https://${teamDomain}`;
    return {
      mode,
      issuer,
      jwksUrl: new URL(`${issuer}/cdn-cgi/access/certs`),
      audience: oneOrMany(audiences),
      ...allowlists,
      allowMachineTokens: bool(env.AUTH_ALLOW_MACHINE_TOKENS) || bool(env.ACCESS_ALLOW_SERVICE_TOKENS),
    };
  }

  const issuer = normalizeUrl(env.OIDC_ISSUER);
  const audiences = list(env.OIDC_AUDIENCE);
  if (!issuer || audiences.length === 0) return null;

  return {
    mode,
    issuer,
    jwksUrl: env.OIDC_JWKS_URL ? new URL(env.OIDC_JWKS_URL) : undefined,
    audience: oneOrMany(audiences),
    ...allowlists,
    allowMachineTokens: bool(env.AUTH_ALLOW_MACHINE_TOKENS),
  };
}

async function jwksFor(config: JwtAuthConfig): Promise<ReturnType<typeof createRemoteJWKSet>> {
  const jwksUrl = config.jwksUrl ?? (await discoverJwksUrl(config.issuer));
  const cacheKey = jwksUrl.toString();
  const cached = jwksByUrl.get(cacheKey);
  if (cached) return cached;
  const jwks = createRemoteJWKSet(jwksUrl);
  jwksByUrl.set(cacheKey, jwks);
  return jwks;
}

function discoverJwksUrl(issuer: string): Promise<URL> {
  const cached = discoveryByIssuer.get(issuer);
  if (cached) return cached;

  const discovery = fetch(new URL(`${issuer}/.well-known/openid-configuration`), {
    headers: { Accept: "application/json" },
  }).then(async (res) => {
    if (!res.ok) throw new Error(`OIDC discovery failed: ${res.status}`);
    const body: any = await res.json();
    if (typeof body.jwks_uri !== "string") throw new Error("OIDC discovery missing jwks_uri");
    return new URL(body.jwks_uri);
  });
  discoveryByIssuer.set(issuer, discovery);
  return discovery;
}

function authAllowlists(env: AuthEnv): Pick<JwtAuthConfig, "allowedDomains" | "allowedEmails"> {
  return {
    allowedDomains: [...list(env.AUTH_ALLOWED_DOMAINS), ...list(env.ACCESS_ALLOWED_DOMAINS)].map((domain) =>
      domain.replace(/^@/, "").toLowerCase(),
    ),
    allowedEmails: [...list(env.AUTH_ALLOWED_EMAILS), ...list(env.ACCESS_ALLOWED_EMAILS)].map((email) =>
      email.toLowerCase(),
    ),
  };
}

function normalizeMode(value: string | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed || null;
}

function normalizeHost(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function normalizeUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function oneOrMany(values: string[]): string | string[] {
  return values.length === 1 ? values[0] : values;
}

function bool(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function emailFromPayload(payload: JWTPayload): string | null {
  for (const claim of ["email", "upn", "preferred_username", "unique_name"]) {
    const value = payload[claim];
    if (typeof value === "string" && value.includes("@")) return value.trim().toLowerCase();
  }
  return null;
}

function looksLikeJwt(value: string | null | undefined): value is string {
  if (!value) return false;
  return value.trim().split(".").length === 3;
}

function cookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey !== name) continue;
    const value = rawValue.join("=").trim();
    if (!value) return null;
    return decodeURIComponent(value.replace(/^"|"$/g, ""));
  }
  return null;
}

function constantTimeEqual(a: string, b: string): boolean {
  const max = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < max; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function textResponse(body: string, status: number, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...headers,
    },
  });
}

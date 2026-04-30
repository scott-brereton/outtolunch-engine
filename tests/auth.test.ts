import { describe, expect, it } from "vitest";
import { authMode, emailAllowed, isAuthEnabled, readBearerToken, readJwtToken, requireAuth } from "../worker/auth";

const jwt = "aaa.bbb.ccc";

describe("auth configuration", () => {
  it("is disabled by default", () => {
    expect(isAuthEnabled({})).toBe(false);
    expect(authMode({})).toBe(null);
  });

  it("is enabled explicitly for Cloudflare Access", () => {
    expect(isAuthEnabled({ AUTH_MODE: "cloudflare_access" })).toBe(true);
    expect(authMode({ AUTH_MODE: "cloudflare_access" })).toBe("cloudflare_access");
  });

  it("is enabled when Access team domain and audience are configured", () => {
    expect(isAuthEnabled({ ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com", ACCESS_AUD: "aud" })).toBe(true);
    expect(authMode({ ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com", ACCESS_AUD: "aud" })).toBe("cloudflare_access");
  });

  it("is enabled when generic OIDC issuer and audience are configured", () => {
    expect(authMode({ OIDC_ISSUER: "https://accounts.example.com", OIDC_AUDIENCE: "client-id" })).toBe("oidc_jwt");
  });

  it("is enabled when a static bearer token is configured", () => {
    expect(authMode({ AUTH_TOKEN: "secret" })).toBe("static_bearer");
  });

  it("can be explicitly disabled even when Access variables exist", () => {
    expect(
      isAuthEnabled({
        AUTH_MODE: "off",
        ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com",
        ACCESS_AUD: "aud",
      }),
    ).toBe(false);
  });

  it("treats unknown explicit modes as misconfigured", async () => {
    const response = await requireAuth(new Request("https://example.test"), { AUTH_MODE: "oidc" });
    expect(authMode({ AUTH_MODE: "oidc" })).toBe("invalid");
    expect(response?.status).toBe(500);
  });
});

describe("readJwtToken", () => {
  it("prefers the Cloudflare Access assertion header", () => {
    const req = new Request("https://example.test", {
      headers: {
        "Cf-Access-Jwt-Assertion": jwt,
        Authorization: "Bearer other.token.value",
      },
    });
    expect(readJwtToken(req, "cloudflare_access")).toBe(jwt);
  });

  it("accepts Authorization bearer JWTs", () => {
    const req = new Request("https://example.test", {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    expect(readJwtToken(req)).toBe(jwt);
  });

  it("accepts the Cloudflare Access cookie as a fallback", () => {
    const req = new Request("https://example.test", {
      headers: { Cookie: `theme=dark; CF_Authorization=${encodeURIComponent(jwt)}` },
    });
    expect(readJwtToken(req, "cloudflare_access")).toBe(jwt);
  });

  it("ignores non-JWT bearer values", () => {
    const req = new Request("https://example.test", {
      headers: { Authorization: "Bearer admin-key" },
    });
    expect(readJwtToken(req)).toBe(null);
  });
});

describe("readBearerToken", () => {
  it("reads any bearer token", () => {
    const req = new Request("https://example.test", {
      headers: { Authorization: "Bearer static-secret" },
    });
    expect(readBearerToken(req)).toBe("static-secret");
  });
});

describe("requireAuth", () => {
  it("accepts the configured static bearer token", async () => {
    const req = new Request("https://example.test", {
      headers: { Authorization: "Bearer static-secret" },
    });
    await expect(requireAuth(req, { AUTH_MODE: "static_bearer", AUTH_TOKEN: "static-secret" })).resolves.toBe(null);
  });

  it("rejects the wrong static bearer token", async () => {
    const req = new Request("https://example.test", {
      headers: { Authorization: "Bearer wrong" },
    });
    const response = await requireAuth(req, { AUTH_MODE: "static_bearer", AUTH_TOKEN: "static-secret" });
    expect(response?.status).toBe(401);
  });
});

describe("emailAllowed", () => {
  it("allows any email when no allowlist is configured", () => {
    expect(emailAllowed("Sam@Acme.org", [], [])).toBe(true);
  });

  it("allows configured domains", () => {
    expect(emailAllowed("sam@acme.org", ["acme.org"], [])).toBe(true);
    expect(emailAllowed("sam@example.com", ["acme.org"], [])).toBe(false);
  });

  it("allows configured emails", () => {
    expect(emailAllowed("sam@example.com", [], ["sam@example.com"])).toBe(true);
    expect(emailAllowed("alex@example.com", [], ["sam@example.com"])).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { securityHeaders } from "./security-headers";

describe("security headers", () => {
  it("restricts resources to the configured Supabase origin", () => {
    const headers = securityHeaders({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    });
    const csp =
      headers.find((header) => header.key === "Content-Security-Policy")
        ?.value || "";
    expect(csp).toContain("connect-src 'self' https://project.supabase.co");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("*.supabase.co");
  });

  it("does not admit invalid or insecure configured origins", () => {
    const csp = securityHeaders({
      NEXT_PUBLIC_SUPABASE_URL: "http://example.test",
    })[0].value;
    expect(csp).not.toContain("example.test");
  });

  it("sets clickjacking, sniffing, capability, and transport protections", () => {
    const mapped = Object.fromEntries(
      securityHeaders().map((header) => [header.key, header.value]),
    );
    expect(mapped["X-Frame-Options"]).toBe("DENY");
    expect(mapped["X-Content-Type-Options"]).toBe("nosniff");
    expect(mapped["Permissions-Policy"]).toContain("payment=()");
    expect(mapped["Strict-Transport-Security"]).toContain("max-age=31536000");
  });
});

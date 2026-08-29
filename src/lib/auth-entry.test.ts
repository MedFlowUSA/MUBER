import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), "src", file), "utf8");

describe("separated authentication entry points", () => {
  it("keeps staff registration unavailable", () => {
    const staffLogin = source("app/admin/login/page.tsx");
    expect(staffLogin).toContain("allowRegistration={false}");
    expect(
      fs.existsSync(path.join(process.cwd(), "src/app/admin/register")),
    ).toBe(false);
  });

  it("continues contractor registration into the application workflow", () => {
    const contractorRegistration = source("app/contractor/register/page.tsx");
    expect(contractorRegistration).toContain('next="/provider/apply"');
    expect(contractorRegistration).toContain(
      "does not grant contractor access",
    );
  });

  it("uses dedicated customer entry points for booking authentication", () => {
    expect(source("components/booking-flow.tsx")).toContain(
      "/customer/login?next=",
    );
    expect(source("lib/supabase/middleware.ts")).toContain(
      'login.pathname = "/customer/login"',
    );
  });

  it("rejects protocol-relative authentication callback destinations", () => {
    const callback = source("app/auth/callback/route.ts");
    expect(callback).toContain('!requestedNext.startsWith("//")');
  });

  it("keeps production, preview, and localhost auth redirects exact", () => {
    const config = fs.readFileSync(
      path.join(process.cwd(), "supabase/config.toml"),
      "utf8",
    );
    expect(config).toContain('site_url = "https://muberapp.vercel.app"');
    expect(config).toContain(
      '"https://muber-8pifn1mvx-manuel-rodriguezs-projects-f5946c44.vercel.app/auth/callback"',
    );
    expect(config).toContain(
      '"https://muber-8pifn1mvx-manuel-rodriguezs-projects-f5946c44.vercel.app/auth/reset"',
    );
    expect(config).toContain('"http://localhost:3000/auth/callback"');
    expect(config).toContain('"http://localhost:3000/auth/reset"');
    expect(config).not.toContain("**");
    expect(config).toContain("enable_confirmations = true");
  });
});

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
});

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { portalMenus } from "./routes";

describe("portal separation", () => {
  it("shows each portal only its relevant navigation", () => {
    expect(portalMenus.customer.map((item) => item.href)).not.toContain(
      "/admin",
    );
    expect(portalMenus.provider.map((item) => item.href)).not.toContain(
      "/customer",
    );
    expect(portalMenus.admin.map((item) => item.href)).not.toContain(
      "/provider/dashboard",
    );
  });

  it("routes every privileged role through a server-side portal destination", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/portal/page.tsx"),
      "utf8",
    );
    for (const role of [
      "provider_owner",
      "provider_manager",
      "crew_lead",
      "crew_member",
      "dispatcher",
      "compliance_admin",
      "finance_admin",
      "super_admin",
    ])
      expect(source).toContain(role);
    expect(source).toContain('redirect("/auth/login?next=/portal")');
  });

  it("keeps contractor profile updates server-derived and audited", () => {
    const migration = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/0027_contractor_company_profile.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("om.profile_id=auth.uid()");
    expect(migration).toContain("provider.profile_updated");
    expect(migration).not.toContain("p_company");
  });
});

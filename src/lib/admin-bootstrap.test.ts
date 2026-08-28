import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/0050_first_super_admin_bootstrap.sql",
  ),
  "utf8",
);

describe("first super-administrator bootstrap", () => {
  it("requires an explicit existing customer profile and blocks repeats", () => {
    expect(migration).toContain("where id = p_user");
    expect(migration).toContain("v_prior_role <> 'customer'");
    expect(migration).toContain("where role = 'super_admin'");
    expect(migration).toContain("pg_advisory_xact_lock");
  });

  it("has no API-role execution grants", () => {
    expect(migration).toContain("from anon");
    expect(migration).toContain("from authenticated");
    expect(migration).toContain("from service_role");
    expect(migration).not.toMatch(/grant execute/i);
  });

  it("records the sensitive role assignment without credentials", () => {
    expect(migration).toContain("role.first_super_admin_bootstrapped");
    expect(migration).toContain("'from_role', v_prior_role");
    expect(migration).toContain("'to_role', 'super_admin'");
    expect(migration).not.toMatch(/password|session_token|service_role_key/i);
  });
});

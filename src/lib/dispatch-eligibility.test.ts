import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/0051_dispatch_eligibility_explanations.sql",
  ),
  "utf8",
);

describe("dispatcher provider eligibility", () => {
  it("requires matching vehicles to be active and insurance eligible", () => {
    expect(migration).toMatch(
      /v\.active\s+and v\.insurance_eligible\s+and v_job\.service/i,
    );
  });

  it("reports positive qualifications and specific credential blockers", () => {
    expect(migration).toContain("qualifications text[]");
    expect(migration).toContain("missing_credentials text[]");
    expect(migration).toContain("Required credentials missing or expired: ");
  });

  it("keeps eligibility restricted to operational administrators", () => {
    expect(migration).toContain("'dispatcher','super_admin'");
    expect(migration).toContain(
      "revoke all on function public.eligible_providers_for_job(uuid) from public",
    );
  });
});

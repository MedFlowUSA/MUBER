import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/0052_assignment_resource_eligibility.sql",
  ),
  "utf8",
);

describe("assignment resource eligibility", () => {
  it("revalidates provider, vehicle, and job-specific fleet requirements", () => {
    expect(migration).toContain("status='approved'");
    expect(migration).toContain("not v_vehicle.insurance_eligible");
    expect(migration).toContain(
      "v_job.service::text=any(v_vehicle.service_categories)",
    );
    expect(migration).toContain("v_review.required_vehicle_class");
  });

  it("requires a capable crew for size, service, and heavy items", () => {
    expect(migration).toContain("v_crew.moving_eligible");
    expect(migration).toContain("v_crew.removal_eligible");
    expect(migration).toContain("v_review.required_crew_size");
    expect(migration).toContain("not v_crew.heavy_item_capable");
  });

  it("rechecks verified unexpired credentials at scheduling time", () => {
    expect(migration).toContain("pc.verification_status='verified'");
    expect(migration).toContain("pc.expires_at>current_date");
    expect(migration).toContain("ca_household_mover_permit");
    expect(migration).toContain("credential_eligibility_revalidated',true");
  });
});

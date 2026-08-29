import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("provider recruitment readiness", () => {
  it("does not advertise inactive payments or guaranteed earnings", () => {
    const page = read("src/app/provider/page.tsx");
    expect(page).not.toContain('"Digital payments"');
    expect(page).toContain("No application fee");
    expect(page).toMatch(/No\s+job volume, revenue, earnings/);
    expect(page).toContain("Payments and payouts are not active");
  });

  it("separates moving and junk-removal applicant expectations", () => {
    const page = read("src/app/provider/page.tsx");
    expect(page).toContain("Moving companies");
    expect(page).toContain("Junk-removal companies");
    expect(page).toContain("MUBER verifies");
  });

  it("records versioned, server-timestamped application acknowledgments", () => {
    const migration = read(
      "supabase/migrations/0053_provider_application_acknowledgments.sql",
    );
    expect(migration).toContain("agreement_version='terms-2026-08-26'");
    expect(migration).toContain("agreement_accepted_at=now()");
    expect(migration).toContain("authorized_representative_attested");
    expect(migration).toContain("no_guarantee_acknowledged");
  });
});

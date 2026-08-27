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

  it("separates finance from compliance and sanitizes the audit feed", () => {
    const migration = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/0028_admin_operational_overview.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("v_role='finance_admin'");
    expect(migration).toContain("'payments_enabled',false");
    expect(migration).toContain(
      "returns table(id uuid,actor_name text,action text,entity_type text,entity_id uuid,occurred_at timestamptz)",
    );
    expect(migration).not.toContain(
      "returns table(id uuid,actor_name text,action text,entity_type text,entity_id uuid,metadata",
    );
  });

  it("derives contractor availability ownership and enforces conflicts", () => {
    const migration = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/0029_contractor_availability_calendar.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("om.profile_id=auth.uid()");
    expect(migration).toContain("provider_schedule_eligible");
    expect(migration).toContain("enforce_provider_schedule_before_offer");
    expect(migration).toContain("provider.availability_set");
    expect(migration).not.toContain("p_provider uuid,p_date");
  });

  it("keeps customer information requests immutable and ownership-scoped", () => {
    const migration = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/0031_customer_information_requests.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("public.owns_job(v_item.job_id)");
    expect(migration).toContain("immutable_job_information_responses");
    expect(migration).toContain("job_information.requested");
    expect(migration).toContain("job_information.responded");
    expect(migration).toContain("update public.jobs set status='needs_review'");
  });
});

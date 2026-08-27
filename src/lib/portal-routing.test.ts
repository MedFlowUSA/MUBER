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

  it("validates canonical weekly operating hours in the database", () => {
    const migration = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/0032_validated_weekly_operating_hours.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("valid_weekly_operating_hours");
    expect(migration).toContain("America/Los_Angeles");
    const fix = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/0034_fix_weekly_hours_key_validation.sql",
      ),
      "utf8",
    );
    expect(fix).toContain("jsonb_object_keys(p_hours->'days')");
    expect(fix).not.toContain("jsonb_object_length");
    expect(migration).toContain("v_start>=v_end");
    expect(migration).toContain("v_start<v_previous_end");
    expect(migration).toContain("validate_provider_operating_hours");
  });

  it("uses a friendly weekly-hours editor instead of raw JSON", () => {
    const editor = fs.readFileSync(
      path.join(process.cwd(), "src/components/weekly-hours-editor.tsx"),
      "utf8",
    );
    const profile = fs.readFileSync(
      path.join(process.cwd(), "src/app/provider/profile/page.tsx"),
      "utf8",
    );
    expect(editor).toContain("Copy one day to others");
    expect(editor).toContain('type="time"');
    expect(editor).toContain("Pacific Time");
    expect(profile).toContain("<WeeklyHoursEditor");
    expect(profile).not.toContain("JSON operating hours");
  });

  it("keeps fleet editing provider-scoped, audited, and assignment-safe", () => {
    const migration = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/0033_provider_fleet_editing.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("public.can_manage_provider");
    expect(migration).toContain("vehicle has an active assignment");
    expect(migration).toContain("crew has an active assignment");
    expect(migration).toContain("'vehicle.updated'");
    expect(migration).toContain("'crew.updated'");
    expect(migration).not.toContain("delete from public.vehicles");
    expect(migration).not.toContain("delete from public.crews");
  });

  it("requires reviewed, owned, and audited customer cancellations", () => {
    const migration = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/0035_customer_cancellation_requests.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("public.owns_job(p_job)");
    expect(migration).toContain("one_open_cancellation_request_per_job");
    expect(migration).toContain("immutable_job_cancellation_events");
    expect(migration).toContain("public.transition_job");
    expect(migration).toContain("'payment_action',false");
    expect(migration).not.toContain("delete from public.jobs");
  });

  it("enforces provider suspension below the eligibility UI", () => {
    const migration = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/0036_provider_suspension_controls.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("enforce_provider_offer_status");
    expect(migration).toContain("enforce_provider_assignment_status");
    expect(migration).toContain("status='approved'");
    expect(migration).toContain("active_job_count");
    expect(migration).toContain("immutable_provider_status_events");
    expect(migration).toContain("'payment_action',false");
    expect(migration).not.toContain("delete from public.provider_companies");
    expect(migration).not.toContain("delete from public.assignments");
  });

  it("filters incident and claim detail fields by role at the database", () => {
    const migration = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/0037_role_filtered_incident_claim_details.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("revoke select on public.incidents");
    expect(migration).toContain("revoke select on public.claims");
    expect(migration).toContain("get_incident_detail");
    expect(migration).toContain("get_claim_detail");
    expect(migration).toContain(
      "case when v_internal then v_i.internal_notes end",
    );
    expect(migration).toContain("'liability_admitted',false");
    expect(migration).toContain("'payment_processed',false");
  });

  it("indexes and server-counts the paginated dispatch queue", () => {
    const migration = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/0038_dispatch_queue_pagination.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("jobs_dispatch_queue_idx");
    expect(migration).toContain("jobs_reference_prefix_idx");
    expect(migration).toContain("dispatch_queue_counts");
    expect(migration).toContain("public.has_any_role");
  });
  it("paginates sensitive compliance queues without raw audit metadata", () => {
    const migration = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/0039_compliance_queue_pagination.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("credentials_review_queue_idx");
    expect(migration).toContain("completion_review_queue_idx");
    expect(migration).toContain("get_admin_audit_feed_page");
    expect(migration).toContain("count(*) over()");
    expect(migration).not.toContain("returns table(id uuid,metadata");
  });
  it("indexes provider work and recipient-scoped notification pages", () => {
    const migration = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/0040_provider_notification_queue_pagination.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("provider_offers_page_idx");
    expect(migration).toContain("provider_assignments_page_idx");
    expect(migration).toContain("notifications_page_idx");
  });
});

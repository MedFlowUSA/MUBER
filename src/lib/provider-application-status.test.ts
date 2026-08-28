import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  providerApplicationStatus,
  providerApplicationStatuses,
} from "./provider-application-status";

describe("provider application status presentation", () => {
  it("defines every operational application state", () => {
    expect(Object.keys(providerApplicationStatuses).sort()).toEqual(
      [
        "approved",
        "draft",
        "information_requested",
        "rejected",
        "submitted",
        "suspended",
        "under_review",
        "withdrawn",
      ].sort(),
    );
  });

  it("never includes internal review reasons", () => {
    for (const status of Object.values(providerApplicationStatuses)) {
      expect(status).not.toHaveProperty("internal_reason");
    }
  });

  it("uses a safe fallback for an unknown state", () => {
    expect(providerApplicationStatus("future_state").label).toBe("In review");
  });

  it("keeps information resubmission authenticated, state-bound, and audited", () => {
    const migration = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/0049_provider_information_request_response.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("applicant_id = auth.uid()");
    expect(migration).toContain("status = 'information_requested'");
    expect(migration).toContain("provider_application.information_resubmitted");
    expect(migration).toContain("'response_provided', true");
    expect(migration).not.toContain(
      "jsonb_build_object('response', v_response)",
    );
  });

  it("separates the contractor message from the internal review reason", () => {
    const migration = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/0049_provider_information_request_response.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("p_internal_reason text");
    expect(migration).toContain("p_applicant_message text");
    expect(migration).toContain("then pa.applicant_message");
  });
});

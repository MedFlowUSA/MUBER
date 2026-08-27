import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/0022_incidents_claims_closure.sql",
  ),
  "utf8",
);
const evidenceMigration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/0025_private_incident_evidence.sql",
  ),
  "utf8",
);
const evidenceCleanupMigration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/0026_incident_evidence_upload_cleanup.sql",
  ),
  "utf8",
);

describe("Phase 2C database security contract", () => {
  it("keeps incident allegations immutable and writes an audit timeline", () => {
    expect(migration).toContain("protect_incident_report");
    expect(migration).toContain("immutable_incident_updates");
    expect(migration).toContain("'incident.reported'");
  });

  it("keeps sensitive writes behind authenticated RPCs", () => {
    expect(migration).toContain(
      "revoke insert,update,delete on public.incidents",
    );
    expect(migration).toContain(
      "grant execute on function public.create_incident",
    );
    expect(migration).toContain("public.can_access_incident(id)");
  });

  it("does not represent a claim or closure as payment or fault", () => {
    expect(migration).toContain("'financial_ledger_created',false");
    expect(migration).toContain("'liability_admitted',false");
    expect(migration).toContain("'payment_settled',false");
  });

  it("blocks closure for unresolved operational risks", () => {
    expect(migration).toContain("High or critical incident remains open");
    expect(migration).toContain("Claim remains open");
    expect(migration).toContain("Customer response window remains open");
  });

  it("keeps incident evidence private, immutable, and RPC-controlled", () => {
    expect(evidenceMigration).toContain(
      "'incident-evidence','incident-evidence',false",
    );
    expect(evidenceMigration).toContain("immutable_incident_evidence");
    expect(evidenceMigration).toContain(
      "revoke insert,update,delete on public.incident_evidence",
    );
    expect(evidenceMigration).toContain("register_incident_evidence");
    expect(evidenceCleanupMigration).toContain(
      "not exists(select 1 from public.incident_evidence",
    );
  });
});

import { describe, expect, it } from "vitest";
import { getProviderReadiness } from "./provider-readiness";

const base = {
  companyStatus: "approved",
  available: true,
  credentials: [{ verification_status: "verified", expires_at: "2026-10-01" }],
  vehicles: [{ active: true, insurance_eligible: true }],
  crews: [{ active: true }],
  serviceDate: "2026-08-27",
};

describe("provider readiness", () => {
  it("marks a fully prepared provider ready", () => {
    const result = getProviderReadiness(base);
    expect(result.ready).toBe(true);
    expect(result.readyCount).toBe(5);
  });

  it("does not count expired or unverified credentials", () => {
    const result = getProviderReadiness({
      ...base,
      credentials: [
        { verification_status: "verified", expires_at: "2026-08-27" },
        { verification_status: "submitted", expires_at: "2027-01-01" },
      ],
    });
    expect(result.ready).toBe(false);
    expect(result.items.find((item) => item.key === "credentials")?.ready).toBe(
      false,
    );
  });

  it("requires an active and insurance-eligible vehicle", () => {
    const result = getProviderReadiness({
      ...base,
      vehicles: [
        { active: true, insurance_eligible: false },
        { active: false, insurance_eligible: true },
      ],
    });
    expect(result.items.find((item) => item.key === "vehicles")?.ready).toBe(
      false,
    );
  });

  it("surfaces credentials expiring within 30 days in urgency order", () => {
    const result = getProviderReadiness({
      ...base,
      credentials: [
        { verification_status: "verified", expires_at: "2026-09-20" },
        { verification_status: "verified", expires_at: "2026-09-03" },
        { verification_status: "verified", expires_at: "2026-12-01" },
      ],
    });
    expect(result.expiringCredentials).toEqual([
      { expiresAt: "2026-09-03", daysRemaining: 7 },
      { expiresAt: "2026-09-20", daysRemaining: 24 },
    ]);
  });
});

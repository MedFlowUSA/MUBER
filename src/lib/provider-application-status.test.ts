import { describe, expect, it } from "vitest";
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
});

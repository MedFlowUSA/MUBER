import { describe, expect, it } from "vitest";
import {
  crewFieldActions,
  dispatchCommands,
  statusForCustomer,
} from "./job-status";

describe("operational job controls", () => {
  it("never exposes customer quote acceptance as a dispatcher command", () => {
    const commands = Object.values(dispatchCommands)
      .flat()
      .map((item) => item.command);
    expect(commands).not.toContain("mark_quote_accepted");
    expect(commands).not.toContain("mark_quote_sent");
  });

  it("requires reasons for sensitive dispatcher commands", () => {
    const sensitive = Object.values(dispatchCommands)
      .flat()
      .filter((item) =>
        [
          "request_customer_information",
          "incident_hold",
          "require_reassignment",
          "cancel",
        ].includes(item.command),
      );
    expect(sensitive.length).toBeGreaterThan(0);
    expect(sensitive.every((item) => item.reason)).toBe(true);
  });

  it("uses customer-safe labels for internal operational states", () => {
    expect(statusForCustomer("incident_hold").label).toBe("Under review");
    expect(statusForCustomer("offer_sent").label).toBe("Matching in progress");
  });

  it("keeps field actions sequential and out of dispatcher controls", () => {
    expect(Object.values(crewFieldActions).map((x) => x.command)).toEqual([
      "mark_ready",
      "start_en_route",
      "mark_arrived",
      "start_work",
    ]);
    expect(
      Object.values(dispatchCommands)
        .flat()
        .map((x) => x.command),
    ).not.toContain("start_en_route");
  });
});

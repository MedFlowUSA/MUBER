import { describe, expect, it } from "vitest";
import {
  parseAuditQueueQuery,
  parseComplianceQueueQuery,
  parseIncidentQueueQuery,
  parseProviderQueueQuery,
  parseQueueQuery,
} from "./queue-query";
describe("queue query validation", () => {
  it("normalizes bounded reference searches and pages", () =>
    expect(parseQueueQuery({ q: " mub-2608- ", page: "2" })).toMatchObject({
      q: "MUB-2608-",
      page: 2,
      pageSize: 20,
    }));
  it("rejects unsupported state and search syntax", () =>
    expect(
      parseQueueQuery({ q: "%' OR 1=1", status: "paid", page: "-4" }),
    ).toMatchObject({ q: "", status: "", page: 1 }));
  it("accepts an operational state", () =>
    expect(parseQueueQuery({ status: "incident_hold" }).status).toBe(
      "incident_hold",
    ));
  it("bounds provider administration filters", () =>
    expect(
      parseProviderQueueQuery({
        provider_q: " Acme & Sons ",
        provider_status: "suspended",
        provider_page: "3",
      }),
    ).toMatchObject({
      providerQ: "Acme & Sons",
      providerStatus: "suspended",
      providerPage: 3,
    }));
  it("requires exact incident identifiers", () =>
    expect(
      parseIncidentQueueQuery({ incident: "not-an-id", status: "invented" }),
    ).toMatchObject({ incident: "", status: "", page: 1 }));
  it("validates compliance and audit filters", () => {
    expect(
      parseComplianceQueueQuery(
        { status: "verified", type: "general_liability", page: "2" },
        "credential",
      ),
    ).toMatchObject({ status: "verified", type: "general_liability", page: 2 });
    expect(
      parseAuditQueueQuery({ action: "provider.", entity: "provider_company" }),
    ).toMatchObject({ action: "provider.", entity: "provider_company" });
  });
});

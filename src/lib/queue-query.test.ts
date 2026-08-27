import { describe, expect, it } from "vitest";
import { parseQueueQuery } from "./queue-query";
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
});

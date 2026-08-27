import { describe, expect, it } from "vitest";
import { requestId } from "./request-id";

describe("request correlation", () => {
  it("preserves a valid upstream UUID", () =>
    expect(requestId("550E8400-E29B-41D4-A716-446655440000")).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    ));
  it("replaces invalid or attacker-controlled values", () => {
    expect(requestId("<script>not-safe</script>")).toMatch(/^[0-9a-f-]{36}$/);
    expect(requestId(null)).toMatch(/^[0-9a-f-]{36}$/);
  });
});

import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { databaseErrorCode, logApiEvent } from "./operational-telemetry";

describe("operational telemetry", () => {
  it("accepts safe database codes and rejects unsafe values", () => {
    expect(databaseErrorCode({ code: "42501" })).toBe("42501");
    expect(databaseErrorCode({ code: "secret value with spaces" })).toBe(
      "unknown",
    );
    expect(databaseErrorCode(new Error("private failure"))).toBe("unknown");
  });

  it("logs only the explicit safe event fields", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => {});
    const request = new Request("https://example.test/api/bookings", {
      headers: { "x-request-id": "48e11195-c250-4618-9bab-4f0aee50597a" },
    });
    logApiEvent({
      request,
      event: "booking.create",
      outcome: "failed",
      status: 400,
      startedAt: Date.now(),
      error: { code: "42501", message: "private address and token" },
    });
    const logged = String(output.mock.calls[0]?.[0]);
    expect(logged).toContain('"databaseErrorCode":"42501"');
    expect(logged).toContain(
      '"requestId":"48e11195-c250-4618-9bab-4f0aee50597a"',
    );
    expect(logged).not.toContain("private address");
    expect(logged).not.toContain("token");
    output.mockRestore();
  });

  it("does not return raw server error messages from API routes", () => {
    const routes = fs
      .readdirSync(path.join(process.cwd(), "src/app/api"), {
        recursive: true,
        withFileTypes: true,
      })
      .filter((entry) => entry.isFile() && entry.name === "route.ts")
      .map((entry) =>
        fs.readFileSync(path.join(entry.parentPath, entry.name), "utf8"),
      );
    expect(routes.join("\n")).not.toMatch(
      /NextResponse\.json\(\s*\{\s*error:\s*error\.message/,
    );
  });
});

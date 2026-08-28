import { describe, expect, it } from "vitest";
import {
  completionDraftMediaSchema,
  completionMediaSchema,
  incidentEvidenceSchema,
} from "./private-media-validation";

const user = "48e11195-c250-4618-9bab-4f0aee50597a";
const record = "2597428d-0fee-459a-9e6b-501d4180961d";
const path = `${user}/${record}/e1614729-fd89-4d10-8147-57bb3e1da65d.png`;
const base = { path, mime: "image/png", size: 1024 } as const;

describe("private media validation", () => {
  it("accepts bounded private completion and incident metadata", () => {
    expect(
      completionDraftMediaSchema.safeParse({ ...base, purpose: "before" })
        .success,
    ).toBe(true);
    expect(
      completionMediaSchema.safeParse({
        ...base,
        purpose: "after",
        customerVisible: true,
      }).success,
    ).toBe(true);
    expect(
      incidentEvidenceSchema.safeParse({
        ...base,
        type: "photo",
        description: "Before service",
      }).success,
    ).toBe(true);
  });

  it("rejects traversal, invalid identifiers, oversized files, and bad enums", () => {
    for (const invalid of [
      { ...base, path: `${user}/../private.png`, purpose: "before" },
      { ...base, path: `not-a-user/${record}/private.png`, purpose: "before" },
      { ...base, size: 10_485_761, purpose: "before" },
      { ...base, purpose: "arbitrary" },
    ]) {
      expect(completionDraftMediaSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it("rejects browser-controlled completion visibility with incident evidence", () => {
    expect(
      completionMediaSchema.safeParse({
        ...base,
        purpose: "incident",
        customerVisible: true,
      }).success,
    ).toBe(false);
  });
});

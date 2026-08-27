import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
const routes = [
  "page.tsx",
  "book/move/page.tsx",
  "book/remove/page.tsx",
  "customer/page.tsx",
  "provider/page.tsx",
  "crew/page.tsx",
  "crew/invite/[id]/page.tsx",
  "crew/completion/[assignment]/page.tsx",
  "crew/completion/[assignment]/evidence/page.tsx",
  "dispatch/page.tsx",
  "dispatch/completions/page.tsx",
  "dispatch/incidents/page.tsx",
  "notifications/page.tsx",
  "admin/page.tsx",
];
describe("route smoke checks", () => {
  it.each(routes)("has an App Router entry for %s", (route) =>
    expect(fs.existsSync(path.join(process.cwd(), "src/app", route))).toBe(
      true,
    ),
  );
});

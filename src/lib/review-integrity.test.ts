import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("public review integrity", () => {
  it("does not present invented reviews or ratings", () => {
    const reviews = read("src/app/reviews/page.tsx");
    expect(reviews).toContain("No reviews published yet");
    expect(reviews).toContain("no verified customer or provider");
    expect(reviews).not.toMatch(/[45](\.\d)? out of 5/i);
  });

  it("requires future reviews to be tied to completed work", () => {
    const home = read("src/app/page.tsx");
    const reviews = read("src/app/reviews/page.tsx");
    expect(home).toContain("completed MUBER job");
    expect(reviews).toContain("associated with a completed MUBER job");
    expect(reviews).toContain(
      "will not be removed merely because it is critical",
    );
  });
});

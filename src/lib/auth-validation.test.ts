import { describe, expect, it } from "vitest";
import {
  CUSTOMER_DEFAULT_ROLE,
  loginSchema,
  registrationSchema,
  safeReturnPath,
} from "./auth-validation";
describe("customer authentication boundaries", () => {
  it("validates registration and login", () => {
    expect(
      registrationSchema.safeParse({
        email: "bad",
        password: "short",
        name: "",
      }).success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({
        email: "customer@example.com",
        password: "password",
      }).success,
    ).toBe(true);
  });
  it("defaults only to customer", () =>
    expect(CUSTOMER_DEFAULT_ROLE).toBe("customer"));
  it("prevents open redirects", () => {
    expect(safeReturnPath("https://evil.example")).toBe("/customer");
    expect(safeReturnPath("//evil.example")).toBe("/customer");
    expect(safeReturnPath("/book/move")).toBe("/book/move");
  });
});

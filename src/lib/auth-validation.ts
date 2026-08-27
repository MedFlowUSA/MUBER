import { z } from "zod";
export const registrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1).max(200),
});
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export const CUSTOMER_DEFAULT_ROLE = "customer" as const;
export function safeReturnPath(value: unknown) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
    ? value
    : "/customer";
}

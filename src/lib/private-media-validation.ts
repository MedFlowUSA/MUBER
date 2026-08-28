import { z } from "zod";

const privateObjectPath = z
  .string()
  .min(70)
  .max(500)
  .refine((value) => {
    const parts = value.split("/");
    return (
      parts.length === 3 &&
      z.string().uuid().safeParse(parts[0]).success &&
      z.string().uuid().safeParse(parts[1]).success &&
      /^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(parts[2])
    );
  }, "Invalid private object path");

const privateMime = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const mediaBase = {
  path: privateObjectPath,
  mime: privateMime,
  size: z.number().int().min(1).max(10_485_760),
};

export const completionDraftMediaSchema = z.object({
  ...mediaBase,
  purpose: z.enum([
    "before",
    "after",
    "item_condition",
    "damage",
    "disposal_receipt",
    "donation_receipt",
  ]),
});

export const completionMediaSchema = z
  .object({
    ...mediaBase,
    purpose: z.enum([
      "before",
      "after",
      "disposal_receipt",
      "donation_receipt",
      "incident",
      "other",
    ]),
    customerVisible: z.boolean(),
  })
  .refine((value) => value.purpose !== "incident" || !value.customerVisible, {
    message: "Incident evidence cannot default to customer-visible",
    path: ["customerVisible"],
  });

export const incidentEvidenceSchema = z.object({
  ...mediaBase,
  type: z.enum(["photo", "document", "receipt", "correspondence", "other"]),
  description: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value.length === 0 || value.length >= 3),
});

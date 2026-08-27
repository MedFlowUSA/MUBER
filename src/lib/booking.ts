import { z } from "zod";
export type ServiceKind = "move" | "remove";
export type BookingDraft = {
  service: ServiceKind;
  pickup: string;
  destination: string;
  date: string;
  timeWindow: string;
  moveType: string;
  truckOption: string;
  description: string;
  access: string;
  specialty: string;
  stops: string;
  categories: string[];
  amount: string;
  materials: string;
  disposal: string;
  hazardousConfirmed: boolean;
  photos: string[];
  name: string;
  email: string;
  phone: string;
};
export const emptyDraft = (service: ServiceKind): BookingDraft => ({
  service,
  pickup: "",
  destination: "",
  date: "",
  timeWindow: "",
  moveType: "",
  truckOption: "",
  description: "",
  access: "",
  specialty: "",
  stops: "",
  categories: [],
  amount: "",
  materials: "",
  disposal: "",
  hazardousConfirmed: false,
  photos: [],
  name: "",
  email: "",
  phone: "",
});
const required = z.string().trim().min(1, "This field is required");
export const commonContact = z.object({
  name: required,
  email: z.string().email("Enter a valid email"),
  phone: z.string().regex(/^[+\d\s().-]{7,20}$/, "Enter a valid phone number"),
});
export const moveSchema = z
  .object({
    pickup: required,
    destination: required,
    date: required,
    timeWindow: required,
    moveType: required,
    truckOption: required,
    description: z.string().trim().min(10, "Add at least 10 characters"),
  })
  .merge(commonContact);
export const removeSchema = z
  .object({
    pickup: required,
    date: required,
    timeWindow: required,
    categories: z.array(z.string()).min(1, "Select at least one category"),
    amount: required,
    disposal: required,
    hazardousConfirmed: z.literal(true, {
      errorMap: () => ({ message: "Confirm the hazardous-item screening" }),
    }),
  })
  .merge(commonContact);
export function validateBooking(draft: BookingDraft) {
  const parsed = (
    draft.service === "move" ? moveSchema : removeSchema
  ).safeParse(draft);
  return parsed.success
    ? {}
    : Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      );
}
export const bookingRepository = {
  async submitLocal(draft: BookingDraft) {
    return {
      id: `demo-${draft.service}-${Date.now()}`,
      persisted: "local-only" as const,
    };
  },
};
export const MAX_PHOTOS = 8,
  MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export function validPhoto(file: Pick<File, "type" | "size">) {
  return (
    ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
    file.size <= MAX_PHOTO_BYTES
  );
}

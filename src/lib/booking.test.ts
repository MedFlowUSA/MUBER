import { describe, expect, it } from "vitest";
import {
  bookingItems,
  emptyDraft,
  validPhoto,
  validateBooking,
} from "./booking";
describe("booking validation", () => {
  it("rejects an incomplete move", () =>
    expect(validateBooking(emptyDraft("move"))).toHaveProperty("pickup"));
  it("accepts a complete removal request", () => {
    const d = {
      ...emptyDraft("remove"),
      pickup: "1 State St",
      date: "2026-09-10",
      timeWindow: "Morning",
      categories: ["Furniture"],
      amount: "quarter truck",
      disposal: "Donate",
      hazardousConfirmed: true,
      name: "Jordan Lee",
      email: "jordan@example.com",
      phone: "909-555-0111",
    };
    expect(validateBooking(d)).toEqual({});
  });
  it("restricts upload type and size", () => {
    expect(validPhoto({ type: "image/png", size: 100 })).toBe(true);
    expect(validPhoto({ type: "application/pdf", size: 100 })).toBe(false);
    expect(validPhoto({ type: "image/png", size: 11 * 1024 * 1024 })).toBe(
      false,
    );
  });
  it("builds structured moving inventory without inventing prices", () => {
    const draft = {
      ...emptyDraft("move"),
      rooms: ["Bedroom", "Garage"],
      moveInventory: ["Bed", "Tool chest", " Bed "],
    };
    expect(bookingItems(draft)).toEqual([
      "Room: Bedroom",
      "Room: Garage",
      "Bed",
      "Tool chest",
    ]);
  });
});

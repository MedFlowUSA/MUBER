import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BookingFlow } from "./booking-flow";
import { ToastProvider } from "./toast";
describe("booking flow", () => {
  it("renders a move and advances with semantic step headings", async () => {
    render(
      <ToastProvider>
        <BookingFlow service="move" />
      </ToastProvider>,
    );
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Where are you moving?",
      }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(
      screen.getByRole("heading", { level: 2, name: "When works best?" }),
    ).toBeInTheDocument();
  });
  it("explains durable drafts and private uploads", async () => {
    render(
      <ToastProvider>
        <BookingFlow service="remove" />
      </ToastProvider>,
    );
    expect(
      await screen.findByText(
        /draft stays in this browser until successful submission/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/upload privately after sign-in/i),
    ).toBeInTheDocument();
  });
});

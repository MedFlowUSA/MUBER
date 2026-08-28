import React from "react";
import axe from "axe-core";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { AuthForm } from "./auth-form";
import { BookingFlow } from "./booking-flow";
import { ToastProvider } from "./toast";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

async function expectNoAutomatedViolations(container: HTMLElement) {
  const result = await axe.run(container, {
    rules: {
      // JSDOM cannot calculate rendered colors. Contrast remains a manual and
      // browser-level certification item.
      "color-contrast": { enabled: false },
    },
  });
  expect(
    result.violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map((node) => ({
        target: node.target,
        html: node.html,
        summary: node.failureSummary,
      })),
    })),
  ).toEqual([]);
}

describe("automated accessibility", () => {
  it("finds no detectable violations on the homepage", async () => {
    const { container } = render(<Home />);
    await expectNoAutomatedViolations(container);
  });

  it("finds no detectable violations in authentication", async () => {
    const { container } = render(
      <AuthForm
        title="Welcome back"
        copy="Sign in to your account."
        action={async () => undefined}
        kind="login"
      />,
    );
    await expectNoAutomatedViolations(container);
  });

  it("finds no detectable violations in the booking flow", async () => {
    const { container } = render(
      <ToastProvider>
        <BookingFlow service="move" />
      </ToastProvider>,
    );
    await expectNoAutomatedViolations(container);
  });
});

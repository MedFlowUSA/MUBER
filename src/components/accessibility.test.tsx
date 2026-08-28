import React from "react";
import axe from "axe-core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it.each([
    ["login", "Welcome back"],
    ["register", "Create your account"],
    ["forgot", "Reset your password"],
    ["reset", "Choose a new password"],
  ] as const)("finds no detectable violations in %s", async (kind, title) => {
    const { container } = render(
      <AuthForm
        title={title}
        copy="Secure account access."
        action={async () => undefined}
        kind={kind}
        error={
          kind === "login" ? "The supplied credentials are invalid." : undefined
        }
      />,
    );
    await expectNoAutomatedViolations(container);
  });

  it.each([
    [
      "move",
      [
        "Where are you moving?",
        "When works best?",
        "Tell us about the move",
        "Access and photos",
        "How can we reach you?",
        "Review your request",
      ],
    ],
    [
      "remove",
      [
        "Where should we pick up?",
        "When works best?",
        "What needs to go?",
        "Access and photos",
        "How can we reach you?",
        "Review your request",
      ],
    ],
  ] as const)(
    "finds no detectable violations in the %s flow",
    async (service, headings) => {
      const { container } = render(
        <ToastProvider>
          <BookingFlow service={service} />
        </ToastProvider>,
      );
      for (const [index, heading] of headings.entries()) {
        await screen.findByRole("heading", { level: 2, name: heading });
        await expectNoAutomatedViolations(container);
        if (index < headings.length - 1) {
          await userEvent.click(
            screen.getByRole("button", { name: /continue/i }),
          );
        }
      }
    },
  );
});

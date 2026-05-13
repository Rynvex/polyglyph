/**
 * TDD spec for BotTypingIndicator — the "..." pre-bubble animation.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { BotTypingIndicator } from "@/components/BotTypingIndicator";

describe("BotTypingIndicator", () => {
  test("renders three dots inside the bot row", () => {
    render(<BotTypingIndicator speakerName="Barista" />);
    const dots = screen.getByTestId("typing-dots");
    expect(dots.children).toHaveLength(3);
  });

  test("shows the speaker name above the dots when provided", () => {
    render(<BotTypingIndicator speakerName="Barista" />);
    expect(screen.getByText("Barista")).toBeInTheDocument();
  });

  test("renders without speaker name", () => {
    render(<BotTypingIndicator />);
    expect(screen.getByTestId("typing-dots")).toBeInTheDocument();
  });

  test("carries data-speaker=bot for theming consistency with ChatBubble", () => {
    render(<BotTypingIndicator />);
    expect(screen.getByTestId("typing-row")).toHaveAttribute("data-speaker", "bot");
  });
});

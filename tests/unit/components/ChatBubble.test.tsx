/**
 * TDD spec for ChatBubble — LINE-style chat row.
 *
 * - Bot row: avatar + name on the left side
 * - Player row: bubble only on the right (no avatar — keeps the rhythm clean)
 * - Both expose `data-speaker` so the parent layout can react.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ChatBubble } from "@/components/ChatBubble";

describe("ChatBubble — text + speaker", () => {
  test("renders bot text", () => {
    // skipTyping bypasses the typewriter animation so the test sees the
    // full text on first paint.
    render(<ChatBubble speaker="bot" text="Hi there!" skipTyping />);
    expect(screen.getByText("Hi there!")).toBeInTheDocument();
  });

  test("renders player text", () => {
    render(<ChatBubble speaker="player" text="I'd like a latte." />);
    expect(screen.getByText("I'd like a latte.")).toBeInTheDocument();
  });

  test("bot row carries data-speaker=bot", () => {
    render(<ChatBubble speaker="bot" text="x" />);
    expect(screen.getByTestId("chat-row")).toHaveAttribute("data-speaker", "bot");
  });

  test("player row carries data-speaker=player", () => {
    render(<ChatBubble speaker="player" text="x" />);
    expect(screen.getByTestId("chat-row")).toHaveAttribute("data-speaker", "player");
  });
});

describe("ChatBubble — LINE styling", () => {
  test("bot row shows the speaker name when provided", () => {
    render(<ChatBubble speaker="bot" text="Hi!" speakerName="Barista" />);
    expect(screen.getByText("Barista")).toBeInTheDocument();
  });

  test("bot row renders an avatar with the speaker initial", () => {
    render(<ChatBubble speaker="bot" text="Hi!" speakerName="Barista" />);
    const avatar = screen.getByTestId("avatar");
    expect(avatar).toHaveTextContent("B");
  });

  test("bot row falls back to a placeholder initial when no name given", () => {
    render(<ChatBubble speaker="bot" text="Hi!" />);
    expect(screen.getByTestId("avatar")).toBeInTheDocument();
  });

  test("player row does NOT render an avatar", () => {
    render(<ChatBubble speaker="player" text="hey" speakerName="You" />);
    expect(screen.queryByTestId("avatar")).toBeNull();
  });

  test("player row does not render the speaker name (right-aligned UX)", () => {
    render(<ChatBubble speaker="player" text="hey" speakerName="You" />);
    expect(screen.queryByText("You")).toBeNull();
  });
});

describe("ChatBubble — translation strip", () => {
  test("no translation strip when translationText is undefined", () => {
    render(<ChatBubble speaker="bot" text="Hi!" skipTyping />);
    expect(screen.queryByTestId("translation-strip")).toBeNull();
  });

  test("no translation strip when translationText is empty", () => {
    render(<ChatBubble speaker="bot" text="Hi!" skipTyping translationText="" />);
    expect(screen.queryByTestId("translation-strip")).toBeNull();
  });

  test("bot row renders translation strip on the left", () => {
    render(
      <ChatBubble
        speaker="bot"
        text="Hi there!"
        skipTyping
        translationText="你好"
      />,
    );
    const strip = screen.getByTestId("translation-strip");
    expect(strip).toHaveTextContent("你好");
    expect(strip).toHaveAttribute("data-side", "left");
  });

  test("player row renders translation strip on the right", () => {
    render(
      <ChatBubble
        speaker="player"
        text="I'd like a latte."
        translationText="我要一杯拿鐵。"
      />,
    );
    const strip = screen.getByTestId("translation-strip");
    expect(strip).toHaveTextContent("我要一杯拿鐵。");
    expect(strip).toHaveAttribute("data-side", "right");
  });
});

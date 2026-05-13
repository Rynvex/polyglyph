/**
 * TDD spec for DialogueSummary — end-of-dialogue settlement.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { DialogueSummary } from "@/components/DialogueSummary";

describe("DialogueSummary", () => {
  test("shows the dialogue title", () => {
    render(
      <DialogueSummary
        title="Coffee Shop Basics"
        wpm={42}
        accuracy={0.95}
        durationSec={120}
        maxCombo={18}
        charsTyped={140}
        onPlayAgain={() => {}}
      />,
    );
    expect(screen.getByText("Coffee Shop Basics")).toBeInTheDocument();
  });

  test("formats WPM with no decimals when whole", () => {
    render(
      <DialogueSummary
        title="x"
        wpm={42}
        accuracy={1}
        durationSec={60}
        maxCombo={5}
        charsTyped={50}
        onPlayAgain={() => {}}
      />,
    );
    expect(screen.getByTestId("stat-wpm").textContent).toContain("42");
  });

  test("formats accuracy as a percentage", () => {
    render(
      <DialogueSummary
        title="x"
        wpm={42}
        accuracy={0.9523}
        durationSec={60}
        maxCombo={5}
        charsTyped={50}
        onPlayAgain={() => {}}
      />,
    );
    expect(screen.getByTestId("stat-accuracy").textContent).toMatch(/95/);
  });

  test("formats duration as mm:ss", () => {
    render(
      <DialogueSummary
        title="x"
        wpm={42}
        accuracy={1}
        durationSec={75}
        maxCombo={5}
        charsTyped={50}
        onPlayAgain={() => {}}
      />,
    );
    expect(screen.getByTestId("stat-duration").textContent).toContain("1:15");
  });

  test("clicking 'Play again' triggers callback", async () => {
    const onPlayAgain = vi.fn();
    const user = userEvent.setup();
    render(
      <DialogueSummary
        title="x"
        wpm={1}
        accuracy={1}
        durationSec={1}
        maxCombo={1}
        charsTyped={1}
        onPlayAgain={onPlayAgain}
      />,
    );
    await user.click(screen.getByRole("button", { name: /play again/i }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  test("links back to the script index", () => {
    render(
      <DialogueSummary
        title="x"
        wpm={1}
        accuracy={1}
        durationSec={1}
        maxCombo={1}
        charsTyped={1}
        onPlayAgain={() => {}}
      />,
    );
    expect(screen.getByRole("link", { name: /back to scripts/i })).toHaveAttribute("href", "/");
  });

  test("optional 'New record' badge renders when isNewRecord", () => {
    render(
      <DialogueSummary
        title="x"
        wpm={50}
        accuracy={1}
        durationSec={60}
        maxCombo={5}
        charsTyped={50}
        isNewRecord
        onPlayAgain={() => {}}
      />,
    );
    expect(screen.getByText(/new record/i)).toBeInTheDocument();
  });

  test("no record badge when isNewRecord absent", () => {
    render(
      <DialogueSummary
        title="x"
        wpm={50}
        accuracy={1}
        durationSec={60}
        maxCombo={5}
        charsTyped={50}
        onPlayAgain={() => {}}
      />,
    );
    expect(screen.queryByText(/new record/i)).toBeNull();
  });
});
